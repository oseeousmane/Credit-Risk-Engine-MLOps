import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // â”€â”€ Compliance Items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getItems() {
    return this.prisma.complianceItem.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updateItem(id: string, data: { status?: string; detail?: string; lastValidated?: Date }, actorId: string) {
    const existing = await this.prisma.complianceItem.findUniqueOrThrow({ where: { id } });

    const updated = await this.prisma.complianceItem.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status as any }),
        ...(data.detail && { detail: data.detail }),
        ...(data.lastValidated && { lastValidated: data.lastValidated }),
        updatedAt: new Date(),
      },
    });

    await this.audit.log({
      eventType: 'COMPLIANCE_ITEM_UPDATED',
      entityType: 'ComplianceItem',
      entityId: id,
      actorId,
      previousValue: { status: existing.status, detail: existing.detail },
      newValue: { status: updated.status, detail: updated.detail },
    });

    return updated;
  }

  // â”€â”€ Tech Documents â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getDocuments() {
    return this.prisma.techDocument.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  // â”€â”€ Audit Trail Export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getAuditEvents(page = 1, limit = 50, startDate?: Date, endDate?: Date) {
    const skip = (page - 1) * limit;
    const where = startDate || endDate ? {
      timestamp: {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate   ? { lte: endDate   } : {}),
      },
    } : {};

    const [events, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        skip,
        take: limit,
        where,
        orderBy: { timestamp: 'desc' },
        include: {
          actor: { select: { name: true, email: true, role: true } },
        },
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    return { data: events, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async exportAuditCsv(actorId: string, startDate?: Date, endDate?: Date): Promise<string> {
    const where = startDate || endDate ? {
      timestamp: {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate   ? { lte: endDate   } : {}),
      },
    } : {};

    // No row cap — full trail required for COBAC/ECB audit submissions
    const events = await this.prisma.auditEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      include: {
        actor: { select: { name: true, email: true, role: true } },
      },
    });

    const headers = ['id', 'timestamp', 'eventType', 'entityType', 'entityId', 'actorName', 'actorEmail', 'actorRole', 'previousValue', 'newValue'];

    const rows = events.map(e => [
      e.id,
      e.timestamp.toISOString(),
      e.eventType,
      e.entityType,
      e.entityId,
      e.actor?.name ?? 'SYSTEM',
      e.actor?.email ?? '',
      e.actor?.role ?? '',
      JSON.stringify(e.previousValue ?? {}),
      JSON.stringify(e.newValue ?? {}),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

    // Record the export itself — required by COBAC art. 38 record-keeping rules
    await this.audit.log({
      eventType: 'AUDIT_EXPORT',
      entityType: 'AuditEvent',
      entityId: 'BULK',
      actorId,
      newValue: {
        rowsExported: events.length,
        startDate: startDate?.toISOString() ?? null,
        endDate: endDate?.toISOString() ?? null,
      },
    });

    return [headers.join(','), ...rows].join('\n');
  }

  // â”€â”€ Phase 4: Portfolio & Regulatory Reporting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * IFRS 9 Stage Distribution Report
   * Structured for committee packs and regulator-oriented summaries.
   */
  async getIfrs9StageReport(actorId: string) {
    const counterparties = await this.prisma.counterparty.findMany({
      select: {
        id: true, name: true, sector: true, ifrs9Stage: true,
        pd1y: true, exposure: true, expectedLoss: true, riskLevel: true,
      },
    });

    const stageBuckets: Record<string, { count: number; totalExposure: number; totalECL: number; entities: any[] }> = {
      STAGE_1: { count: 0, totalExposure: 0, totalECL: 0, entities: [] },
      STAGE_2: { count: 0, totalExposure: 0, totalECL: 0, entities: [] },
      STAGE_3: { count: 0, totalExposure: 0, totalECL: 0, entities: [] },
    };

    let totalExposure = 0;
    let totalECL = 0;

    for (const c of counterparties) {
      const stage = c.ifrs9Stage ?? 'STAGE_1';
      const exposure = c.exposure ?? 0;
      const ecl = c.expectedLoss ?? 0;

      stageBuckets[stage].count++;
      stageBuckets[stage].totalExposure += exposure;
      stageBuckets[stage].totalECL += ecl;
      stageBuckets[stage].entities.push({
        id: c.id, name: c.name, sector: c.sector,
        pd: c.pd1y, exposure, ecl, riskLevel: c.riskLevel,
      });

      totalExposure += exposure;
      totalECL += ecl;
    }

    return {
      reportType: 'IFRS9_STAGE_DISTRIBUTION',
      generatedAt: new Date().toISOString(),
      generatedBy: actorId,
      portfolioSummary: {
        totalEntities: counterparties.length,
        totalExposure: Math.round(totalExposure * 10) / 10,
        totalECL: Math.round(totalECL * 10) / 10,
      },
      stageBreakdown: Object.entries(stageBuckets).map(([stage, data]) => ({
        stage,
        count: data.count,
        pct: counterparties.length > 0 ? parseFloat(((data.count / counterparties.length) * 100).toFixed(1)) : 0,
        totalExposure: Math.round(data.totalExposure * 10) / 10,
        totalECL: Math.round(data.totalECL * 10) / 10,
        exposureShare: totalExposure > 0 ? parseFloat(((data.totalExposure / totalExposure) * 100).toFixed(1)) : 0,
        entities: data.entities.slice(0, 20),
      })),
    };
  }

  /**
   * Fallback Engine Incident Report
   * Lists all times the Python ML engine was unavailable and the rule-based fallback was used.
   * Critical MRM governance document.
   */
  async getFallbackIncidents(actorId: string, limit = 100) {
    const fallbackAuditEvents = await this.prisma.auditEvent.findMany({
      where: { eventType: 'FALLBACK_ENGINE_USED' },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: { actor: { select: { name: true, role: true } } },
    });

    const fallbackAlerts = await this.prisma.alert.findMany({
      where: { message: { contains: 'FALLBACK' } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      reportType: 'FALLBACK_INCIDENTS',
      generatedAt: new Date().toISOString(),
      generatedBy: actorId,
      totalIncidents: fallbackAuditEvents.length,
      mrmNote: fallbackAuditEvents.length > 10
        ? 'HIGH fallback frequency. Review Python scoring service availability and model connectivity.'
        : fallbackAuditEvents.length > 3
        ? 'MODERATE fallback frequency. Monitor closely.'
        : 'Fallback usage within acceptable bounds.',
      auditTrail: fallbackAuditEvents.map(e => ({
        timestamp: e.timestamp,
        entityId: e.entityId,
        actor: e.actor?.name ?? 'SYSTEM',
        detail: e.newValue,
      })),
      alertLog: fallbackAlerts,
    };
  }

  /**
   * Override Activity Report â€” all cases where a human overrode the ML recommendation.
   * Critical for IFRS 9 MRM governance and COBAC/ECB audit readiness.
   */
  async getOverrideActivityReport(actorId: string, limit = 100) {
    const overrides = await this.prisma.auditEvent.findMany({
      where: { eventType: 'DECISION_OVERRIDE' },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: { actor: { select: { name: true, role: true, email: true } } },
    });

    const decisions = await this.prisma.decision.findMany({
      where: { overrideFlag: true },
      orderBy: { decidedAt: 'desc' },
      take: limit,
      include: {
        decidedBy: { select: { name: true, role: true } },
        application: { select: { id: true, counterparty: { select: { name: true } } } },
      },
    });

    return {
      reportType: 'OVERRIDE_ACTIVITY',
      generatedAt: new Date().toISOString(),
      generatedBy: actorId,
      totalOverrides: decisions.length,
      mrmNote: decisions.length > 0
        ? `${decisions.length} ML recommendation overrides detected. Requires MRM sign-off per governance policy.`
        : 'No ML overrides recorded in this period.',
      overrideDecisions: decisions.map(d => ({
        decisionId: d.id,
        applicationId: d.applicationId,
        counterpartyName: d.application?.counterparty?.name ?? 'UNKNOWN',
        decidedBy: d.decidedBy?.name,
        decidedByRole: d.decidedBy?.role,
        decidedAt: d.decidedAt,
        overrideReason: d.overrideReason,
        finalStatus: d.status,
      })),
      auditTrail: overrides.map(e => ({
        timestamp: e.timestamp,
        actorName: e.actor?.name ?? 'SYSTEM',
        actorRole: e.actor?.role,
        previousValue: e.previousValue,
        newValue: e.newValue,
      })),
    };
  }

  /**
   * Portfolio ECL Summary Report
   * Sector-level exposure and ECL summary ready for committee reporting.
   */
  /**
   * ECL Monthly Trend.
   * Primary: Decision.scoringSnapshot.ecl grouped by decidedAt month.
   * Fallback: if no scored decisions exist, reconstructs trend from Counterparty.expectedLoss
   * grouped by createdAt — shows portfolio ECL build-up over time.
   */
  async getEclTrend(months = 12) {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const decisions = await this.prisma.decision.findMany({
      where: { decidedAt: { gte: since } },
      select: { decidedAt: true, scoringSnapshot: true },
      orderBy: { decidedAt: 'asc' },
    });

    // Group by YYYY-MM — only include decisions that have ecl in their snapshot
    const byMonth: Record<string, { ecls: number[]; eads: number[] }> = {};
    for (const d of decisions) {
      if (!d.decidedAt) continue;
      const snap = d.scoringSnapshot as any;
      const ecl = snap?.ecl ?? snap?.expectedLoss;
      const ead = snap?.ead ?? snap?.exposure;
      if (ecl == null) continue;
      const key = d.decidedAt.toISOString().slice(0, 7);
      if (!byMonth[key]) byMonth[key] = { ecls: [], eads: [] };
      byMonth[key].ecls.push(Number(ecl));
      if (ead != null) byMonth[key].eads.push(Number(ead));
    }

    const sorted = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b));

    if (sorted.length > 0) {
      let cumulativeEcl = 0;
      return sorted.map(([month, data]) => {
        const monthEcl = data.ecls.reduce((s, v) => s + v, 0);
        cumulativeEcl += monthEcl;
        return {
          month,
          label: new Date(month + '-01').toLocaleString('fr-FR', { month: 'short', year: '2-digit' }),
          newEcl: parseFloat(monthEcl.toFixed(3)),
          cumulativeEcl: parseFloat(cumulativeEcl.toFixed(3)),
          avgEad: data.eads.length > 0
            ? parseFloat((data.eads.reduce((s, v) => s + v, 0) / data.eads.length).toFixed(3))
            : null,
          count: data.ecls.length,
          source: 'decisions',
        };
      });
    }

    // ── Fallback: build trend from counterparty.expectedLoss grouped by createdAt ──
    const counterparties = await this.prisma.counterparty.findMany({
      select: { createdAt: true, expectedLoss: true, exposure: true },
      orderBy: { createdAt: 'asc' },
    });

    const cpByMonth: Record<string, { ecls: number[]; eads: number[] }> = {};
    for (const c of counterparties) {
      const ecl = c.expectedLoss;
      if (ecl == null || ecl === 0) continue;
      const key = c.createdAt.toISOString().slice(0, 7);
      if (!cpByMonth[key]) cpByMonth[key] = { ecls: [], eads: [] };
      cpByMonth[key].ecls.push(ecl);
      cpByMonth[key].eads.push(c.exposure ?? 0);
    }

    const cpSorted = Object.entries(cpByMonth).sort(([a], [b]) => a.localeCompare(b));
    if (cpSorted.length === 0) return [];

    let cumEcl = 0;
    return cpSorted.map(([month, data]) => {
      const monthEcl = data.ecls.reduce((s, v) => s + v, 0);
      cumEcl += monthEcl;
      return {
        month,
        label: new Date(month + '-01').toLocaleString('fr-FR', { month: 'short', year: '2-digit' }),
        newEcl: parseFloat(monthEcl.toFixed(3)),
        cumulativeEcl: parseFloat(cumEcl.toFixed(3)),
        avgEad: parseFloat((data.eads.reduce((s, v) => s + v, 0) / data.eads.length).toFixed(3)),
        count: data.ecls.length,
        source: 'counterparties',
      };
    });
  }

  async getPortfolioReport(actorId: string) {
    const counterparties = await this.prisma.counterparty.findMany({
      select: {
        sector: true, riskLevel: true, ifrs9Stage: true,
        exposure: true, expectedLoss: true, pd1y: true, watchlistFlag: true,
      },
    });

    const bySector: Record<string, { count: number; totalExposure: number; totalECL: number; watchlist: number }> = {};
    let totalExposure = 0;
    let totalECL = 0;
    let watchlistTotal = 0;

    for (const c of counterparties) {
      const sector = c.sector ?? 'UNKNOWN';
      if (!bySector[sector]) bySector[sector] = { count: 0, totalExposure: 0, totalECL: 0, watchlist: 0 };
      bySector[sector].count++;
      bySector[sector].totalExposure += c.exposure ?? 0;
      bySector[sector].totalECL += c.expectedLoss ?? 0;
      if (c.watchlistFlag) { bySector[sector].watchlist++; watchlistTotal++; }
      totalExposure += c.exposure ?? 0;
      totalECL += c.expectedLoss ?? 0;
    }

    return {
      reportType: 'PORTFOLIO_ECL_SUMMARY',
      generatedAt: new Date().toISOString(),
      generatedBy: actorId,
      portfolio: {
        totalEntities: counterparties.length,
        totalExposure: Math.round(totalExposure * 10) / 10,
        totalECL: Math.round(totalECL * 10) / 10,
        watchlistEntities: watchlistTotal,
        coverageRatio: totalExposure > 0 ? parseFloat(((totalECL / totalExposure) * 100).toFixed(2)) : 0,
      },
      bySector: Object.entries(bySector)
        .map(([sector, d]) => ({
          sector,
          count: d.count,
          totalExposure: Math.round(d.totalExposure * 10) / 10,
          totalECL: Math.round(d.totalECL * 10) / 10,
          watchlistCount: d.watchlist,
          eclCoverage: d.totalExposure > 0 ? parseFloat(((d.totalECL / d.totalExposure) * 100).toFixed(2)) : 0,
        }))
        .sort((a, b) => b.totalECL - a.totalECL),
    };
  }
}
