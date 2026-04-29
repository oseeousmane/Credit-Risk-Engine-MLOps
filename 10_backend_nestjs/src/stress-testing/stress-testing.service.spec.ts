import { Test, TestingModule } from '@nestjs/testing';
import { StressTestingService } from './stress-testing.service';
import { PrismaService } from '../prisma/prisma.service';
import { RiskMathService } from '../risk-math/risk-math.service';
import { IFRS9Stage } from '@prisma/client';

const mockCounterparties = [
  { id: '1', name: 'Corp A', sector: 'Technology', pd1y: 2.0, exposure: 10, ifrs9Stage: 'STAGE_1', riskLevel: 'MED', watchlistFlag: false },
  { id: '2', name: 'Corp B', sector: 'Mining',     pd1y: 5.0, exposure: 25, ifrs9Stage: 'STAGE_1', riskLevel: 'HIGH', watchlistFlag: false },
  { id: '3', name: 'Corp C', sector: 'Technology', pd1y: 1.0, exposure: 5,  ifrs9Stage: 'STAGE_1', riskLevel: 'LOW', watchlistFlag: true },
];

describe('StressTestingService â€” Realistic Shock Propagation', () => {
  let service: StressTestingService;
  let riskMath: RiskMathService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StressTestingService,
        {
          provide: PrismaService,
          useValue: {
            counterparty: { findMany: jest.fn().mockResolvedValue(mockCounterparties) },
            scenario: { create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'scen-1', ...args.data })) },
          },
        },
        {
          provide: RiskMathService,
          useValue: {
            calculateECL: jest.fn().mockReturnValue({
              expectedLoss: 0.5, lgd: 0.45, ead: 10, lgdMethod: 'UNSECURED_IG', eadMethod: 'TERM_LOAN'
            }),
            assignStage: jest.fn().mockReturnValue({
              currentStage: IFRS9Stage.STAGE_2,
              sicrTriggered: true,
              stagingReasons: ['SICR: PD doubled'],
              reason: 'SICR: PD doubled from origination',
            }),
            convertPITtoTTC: jest.fn().mockImplementation((pd: number) => pd),
          },
        },
      ],
    }).compile();

    service = module.get<StressTestingService>(StressTestingService);
    riskMath = module.get<RiskMathService>(RiskMathService);
  });

  it('should run scenario and call RiskMathService for each counterparty Ã— 2 (base + stressed)', async () => {
    await service.runScenario({ unemploymentShock: 5, creditSpreadBps: 200, realGDPGrowth: -2, horizon: '1Y' });
    // 3 counterparties Ã— 3 scenario tiers Ã— 2 calls (base + stressed) = 18 ECL calls
    expect(riskMath.calculateECL).toHaveBeenCalledTimes(18);
    expect(riskMath.assignStage).toHaveBeenCalledTimes(9);
  });

  it('should return a scenario with all three tiers: baseline, adverse, severe', async () => {
    const result = await service.runScenario({ unemploymentShock: 3, creditSpreadBps: 150, realGDPGrowth: -1, horizon: '1Y' });
    expect(result.summary.baseline).toBeDefined();
    expect(result.summary.adverse).toBeDefined();
    expect(result.summary.severe).toBeDefined();
  });

  it('should propagate stage migrations in the severe tier', async () => {
    const result = await service.runScenario({ unemploymentShock: 5, creditSpreadBps: 300, realGDPGrowth: -3, horizon: '1Y' });
    expect(result.summary.severe.stage2Count).toBeGreaterThanOrEqual(0);
    expect(typeof result.summary.severe.stageMigrations).toBe('number');
  });

  it('should return ECL delta (stressed minus base) for each counterparty', async () => {
    const result = await service.runScenario({ unemploymentShock: 5, creditSpreadBps: 200, realGDPGrowth: -2, horizon: '1Y' });
    const details = result.counterpartyDetails;
    expect(Array.isArray(details)).toBe(true);
    if (details.length > 0) {
      expect(details[0]).toHaveProperty('eclDelta');
      expect(details[0]).toHaveProperty('stageMigrated');
      expect(details[0]).toHaveProperty('stagingReason');
    }
  });

  it('should track total ECL increase across portfolio in severe scenario', async () => {
    const result = await service.runScenario({ unemploymentShock: 5, creditSpreadBps: 200, realGDPGrowth: -2, horizon: '1Y' });
    expect(typeof result.summary.severe.totalECLIncrease).toBe('number');
    expect(typeof result.summary.severe.rwaImpact).toBe('number');
  });

  it('should persist scenario with full parameter audit trail', async () => {
    const result = await service.runScenario({ unemploymentShock: 5, creditSpreadBps: 200, realGDPGrowth: -2, horizon: '3Y' });
    expect(result.scenarioId).toBe('scen-1');
  });
});

