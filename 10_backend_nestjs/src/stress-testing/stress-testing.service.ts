import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskMathService } from '../risk-math/risk-math.service';
import { IFRS9Stage } from '@prisma/client';

/**
 * MacroShockParams â€” input parameters for a stress scenario run.
 * Designed to be extensible: future Monte Carlo or transition-matrix engines
 * can inject their outputs via the same interface without changing the contract.
 */
export interface MacroShockParams {
  unemploymentShock: number;    // Shock in pp (e.g., +3.5 = unemployment rises 3.5%)
  creditSpreadBps: number;      // Credit spread widening in basis points
  realGDPGrowth: number;        // GDP growth rate (negative = contraction)
  inflationDelta?: number;      // Inflation shock in pp
  sectorShock?: number;         // Sector-specific multiplier (1.0 = no additional effect)
  horizon: string;              // e.g., '1Y', '3Y'
  engineVersion?: string;       // For future: 'VASICEK_PROXY' | 'MONTE_CARLO' | 'TRANSITION_MATRIX'
}

interface StressedCounterparty {
  id: string;
  name: string;
  basePD: number;
  stressedPD: number;
  pdDelta: number;
  baseStage: IFRS9Stage;
  newStage: IFRS9Stage;
  stagingReason: string;
  baseECL: number;
  stressedECL: number;
  eclDelta: number;
  lgd: number;
  ead: number;
  stageMigrated: boolean;
}

@Injectable()
export class StressTestingService {
  private readonly logger = new Logger(StressTestingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly riskMath: RiskMathService,
  ) {}

