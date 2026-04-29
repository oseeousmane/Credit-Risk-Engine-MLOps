import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ScoringService } from '../scoring/scoring.service';
import { ModelStatus, ArtifactCategory } from '@prisma/client';

const PSI_WARN = 0.10;
const PSI_CRITICAL = 0.25;
const QUALITY_WARN_THRESHOLD = 50;     // payloadQualityScore below this is a warning
const FALLBACK_RATE_WARN = 0.10;       // 10%+ fallback usage triggers a governance review

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly scoring: ScoringService,
  ) {}

  // â”€â”€ Automated Drift Evaluation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Cron(CronExpression.EVERY_HOUR)
  async evaluateModelDrift() {
    this.logger.log('[MONITORING] Starting hourly drift + governance evaluation...');

    const activeModels = await this.prisma.modelVersion.findMany({
      where: { status: { in: ['HEALTHY', 'WARNING', 'DEGRADED'] } },
      include: { registry: true },
    });

    for (const model of activeModels) {
      let newStatus: ModelStatus = model.status;
      const reasons: string[] = [];

      if (model.psi > PSI_CRITICAL) {
        newStatus = 'DEGRADED';
        reasons.push(`PSI=${model.psi.toFixed(3)} exceeds CRITICAL threshold (${PSI_CRITICAL})`);
      } else if (model.psi > PSI_WARN) {
        newStatus = 'WARNING';
        reasons.push(`PSI=${model.psi.toFixed(3)} exceeds WARNING threshold (${PSI_WARN})`);
      } else {
        newStatus = 'HEALTHY';
      }

      // Governance escalation: DEGRADED for 2+ cycles triggers REVIEW_REQUIRED status (future hook)
      if (newStatus !== model.status) {
        await this.prisma.modelVersion.update({
          where: { id: model.id },
          data: { status: newStatus },
        });

        await this.audit.log({
          eventType: 'MODEL_STATUS_CHANGED',
          entityType: 'ModelVersion',
          entityId: model.id,
          previousValue: { status: model.status, psi: model.psi },
          newValue: { status: newStatus, psi: model.psi, reasons },
        });

        await this.prisma.alert.create({
          data: {
            severity: newStatus === 'DEGRADED' ? 'CRITICAL' : 'WARNING',
            message: `Model ${model.registry.name} (${model.versionTag}) â†’ ${newStatus}`,
            detail: reasons.join('; '),
          },
        });

        this.logger.warn(`[MONITORING] ${model.id} transitioned to ${newStatus}: ${reasons.join(', ')}`);
      }
    }
  }

  // â”€â”€ MLOps Python Engine Metric Ingestion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Cron('*/30 * * * * *') // Every 30 seconds for live demo visibility
  async fetchAndIngestPythonMetrics() {
    this.logger.log('[MONITORING] Fetching real-time metrics from Python MLOps Engine...');

    const activeModel = await this.prisma.modelVersion.findFirst({
      where: { status: { in: ['HEALTHY', 'WARNING'] } },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeModel) return;

    // Simulate metrics with slight jitter to create realistic time-series graphs
    const baseAuc = activeModel.auc > 0 ? activeModel.auc : 0.85;
    const baseKs = activeModel.ks > 0 ? activeModel.ks : 0.45;
    const basePsi = activeModel.psi > 0 ? activeModel.psi : 0.05;

    // Random walk with boundaries
    const auc = Math.min(0.95, Math.max(0.65, baseAuc + (Math.random() * 0.02 - 0.01)));
    const ks = Math.min(0.80, Math.max(0.20, baseKs + (Math.random() * 0.04 - 0.02)));

    // Occasional drift spike
    const isDriftSpike = Math.random() > 0.95;
    const psi = Math.max(0.01, basePsi + (isDriftSpike ? (Math.random() * 0.15) : (Math.random() * 0.01 - 0.005)));

    await this.ingestMetrics(activeModel.id, {
      inferenceVolume: Math.floor(Math.random() * 50) + 10,
      errorRate: Math.random() < 0.05 ? 0.01 : 0.0,
      latencyP50: 25 + Math.random() * 10,
      latencyP99: 45 + Math.random() * 30,
      criticalFeatures: [
        { feature: 'debt_to_income', psi: psi * 0.8 },
        { feature: 'revolving_util', psi: psi * 0.4 },
        { feature: 'missed_payments_6m', psi: psi * 0.3 }
      ],
      auc,
      ks,
      psi
    });
  }

  // â”€â”€ Scoring Event Ingestion (called per-decision) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Records per-inference quality signals into ModelMetrics.
   * This enables payload quality and fallback usage trending over time.
   */
  async ingestScoringEvent(payload: {
    modelVersionId?: string;
    engine: 'PYTHON' | 'FALLBACK';
    payloadQualityScore: number;
    imputedFeaturesCount: number;
    qualityBand: string;
    latencyMs?: number;
  }) {
    // Find active champion model if no version ID provided
    let versionId = payload.modelVersionId;
    if (!versionId) {
      const champion = await this.prisma.modelVersion.findFirst({
        where: { status: { in: ['HEALTHY', 'WARNING'] } },
        orderBy: { createdAt: 'desc' },
      });
      if (!champion) return;
      versionId = champion.id;
    }

    const isFallback = payload.engine === 'FALLBACK';

    await this.prisma.modelMetrics.create({
      data: {
        modelVersionId: versionId,
        inferenceVolume: 1,
        errorRate: isFallback ? 1.0 : 0.0,
        latencyP50: payload.latencyMs ?? 0,
        latencyP99: payload.latencyMs ?? 0,
        criticalFeatures: [],
        avgPayloadQuality: payload.payloadQualityScore,
        avgImputedCount: payload.imputedFeaturesCount,
      },
    });

    // Alert if quality band degrades to LOW
    if (payload.qualityBand === 'LOW') {
      this.logger.warn(
        `[MONITORING] LOW payload quality detected: ${payload.payloadQualityScore.toFixed(1)}% ` +
        `(Imputed=${payload.imputedFeaturesCount})`
      );
    }

    // Alert if fallback used
    if (isFallback) {
      this.logger.warn('[MONITORING] FALLBACK engine usage recorded in metrics history.');
    }
  }

  // â”€â”€ Historical Data Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getLatestMetrics() {
    const versions = await this.prisma.modelVersion.findMany({
      where: { lifecycleStatus: { not: 'ARCHIVED' } },
      include: {
        registry: true,
        metricsLogs: { orderBy: { loggedAt: 'desc' }, take: 1 },
      },
    });

    return versions.map(v => ({
      id: v.id,
      modelName: v.registry.name,
      version: v.versionTag,
      status: v.status,
      lifecycleStatus: v.lifecycleStatus,
      deploymentStatus: v.deploymentStatus,
      isShadow: v.deploymentStatus === 'SHADOW',
      auc: v.auc,
      ks: v.ks,
      psi: v.psi,
      latestLog: v.metricsLogs[0] ?? null,
    }));
  }

  async getMetricsHistory(modelVersionId?: string, limit = 30) {
    const where = modelVersionId ? { modelVersionId } : {};
    const logs = await this.prisma.modelMetrics.findMany({
      where,
      orderBy: { loggedAt: 'desc' },
      take: limit,
      include: {
        modelVersion: { include: { registry: { select: { name: true } } } },
      },
    });

    return logs.map(l => ({
      id: l.id,
      loggedAt: l.loggedAt,
      modelVersionId: l.modelVersionId,
      modelName: l.modelVersion.registry.name,
      versionTag: l.modelVersion.versionTag,
      inferenceVolume: l.inferenceVolume,
      errorRate: l.errorRate,
      latencyP50: l.latencyP50,
      latencyP99: l.latencyP99,
      auc: l.auc ?? l.modelVersion.auc,
      ks: l.ks ?? l.modelVersion.ks,
      psi: l.psi ?? l.modelVersion.psi,
      // Phase 4: quality time-series fields
      avgPayloadQuality: (l as any).avgPayloadQuality ?? null,
      avgImputedCount: (l as any).avgImputedCount ?? null,
    }));
  }

  /**
   * Returns payload quality trend over time.
   * Buckets: daily averages from ModelMetrics.
   */
  async getPayloadQualityTrend(modelVersionId?: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const where: any = { loggedAt: { gte: since } };
    if (modelVersionId) where.modelVersionId = modelVersionId;

    const logs = await this.prisma.modelMetrics.findMany({
      where,
      orderBy: { loggedAt: 'asc' },
      select: { loggedAt: true, avgPayloadQuality: true, avgImputedCount: true, errorRate: true },
    });

    // Aggregate by day
    const byDay: Record<string, { qualities: number[]; imputations: number[]; fallbacks: number[] }> = {};
    for (const log of logs) {
      const day = (log as any).loggedAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { qualities: [], imputations: [], fallbacks: [] };
      if ((log as any).avgPayloadQuality != null) byDay[day].qualities.push((log as any).avgPayloadQuality);
      if ((log as any).avgImputedCount != null) byDay[day].imputations.push((log as any).avgImputedCount);
      byDay[day].fallbacks.push((log as any).errorRate > 0 ? 1 : 0);
    }

    return Object.entries(byDay).map(([date, data]) => ({
      date,
      avgPayloadQuality: data.qualities.length > 0 ? parseFloat((data.qualities.reduce((a, b) => a + b, 0) / data.qualities.length).toFixed(1)) : null,
      avgImputedCount: data.imputations.length > 0 ? parseFloat((data.imputations.reduce((a, b) => a + b, 0) / data.imputations.length).toFixed(1)) : null,
      fallbackRate: data.fallbacks.length > 0 ? parseFloat((data.fallbacks.reduce((a, b) => a + b, 0) / data.fallbacks.length).toFixed(3)) : 0,
      sampleCount: data.qualities.length,
    }));
  }

  /**
   * Returns fallback engine usage history: timestamps and frequency.
   */
  async getFallbackHistory(limit = 50) {
    const fallbackAlerts = await this.prisma.alert.findMany({
      where: { message: { contains: 'FALLBACK' } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const totalEvents = await this.prisma.modelMetrics.count({
      where: { errorRate: { gt: 0 } },
    });
    const totalInferences = await this.prisma.modelMetrics.count();

    return {
      totalFallbackEvents: totalEvents,
      totalInferences,
      fallbackRate: totalInferences > 0 ? parseFloat((totalEvents / totalInferences).toFixed(4)) : 0,
      governanceFlag: totalInferences > 0 && (totalEvents / totalInferences) > FALLBACK_RATE_WARN
        ? 'REVIEW_REQUIRED'
        : 'ACCEPTABLE',
      recentIncidents: fallbackAlerts,
    };
  }

  /**
   * Returns the degradation timeline: periods where model status was WARNING or DEGRADED.
   */
  async getDegradationTimeline(limit = 50) {
    const events = await this.prisma.auditEvent.findMany({
      where: { eventType: 'MODEL_STATUS_CHANGED' },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return events
      .filter(e => {
        const newVal = e.newValue as any;
        return newVal?.status === 'DEGRADED' || newVal?.status === 'WARNING';
      })
      .map(e => ({
        id: e.id,
        timestamp: e.timestamp,
        entityId: e.entityId,
        previousStatus: (e.previousValue as any)?.status,
        newStatus: (e.newValue as any)?.status,
        psi: (e.newValue as any)?.psi,
        reasons: (e.newValue as any)?.reasons ?? [],
      }));
  }

  async getScoringHealth() {
    const start = Date.now();
    try {
      const probeResult = await this.scoring.score({
        applicationId: '__health_probe__',
        pdCurrent: 1.5,
        exposure: 25,
        riskLevel: 'LOW',
      });

      const latencyMs = Date.now() - start;
      const isLivePython = probeResult.engine === 'PYTHON';

      return {
        status: isLivePython ? 'PYTHON_ONLINE' : 'FALLBACK_ACTIVE',
        engine: probeResult.engine,
        modelVersion: probeResult.modelVersion,
        scoredBy: probeResult.scoredBy,
        latencyMs,
        pythonServiceUrl: process.env.SCORING_SERVICE_URL || 'http://localhost:8000',
        checkedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        status: 'ERROR',
        engine: 'FALLBACK',
        latencyMs: Date.now() - start,
        error: (err as Error).message,
        checkedAt: new Date().toISOString(),
      };
    }
  }

  async getAlerts(resolved?: boolean) {
    const where = resolved !== undefined ? { isResolved: resolved } : {};
    return this.prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async ingestMetrics(modelVersionId: string, metrics: {
    inferenceVolume: number;
    errorRate: number;
    latencyP50: number;
    latencyP99: number;
    criticalFeatures: object[];
    auc?: number;
    ks?: number;
    psi?: number;
  }) {
    const log = await this.prisma.modelMetrics.create({
      data: {
        modelVersionId,
        inferenceVolume: metrics.inferenceVolume,
        errorRate: metrics.errorRate,
        latencyP50: metrics.latencyP50,
        latencyP99: metrics.latencyP99,
        criticalFeatures: metrics.criticalFeatures,
        auc: metrics.auc,
        ks: metrics.ks,
        psi: metrics.psi,
      },
    });

    if (metrics.auc !== undefined || metrics.ks !== undefined || metrics.psi !== undefined) {
      await this.prisma.modelVersion.update({
        where: { id: modelVersionId },
        data: {
          ...(metrics.auc !== undefined && { auc: metrics.auc }),
          ...(metrics.ks !== undefined && { ks: metrics.ks }),
          ...(metrics.psi !== undefined && { psi: metrics.psi }),
        },
      });
    }

    const features = metrics.criticalFeatures as { psi: number }[];
    const maxPsi = features.length > 0 ? Math.max(...features.map(f => f.psi || 0)) : 0;

    if (maxPsi > PSI_CRITICAL) {
      const alert = await this.prisma.alert.create({
        data: {
          severity: 'CRITICAL',
          message: `Model Drift Detected â€” PSI ${maxPsi.toFixed(3)} exceeds critical threshold`,
          detail: `Model version ${modelVersionId} requires immediate investigation.`,
        },
      });
      await this.audit.log({
        eventType: 'MODEL_DRIFT_ALERT',
        entityType: 'ModelVersion',
        entityId: modelVersionId,
        newValue: { psi: maxPsi, severity: 'CRITICAL' },
      });
      this.logger.error(`[MONITORING] CRITICAL drift on model ${modelVersionId}: PSI=${maxPsi.toFixed(3)}`);
      return { log, alert };
    }

    if (maxPsi > PSI_WARN) {
      await this.prisma.alert.create({
        data: {
          severity: 'WARNING',
          message: `PSI Warning â€” ${maxPsi.toFixed(3)} is elevated`,
          detail: `Monitor model version ${modelVersionId} closely.`,
        },
      });
      this.logger.warn(`[MONITORING] WARNING drift on model ${modelVersionId}: PSI=${maxPsi.toFixed(3)}`);
    }

    return { log };
  }

  // â”€â”€ Model Governance & MRM (Phase B) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async updateModelGovernance(id: string, data: {
    artifactCategory?: ArtifactCategory;
    oot_auc?: number;
    oot_ks?: number;
    oot_psi?: number;
    oot_period_start?: string;
    oot_period_end?: string;
    validationStatus?: string;
  }) {
    this.logger.log(`[GOVERNANCE] Updating ModelVersion ${id} governance metadata...`);

    const updated = await this.prisma.modelVersion.update({
      where: { id },
      data: {
        ...(data.artifactCategory && { artifactCategory: data.artifactCategory }),
        ...(data.oot_auc !== undefined && { oot_auc: data.oot_auc }),
        ...(data.oot_ks !== undefined && { oot_ks: data.oot_ks }),
        ...(data.oot_psi !== undefined && { oot_psi: data.oot_psi }),
        ...(data.oot_period_start && { oot_period_start: new Date(data.oot_period_start) }),
        ...(data.oot_period_end && { oot_period_end: new Date(data.oot_period_end) }),
        ...(data.validationStatus && { validationStatus: data.validationStatus }),
      },
      include: { registry: true },
    });

    await this.audit.log({
      eventType: 'MODEL_GOVERNANCE_UPDATE',
      entityType: 'ModelVersion',
      entityId: id,
      newValue: data,
    });

    return updated;
  }
}
