import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrchestrationService } from './orchestration.service';

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
  // Counterparty context
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
}

// Thresholds aligned with DEMO_VS_PROD_BENCHMARK §5 and main.py apply_decision_policy().
// Any change here MUST be mirrored in 03_risk_engine/main.py.
const POLICY = {
  AUTO_APPROVE_MAX_PD: 0.8,   // was 0.5 — misaligned with main engine Elite tier (<= 0.8%)
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

  constructor(
    private readonly orchestrator: OrchestrationService,
    private readonly config: ConfigService,
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

    try {
      const result = await this.callPythonService(req, activeVersion);

      if (result.imputedFeaturesCount >= POLICY.LOW_QUALITY_IMPUTED_THRESHOLD) {
        this.logger.warn(
          `[DataQuality] HIGH IMPUTATION BURDEN: ${result.imputedFeaturesCount} features imputed for app=${req.applicationId}. ` +
          `Quality=${result.qualityBand} (${result.payloadQualityScore}%). Raw PD preserved.`
        );
      }

      this.logger.log(
        `[Scoring] Success: app=${req.applicationId} â†’ ${result.recommendation} ` +
        `PD=${result.pdScore.toFixed(2)}% Quality=${result.qualityBand} Imputed=${result.imputedFeaturesCount}`
      );
      return { ...result, engine: 'PYTHON', activeVersion };
    } catch (err) {
      this.logger.warn(
        `[Scoring] Python service unreachable. Activating explicit fallback. Error: ${(err as Error).message}`
      );
      return { ...this.localRuleEngine(req), engine: 'FALLBACK', activeVersion: 'rule_engine_v1' };
    }
  }

  private async callPythonService(req: ScoreRequest, activeVersion: string): Promise<ScoreResult> {
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

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
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