  async runScenario(params: MacroShockParams) {
    const engineVersion = params.engineVersion ?? 'VASICEK_PROXY_V2';
    this.logger.log(`[StressTesting] Running scenario: horizon=${params.horizon}, engine=${engineVersion}`);

    const counterparties = await this.prisma.counterparty.findMany({
      select: {
        id: true, name: true, sector: true,
        pd1y: true, exposure: true, ifrs9Stage: true,
        riskLevel: true, watchlistFlag: true,
      },
    });

    if (counterparties.length === 0) {
      this.logger.warn('[StressTesting] No counterparties found in DB. Returning empty scenario.');
    }

    /**
     * Core shock function (Vasicek-inspired proxy).
     *
     * Shock formula: Stressed PD = Base PD Ã— exp(macro_composite_score)
     *
     * macro_composite_score is a weighted linear combination of macro factors.
     * This mimics a single-factor credit cycle model where the systematic factor
     * loads on unemployment, spread, and GDP growth.
     *
     * Future extension: replace with Gaussian copula or transition matrix approach.
     */
    const computeShock = (
      scenMultiplier: { unemp: number; spread: number; gdp: number; inf: number }
    ) => {
      return (
        (params.unemploymentShock * scenMultiplier.unemp * 0.10) +
        ((params.creditSpreadBps * scenMultiplier.spread) / 100 * 0.08) -
        (params.realGDPGrowth * scenMultiplier.gdp * 0.12) +
        ((params.inflationDelta ?? 0) * scenMultiplier.inf * 0.05)
      );
    };

    const runScenarioTier = (
      name: string,
      multipliers: { unemp: number; spread: number; gdp: number; inf: number }
    ) => {
      const macroShock = computeShock(multipliers);

      const stressed: StressedCounterparty[] = counterparties.map(c => {
        const basePD = c.pd1y ?? 1.5;

        // Sector amplifier: some sectors more exposed to macro cycles
        const sectorAmplifier = c.sector?.toLowerCase().includes('mining') || c.sector?.toLowerCase().includes('construction') ? 1.3
          : c.sector?.toLowerCase().includes('technology') || c.sector?.toLowerCase().includes('healthcare') ? 0.85
          : 1.0;

        const stressedPD = Math.min(basePD * Math.exp(macroShock * sectorAmplifier), 100);
        const pdDelta = stressedPD - basePD;

        // IFRS 9 Stage Migration under stress
        const stagingResult = this.riskMath.assignStage(
          stressedPD,
          basePD,          // pre-stress PD as origination proxy
          0,
          c.watchlistFlag, // real watchlist from DB
        );

        // ECL with enriched risk math (Basel III / Segmented LGD)
        const baseEclResult = this.riskMath.calculateECL(basePD, c.exposure, c.riskLevel, false);
        const stressedEclResult = this.riskMath.calculateECL(stressedPD, c.exposure, c.riskLevel, false);

        return {
          id: c.id,
          name: c.name,
          basePD: Math.round(basePD * 1000) / 1000,
          stressedPD: Math.round(stressedPD * 1000) / 1000,
          pdDelta: Math.round(pdDelta * 1000) / 1000,
          baseStage: c.ifrs9Stage,
          newStage: stagingResult.currentStage,
          stagingReason: stagingResult.reason,
          baseECL: Math.round(baseEclResult.expectedLoss * 100) / 100,
          stressedECL: Math.round(stressedEclResult.expectedLoss * 100) / 100,
          eclDelta: Math.round((stressedEclResult.expectedLoss - baseEclResult.expectedLoss) * 100) / 100,
          lgd: stressedEclResult.lgd,
          ead: stressedEclResult.ead,
          stageMigrated: c.ifrs9Stage !== stagingResult.currentStage,
        };
      });

      const totalBaseECL = stressed.reduce((s, c) => s + c.baseECL, 0);
      const totalStressedECL = stressed.reduce((s, c) => s + c.stressedECL, 0);
      const avgStressedPD = stressed.length > 0 ? stressed.reduce((s, c) => s + c.stressedPD, 0) / stressed.length : 0;
      const stageMigrations = stressed.filter(c => c.stageMigrated).length;

      return {
        name,
        macroShock: Math.round(macroShock * 10000) / 10000,
        engineVersion,
        metrics: {
          totalBaseECL: Math.round(totalBaseECL * 10) / 10,
          totalStressedECL: Math.round(totalStressedECL * 10) / 10,
          totalECLIncrease: Math.round((totalStressedECL - totalBaseECL) * 10) / 10,
          avgStressedPD: Math.round(avgStressedPD * 1000) / 1000,
          stage3Count: stressed.filter(c => c.newStage === 'STAGE_3').length,
          stage2Count: stressed.filter(c => c.newStage === 'STAGE_2').length,
          stage1Count: stressed.filter(c => c.newStage === 'STAGE_1').length,
          stageMigrations,
          rwaImpact: Math.round(totalStressedECL * 8 * 10) / 10,  // Basel RWA proxy
        },
        entityDetails: name === 'severe' ? stressed : [],
      };
    };

    // Three-tier scenario structure (EBA DFAST-inspired)
    const baseline = runScenarioTier('baseline', { unemp: 0.5, spread: 0.5, gdp: 1.2, inf: 0.0 });
    const adverse  = runScenarioTier('adverse',  { unemp: 1.0, spread: 1.0, gdp: 1.0, inf: 1.0 });
    const severe   = runScenarioTier('severe',   { unemp: 1.5, spread: 1.5, gdp: 0.5, inf: 1.5 });

    // IFRS 9 Forward-Looking Weighted ECL
    // Standard bank weights: 50% Baseline, 30% Adverse, 20% Severe
    const weightedECL = (baseline.metrics.totalStressedECL * 0.5) + (adverse.metrics.totalStressedECL * 0.3) + (severe.metrics.totalStressedECL * 0.2);

    // Migration Matrix (Severe Scenario)
    const migrationMatrix = {
      '1_to_2': severe.entityDetails.filter(c => c.baseStage === 'STAGE_1' && c.newStage === 'STAGE_2').length,
      '2_to_3': severe.entityDetails.filter(c => c.baseStage === 'STAGE_2' && c.newStage === 'STAGE_3').length,
      '1_to_3': severe.entityDetails.filter(c => c.baseStage === 'STAGE_1' && c.newStage === 'STAGE_3').length,
    };

    const totalExposure = counterparties.reduce((s, c) => s + (c.exposure ?? 0), 0);

    // Calculate TTC RWA Impact (Basel III Proxy)
    // We use the severe scenario but convert PIT PDs to TTC for capital stability
    const totalTtcRwa = severe.entityDetails.reduce((sum, c) => {
      const ttcPD = this.riskMath.convertPITtoTTC(c.stressedPD, severe.macroShock);
      return sum + (c.ead * (ttcPD / 100) * 12.5); // 12.5x risk weight multiplier (standard proxy)
    }, 0);

    // Persist with full parameter + outcome audit trail
    const scenario = await this.prisma.scenario.create({
      data: {
        name: `Macro-Stress [${params.horizon}] â€” ${engineVersion}`,
        horizon: params.horizon,
        pdDelta: severe.metrics.avgStressedPD - (baseline.metrics.avgStressedPD || 0),
        expectedLoss: weightedECL, // We now store the weighted ECL as the primary outcome
        rwaImpact: totalTtcRwa,
        parameters: {
          inputs: { ...params, engineVersion },
          shocks: { baseline: baseline.macroShock, adverse: adverse.macroShock, severe: severe.macroShock },
          outcomes: { baseline: baseline.metrics, adverse: adverse.metrics, severe: severe.metrics },
          weights: { baseline: 0.5, adverse: 0.3, severe: 0.2 },
          migrationMatrix,
          forwardLookingECL: weightedECL,
          ttcRwa: totalTtcRwa,
          timestamp: new Date().toISOString(),
        },
      },
    });

    this.logger.log(
      `[StressTesting] Complete: Weighted ECL=${weightedECL.toFixed(2)}M | ` +
      `Severe RWA (TTC)=${totalTtcRwa.toFixed(2)}M | Migrations(1->2)=${migrationMatrix['1_to_2']}`
    );

    return {
      scenarioId: scenario.id,
      summary: {
        totalExposure,
        weightedECL: Math.round(weightedECL * 10) / 10,
        ttcRwa: Math.round(totalTtcRwa * 10) / 10,
        migrationMatrix,
        baseline: baseline.metrics,
        adverse: adverse.metrics,
        severe: severe.metrics,
      },
      counterpartyDetails: severe.entityDetails,
    };
  }

