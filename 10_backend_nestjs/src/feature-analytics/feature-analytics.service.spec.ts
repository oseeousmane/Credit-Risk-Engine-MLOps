import { Test, TestingModule } from '@nestjs/testing';
import { FeatureAnalyticsService } from './feature-analytics.service';
import { PrismaService } from '../prisma/prisma.service';

// â”€â”€â”€ Fixtures â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const makeSnapshot = (quality: number, band: string, imputedCount: number, sector = 'Technology') => ({
  scoringSnapshot: {
    payloadQualityScore: quality,
    qualityBand: band,
    featureLineage: {
      rawCount: 80,
      derivedCount: 20,
      imputedCount,
      imputedFeatures: imputedCount > 0
        ? Array.from({ length: imputedCount }, (_, i) => `FEAT_${i}`)
        : [],
    },
  },
  application: {
    metadata: {},
    counterparty: { sector, riskLevel: 'HIGH', industry: 'Software' },
  },
  decidedAt: new Date(),
});

// â”€â”€â”€ PrismaService Mock â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function buildPrismaMock(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    decision: {
      findMany: jest.fn().mockResolvedValue([]),
      ...overrides,
    },
  };
}

// â”€â”€â”€ Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('FeatureAnalyticsService', () => {
  let service: FeatureAnalyticsService;
  let prismaMock: any;

  const buildModule = async (mock: any) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureAnalyticsService,
        { provide: PrismaService, useValue: mock },
      ],
    }).compile();
    service = module.get<FeatureAnalyticsService>(FeatureAnalyticsService);
  };

  // â”€â”€ getMostFrequentlyMissingFeatures â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('getMostFrequentlyMissingFeatures()', () => {
    it('should return empty results when no decisions exist', async () => {
      prismaMock = buildPrismaMock({ findMany: jest.fn().mockResolvedValue([]) });
      await buildModule({ decision: prismaMock.decision });

      const result = await service.getMostFrequentlyMissingFeatures();
      expect(result.analysedDecisions).toBe(0);
      expect(result.topMissingFeatures).toHaveLength(0);
      expect(result.decisionsWithImputations).toBe(0);
    });

    it('should correctly rank missing features by frequency', async () => {
      const decisions = [
        makeSnapshot(30, 'LOW', 5, 'Mining'),
        makeSnapshot(30, 'LOW', 5, 'Mining'),
        makeSnapshot(70, 'HIGH', 0, 'Technology'),
      ];

      prismaMock = buildPrismaMock({ findMany: jest.fn().mockResolvedValue(decisions) });
      await buildModule({ decision: prismaMock.decision });

      const result = await service.getMostFrequentlyMissingFeatures(10);
      expect(result.analysedDecisions).toBe(3);
      expect(result.decisionsWithImputations).toBe(2);
      // Each LOW decision had 5 imputed features (FEAT_0..FEAT_4)
      expect(result.topMissingFeatures.length).toBeGreaterThan(0);
      expect(result.topMissingFeatures[0].missingCount).toBe(2);
    });

    it('should not count HIGH-quality decisions with zero imputations', async () => {
      const decisions = [
        makeSnapshot(75, 'HIGH', 0, 'Technology'),
        makeSnapshot(80, 'HIGH', 0, 'Healthcare'),
      ];

      prismaMock = buildPrismaMock({ findMany: jest.fn().mockResolvedValue(decisions) });
      await buildModule({ decision: prismaMock.decision });

      const result = await service.getMostFrequentlyMissingFeatures();
      expect(result.decisionsWithImputations).toBe(0);
      expect(result.topMissingFeatures).toHaveLength(0);
    });
  });

  // â”€â”€ getPayloadQualitySegmentation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('getPayloadQualitySegmentation()', () => {
    it('should segment quality by sector correctly', async () => {
      const decisions = [
        makeSnapshot(25, 'LOW', 10, 'Mining'),
        makeSnapshot(50, 'MEDIUM', 5, 'Technology'),
        makeSnapshot(75, 'HIGH', 2, 'Technology'),
      ];

      prismaMock = buildPrismaMock({ findMany: jest.fn().mockResolvedValue(decisions) });
      await buildModule({ decision: prismaMock.decision });

      const result = await service.getPayloadQualitySegmentation();

      const miningSector = result.bySector.find(s => s.sector === 'Mining');
      expect(miningSector).toBeDefined();
      expect(miningSector!.qualityRating).toBe('LOW');

      const techSector = result.bySector.find(s => s.sector === 'Technology');
      expect(techSector).toBeDefined();
      expect(techSector!.avgPayloadQuality).toBeGreaterThan(50);
    });

    it('should produce a qualityBandDistribution with all three bands', async () => {
      const decisions = [
        makeSnapshot(25, 'LOW', 10),
        makeSnapshot(50, 'MEDIUM', 5),
        makeSnapshot(75, 'HIGH', 0),
      ];

      prismaMock = buildPrismaMock({ findMany: jest.fn().mockResolvedValue(decisions) });
      await buildModule({ decision: prismaMock.decision });

      const result = await service.getPayloadQualitySegmentation();
      const bands = result.qualityBandDistribution.map(b => b.band);
      expect(bands).toContain('LOW');
      expect(bands).toContain('MEDIUM');
      expect(bands).toContain('HIGH');
    });
  });

  // â”€â”€ getFeatureCoverageSummary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('getFeatureCoverageSummary()', () => {
    it('should classify overall band as HIGH when average quality is above 60', async () => {
      const decisions = [
        makeSnapshot(70, 'HIGH', 2),
        makeSnapshot(80, 'HIGH', 0),
        makeSnapshot(65, 'HIGH', 1),
      ];

      prismaMock = buildPrismaMock({ findMany: jest.fn().mockResolvedValue(decisions) });
      await buildModule({ decision: prismaMock.decision });

      const result = await service.getFeatureCoverageSummary();
      expect(result.overallQualityBand).toBe('HIGH');
      expect(result.avgPayloadQuality).toBeGreaterThanOrEqual(60);
    });

    it('should classify overall band as LOW and emit MRM alert note when average quality < 35', async () => {
      const decisions = [
        makeSnapshot(20, 'LOW', 15),
        makeSnapshot(15, 'LOW', 20),
        makeSnapshot(30, 'LOW', 12),
      ];

      prismaMock = buildPrismaMock({ findMany: jest.fn().mockResolvedValue(decisions) });
      await buildModule({ decision: prismaMock.decision });

      const result = await service.getFeatureCoverageSummary();
      expect(result.overallQualityBand).toBe('LOW');
      expect(result.mrmNote).toContain('ALERT');
    });

    it('should return UNKNOWN for empty decision set', async () => {
      prismaMock = buildPrismaMock({ findMany: jest.fn().mockResolvedValue([]) });
      await buildModule({ decision: prismaMock.decision });

      const result = await service.getFeatureCoverageSummary();
      expect(result.overallQualityBand).toBe('UNKNOWN');
      expect(result.avgPayloadQuality).toBeNull();
    });
  });

  // â”€â”€ getLineageTrend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('getLineageTrend()', () => {
    it('should group decisions by day and compute averages', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const decisions = [
        { scoringSnapshot: { featureLineage: { rawCount: 80, derivedCount: 20, imputedCount: 5 } }, decidedAt: today },
        { scoringSnapshot: { featureLineage: { rawCount: 75, derivedCount: 25, imputedCount: 8 } }, decidedAt: today },
        { scoringSnapshot: { featureLineage: { rawCount: 60, derivedCount: 30, imputedCount: 15 } }, decidedAt: yesterday },
      ];

      prismaMock = buildPrismaMock({ findMany: jest.fn().mockResolvedValue(decisions) });
      await buildModule({ decision: prismaMock.decision });

      const result = await service.getLineageTrend(30);
      expect(result.trend.length).toBeGreaterThanOrEqual(1);
      const todayEntry = result.trend.find(t =>
        t.date === today.toISOString().split('T')[0]
      );
      expect(todayEntry).toBeDefined();
      // Average imputed for today: (5+8)/2 = 6.5
      expect(todayEntry!.avgImputedCount).toBeCloseTo(6.5, 1);
    });
  });
});
