import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * FeatureAnalyticsService
 *
 * Turns feature quality into a first-class analytics layer.
 * Operates by mining the JSONB scoringSnapshot field across all persisted
 * Decisions to produce audit-grade, reproducible insights.
 */
@Injectable()
export class FeatureAnalyticsService {
  private readonly logger = new Logger(FeatureAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the most frequently missing (imputed) features across all decisions.
   * Reveals systemic data gaps for backlog prioritisation.
   */
  async getMostFrequentlyMissingFeatures(limit = 30) {
    const decisions = await this.prisma.decision.findMany({
      select: { scoringSnapshot: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const frequency: Record<string, number> = {};
    let total = 0;

    for (const d of decisions) {
      const snapshot = d.scoringSnapshot as any;
      const imputedFeatures: string[] = snapshot?.featureLineage?.imputedFeatures ?? [];
      if (imputedFeatures.length > 0) {
        total++;
        for (const feat of imputedFeatures) {
          frequency[feat] = (frequency[feat] ?? 0) + 1;
        }
      }
    }

    const sorted = Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([feature, count]) => ({
        feature,
        missingCount: count,
        missingRate: total > 0 ? parseFloat((count / total).toFixed(3)) : 0,
      }));

    return {
      analysedDecisions: decisions.length,
      decisionsWithImputations: total,
      topMissingFeatures: sorted,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Segments payload quality by dimension: sector, riskLevel, qualityBand, facilityType.
   * Reveals which client segments suffer the worst data quality.
   */
  async getPayloadQualitySegmentation() {
    const decisions = await this.prisma.decision.findMany({
      select: {
        scoringSnapshot: true,
        application: {
          select: {
            metadata: true,
            counterparty: {
              select: { sector: true, riskLevel: true, industry: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const bySector: Record<string, number[]> = {};
    const byRisk: Record<string, number[]> = {};
    const byQualityBand: Record<string, number> = {};

    for (const d of decisions) {
      const snap = d.scoringSnapshot as any;
      const quality = snap?.payloadQualityScore as number | null;
      const band = snap?.qualityBand as string | null;
      const sector = (d.application?.counterparty as any)?.sector ?? 'UNKNOWN';
      const risk = (d.application?.counterparty as any)?.riskLevel ?? 'UNKNOWN';

      if (quality != null) {
        bySector[sector] = bySector[sector] ?? [];
        bySector[sector].push(quality);
        byRisk[risk] = byRisk[risk] ?? [];
        byRisk[risk].push(quality);
      }
      if (band) byQualityBand[band] = (byQualityBand[band] ?? 0) + 1;
    }

    const avg = (arr: number[]) =>
      arr.length > 0 ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : null;

    return {
      bySector: Object.entries(bySector).map(([sector, scores]) => ({
        sector,
        avgPayloadQuality: avg(scores),
        sampleCount: scores.length,
        qualityRating: avg(scores) != null
          ? (avg(scores)! >= 60 ? 'HIGH' : avg(scores)! >= 35 ? 'MEDIUM' : 'LOW')
          : 'UNKNOWN',
      })).sort((a, b) => (a.avgPayloadQuality ?? 0) - (b.avgPayloadQuality ?? 0)),

      byRiskLevel: Object.entries(byRisk).map(([riskLevel, scores]) => ({
        riskLevel,
        avgPayloadQuality: avg(scores),
        sampleCount: scores.length,
      })).sort((a, b) => (a.avgPayloadQuality ?? 0) - (b.avgPayloadQuality ?? 0)),

      qualityBandDistribution: Object.entries(byQualityBand).map(([band, count]) => ({
        band,
        count,
        pct: decisions.length > 0 ? parseFloat((count / decisions.length * 100).toFixed(1)) : 0,
      })),

      analysedDecisions: decisions.length,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Breakdown of lineage proportions: raw vs derived vs imputed over time.
   * Shows the evolution of data quality as the platform matures.
   */
  async getLineageTrend(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const decisions = await this.prisma.decision.findMany({
      where: { decidedAt: { gte: since } },
      select: { scoringSnapshot: true, decidedAt: true },
      orderBy: { decidedAt: 'asc' },
    });

    const byDay: Record<string, { raw: number[]; derived: number[]; imputed: number[] }> = {};

    for (const d of decisions) {
      const snap = d.scoringSnapshot as any;
      const lineage = snap?.featureLineage;
      if (!lineage || !d.decidedAt) continue;
      const day = d.decidedAt.toISOString().split('T')[0];
      byDay[day] = byDay[day] ?? { raw: [], derived: [], imputed: [] };
      byDay[day].raw.push(lineage.rawCount ?? 0);
      byDay[day].derived.push(lineage.derivedCount ?? 0);
      byDay[day].imputed.push(lineage.imputedCount ?? 0);
    }

    const avg = (arr: number[]) =>
      arr.length > 0 ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : 0;

    return {
      windowDays: days,
      trend: Object.entries(byDay).map(([date, v]) => ({
        date,
        avgRawCount: avg(v.raw),
        avgDerivedCount: avg(v.derived),
        avgImputedCount: avg(v.imputed),
        sampleCount: v.raw.length,
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Overall feature coverage summary for MRM review.
   * Single-page view of data quality health.
   */
  async getFeatureCoverageSummary() {
    const decisions = await this.prisma.decision.findMany({
      select: { scoringSnapshot: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const qualities: number[] = [];
    const imputedCounts: number[] = [];
    const bandCounts: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };

    for (const d of decisions) {
      const snap = d.scoringSnapshot as any;
      const q = snap?.payloadQualityScore;
      const ic = snap?.featureLineage?.imputedCount;
      const band = snap?.qualityBand;
      if (q != null) qualities.push(q);
      if (ic != null) imputedCounts.push(ic);
      if (band && band in bandCounts) bandCounts[band]++;
    }

    const avg = (arr: number[]) =>
      arr.length > 0 ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : null;

    const avgQuality = avg(qualities);
    const overallBand = avgQuality == null ? 'UNKNOWN'
      : avgQuality >= 60 ? 'HIGH' : avgQuality >= 35 ? 'MEDIUM' : 'LOW';

    return {
      totalDecisionsAnalysed: decisions.length,
      avgPayloadQuality: avgQuality,
      avgImputedFeaturesCount: avg(imputedCounts),
      overallQualityBand: overallBand,
      qualityBandDistribution: bandCounts,
      mrmNote: avgQuality != null && avgQuality < 35
        ? 'ALERT: Average payload quality is LOW. Data onboarding review recommended.'
        : avgQuality != null && avgQuality < 60
        ? 'CAUTION: Average payload quality is MEDIUM. Targeted backlog items can improve model inputs.'
        : 'Data quality is acceptable. Continue monitoring trends.',
      generatedAt: new Date().toISOString(),
    };
  }
}
