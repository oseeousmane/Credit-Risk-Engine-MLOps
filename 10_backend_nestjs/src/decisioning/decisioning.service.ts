import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ScoringService } from '../scoring/scoring.service';
import { PipelineService } from '../pipeline/pipeline.service';
import { RiskMathService } from '../risk-math/risk-math.service';
import { MonitoringService } from '../monitoring/monitoring.service';
import { EventsBroadcasterService } from '../monitoring/events-broadcaster.service';
import { WebhookDispatcherService } from '../webhook/webhook-dispatcher.service';
import { DecisionStatus, Role } from '@prisma/client';
import { PaginationDto } from '../common/dto/query.dto';
import { paginate } from '../common/pagination';

@Injectable()
export class DecisioningService {
  private readonly logger = new Logger(DecisioningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly scoring: ScoringService,
    private readonly pipelineService: PipelineService,
    private readonly riskMath: RiskMathService,
    private readonly monitoring: MonitoringService,
    private readonly broadcaster: EventsBroadcasterService,
    private readonly webhookDispatcher: WebhookDispatcherService,
  ) {}

  /**
   * EVALUATE â€” Stateless scoring. Calls the Python ML service (or fallback).
   * Does NOT persist anything. Used for preview before committee decision.
   */
  async evaluateApplication(applicationId: string) {
    const app = await this.prisma.application.findUniqueOrThrow({
      where: { id: applicationId },
      include: { counterparty: true, documents: true },
    });
    const cp = app.counterparty as any;
    const appAny = app as any;

    // Build rich business payload â€” Python feature_pipeline.py handles the current 157-feature mapping
    const scoreResult = await this.scoring.score({
      applicationId,
      pdCurrent: app.pd ?? 2.0,
      exposure: cp.exposure ?? app.requestedAmount,
      riskLevel: cp.riskLevel,
      // Counterparty context
      internalRating: cp.internalRating,
      sector: cp.sector,
      yearsInBusiness: cp.yearsInBusiness ?? undefined,
      watchlistFlag: cp.watchlistFlag ?? false,
      // Counterparty financials (Enriched)
      revenue: cp.revenue ?? undefined,
      ebitda: cp.ebitda ?? undefined,
      netProfit: cp.netProfit ?? undefined,
      totalAssets: cp.totalAssets ?? undefined,
      totalDebt: cp.totalDebt ?? undefined,
      operatingCashFlow: cp.operatingCashFlow ?? undefined,
      currentRatio: cp.currentRatio ?? undefined,
      leverageRatio: cp.leverageRatio ?? undefined,
      inventoryTurnover: cp.inventoryTurnover ?? undefined,
      // Behavioral
      daysPastDue: cp.daysPastDue ?? 0,
      missedPayments24m: cp.missedPayments24m ?? 0,
      creditHistoryYears: cp.creditHistoryYears ?? undefined,
      bureauScore: cp.bureauScore ?? undefined,
      // Facility details from Application
      requestedAmount: app.requestedAmount,
      collateralValue: appAny.collateralValue ?? undefined,
      collateralType: appAny.collateralType ?? undefined,
      tenorMonths: appAny.tenorMonths ?? undefined,
      facilityType: appAny.facilityType ?? undefined,
      repaymentSource: appAny.repaymentSource ?? undefined,
      amortizationType: appAny.amortizationType ?? undefined,
      gracePeriodMonths: appAny.gracePeriodMonths ?? 0,
    });

    this.logger.log(
      `[Evaluate] app=${app.reqId} â†’ ${scoreResult.recommendation} ` +
      `PD=${scoreResult.pdScore.toFixed(2)}% Quality=${scoreResult.qualityBand} Imputed=${scoreResult.imputedFeaturesCount}`
    );

    return {
      recommendation: scoreResult.recommendation,
      confidence: scoreResult.confidence,
      pdScore: scoreResult.pdScore,
      xaiDrivers: scoreResult.xaiDrivers,
      rationale: scoreResult.rationale,
      modelVersion: scoreResult.modelVersion,
      scoredBy: scoreResult.scoredBy,
      engine: scoreResult.engine,
      imputedFeaturesCount: scoreResult.imputedFeaturesCount,
      payloadQualityScore: scoreResult.payloadQualityScore,
      qualityBand: scoreResult.qualityBand,
      featureLineage: scoreResult.featureLineage,
      inferenceTimestamp: scoreResult.inferenceTimestamp,
    };
  }

