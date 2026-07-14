import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrchestrationService } from './orchestration.service';
import { PrismaService } from '../prisma/prisma.service';
import { IFRS9Stage } from '@prisma/client';

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Business payload sent to Python. Domain-driven, not Kaggle-driven.
 * Python's feature_pipeline.py handles the transformation to the current 157-column model vector.
 */
export interface ScoreRequest {
  applicationId: string;
  pdCurrent: number;
  exposure: number;
  riskLevel: string;
  requestId?: string;       // corrélation NestJS ↔ FastAPI (X-Request-ID)
  // Counterparty context
  counterpartyId?: string;
  internalRating?: string;
  sector?: string;
  yearsInBusiness?: number;
  watchlistFlag?: boolean;
  // Financials (Enhanced for Data Realism)
  revenue?: number;
  ebitda?: number;
  netProfit?: number;
  totalAssets?: number;
  totalDebt?: number;
  operatingCashFlow?: number;
  currentRatio?: number;
  leverageRatio?: number;
  inventoryTurnover?: number;
  // Behavioral & History
  daysPastDue?: number;
  missedPayments24m?: number;
  creditHistoryYears?: number;
  bureauScore?: number;
  // Facility details from Application
  requestedAmount?: number;
  collateralValue?: number;
  collateralType?: string;
  tenorMonths?: number;
  facilityType?: string;
  repaymentSource?: string;
  amortizationType?: string;
  gracePeriodMonths?: number;
}

export interface XAIDriver {
  label: string;
  impact: number;
  direction: 'positive' | 'negative';
  category: string; // RAW | DERIVED | IMPUTED | FALLBACK
}

export interface FeatureLineage {
  rawCount: number;
  derivedCount: number;
  imputedCount: number;
  payloadQualityScore: number;
  qualityBand: 'HIGH' | 'MEDIUM' | 'LOW';
  imputedFeatures: string[];
}

export interface Ifrs9StagingSnapshot {
  stage:              number;           // 1, 2 ou 3
  staging_id?:        string;           // UUID généré par ifrs9_staging.py
  ecl_horizon:        string;           // '12_MONTH' | 'LIFETIME'
  ecl_provision:      number;           // provision en unités EAD
  lgd_estimate:       number;           // LGD calculée (Two-Part Beta ou statique)
  lgd_method:         string;           // méthode utilisée
  lgd_p05?:           number | null;    // percentile 5% Monte-Carlo
  lgd_p95?:           number | null;    // percentile 95% Monte-Carlo
  lgd_sector_applied?: string | null;
  ead_estimate:       number;
  eir_used:           number;
  rwa_estimate?:      number | null;
  rwa_method?:        string | null;
  sicr_triggered:     boolean;
  staging_reasons:    string[];
  pd_origination_used: number;
}

export interface ScoreResult {
  recommendation: 'APPROVE' | 'APPROVE_WITH_CONDITIONS' | 'SEND_TO_REVIEW' | 'REJECT';
  confidence: number;
  pdScore: number;
  rationale: string;
  xaiDrivers: XAIDriver[];
  modelVersion: string;
  scoredBy: 'ML_AUTO' | 'RULE_ENGINE';
  imputedFeaturesCount: number;
  payloadQualityScore: number;
  qualityBand: string;
  featureLineage: FeatureLineage;
  inferenceTimestamp: string;
  // IFRS 9 staging snapshot
  ifrs9?: Ifrs9StagingSnapshot | null;
  // Reason codes réglementaires COBAC
  reasonCodes?: Record<string, unknown>[] | null;
  // Notice adverse action COBAC
  adverseActionNotice?: Record<string, unknown> | null;
  // Shadow model comparison
  shadowPdScore?: number | null;
  shadowModelVersion?: string | null;
  shadowPdDelta?: number | null;
}

