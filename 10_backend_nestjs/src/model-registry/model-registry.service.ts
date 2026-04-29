import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LifecycleStatus, DeploymentStatus, ArtifactCategory } from '@prisma/client';

@Injectable()
export class ModelRegistryService {
  private readonly logger = new Logger(ModelRegistryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * PROMOTE â€” Governed transition from CHALLENGER to CHAMPION.
   *
   * Gates:
   * 1. Must be a CHALLENGER.
   * 2. Must have ArtifactCategory: PROD_CHAMPION.
   * 3. Must have OOT Validation evidence (oot_auc and oot_ks).
   */
  async promoteToChampion(versionId: string, actorId: string) {
    const version = await this.prisma.modelVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: { registry: true },
    });

    // Gate 1: Lifecycle State Check
    if (version.lifecycleStatus !== LifecycleStatus.CHALLENGER) {
      throw new BadRequestException(`Model version must be in CHALLENGER state to be promoted. Current: ${version.lifecycleStatus}`);
    }

    // Gate 2: Artifact Category Check
    if (version.artifactCategory !== ArtifactCategory.PROD_CHAMPION) {
      throw new BadRequestException(`Only PROD_CHAMPION artifacts can be promoted to the Champion slot.`);
    }

    // Gate 3: OOT Evidence Check (Institutional Requirement)
    if (!version.oot_auc || !version.oot_ks) {
      throw new BadRequestException(`Missing OOT Validation evidence. AUC and KS from Out-of-Time window are mandatory for promotion.`);
    }

    this.logger.log(`[Promotion] Promoting model ${version.registry.name} (${version.versionTag}) to CHAMPION.`);

    // Atomic Transaction: Demote old Champion, Promote new one
    return this.prisma.$transaction(async (tx) => {
      // 1. Archive or demote current champion in this registry
      await tx.modelVersion.updateMany({
        where: {
          modelId: version.modelId,
          lifecycleStatus: LifecycleStatus.CHAMPION
        },
        data: {
          lifecycleStatus: LifecycleStatus.ARCHIVED,
          deploymentStatus: DeploymentStatus.DISABLED
        },
      });

      // 2. Promote target version
      const updated = await tx.modelVersion.update({
        where: { id: versionId },
        data: {
          lifecycleStatus: LifecycleStatus.CHAMPION,
          deploymentStatus: DeploymentStatus.PRODUCTION,
          deployedAt: new Date(),
        },
      });

      // 3. Audit Log
      await this.audit.log({
        eventType: 'MODEL_PROMOTION',
        entityType: 'ModelVersion',
        entityId: versionId,
        actorId,
        previousValue: { lifecycle: version.lifecycleStatus, deployment: version.deploymentStatus },
        newValue: { lifecycle: LifecycleStatus.CHAMPION, deployment: DeploymentStatus.PRODUCTION },
      });

      return updated;
    });
  }

  /**
   * ROLLBACK â€” Reverts the registry to the most recent ARCHIVED version that was previously a CHAMPION.
   */
  async rollback(modelRegistryId: string, actorId: string) {
    const currentChampion = await this.prisma.modelVersion.findFirst({
      where: { modelId: modelRegistryId, lifecycleStatus: LifecycleStatus.CHAMPION },
    });

    const lastArchived = await this.prisma.modelVersion.findFirst({
      where: { modelId: modelRegistryId, lifecycleStatus: LifecycleStatus.ARCHIVED },
      orderBy: { updatedAt: 'desc' },
    });

    if (!lastArchived) {
      throw new BadRequestException('No previous version found to rollback to.');
    }

    this.logger.warn(`[Rollback] Reverting registry ${modelRegistryId} to ${lastArchived.versionTag}.`);

    return this.prisma.$transaction(async (tx) => {
      if (currentChampion) {
        await tx.modelVersion.update({
          where: { id: currentChampion.id },
          data: {
            lifecycleStatus: LifecycleStatus.ARCHIVED,
            deploymentStatus: DeploymentStatus.DISABLED
          },
        });
      }

      const rolledBack = await tx.modelVersion.update({
        where: { id: lastArchived.id },
        data: {
          lifecycleStatus: LifecycleStatus.CHAMPION,
          deploymentStatus: DeploymentStatus.PRODUCTION,
        },
      });

      await this.audit.log({
        eventType: 'MODEL_ROLLBACK',
        entityType: 'ModelRegistry',
        entityId: modelRegistryId,
        actorId,
        newValue: { targetVersion: lastArchived.versionTag },
      });

      return rolledBack;
    });
  }

  /**
   * Registers a new PROD_CHAMPION candidate.
   * It enters the registry as CHALLENGER and requires formal MRM promotion.
   */
  async registerProdChampion(data: any, actorId: string) {
    const registry = await this.prisma.modelRegistry.findFirst({
      where: { type: 'XGBOOST' }
    });

    if (!registry) {
      throw new BadRequestException('Target model registry not found.');
    }

    const version = await this.prisma.modelVersion.create({
      data: {
        modelId: registry.id,
        versionTag: data.versionTag,
        status: 'HEALTHY',
        lifecycleStatus: 'CHALLENGER',
        deploymentStatus: 'SHADOW',
        artifactCategory: 'PROD_CHAMPION',
        auc: data.auc,
        ks: data.ks,
        psi: data.psi || 0,
        oot_auc: data.oot_auc,
        oot_ks: data.oot_ks,
        oot_psi: data.oot_psi,
        oot_period_start: data.oot_period_start ? new Date(data.oot_period_start) : null,
        oot_period_end: data.oot_period_end ? new Date(data.oot_period_end) : null,
        featureSchemaVersion: data.featureSchemaVersion,
        trainingTimestamp: data.trainingTimestamp ? new Date(data.trainingTimestamp) : null,
        validationStatus: 'VALIDATED_PASS_WITH_CAVEATS'
      }
    });

    await this.audit.log({
      eventType: 'PROD_CHAMPION_REGISTERED',
      entityType: 'ModelVersion',
      entityId: version.id,
      actorId,
      newValue: { versionTag: data.versionTag, featureSchemaVersion: data.featureSchemaVersion }
    });

    return {
      message: 'PROD_CHAMPION candidate registered successfully as CHALLENGER.',
      version
    };
  }

  async findAll() {
    return this.prisma.modelRegistry.findMany({
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }
}
