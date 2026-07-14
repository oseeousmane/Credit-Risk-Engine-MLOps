import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ModelStatus, LifecycleStatus, DeploymentStatus } from '@prisma/client';

/**
 * RegistryService â€” Phase 4 MLOps Orchestration
 *
 * Governs the full model lifecycle: HEALTHY â†’ CHALLENGER â†’ CHAMPION â†’ ARCHIVED.
 * All state transitions are fully auditable.
 * Designed to be Airflow / MLflow webhook-compatible (stateless HTTP endpoints).
 */
@Injectable()
export class RegistryService {
  private readonly logger = new Logger(RegistryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // â”€â”€ Read Operations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Returns all model versions with enriched metadata.
   * Includes champion/challenger/shadow flags.
   */
  async getAllVersions() {
    const versions = await this.prisma.modelVersion.findMany({
      include: { registry: true, metricsLogs: { orderBy: { loggedAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });

    return versions.map(v => ({
      id: v.id,
      registryName: v.registry.name,
      versionTag: v.versionTag,
      status: v.status,
      lifecycleStatus: v.lifecycleStatus,
      deploymentStatus: v.deploymentStatus,
      isShadow: v.deploymentStatus === 'SHADOW',
      isChampion: v.lifecycleStatus === 'CHAMPION',
      isChallenger: v.lifecycleStatus === 'CHALLENGER',
      auc: v.auc,
      ks: v.ks,
      psi: v.psi,
      createdAt: v.createdAt,
      latestMetrics: v.metricsLogs[0] ?? null,
      featureSchemaVersion: (v as any).featureSchemaVersion ?? null,
      trainingTimestamp: (v as any).trainingTimestamp ?? null,
      deployedAt: (v as any).deployedAt ?? null,
    }));
  }

  /**
   * Returns the current champion model (CHAMPION, PRODUCTION).
   */
  async getChampion() {
    const champion = await this.prisma.modelVersion.findFirst({
      where: { lifecycleStatus: 'CHAMPION', deploymentStatus: 'PRODUCTION' },
      include: { registry: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!champion) return { champion: null, message: 'No active champion model found.' };

    return {
      champion: {
        id: champion.id,
        registryName: champion.registry.name,
        versionTag: champion.versionTag,
        auc: champion.auc,
        ks: champion.ks,
        psi: champion.psi,
        createdAt: champion.createdAt,
      },
    };
  }

  /**
   * Compares two model versions side by side.
   * Useful for champion-challenger evaluation.
   */
  async compareVersions(versionIdA: string, versionIdB: string) {
    const [a, b] = await Promise.all([
      this.prisma.modelVersion.findUnique({ where: { id: versionIdA }, include: { registry: true } }),
      this.prisma.modelVersion.findUnique({ where: { id: versionIdB }, include: { registry: true } }),
    ]);

    if (!a || !b) throw new NotFoundException('One or both model versions not found.');

    const metrics = (m: typeof a) => ({
      id: m!.id,
      version: m!.versionTag,
      status: m!.status,
      lifecycleStatus: m!.lifecycleStatus,
      deploymentStatus: m!.deploymentStatus,
      isShadow: m!.deploymentStatus === 'SHADOW',
      auc: m!.auc,
      ks: m!.ks,
      psi: m!.psi,
    });

    const winner = (a.auc ?? 0) >= (b.auc ?? 0) ? 'A' : 'B';
    const aucDelta = ((a.auc ?? 0) - (b.auc ?? 0));

    return {
      modelA: metrics(a),
      modelB: metrics(b),
      comparison: {
        winner,
        aucDelta: Math.round(aucDelta * 10000) / 10000,
        ksDelta: Math.round(((a.ks ?? 0) - (b.ks ?? 0)) * 10000) / 10000,
        psiDelta: Math.round(((a.psi ?? 0) - (b.psi ?? 0)) * 10000) / 10000,
        recommendation: winner === 'A'
          ? `Version ${a.versionTag} outperforms on AUC. Consider promoting to champion.`
          : `Version ${b.versionTag} outperforms on AUC. Consider promoting to champion.`,
      },
    };
  }

  // â”€â”€ Lifecycle Mutations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Promotes a version to Champion.
   * Automatically demotes the current champion to challenger (shadow) status.
   */
  async promoteToChampion(versionId: string, actorId?: string) {
    const candidate = await this.prisma.modelVersion.findUnique({
      where: { id: versionId },
      include: { registry: true },
    });

    if (!candidate) throw new NotFoundException(`Model version ${versionId} not found.`);

    // Gate 1 — état machine : seul un CHALLENGER peut être promu
    if (candidate.lifecycleStatus !== 'CHALLENGER') {
      throw new BadRequestException(
        `Promotion refusée : le modèle doit être en état CHALLENGER. État actuel : ${candidate.lifecycleStatus}`
      );
    }

    // Gate 2 — catégorie artefact : seul un PROD_CHAMPION peut entrer en production
    if (candidate.artifactCategory !== 'PROD_CHAMPION') {
      throw new BadRequestException(
        `Promotion refusée : seuls les artefacts PROD_CHAMPION peuvent être promus. Catégorie actuelle : ${candidate.artifactCategory}. ` +
        `Les modèles DEMO_BASELINE sont interdits en production (MODEL_GOVERNANCE_SPEC §1).`
      );
    }

    // Gate 3 — evidence OOT obligatoire (IFRS 9 / Basel III validation MRM)
    if (!candidate.oot_auc || !candidate.oot_ks) {
      throw new BadRequestException(
        `Promotion refusée : validation OOT manquante. AUC et KS hors-échantillon obligatoires ` +
        `avant promotion (OOT_VALIDATION_PACK §2). Soumettre le rapport de validation au MRM.`
      );
    }

    // Gate 4 — performance minimale : Gini ≥ 45% (= AUC ≥ 0.725)
    if (candidate.oot_auc < 0.725) {
      throw new BadRequestException(
        `Promotion refusée : AUC OOT ${candidate.oot_auc.toFixed(4)} < 0.725 (Gini < 45%). ` +
        `Floor réglementaire non atteint (OOT_VALIDATION_PACK §2).`
      );
    }

    // Demote current champion(s) to ARCHIVED/DISABLED
    await this.prisma.modelVersion.updateMany({
      where: { modelId: candidate.modelId, lifecycleStatus: 'CHAMPION' },
      data: { lifecycleStatus: 'ARCHIVED', deploymentStatus: 'DISABLED' },
    });

    // Promote candidate
    const promoted = await this.prisma.modelVersion.update({
      where: { id: versionId },
      data: { lifecycleStatus: 'CHAMPION' as LifecycleStatus, deploymentStatus: 'PRODUCTION' as DeploymentStatus },
    });

    // ── Evidence pack — généré automatiquement à chaque promotion ────────────
    const promotionTs = new Date().toISOString();
    const evidencePack = {
      pack_type:        'MODEL_PROMOTION_EVIDENCE',
      pack_version:     '1.0',
      generated_at:     promotionTs,
      generated_by:     actorId ?? 'system',

      model_identity: {
        registry_name:      candidate.registry.name,
        version_tag:        candidate.versionTag,
        artifact_category:  candidate.artifactCategory,
        version_id:         versionId,
      },

      promotion_gates: {
        gate_1_challenger_state:  { passed: true, value: candidate.lifecycleStatus },
        gate_2_prod_champion_cat: { passed: true, value: candidate.artifactCategory },
        gate_3_oot_evidence:      { passed: true, oot_auc: candidate.oot_auc, oot_ks: candidate.oot_ks },
        gate_4_gini_floor:        { passed: true, oot_auc: candidate.oot_auc, floor: 0.725 },
      },

      performance_metrics: {
        val_auc:    candidate.auc,
        val_ks:     candidate.ks,
        oot_auc:    candidate.oot_auc,
        oot_ks:     candidate.oot_ks,
        oot_psi:    candidate.psi,
        oot_period: {
          start: (candidate as any).oot_period_start ?? null,
          end:   (candidate as any).oot_period_end   ?? null,
        },
        gini_oot: candidate.oot_auc ? parseFloat((2 * candidate.oot_auc - 1).toFixed(4)) : null,
      },

      governance: {
        mrm_sign_off_required: true,
        mrm_sign_off_received: false,
        comment: 'MRM sign-off required before live traffic. See MODEL_GOVERNANCE_SPEC §3.',
        regulatory_standard:  'OOT_VALIDATION_PACK §2 + Basel III CRE36 + IFRS 9 §B5.5.17',
      },

      shadow_scoring_summary: {
        note: 'Retrieve from ShadowScoreLog table for this versionTag before promoting.',
        query: `SELECT AVG(pdDeltaAbsPercent), COUNT(*), SUM(CASE WHEN recommendationMatch THEN 1 END) FROM ShadowScoreLog WHERE shadowVersion = '${candidate.versionTag}'`,
      },
    };

    await this.audit.log({
      eventType: 'MODEL_PROMOTED_TO_CHAMPION',
      entityType: 'ModelVersion',
      entityId: versionId,
      actorId,
      previousValue: { lifecycle: candidate.lifecycleStatus },
      newValue: {
        lifecycle:     'CHAMPION',
        deployment:    'PRODUCTION',
        evidence_pack: evidencePack,
      },
    });

    await this.prisma.alert.create({
      data: {
        severity: 'INFO',
        message: `Model ${candidate.registry.name} (${candidate.versionTag}) promoted to Champion`,
        detail: `Evidence pack generated. MRM sign-off pending. Promoted by: ${actorId ?? 'system'}`,
      },
    });

    this.logger.log(`[Registry] ${candidate.versionTag} promoted to champion. Evidence pack stored in AuditEvent.`);
    return {
      promoted:      { id: promoted.id, versionTag: promoted.versionTag, status: promoted.status },
      evidence_pack: evidencePack,
    };
  }

  /**
   * Marks a model version as a Shadow/Challenger for parallel evaluation.
   */
  async markAsChallenger(versionId: string, actorId?: string) {
    const version = await this.prisma.modelVersion.findUnique({ where: { id: versionId } });
    if (!version) throw new NotFoundException(`Model version ${versionId} not found.`);
    if (version.lifecycleStatus === 'ARCHIVED') {
      throw new BadRequestException('Cannot mark an archived model version as challenger.');
    }

    const updated = await this.prisma.modelVersion.update({
      where: { id: versionId },
      data: { lifecycleStatus: 'CHALLENGER' as LifecycleStatus, deploymentStatus: 'SHADOW' as DeploymentStatus },
    });

    await this.audit.log({
      eventType: 'MODEL_MARKED_CHALLENGER',
      entityType: 'ModelVersion',
      entityId: versionId,
      actorId,
      previousValue: { lifecycle: version.lifecycleStatus },
      newValue: { lifecycle: 'CHALLENGER', deployment: 'SHADOW' },
    });

    return { updated: { id: updated.id, versionTag: updated.versionTag, status: updated.lifecycleStatus } };
  }

  /**
   * Archives a model version permanently.
   * Archived models cannot be promoted or used for scoring.
   */
  async archiveModel(versionId: string, actorId?: string) {
    const version = await this.prisma.modelVersion.findUnique({ where: { id: versionId } });
    if (!version) throw new NotFoundException(`Model version ${versionId} not found.`);
    if (version.lifecycleStatus === 'CHAMPION') {
      throw new BadRequestException('Cannot archive the active champion model. Promote a challenger first.');
    }

    const updated = await this.prisma.modelVersion.update({
      where: { id: versionId },
      data: { lifecycleStatus: 'ARCHIVED' as LifecycleStatus, deploymentStatus: 'DISABLED' as DeploymentStatus },
    });

    await this.audit.log({
      eventType: 'MODEL_ARCHIVED',
      entityType: 'ModelVersion',
      entityId: versionId,
      actorId,
      previousValue: { lifecycle: version.lifecycleStatus },
      newValue: { lifecycle: 'ARCHIVED', deployment: 'DISABLED' },
    });

    this.logger.log(`[Registry] ${version.versionTag} archived.`);
    return { archived: { id: updated.id, versionTag: updated.versionTag, status: updated.lifecycleStatus } };
  }

  /**
   * Flags a model as requiring governance review.
   * Called automatically by monitoring when drift thresholds are breached.
   */
  async requestReview(versionId: string, reason: string, actorId?: string) {
    const version = await this.prisma.modelVersion.findUnique({ where: { id: versionId } });
    if (!version) throw new NotFoundException(`Model version ${versionId} not found.`);

    await this.prisma.modelVersion.update({
      where: { id: versionId },
      data: { status: 'DEGRADED' as ModelStatus },
    });

    await this.audit.log({
      eventType: 'MODEL_REVIEW_REQUESTED',
      entityType: 'ModelVersion',
      entityId: versionId,
      actorId,
      previousValue: { status: version.status },
      newValue: { status: 'DEGRADED', reviewReason: reason },
    });

    await this.prisma.alert.create({
      data: {
        severity: 'WARNING',
        message: `Model Review Requested: ${version.versionTag}`,
        detail: reason,
      },
    });

    this.logger.warn(`[Registry] Review requested for ${version.versionTag}: ${reason}`);
    return { versionId, status: 'DEGRADED', reviewReason: reason };
  }

  /**
   * Orchestration hook: triggers a retraining job request.
   * Does not retrain locally â€” emits an audit event for external Airflow/MLflow pickup.
   * Future: POST to Airflow REST API from here.
   */
  async requestRetraining(versionId: string, reason: string, actorId?: string) {
    const version = await this.prisma.modelVersion.findUnique({
      where: { id: versionId },
      include: { registry: true },
    });
    if (!version) throw new NotFoundException(`Model version ${versionId} not found.`);

    await this.audit.log({
      eventType: 'RETRAINING_REQUESTED',
      entityType: 'ModelVersion',
      entityId: versionId,
      actorId,
      newValue: {
        reason,
        triggeredAt: new Date().toISOString(),
        currentAUC: version.auc,
        currentPSI: version.psi,
        // Future: Airflow DAG ID would be returned here
        orchestrationHook: 'PENDING_AIRFLOW_INTEGRATION',
      },
    });

    await this.prisma.alert.create({
      data: {
        severity: 'INFO',
        message: `Retraining Requested: ${version.registry.name} (${version.versionTag})`,
        detail: reason,
      },
    });

    this.logger.log(`[Registry] Retraining hook triggered for ${version.versionTag}.`);
    return {
      message: 'Retraining request logged. External orchestrator (Airflow/MLflow) will pick up.',
      versionId,
      triggeredAt: new Date().toISOString(),
      reason,
    };
  }
}