// Thresholds aligned with DEMO_VS_PROD_BENCHMARK §5 and main.py apply_decision_policy().
// Any change here MUST be mirrored in 03_risk_engine/main.py.
// NOTE: AUTO_APPROVE_MAX_PD is intentionally set to 0.0 (disabled).
// The fallback rule engine must NOT auto-approve — only route to human review.
// Réactivation : positionner ZERO_TOUCH_ENABLED=true ET avoir un artefact PROD_CHAMPION validé.
const POLICY = {
  AUTO_APPROVE_MAX_PD: 0.0,   // DÉSACTIVÉ — était 0.8. Aucune auto-approbation sur DEMO_BASELINE.
  AUTO_REJECT_MIN_PD: 6.0,
  AUTO_APPROVE_MAX_EXPOSURE: 50,
  REVIEW_MIN_EXPOSURE: 100,
  LOW_QUALITY_IMPUTED_THRESHOLD: 120,
};

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);
  private readonly scoringUrl: string;
  private readonly scoringApiKey: string;
  private readonly timeoutMs = 8000;
  
  // ── Circuit Breaker State ──
  private cbState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private cbFailureCount = 0;
  private cbNextAttempt = 0;
  private readonly CB_FAILURE_THRESHOLD = 3;
  private readonly CB_COOLDOWN_MS = 15000; // 15 seconds cooldown

  constructor(
    private readonly orchestrator: OrchestrationService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.scoringUrl = this.config.get<string>('integrations.scoringServiceUrl') ?? 'http://localhost:8000';
    this.scoringApiKey = this.config.get<string>('integrations.scoringApiKey') ?? '';
    if (!this.scoringApiKey) {
      this.logger.warn('[SECURITY] SCORING_API_KEY not configured — Python scoring endpoint is unauthenticated.');
    }
  }

  async score(req: ScoreRequest): Promise<ScoreResult & { engine: 'PYTHON' | 'FALLBACK'; activeVersion: string }> {
    const activeVersion = await this.orchestrator.getActiveModelVersion('XGBOOST');
    this.logger.log(`[Scoring] Application ${req.applicationId} via version ${activeVersion}`);

    // Circuit Breaker Check
    if (this.cbState === 'OPEN') {
      if (Date.now() > this.cbNextAttempt) {
        this.logger.warn(`[CircuitBreaker] HALF-OPEN: Retrying Python service for app=${req.applicationId}...`);
        this.cbState = 'HALF_OPEN';
      } else {
        this.logger.warn(`[CircuitBreaker] OPEN: Traffic to Python blocked. Fast-failing to Rule Engine.`);
        return { ...this.localRuleEngine(req), engine: 'FALLBACK', activeVersion: 'rule_engine_v1' };
      }
    }

    try {
      const result = await this.callPythonService(req);

      // On success, reset the circuit breaker
      if (this.cbState === 'HALF_OPEN') {
        this.logger.log(`[CircuitBreaker] CLOSED: Python service recovered.`);
        this.cbState = 'CLOSED';
      }
      this.cbFailureCount = 0;

      if (result.imputedFeaturesCount >= POLICY.LOW_QUALITY_IMPUTED_THRESHOLD) {
        this.logger.warn(
          `[DataQuality] HIGH IMPUTATION BURDEN: ${result.imputedFeaturesCount} features imputed for app=${req.applicationId}. ` +
          `Quality=${result.qualityBand} (${result.payloadQualityScore}%). Raw PD preserved.`
        );
      }

      this.logger.log(
        `[Scoring] Success: app=${req.applicationId} → ${result.recommendation} ` +
        `PD=${result.pdScore.toFixed(2)}% Quality=${result.qualityBand} Imputed=${result.imputedFeaturesCount}`
      );

      // Persist IFRS9 staging audit — fire-and-forget
      if (result.ifrs9) {
        this.persistIfrs9Audit(req, result, activeVersion).catch((e: Error) =>
          this.logger.error(`[IFRS9Audit] Persistence failed for app=${req.applicationId}: ${e.message}`)
        );
      }

      // Persist shadow comparison — fire-and-forget
      if (result.shadowPdScore !== null && result.shadowPdScore !== undefined && result.shadowModelVersion) {
        this.persistShadowLog(req, result, activeVersion).catch((e: Error) =>
          this.logger.error(`[ShadowLog] Persistence failed for app=${req.applicationId}: ${e.message}`)
        );
      }

      return { ...result, engine: "PYTHON" as const, activeVersion };
    } catch (err) {
      this.handlePythonFailure(err);
      return { ...this.localRuleEngine(req), engine: 'FALLBACK', activeVersion: 'rule_engine_v1' };
    }
  }

  private async persistIfrs9Audit(
    req: ScoreRequest,
    result: ScoreResult,
    modelVersion: string,
  ): Promise<void> {
    const s = result.ifrs9!;
    const stageMap: Record<number, IFRS9Stage> = {
      1: IFRS9Stage.STAGE_1,
      2: IFRS9Stage.STAGE_2,
      3: IFRS9Stage.STAGE_3,
    };

    await this.prisma.ifrs9StagingAudit.create({
      data: {
        stagingId:      s.staging_id ?? crypto.randomUUID(),
        applicationId:  req.applicationId ?? null,
        counterpartyId: req.counterpartyId ?? null,
        stage:          stageMap[s.stage] ?? IFRS9Stage.STAGE_1,
        sicrTriggered:  s.sicr_triggered ?? false,
        stagingReasons: s.staging_reasons ?? [],
        pdCurrent:      result.pdScore / 100,
        pdOrigination:  s.pd_origination_used ?? result.pdScore / 100,
        lgdEstimate:    s.lgd_estimate ?? 0.45,
        lgdMethod:      s.lgd_method ?? 'static',
        eadEstimate:    s.ead_estimate ?? req.exposure ?? 0,
        eirUsed:        s.eir_used ?? 0.08,
        eclProvision:   s.ecl_provision ?? 0,
        eclHorizon:     s.ecl_horizon ?? '12_MONTH',
        rwaEstimate:    s.rwa_estimate ?? null,
        modelVersion,
        scoredBy:       'PYTHON_MODEL',
      },
    });
  }

  private async persistShadowLog(
    req: ScoreRequest,
    result: ScoreResult,
    championVersion: string,
  ): Promise<void> {
    const shadowPd   = result.shadowPdScore!;
    const championPd = result.pdScore;
    const delta      = shadowPd - championPd;

    const championRec = result.recommendation;
    const shadowRec   = this.applyShadowDecisionPolicy(shadowPd, req.exposure, req.riskLevel);

    await this.prisma.shadowScoreLog.create({
      data: {
        applicationId:          req.applicationId ?? null,
        requestId:              req.requestId ?? null,
        championVersion,
        championPdScore:        championPd,
        championRecommendation: championRec,
        shadowVersion:          result.shadowModelVersion!,
        shadowPdScore:          shadowPd,
        shadowPdDelta:          delta,
        recommendationMatch:    championRec === shadowRec,
        pdDeltaAbsPercent:      Math.abs(delta),
      },
    });
  }

  private applyShadowDecisionPolicy(pd: number, exposure: number, riskLevel: string): string {
    if (pd > POLICY.AUTO_REJECT_MIN_PD) return 'REJECT';
    if (exposure > POLICY.REVIEW_MIN_EXPOSURE || riskLevel.toUpperCase() === 'HIGH') return 'SEND_TO_REVIEW';
    if (pd > POLICY.AUTO_APPROVE_MAX_PD) return 'APPROVE_WITH_CONDITIONS';
    return 'APPROVE';
  }

  private handlePythonFailure(err: unknown) {
    this.logger.error(`[Scoring] Python service failure: ${(err as Error).message}`);
    this.cbFailureCount += 1;
    if (this.cbFailureCount >= this.CB_FAILURE_THRESHOLD && this.cbState !== 'OPEN') {
      this.logger.error(`[CircuitBreaker] TRIPPED! Opening circuit for ${this.CB_COOLDOWN_MS}ms.`);
      this.cbState = 'OPEN';
      this.cbNextAttempt = Date.now() + this.CB_COOLDOWN_MS;
    }
  }

  private async callPythonService(req: ScoreRequest): Promise<ScoreResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    const body = JSON.stringify({
      application_id: req.applicationId,
      requested_amount: req.requestedAmount ?? req.exposure,
      exposure: req.exposure,
      pd_current: req.pdCurrent,
      risk_level: req.riskLevel,
      internal_rating: req.internalRating ?? null,
      sector: req.sector ?? null,
      years_in_business: req.yearsInBusiness ?? null,
      watchlist_flag: req.watchlistFlag ?? false,
      // Financials (Enriched)
      revenue: req.revenue ?? null,
      ebitda: req.ebitda ?? null,
      net_profit: req.netProfit ?? null,
      total_assets: req.totalAssets ?? null,
      total_debt: req.totalDebt ?? null,
      operating_cash_flow: req.operatingCashFlow ?? null,
      current_ratio: req.currentRatio ?? null,
      leverage_ratio: req.leverageRatio ?? null,
      inventory_turnover: req.inventoryTurnover ?? null,
      // Behavioral
      days_past_due: req.daysPastDue ?? 0,
      missed_payments_24m: req.missedPayments24m ?? 0,
      credit_history_years: req.creditHistoryYears ?? null,
      bureau_score: req.bureauScore ?? null,
      // Facility details
      collateral_value: req.collateralValue ?? null,
      collateral_type: req.collateralType ?? null,
      tenor_months: req.tenorMonths ?? null,
      facility_type: req.facilityType ?? null,
      repayment_source: req.repaymentSource ?? null,
      amortization_type: req.amortizationType ?? null,
      grace_period_months: req.gracePeriodMonths ?? 0,
    });

    const correlationId = req.requestId ?? crypto.randomUUID();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-ID': correlationId,
    };
    if (this.scoringApiKey) {
      headers['X-Api-Key'] = this.scoringApiKey;
    }

    let response: Response;
    try {
      response = await fetch(`${this.scoringUrl}/score`, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) throw new Error(`Python scoring service returned HTTP ${response.status}`);

    const data = await response.json();

    const lineage = data.feature_lineage ?? {};
    return {
      recommendation: data.recommendation,
      confidence: data.confidence,
      pdScore: data.pd_score,
      rationale: data.rationale,
      xaiDrivers: (data.xai_drivers ?? []).map((d: any) => ({
        label: d.label,
        impact: d.impact,
        direction: d.direction,
        category: d.category,
      })),
      modelVersion: data.model_version,
      scoredBy: data.scored_by,
      imputedFeaturesCount: data.imputed_features_count ?? 0,
      payloadQualityScore: data.payload_quality_score ?? 0,
      qualityBand: data.quality_band ?? 'LOW',
      featureLineage: {
        rawCount: lineage.raw_count ?? 0,
        derivedCount: lineage.derived_count ?? 0,
        imputedCount: lineage.imputed_count ?? 0,
        payloadQualityScore: lineage.payload_quality_score ?? 0,
        qualityBand: lineage.quality_band ?? 'LOW',
        imputedFeatures: lineage.imputed_features ?? [],
      },
      inferenceTimestamp: data.inference_timestamp ?? new Date().toISOString(),
      // IFRS 9 staging snapshot — mappé depuis FastAPI, null si non disponible
      ifrs9: data.ifrs9 ? {
        stage:               data.ifrs9.stage,
        ecl_horizon:         data.ifrs9.ecl_horizon,
        ecl_provision:       data.ifrs9.ecl_provision,
        lgd_estimate:        data.ifrs9.lgd_estimate,
        lgd_method:          data.ifrs9.lgd_method,
        lgd_p05:             data.ifrs9.lgd_p05 ?? null,
        lgd_p95:             data.ifrs9.lgd_p95 ?? null,
        lgd_sector_applied:  data.ifrs9.lgd_sector_applied ?? null,
        ead_estimate:        data.ifrs9.ead_estimate,
        eir_used:            data.ifrs9.eir_used,
        rwa_estimate:        data.ifrs9.rwa_estimate ?? null,
        rwa_method:          data.ifrs9.rwa_method ?? null,
        sicr_triggered:      data.ifrs9.sicr_triggered,
        staging_reasons:     data.ifrs9.staging_reasons ?? [],
        pd_origination_used: data.ifrs9.pd_origination_used,
        staging_id:          data.ifrs9.staging_id ?? undefined,
      } as Ifrs9StagingSnapshot : null,
      reasonCodes:         data.reason_codes ?? null,
      adverseActionNotice: data.adverse_action_notice ?? null,
      shadowPdScore:       data.shadow_pd_score ?? null,
      shadowModelVersion:  data.shadow_model_version ?? null,
      shadowPdDelta:       data.shadow_pd_delta ?? null,
    };
  }

  private localRuleEngine(req: ScoreRequest): ScoreResult {
    const pd = req.pdCurrent;
    const exposure = req.exposure;
    const risk = req.riskLevel.toUpperCase();
    let recommendation: ScoreResult['recommendation'];
    let rationale: string;

    if (pd < POLICY.AUTO_APPROVE_MAX_PD && exposure < POLICY.AUTO_APPROVE_MAX_EXPOSURE) {
      recommendation = 'APPROVE';
      rationale = `PD of ${pd}% is well below threshold. Exposure of $${exposure}M within auto-approval limit.`;
    } else if (pd > POLICY.AUTO_REJECT_MIN_PD) {
      recommendation = 'REJECT';
      rationale = `PD of ${pd}% exceeds maximum acceptable threshold of ${POLICY.AUTO_REJECT_MIN_PD}%.`;
    } else if (exposure > POLICY.REVIEW_MIN_EXPOSURE || risk === 'HIGH' || risk === 'CRITICAL') {
      recommendation = 'SEND_TO_REVIEW';
      rationale = `Exposure of $${exposure}M or elevated risk level requires committee review.`;
    } else {
      recommendation = 'APPROVE_WITH_CONDITIONS';
      rationale = 'Application meets minimum criteria. Conditional approval recommended.';
    }

    const emptyLineage: FeatureLineage = {
      rawCount: 0, derivedCount: 0, imputedCount: 0,
      payloadQualityScore: 0, qualityBand: 'LOW', imputedFeatures: [],
    };

    return {
      recommendation,
      confidence: 0.55,
      pdScore: pd,
      rationale: `[FALLBACK RULE ENGINE] ${rationale}`,
      xaiDrivers: [{ label: 'Rule: PD Threshold', impact: pd, direction: 'negative', category: 'FALLBACK' }],
      modelVersion: 'rule_engine_v1',
      scoredBy: 'RULE_ENGINE',
      imputedFeaturesCount: 0,
      payloadQualityScore: 0,
      qualityBand: 'LOW',
      featureLineage: emptyLineage,
      inferenceTimestamp: new Date().toISOString(),
    };
  }
}
