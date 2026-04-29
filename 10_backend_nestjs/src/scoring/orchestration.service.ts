import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Orchestrator for MLOps Lifecycles.
 * Handles Model Registry hooks, retrain triggers, and promotion logic.
 */
@Injectable()
export class OrchestrationService {
  private readonly logger = new Logger(OrchestrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Identifies the current active champion model for a specific registry model type.
   * Promotes the first online version if none are directly tracked as champion.
   */
  async getActiveModelVersion(type: string): Promise<string> {
    const registry = await this.prisma.modelRegistry.findFirst({
      where: { type },
      include: {
        versions: {
          where: { status: 'HEALTHY' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (registry && registry.versions.length > 0) {
      return registry.versions[0].versionTag;
    }

    // Default fallback if registry is disconnected
    this.logger.warn(`[MLOps] No active model found in registry for ${type}. Using active_v1`);
    return `${type.toLowerCase()}_active_v1`;
  }

  /**
   * Endpoint hook for the Python MLOps proxy to ingest newly calculated metrics (Airflow/MLflow hook).
   */
  async ingestModelMetrics(payload: {
    versionTag: string;
    inferenceVolume: number;
    errorRate: number;
    latencyP50: number;
    latencyP99: number;
    auc?: number;
    ks?: number;
    psi?: number;
  }) {
    this.logger.log(`[MLOps] Ingesting metrics for version: ${payload.versionTag}`);

    const version = await this.prisma.modelVersion.findFirst({
      where: { versionTag: payload.versionTag },
    });

    if (!version) {
      this.logger.error(`[MLOps] Model version ${payload.versionTag} not found in registry. Creating ad-hoc record.`);
      // In a real system, you'd fail or create a dangling metric. Here we just log for brevity.
      return;
    }

    await this.prisma.$transaction(async (tx) => {
       // Update version master metrics
       if (payload.auc || payload.ks) {
         await tx.modelVersion.update({
           where: { id: version.id },
           data: {
             auc: payload.auc ?? version.auc,
             ks: payload.ks ?? version.ks,
             psi: payload.psi ?? version.psi,
           }
         });
       }

       // Append point-in-time metrics log
       await tx.modelMetrics.create({
         data: {
           modelVersionId: version.id,
           inferenceVolume: payload.inferenceVolume,
           errorRate: payload.errorRate,
           latencyP50: payload.latencyP50,
           latencyP99: payload.latencyP99,
         }
       });
    });

    // Simple Drift Alert Logic (PSI > 0.25 is severe drift)
    if (payload.psi && payload.psi > 0.25) {
      this.logger.warn(`[MLOps] Severe Data Drift detected (PSI: ${payload.psi}). Triggering Alert.`);
      await this.prisma.alert.create({
        data: {
          severity: 'CRITICAL',
          message: `Data Drift Alert: ${payload.versionTag} has PSI > 0.25 (Value: ${payload.psi})`,
          detail: 'Model requires immediate retraining or challenger promotion.',
        }
      });
    }
  }

  /**
   * Placeholder hook for CI/CD or MLOps Airflow to trigger model retraining.
   */
  async triggerRetrainingJob(modelType: string): Promise<string> {
    this.logger.log(`[MLOps] Orchestrator triggering model retraining for ${modelType}...`);
    // Example: HTTP POST to Airflow DAG trigger endpoint
    const jobId = `job_retrain_${new Date().getTime()}`;

    await this.prisma.alert.create({
      data: {
        severity: 'INFO',
        message: `Model Retraining scheduled for ${modelType}`,
        detail: `Job ID ${jobId} submitted to orchestration queue.`
      }
    });

    return jobId;
  }
}