  async getSavedScenarios() {
    return this.prisma.scenario.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  /**
   * getPortfolioAnalytics â€” Phase 4 Workstream E
   *
   * Aggregates portfolio-level risk analytics from live DB data without running
   * a new stress scenario. Provides MRM-grade outputs:
   * - IFRS 9 stage distribution
   * - ECL by sector
   * - Top 10 impacted counterparties
   * - Concentration heatmap inputs
   * - RWA proxy
   */
  async getPortfolioAnalytics() {
    const counterparties = await this.prisma.counterparty.findMany({
      select: {
        id: true,
        name: true,
        sector: true,
        pd1y: true,
        exposure: true,
        ifrs9Stage: true,
        riskLevel: true,
        expectedLoss: true,
        watchlistFlag: true,
      },
    });

    if (counterparties.length === 0) {
      return { message: 'No counterparty data available.', generatedAt: new Date().toISOString() };
    }

    // Stage distribution
    const stageDistribution: Record<string, { count: number; totalExposure: number; totalECL: number }> = {
      STAGE_1: { count: 0, totalExposure: 0, totalECL: 0 },
      STAGE_2: { count: 0, totalExposure: 0, totalECL: 0 },
      STAGE_3: { count: 0, totalExposure: 0, totalECL: 0 },
    };

    // ECL by sector
    const bySector: Record<string, { totalExposure: number; totalECL: number; count: number }> = {};

    // Aggregate
    let totalExposure = 0;
    let totalECL = 0;
    let watchlistCount = 0;

    for (const c of counterparties) {
      const stage = c.ifrs9Stage ?? 'STAGE_1';
      const exposure = c.exposure ?? 0;
      const pd = c.pd1y ?? 1.5;

      // Re-derive ECL using hardened risk math for accuracy
      const eclResult = this.riskMath.calculateECL(
        pd,
        exposure,
        c.riskLevel,
        false, // Placeholder: need to fetch collateral for 10/10 truth
        null,
        null,
        0,
        null
      );
      const ecl = eclResult.expectedLoss;

      stageDistribution[stage].count++;
      stageDistribution[stage].totalExposure += exposure;
      stageDistribution[stage].totalECL += ecl;

      const sector = c.sector ?? 'UNKNOWN';
      if (!bySector[sector]) bySector[sector] = { totalExposure: 0, totalECL: 0, count: 0 };
      bySector[sector].totalExposure += exposure;
      bySector[sector].totalECL += ecl;
      bySector[sector].count++;

      totalExposure += exposure;
      totalECL += ecl;
      if (c.watchlistFlag) watchlistCount++;
    }

    // Top 10 impacted by ECL (concentration risk)
    const enriched = counterparties.map(c => {
      const eclResult = this.riskMath.calculateECL(
        c.pd1y ?? 1.5,
        c.exposure ?? 0,
        c.riskLevel,
        false
      );
      return { ...c, computedECL: eclResult.expectedLoss };
    });

    const top10ByECL = enriched
      .sort((a, b) => b.computedECL - a.computedECL)
      .slice(0, 10)
      .map(c => ({
        id: c.id,
        name: c.name,
        sector: c.sector,
        exposure: c.exposure,
        pd: c.pd1y,
        stage: c.ifrs9Stage,
        ecl: Math.round(c.computedECL * 100) / 100,
        eclShare: totalECL > 0 ? parseFloat(((c.computedECL / totalECL) * 100).toFixed(1)) : 0,
        watchlist: c.watchlistFlag,
      }));

    // Concentration heatmap inputs (sector Ã— stage)
    const heatmap: Array<{ sector: string; stage: string; count: number; ecl: number }> = [];
    const sectorStageMap: Record<string, Record<string, { count: number; ecl: number }>> = {};
    for (const c of enriched) {
      const sector = c.sector ?? 'UNKNOWN';
      const stage = c.ifrs9Stage ?? 'STAGE_1';
      if (!sectorStageMap[sector]) sectorStageMap[sector] = {};
      if (!sectorStageMap[sector][stage]) sectorStageMap[sector][stage] = { count: 0, ecl: 0 };
      sectorStageMap[sector][stage].count++;
      sectorStageMap[sector][stage].ecl += c.computedECL;
    }
    for (const [sector, stages] of Object.entries(sectorStageMap)) {
      for (const [stage, data] of Object.entries(stages)) {
        heatmap.push({ sector, stage, count: data.count, ecl: Math.round(data.ecl * 10) / 10 });
      }
    }

    const rwaProxy = Math.round(totalECL * 8 * 10) / 10; // Basel RWA proxy (ECL Ã— 8x density)

    return {
      summary: {
        totalCounterparties: counterparties.length,
        totalExposure: Math.round(totalExposure * 10) / 10,
        totalECL: Math.round(totalECL * 10) / 10,
        avgPD: counterparties.length > 0
          ? parseFloat((counterparties.reduce((s, c) => s + (c.pd1y ?? 0), 0) / counterparties.length).toFixed(3))
          : 0,
        watchlistCount,
        rwaProxy,
      },
      stageDistribution: Object.entries(stageDistribution).map(([stage, data]) => ({
        stage,
        count: data.count,
        pct: counterparties.length > 0 ? parseFloat(((data.count / counterparties.length) * 100).toFixed(1)) : 0,
        totalExposure: Math.round(data.totalExposure * 10) / 10,
        totalECL: Math.round(data.totalECL * 10) / 10,
      })),
      eclBySector: Object.entries(bySector)
        .map(([sector, data]) => ({
          sector,
          count: data.count,
          totalExposure: Math.round(data.totalExposure * 10) / 10,
          totalECL: Math.round(data.totalECL * 10) / 10,
          eclShare: totalECL > 0 ? parseFloat(((data.totalECL / totalECL) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.totalECL - a.totalECL),
      top10ImpactedCounterparties: top10ByECL,
      concentrationHeatmap: heatmap,
      generatedAt: new Date().toISOString(),
    };
  }
}
