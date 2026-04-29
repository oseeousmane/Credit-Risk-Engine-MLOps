import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IFRS9Stage } from '@prisma/client';

export interface ECLResult {
  pd: number;
  lgd: number;
  ead: number;
  expectedLoss: number;
  lgdMethod: string;
  eadMethod: string;
}

export interface StagingResult {
  currentStage: IFRS9Stage;
  sicrTriggered: boolean;
  stagingReasons: string[];
  reason: string; // Human-readable summary for snapshot
}

/**
 * LGD Table (Basel III / IFRS 9 - Foundation IRB segments).
 * Documented rates for Octaix Risk Engine industrialization.
 */
const LGD_TABLE: Record<string, number> = {
  // Secured Segments
  CASH:                     0.05,  // Cash collateral (5% floor per Basel)
  SOVEREIGN_BONDS:          0.10,  // High-quality government bonds
  RESIDENTIAL_REAL_ESTATE:  0.25,  // Residential mortgage collateral
  COMMERCIAL_REAL_ESTATE:   0.35,  // Commercial property
  EQUIPMENT_HEAVY:          0.40,  // Yellow goods / machinery
  VEHICLES:                 0.50,  // Standard auto / light vehicles
  RECEIVABLES:              0.35,  // Trade receivables (Eligible F-IRB)

  // Unsecured Segments (EBA/Basel Benchmarks)
  UNSECURED_CORPORATE_IG:   0.45,  // Basel Standard (Investment Grade)
  UNSECURED_CORPORATE_HY:   0.65,  // Sub-Investment Grade / High Yield
  UNSECURED_SME:            0.70,  // Small/Medium Enterprise (higher loss volatility)
  UNSECURED_RETAIL:         0.75,  // Mass retail / Microfinance
  UNSECURED_CRITICAL:       0.85,  // High-risk recovery segment
};

/**
 * Credit Conversion Factor (CCF) per facility type (Basel III Reform / BCBS d424).
 * Converts undrawn commitments into Exposure at Default (EAD).
 */
const CCF_TABLE: Record<string, number> = {
  TERM_LOAN:                1.00,  // Fully drawn
  REVOLVING_LINE:           0.40,  // Unconditionally cancellable (Basel III standard: 40%)
  OVERDRAFT:                0.40,  // Short-term uncommitted
  TRADE_LETTERS_OF_CREDIT:  0.20,  // Self-liquidating trade transactions
  FINANCIAL_GUARANTEE:      1.00,  // Full risk substitute
  PERFORMANCE_BOND:         0.50,  // Non-credit substitute
  DEFAULT:                  1.00,
};