  /**
   * SUBMIT â€” Stateful decision. Records the business decision with full audit trail.
   * Requires a human actor. Advances the pipeline stage.
   */
  async submitDecision(
    applicationId: string,
    actor: { id: string; role: string },
    overrideStatus?: DecisionStatus,
    overrideReason?: string,
  ) {
    // RBAC: Analysts cannot approve or override
    if (overrideStatus && actor.role === Role.ANALYST) {
      throw new ForbiddenException(
        'Analysts cannot approve or override decisions. Please escalate to a Risk Manager or CRO.',
      );
    }

    // Run ML evaluation — measure real latency for monitoring
    const evalStart = Date.now();
    const evaluation = await this.evaluateApplication(applicationId);
    const evalLatencyMs = Date.now() - evalStart;
    const recommendation = evaluation.recommendation;
    const finalStatus = overrideStatus ?? recommendation;
    const isOverride = !!overrideStatus && overrideStatus !== recommendation;

    if (isOverride && !overrideReason) {
      throw new ForbiddenException('Override reason (justification) is required when overriding the ML recommendation.');
    }

    const app = await this.prisma.application.findUniqueOrThrow({
      where: { id: applicationId },
      include: { counterparty: true },
    });

    // --- Risk Math Layer (Hardened Quant Layer) ---
    const appAny2 = app as any;
    const undrawnLimit = appAny2.metadata?.undrawnLimit ?? 0; // Extraction from metadata if exists

    const eclResult = this.riskMath.calculateECL(
      evaluation.pdScore,
      app.requestedAmount,      // Drawn Amount
      app.counterparty.riskLevel,
      !!appAny2.collateralValue,
      appAny2.collateralType,
      appAny2.collateralValue,
      undrawnLimit,             // Undrawn Limit (Basel CCF logic)
      appAny2.facilityType,
    );

    // pdAtOrigination is set once on first scoring and never overwritten —
    // it anchors the SICR denominator (IFRS 9 §B5.5.15).
    const appAny3 = app as any;
    const pdAtOrigination: number = appAny3.pdAtOrigination ?? evaluation.pdScore;

    const stagingResult = this.riskMath.assignStage(
      evaluation.pdScore,
      pdAtOrigination,
      appAny2.metadata?.daysPastDue ?? 0, // SICR Backstop check
      app.counterparty.watchlistFlag,
    );

    // Persist full scoring snapshot cleanly
    const scoringSnapshot = {
      // ML Output
      pd: evaluation.pdScore,
      modelVersion: evaluation.modelVersion,
      inferenceTimestamp: evaluation.inferenceTimestamp,
      engine: evaluation.engine,
      // SHAP
      xaiDrivers: evaluation.xaiDrivers,
      // Risk Math
      ecl: eclResult.expectedLoss,
      lgd: eclResult.lgd,
      ead: eclResult.ead,
      ifrs9Stage: stagingResult.currentStage,
      stagingReason: stagingResult.reason,
      // Data Quality (Governed signal â€” not cosmetic)
      imputedFeaturesCount: evaluation.imputedFeaturesCount,
      payloadQualityScore: evaluation.payloadQualityScore,
      qualityBand: evaluation.qualityBand,
      featureLineage: evaluation.featureLineage,
    };

    const decision = await this.prisma.decision.upsert({
      where: { applicationId },
      create: {
        applicationId,
        counterpartyId: app.counterpartyId,
        status: finalStatus,
        decisionType: isOverride ? 'MANUAL_COMMITTEE' : (evaluation.scoredBy === 'RULE_ENGINE' ? 'RULE_ENGINE' : 'ML_AUTO'),
        overrideFlag: isOverride,
        overrideReason: overrideReason ?? null,
        justification: `[${evaluation.scoredBy}] ${evaluation.rationale} (ECL: $${eclResult.expectedLoss.toFixed(2)}M, Stage: ${stagingResult.currentStage})`,
        scoringSnapshot: scoringSnapshot as any,
        decidedById: actor.id,
        decidedAt: new Date(),
      },
      update: {
        status: finalStatus,
        decisionType: isOverride ? 'MANUAL_COMMITTEE' : (evaluation.scoredBy === 'RULE_ENGINE' ? 'RULE_ENGINE' : 'ML_AUTO'),
        overrideFlag: isOverride,
        overrideReason: overrideReason ?? null,
        justification: `[${evaluation.scoredBy}] ${evaluation.rationale} (ECL: $${eclResult.expectedLoss.toFixed(2)}M, Stage: ${stagingResult.currentStage})`,
        scoringSnapshot: scoringSnapshot as any,
        decidedById: actor.id,
        decidedAt: new Date(),
      },
    });

    // Ingest scoring event to historical monitoring with measured latency
    await this.monitoring.ingestScoringEvent({
      engine: evaluation.engine as 'PYTHON' | 'FALLBACK',
      payloadQualityScore: evaluation.payloadQualityScore,
      imputedFeaturesCount: evaluation.imputedFeaturesCount,
      qualityBand: evaluation.qualityBand,
      latencyMs: evalLatencyMs,
    });

    // Push real-time SSE event to all connected dashboard clients
    this.broadcaster.emit('decision.submitted', {
      decisionId: decision.id,
      applicationId,
      reqId: app.reqId,
      status: finalStatus,
      pdScore: evaluation.pdScore,
      isOverride,
      engine: evaluation.engine,
      qualityBand: evaluation.qualityBand,
      ifrs9Stage: stagingResult.currentStage,
      ecl: eclResult.expectedLoss,
    });

    // Also update Counterparty and Application with the new mathematical outputs
    await this.prisma.counterparty.update({
      where: { id: app.counterpartyId },
      data: {
        ifrs9Stage: stagingResult.currentStage,
        expectedLoss: eclResult.expectedLoss,
        pd1y: evaluation.pdScore,
      }
    });

    await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        pd: evaluation.pdScore,
        // Set once at first scoring — never overwritten (IFRS 9 SICR anchor)
        ...(appAny3.pdAtOrigination == null ? { pdAtOrigination: evaluation.pdScore } : {}),
      },
    });

    // Write immutable audit trail
    await this.audit.log({
      eventType: isOverride ? 'DECISION_OVERRIDE' : 'DECISION_SUBMITTED',
      entityType: 'Decision',
      entityId: decision.id,
      actorId: actor.id,
      previousValue: { status: 'PENDING', recommendation },
      newValue: {
        status: finalStatus,
        override: isOverride,
        overrideReason: overrideReason ?? null,
        scoredBy: evaluation.scoredBy,
        modelVersion: evaluation.modelVersion,
        confidence: evaluation.confidence,
      },
    });

    // Explicit Fallback Alert and Audit
    if (evaluation.engine === 'FALLBACK') {
      this.logger.error(`[AUDIT] Explicit fallback engine used for decision ${decision.id}. Generating alert.`);

      await this.audit.log({
        eventType: 'FALLBACK_ENGINE_USED',
        entityType: 'Decision',
        entityId: decision.id,
        actorId: actor.id,
        newValue: { engine: 'FALLBACK', modelVersion: evaluation.modelVersion },
      });

      await this.prisma.alert.create({
        data: {
          severity: 'WARNING',
          message: `Decision finalized using FALLBACK Rule Engine.`,
          detail: `Application ${app.reqId} was scored without the real ML artifact. Please investigate ML Service availability.`
        }
      });
    }

    // Advance pipeline stage automatically
    let targetStage: any = null;
    if (finalStatus === 'APPROVE') {
      targetStage = 'APPROVED';
    } else if (finalStatus === 'APPROVE_WITH_CONDITIONS') {
      targetStage = 'APPROVED_WITH_CONDITIONS';
    } else if (finalStatus === 'SEND_TO_REVIEW') {
      targetStage = 'COMMITTEE_REVIEW';
    } else if (finalStatus === 'REJECT') {
      targetStage = 'REJECTED';
    }

    if (targetStage) {
      await this.pipelineService.moveStage(applicationId, targetStage, actor as any);
    }

    // Fire outbound webhooks (non-blocking — does not delay the API response)
    const webhookEventMap: Partial<Record<string, 'decision.approved' | 'decision.approved_with_conditions' | 'decision.rejected'>> = {
      APPROVE: 'decision.approved',
      APPROVE_WITH_CONDITIONS: 'decision.approved_with_conditions',
      REJECT: 'decision.rejected',
    };
    const webhookEvent = webhookEventMap[finalStatus as string];
    if (webhookEvent) {
      this.webhookDispatcher.dispatch(webhookEvent, {
        decisionId: decision.id,
        applicationId,
        reqId: app.reqId,
        counterpartyId: app.counterpartyId,
        status: finalStatus,
        isOverride,
        pdScore: evaluation.pdScore,
        ifrs9Stage: stagingResult.currentStage,
        ecl: eclResult.expectedLoss,
        decidedAt: new Date().toISOString(),
      });
    }

    return {
      decision,
      evaluation,
      isOverride,
    };
  }

  /**
   * GET /decisions/queue
   * Pending decisions enriched with ageInDays and priority flag for the CRO dashboard.
   */
  async getQueue(limit = 50) {
    const decisions = await this.prisma.decision.findMany({
      where: { status: { in: ['PENDING', 'SEND_TO_REVIEW'] } },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        application: { select: { reqId: true, requestedAmount: true, pd: true, facilityType: true } },
        counterparty: { select: { name: true, sector: true, internalRating: true, riskLevel: true } },
        decidedBy: { select: { name: true } },
      },
    });

    const now = Date.now();
    return decisions.map(d => {
      const ageInDays = Math.floor((now - d.createdAt.getTime()) / 86_400_000);
      const snapshot = d.scoringSnapshot as any;
      return {
        id: d.id,
        reqId: d.application?.reqId,
        counterpartyName: d.counterparty?.name,
        sector: d.counterparty?.sector,
        internalRating: d.counterparty?.internalRating,
        riskLevel: d.counterparty?.riskLevel,
        requestedAmount: d.application?.requestedAmount,
        pd: d.application?.pd ?? snapshot?.pd,
        facilityType: (d.application as any)?.facilityType,
        status: d.status,
        ageInDays,
        priority: ageInDays >= 7 ? 'URGENT' : ageInDays >= 3 ? 'HIGH' : 'NORMAL',
        slaBreached: ageInDays >= 10,
        analyst: d.decidedBy?.name ?? null,
        ifrs9Stage: snapshot?.ifrs9Stage,
        ecl: snapshot?.ecl,
        createdAt: d.createdAt,
      };
    });
  }

  async findAll(query: PaginationDto = {}) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.decision.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          counterparty: { select: { name: true, sector: true, internalRating: true } },
          decidedBy: { select: { name: true, role: true } },
          application: { select: { reqId: true, requestedAmount: true, pd: true } },
        },
      }),
      this.prisma.decision.count(),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    return this.prisma.decision.findUniqueOrThrow({
      where: { id },
      include: {
        application: { include: { counterparty: true } },
        decidedBy: { select: { name: true, role: true } },
      },
    });
  }
}