// â”€â”€ Phase 4: Portfolio Analytics Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('StressTestingService.getPortfolioAnalytics() â€” Phase 4', () => {
  let service: StressTestingService;

  const mockCPs = [
    { id: '1', name: 'Corp A', sector: 'Technology', pd1y: 2.0, exposure: 10, ifrs9Stage: 'STAGE_1', riskLevel: 'MED',      expectedLoss: 0.09, watchlistFlag: false },
    { id: '2', name: 'Corp B', sector: 'Mining',     pd1y: 5.0, exposure: 25, ifrs9Stage: 'STAGE_2', riskLevel: 'HIGH',     expectedLoss: 0.56, watchlistFlag: true  },
    { id: '3', name: 'Corp C', sector: 'Technology', pd1y: 1.0, exposure: 5,  ifrs9Stage: 'STAGE_1', riskLevel: 'LOW',      expectedLoss: 0.02, watchlistFlag: false },
    { id: '4', name: 'Corp D', sector: 'Healthcare', pd1y: 8.0, exposure: 50, ifrs9Stage: 'STAGE_3', riskLevel: 'CRITICAL', expectedLoss: 3.00, watchlistFlag: true  },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StressTestingService,
        {
          provide: PrismaService,
          useValue: {
            counterparty: { findMany: jest.fn().mockResolvedValue(mockCPs) },
            scenario: { create: jest.fn().mockResolvedValue({ id: 'scen-1' }), findMany: jest.fn().mockResolvedValue([]) },
          },
        },
        {
          provide: RiskMathService,
          useValue: {
            calculateECL: jest.fn().mockImplementation((pd: number, exposure: number) => ({
              expectedLoss: (pd / 100) * 0.45 * exposure,
              lgd: 0.45,
              ead: exposure,
              lgdMethod: 'UNSECURED_IG',
              eadMethod: 'TERM_LOAN',
            })),
            assignStage: jest.fn().mockReturnValue({
              currentStage: IFRS9Stage.STAGE_1,
              sicrTriggered: false,
              stagingReasons: [],
              reason: 'No SICR detected',
            }),
            convertPITtoTTC: jest.fn().mockImplementation((pd: number) => pd),
          },
        },
      ],
    }).compile();

    service = module.get<StressTestingService>(StressTestingService);
  });

  it('should return a summary with totalCounterparties, totalExposure, totalECL, and rwaProxy', async () => {
    const result = await service.getPortfolioAnalytics();
    expect(result.summary.totalCounterparties).toBe(4);
    expect(result.summary.totalExposure).toBeGreaterThan(0);
    expect(result.summary.totalECL).toBeGreaterThan(0);
    expect(result.summary.rwaProxy).toBeGreaterThan(0);
    // RWA proxy = ECL Ã— 8
    expect(result.summary.rwaProxy).toBeCloseTo(result.summary.totalECL * 8, 0);
  });

  it('should return stageDistribution with STAGE_1, STAGE_2, STAGE_3 buckets', async () => {
    const result = await service.getPortfolioAnalytics();
    const stages = result.stageDistribution.map((s: any) => s.stage);
    expect(stages).toContain('STAGE_1');
    expect(stages).toContain('STAGE_2');
    expect(stages).toContain('STAGE_3');

    const stage2 = result.stageDistribution.find((s: any) => s.stage === 'STAGE_2');
    expect(stage2?.count).toBe(1); // Corp B
    const stage3 = result.stageDistribution.find((s: any) => s.stage === 'STAGE_3');
    expect(stage3?.count).toBe(1); // Corp D
  });

  it('should return eclBySector sorted descending by totalECL', async () => {
    const result = await service.getPortfolioAnalytics();
    const ecls = result.eclBySector.map((s: any) => s.totalECL);
    for (let i = 0; i < ecls.length - 1; i++) {
      expect(ecls[i]).toBeGreaterThanOrEqual(ecls[i + 1]);
    }
  });

  it('should return top10ImpactedCounterparties with eclShare field', async () => {
    const result = await service.getPortfolioAnalytics();
    expect(result.top10ImpactedCounterparties.length).toBeLessThanOrEqual(10);
    for (const cp of result.top10ImpactedCounterparties) {
      expect(cp).toHaveProperty('eclShare');
      expect(cp).toHaveProperty('watchlist');
      expect(cp.eclShare).toBeGreaterThanOrEqual(0);
    }
    // Top entry must be the highest ECL counterparty
    const top = result.top10ImpactedCounterparties[0];
    expect(top.id).toBe('4'); // Corp D has pd=8, exposure=50
  });

  it('should include watchlistCount in summary', async () => {
    const result = await service.getPortfolioAnalytics();
    expect(result.summary.watchlistCount).toBe(2); // Corp B + Corp D
  });

  it('should return concentrationHeatmap with sector Ã— stage entries', async () => {
    const result = await service.getPortfolioAnalytics();
    expect(Array.isArray(result.concentrationHeatmap)).toBe(true);
    expect(result.concentrationHeatmap.length).toBeGreaterThan(0);
    const entry = result.concentrationHeatmap[0];
    expect(entry).toHaveProperty('sector');
    expect(entry).toHaveProperty('stage');
    expect(entry).toHaveProperty('count');
    expect(entry).toHaveProperty('ecl');
  });

  it('should return a message if no counterparties exist', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StressTestingService,
        {
          provide: PrismaService,
          useValue: {
            counterparty: { findMany: jest.fn().mockResolvedValue([]) },
            scenario: { create: jest.fn(), findMany: jest.fn() },
          },
        },
        {
          provide: RiskMathService,
          useValue: { calculateECL: jest.fn(), assignStage: jest.fn(), convertPITtoTTC: jest.fn() },
        },
      ],
    }).compile();

    const emptyService = module.get<StressTestingService>(StressTestingService);
    const result = await emptyService.getPortfolioAnalytics();
    expect((result as any).message).toBeDefined();
  });
});