@Injectable()
export class RiskMathService {
  private readonly logger = new Logger(RiskMathService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculates Expected Credit Loss (ECL) = PD Ã— LGD Ã— EAD.
   * Basel III compliant EAD and Segmented LGD logic.
   */
  calculateECL(
    pd: number,
    drawnAmount: number,
    riskLevel: string,
    isSecured: boolean = false,
    collateralType?: string | null,
    collateralValue?: number | null,
    undrawnLimit: number = 0,
    facilityType?: string | null,
  ): ECLResult {
    const pdProb = Math.max(0, Math.min(pd / 100, 1.0));

    // â”€â”€ 1. LGD Calculation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let lgd: number;
    let lgdMethod: string;

    if (isSecured && collateralType) {
      const normalizedType = collateralType.toUpperCase().replace(/ /g, '_');
      const rawLGD = LGD_TABLE[normalizedType] ?? LGD_TABLE['RESIDENTIAL_REAL_ESTATE'];

      // Apply Loan-to-Value (LTV) haircut if collateral value is known
      if (collateralValue && collateralValue > 0 && drawnAmount > 0) {
        const ltv = drawnAmount / collateralValue;
        // Logic: LGD improves if LTV is low (over-collateralized)
        lgd = Math.max(rawLGD * (ltv > 0.8 ? 1.0 : (ltv + 0.2)), 0.05); // Floor 5%
        lgdMethod = `SECURED_${normalizedType}_LTV_${(ltv * 100).toFixed(0)}%`;
      } else {
        lgd = rawLGD;
        lgdMethod = `SECURED_${normalizedType}_STANDARD`;
      }
    } else {
      // Unsecured segmentation based on Risk Level (Proxy for segment)
      if (riskLevel === 'CRITICAL') {
        lgd = LGD_TABLE['UNSECURED_CRITICAL'];
        lgdMethod = 'UNSECURED_CRITICAL_SEGMENT';
      } else if (riskLevel === 'HIGH') {
        lgd = LGD_TABLE['UNSECURED_SME'];
        lgdMethod = 'UNSECURED_SME_TIER';
      } else {
        lgd = LGD_TABLE['UNSECURED_CORPORATE_IG'];
        lgdMethod = 'UNSECURED_INVESTMENT_GRADE';
      }
    }

    // â”€â”€ 2. EAD Calculation (Exposure at Default) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // EAD = Drawn + (Undrawn * CCF)
    const normalizedFacility = facilityType?.toUpperCase() ?? 'DEFAULT';
    const ccf = CCF_TABLE[normalizedFacility] ?? CCF_TABLE['DEFAULT'];

    const ead = drawnAmount + (undrawnLimit * ccf);
    const eadMethod = undrawnLimit > 0
      ? `BASEL_III_EAD (Drawn=${drawnAmount}M + Undrawn=${undrawnLimit}M * CCF=${ccf})`
      : `FULLY_DRAWN_${normalizedFacility}`;

    // â”€â”€ 3. Final ECL Assembly â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const expectedLoss = pdProb * lgd * ead;

    this.logger.debug(
      `ECL Calc: PD=${(pdProb*100).toFixed(2)}% | LGD=${(lgd*100).toFixed(1)}% | EAD=${ead.toFixed(2)}M | EL=${expectedLoss.toFixed(4)}M`
    );

    return { pd: pdProb, lgd, ead, expectedLoss, lgdMethod, eadMethod };
  }

  /**
   * IFRS 9 Staging (SICR - Significant Increase in Credit Risk).
   * Compliant with IFRS 9.B5.5.17 and IFRS 9.5.5.
   */
  assignStage(
    pdCurrent: number,
    pdOrigination: number,
    daysPastDue: number = 0,
    watchlistFlag: boolean = false,
    isRestructured: boolean = false,
  ): StagingResult {
    let stage: IFRS9Stage = IFRS9Stage.STAGE_1;
    let sicrTriggered = false;
    const reasons: string[] = [];

    // â”€â”€ Stage 3: Credit Impaired (Default) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // IFRS 9 Appendix A: Default / Credit Impaired indicators
    if (daysPastDue >= 90 || pdCurrent >= 100) {
      stage = IFRS9Stage.STAGE_3;
      reasons.push(daysPastDue >= 90 ? 'Default: DPD >= 90' : 'Default: PD at 100%');
      const reason = reasons.join('; ');
      return { currentStage: stage, sicrTriggered: true, stagingReasons: reasons, reason };
    }

    // â”€â”€ Stage 2: SICR (Significant Increase) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Threshold 1: PD Relative Increase (Standard threshold: 2x increase)
    const relIncrease = pdOrigination > 0 ? (pdCurrent / pdOrigination) : 1;
    const absIncrease = pdCurrent - pdOrigination;

    if (relIncrease >= 2.0 && absIncrease >= 1.0) {
      sicrTriggered = true;
      reasons.push(`SICR: PD relative increase >= 2.0x (${relIncrease.toFixed(1)}x)`);
    }

    // Threshold 2: 30 DPD Backstop (IFRS 9.5.5.11)
    if (daysPastDue >= 30) {
      sicrTriggered = true;
      reasons.push(`SICR: 30 DPD Backstop exceeded (${daysPastDue} days)`);
    }

    // Threshold 3: Qualitative / Soft Triggers
    if (watchlistFlag) {
      sicrTriggered = true;
      reasons.push('SICR: Early Warning Indicator (Watchlist)');
    }
    if (isRestructured) {
      sicrTriggered = true;
      reasons.push('SICR: Forbearance / Restructuring detected');
    }

    if (sicrTriggered) {
      stage = IFRS9Stage.STAGE_2;
    } else {
      reasons.push('Low credit risk / No SICR indicators. Stage 1 maintained.');
    }

    const reason = reasons.join('; ');
    return { currentStage: stage, sicrTriggered, stagingReasons: reasons, reason };
  }

  /**
   * PIT_TO_TTC â€” Conversion from Point-in-Time (PIT) PD to Through-the-Cycle (TTC) PD.
   *
   * PIT scores are sensitive to the current economic cycle (used for IFRS 9 ECL).
   * TTC scores are stable across the cycle (used for Basel Regulatory Capital / RWA).
   *
   * Approach: Long-run average adjustment using a Probit shift.
   */
  convertPITtoTTC(pitPD: number, macroFactor: number = 0.0): number {
    // Probit shift formula: TTC_PD = Î¦(Î¦â»Â¹(PIT_PD) - macro_component)
    // For this proxy, we use a logistic approximation:
    const logitPIT = Math.log(pitPD / (100 - pitPD + 0.000001));
    const ttcAdjustment = -0.5 * macroFactor; // Conservative shift
    const logitTTC = logitPIT + ttcAdjustment;
    const ttcPD = (1 / (1 + Math.exp(-logitTTC))) * 100;

    return Math.max(0.01, ttcPD);
  }
}
