import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

// Basel III Standardized Approach — simplified risk weights by risk level
const RWA_WEIGHTS: Record<string, number> = {
  LOW: 0.20,
  MED: 0.75,
  HIGH: 1.00,
  CRITICAL: 1.50,
};

const PCT = (v: number) => `${(v * 100).toFixed(2)}%`;

// ── Brand colors ──────────────────────────────────────────────────────────────
const COLORS = {
  headerBg: '1A3C5E',
  headerFg: 'FFFFFF',
  stage1Bg: 'D4EDDA',
  stage1Fg: '155724',
  stage2Bg: 'FFF3CD',
  stage2Fg: '856404',
  stage3Bg: 'F8D7DA',
  stage3Fg: '721C24',
  totalBg: 'E9ECEF',
  totalFg: '212529',
  titleFg: '1A3C5E',
  subtitleFg: '6C757D',
  redBold: 'DC3545',
  labelFg: '495057',
  borderColor: 'DEE2E6',
};

function applyHeaderStyle(cell: ExcelJS.Cell) {
  cell.font = { bold: true, color: { argb: 'FF' + COLORS.headerFg }, size: 10, name: 'Calibri' };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.headerBg } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FF' + COLORS.borderColor } },
    left: { style: 'thin', color: { argb: 'FF' + COLORS.borderColor } },
    bottom: { style: 'thin', color: { argb: 'FF' + COLORS.borderColor } },
    right: { style: 'thin', color: { argb: 'FF' + COLORS.borderColor } },
  };
}

function applyDataStyle(cell: ExcelJS.Cell) {
  cell.font = { size: 10, name: 'Calibri' };
  cell.alignment = { vertical: 'middle' };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFDEE2E6' } },
    left: { style: 'thin', color: { argb: 'FFDEE2E6' } },
    bottom: { style: 'thin', color: { argb: 'FFDEE2E6' } },
    right: { style: 'thin', color: { argb: 'FFDEE2E6' } },
  };
}

function applyTotalStyle(cell: ExcelJS.Cell) {
  cell.font = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FF' + COLORS.totalFg } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.totalBg } };
  cell.alignment = { vertical: 'middle' };
  cell.border = {
    top: { style: 'medium', color: { argb: 'FF' + COLORS.headerBg } },
    left: { style: 'thin', color: { argb: 'FFDEE2E6' } },
    bottom: { style: 'medium', color: { argb: 'FF' + COLORS.headerBg } },
    right: { style: 'thin', color: { argb: 'FFDEE2E6' } },
  };
}

function applyStageStyle(cell: ExcelJS.Cell, stage: string) {
  const map: Record<string, { bg: string; fg: string }> = {
    STAGE_1: { bg: COLORS.stage1Bg, fg: COLORS.stage1Fg },
    STAGE_2: { bg: COLORS.stage2Bg, fg: COLORS.stage2Fg },
    STAGE_3: { bg: COLORS.stage3Bg, fg: COLORS.stage3Fg },
  };
  const s = map[stage];
  if (!s) return applyDataStyle(cell);
  cell.font = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FF' + s.fg } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + s.bg } };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFDEE2E6' } },
    left: { style: 'thin', color: { argb: 'FFDEE2E6' } },
    bottom: { style: 'thin', color: { argb: 'FFDEE2E6' } },
    right: { style: 'thin', color: { argb: 'FFDEE2E6' } },
  };
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateIfrs9CobacReport(): Promise<Buffer> {
    this.logger.log('[REPORTING] Generating IFRS 9 / COBAC Excel report (exceljs)');

    const [counterparties, decisions] = await Promise.all([
      this.prisma.counterparty.findMany({
        select: {
          id: true, name: true, lei: true, sector: true, internalRating: true,
          riskLevel: true, ifrs9Stage: true, pd1y: true, exposure: true,
          expectedLoss: true, watchlistFlag: true,
        },
        orderBy: { exposure: 'desc' },
      }),
      this.prisma.decision.findMany({
        where: { status: { in: ['APPROVE', 'APPROVE_WITH_CONDITIONS'] } },
        select: { scoringSnapshot: true, counterpartyId: true },
      }),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Octaix Risk Engine';
    wb.created = new Date();
    wb.modified = new Date();

    this.buildCoverSheet(wb, counterparties.length);
    this.buildStagingSheet(wb, counterparties);
    this.buildSectorSheet(wb, counterparties);
    this.buildTopExposuresSheet(wb, counterparties);
    this.buildRwaSheet(wb, counterparties);

    const buffer = await wb.xlsx.writeBuffer();

    this.logger.log(
      `[REPORTING] Done — ${counterparties.length} counterparties, ${decisions.length} decisions`,
    );
    return Buffer.from(buffer);
  }

  // ── Sheet builders ─────────────────────────────────────────────────────────

  private buildCoverSheet(wb: ExcelJS.Workbook, total: number) {
    const ws = wb.addWorksheet('Couverture');
    ws.columns = [{ width: 40 }, { width: 55 }];

    const today = new Date();

    const addRow = (label: string, value: string, isTitleRow = false) => {
      const row = ws.addRow([label, value]);
      if (isTitleRow) {
        row.getCell(1).font = { bold: true, size: 16, color: { argb: 'FF' + COLORS.titleFg }, name: 'Calibri' };
        row.height = 28;
      } else if (label === '') {
        // empty spacer
      } else {
        row.getCell(1).font = { bold: true, size: 10, color: { argb: 'FF' + COLORS.labelFg }, name: 'Calibri' };
        row.getCell(2).font = { size: 10, name: 'Calibri' };
      }
    };

    ws.addRow([]);
    addRow('RAPPORT PRUDENTIEL IFRS 9 / COBAC', '', true);
    const subtitleRow = ws.addRow(['Plateforme de Gestion des Risques de Crédit — Zone CEMAC / XAF', '']);
    subtitleRow.getCell(1).font = { italic: true, size: 11, color: { argb: 'FF' + COLORS.subtitleFg }, name: 'Calibri' };
    ws.addRow([]);

    addRow('Date de génération', today.toLocaleDateString('fr-FR', { dateStyle: 'full' }));
    addRow('Heure UTC', today.toISOString());
    addRow('Référentiel', 'IFRS 9 — Instruments financiers (Phase 3 dépréciation)');
    addRow('Cadre prudentiel', 'Bâle III — Approche Standard (COBAC R-2018)');
    addRow('Devise de reporting', 'XAF (Franc CFA BEAC)');
    addRow('Contreparties', String(total));
    addRow('Généré par', 'Octaix Risk Engine v1.0');
    ws.addRow([]);

    const warningRow = ws.addRow(['⚠ Document confidentiel — Usage interne et réglementaire exclusivement.', '']);
    warningRow.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF856404' }, name: 'Calibri' };
  }

  private buildStagingSheet(wb: ExcelJS.Workbook, cps: any[]) {
    const ws = wb.addWorksheet('IFRS 9 — Staging');
    ws.columns = [
      { width: 16 }, { width: 42 }, { width: 18 }, { width: 22 }, { width: 22 }, { width: 20 }, { width: 16 },
    ];

    const headerRow = ws.addRow([
      'Stage IFRS 9', 'Description', 'Nb Contreparties',
      'EAD Total (M XAF)', 'ECL Total (M XAF)', 'Taux de couverture', 'PD Moyenne',
    ]);
    headerRow.height = 30;
    headerRow.eachCell((cell: ExcelJS.Cell) => applyHeaderStyle(cell));
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    const stageDesc: Record<string, string> = {
      STAGE_1: 'Actifs sains — Dépréciation 12 mois',
      STAGE_2: 'Dégradation significative du risque (SICR)',
      STAGE_3: 'Actifs en défaut — Dépréciation vie entière',
    };
    const grouped = groupBy(cps, (c) => c.ifrs9Stage);
    let totalEad = 0, totalEcl = 0, totalCount = 0;

    for (const stage of ['STAGE_1', 'STAGE_2', 'STAGE_3']) {
      const group = grouped[stage] || [];
      const ead = group.reduce((s: number, c: any) => s + c.exposure, 0);
      const ecl = group.reduce((s: number, c: any) => s + c.expectedLoss, 0);
      const avgPd = group.length ? group.reduce((s: number, c: any) => s + c.pd1y, 0) / group.length : 0;
      totalEad += ead; totalEcl += ecl; totalCount += group.length;

      const row = ws.addRow([
        stage, stageDesc[stage] ?? '', group.length,
        ead.toFixed(3), ecl.toFixed(3),
        ead > 0 ? PCT(ecl / ead) : '0.00%', PCT(avgPd),
      ]);
      row.height = 20;
      applyStageStyle(row.getCell(1), stage);
      for (let i = 2; i <= 7; i++) applyDataStyle(row.getCell(i));
    }

    const totalPd = totalCount ? cps.reduce((s, c) => s + c.pd1y, 0) / totalCount : 0;
    const totRow = ws.addRow([
      'TOTAL PORTEFEUILLE', '', totalCount,
      totalEad.toFixed(3), totalEcl.toFixed(3),
      totalEad > 0 ? PCT(totalEcl / totalEad) : '0.00%', PCT(totalPd),
    ]);
    totRow.height = 22;
    totRow.eachCell((cell: ExcelJS.Cell) => applyTotalStyle(cell));
  }

  private buildSectorSheet(wb: ExcelJS.Workbook, cps: any[]) {
    const ws = wb.addWorksheet('ECL par Secteur');
    ws.columns = [
      { width: 30 }, { width: 18 }, { width: 22 }, { width: 20 }, { width: 16 }, { width: 20 }, { width: 16 },
    ];

    const headerRow = ws.addRow([
      'Secteur', 'Nb Contreparties', 'Exposition (M XAF)',
      'ECL (M XAF)', 'PD Moyenne', 'Taux de couverture', 'En Watch List',
    ]);
    headerRow.height = 30;
    headerRow.eachCell((cell: ExcelJS.Cell) => applyHeaderStyle(cell));
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    const grouped = groupBy(cps, (c) => c.sector);
    Object.keys(grouped).sort().forEach((sector) => {
      const group = grouped[sector];
      const ead = group.reduce((s: number, c: any) => s + c.exposure, 0);
      const ecl = group.reduce((s: number, c: any) => s + c.expectedLoss, 0);
      const avgPd = group.reduce((s: number, c: any) => s + c.pd1y, 0) / group.length;
      const watchlist = group.filter((c: any) => c.watchlistFlag).length;

      const row = ws.addRow([
        sector, group.length, ead.toFixed(3),
        ecl.toFixed(3), PCT(avgPd),
        ead > 0 ? PCT(ecl / ead) : '0.00%', watchlist,
      ]);
      row.height = 20;
      row.eachCell((cell: ExcelJS.Cell) => applyDataStyle(cell));
    });
  }

  private buildTopExposuresSheet(wb: ExcelJS.Workbook, cps: any[]) {
    const ws = wb.addWorksheet('Top 20 Expositions');
    ws.columns = [
      { width: 5 }, { width: 28 }, { width: 22 }, { width: 22 },
      { width: 16 }, { width: 14 }, { width: 12 }, { width: 22 }, { width: 20 }, { width: 14 },
    ];

    const headerRow = ws.addRow([
      '#', 'Contrepartie', 'LEI', 'Secteur',
      'Notation Interne', 'Stage IFRS 9', 'PD 1 an',
      'Exposition (M XAF)', 'ECL (M XAF)', 'Watch List',
    ]);
    headerRow.height = 30;
    headerRow.eachCell((cell: ExcelJS.Cell) => applyHeaderStyle(cell));
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    cps.slice(0, 20).forEach((c: any, i: number) => {
      const row = ws.addRow([
        i + 1, c.name, c.lei ?? '', c.sector,
        c.internalRating ?? '', c.ifrs9Stage, PCT(c.pd1y),
        c.exposure.toFixed(3), c.expectedLoss.toFixed(3),
        c.watchlistFlag ? 'OUI ⚠' : 'Non',
      ]);
      row.height = 20;
      row.eachCell((cell: ExcelJS.Cell) => applyDataStyle(cell));

      // Stage coloring
      applyStageStyle(row.getCell(6), c.ifrs9Stage);

      // Watch list alert
      if (c.watchlistFlag) {
        const wCell = row.getCell(10);
        wCell.font = { bold: true, color: { argb: 'FF' + COLORS.redBold }, size: 10, name: 'Calibri' };
      }
    });
  }

  private buildRwaSheet(wb: ExcelJS.Workbook, cps: any[]) {
    const ws = wb.addWorksheet('RWA — Bâle III');
    ws.columns = [
      { width: 20 }, { width: 20 }, { width: 18 }, { width: 20 }, { width: 20 }, { width: 26 },
    ];

    const headerRow = ws.addRow([
      'Niveau de Risque', 'Pondération (Std.)', 'Nb Contreparties',
      'EAD (M XAF)', 'RWA (M XAF)', 'Exigence CET1 8% (M XAF)',
    ]);
    headerRow.height = 30;
    headerRow.eachCell((cell: ExcelJS.Cell) => applyHeaderStyle(cell));
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    const grouped = groupBy(cps, (c) => c.riskLevel);
    let totalEad = 0, totalRwa = 0;

    for (const level of ['LOW', 'MED', 'HIGH', 'CRITICAL']) {
      const group = grouped[level] || [];
      const ead = group.reduce((s: number, c: any) => s + c.exposure, 0);
      const weight = RWA_WEIGHTS[level] ?? 1.0;
      const rwa = ead * weight;
      totalEad += ead; totalRwa += rwa;

      const row = ws.addRow([
        level, PCT(weight), group.length, ead.toFixed(3), rwa.toFixed(3), (rwa * 0.08).toFixed(3),
      ]);
      row.height = 20;
      row.eachCell((cell: ExcelJS.Cell) => applyDataStyle(cell));
    }

    const totRow = ws.addRow([
      'TOTAL', '—', cps.length, totalEad.toFixed(3), totalRwa.toFixed(3), (totalRwa * 0.08).toFixed(3),
    ]);
    totRow.height = 22;
    totRow.eachCell((cell: ExcelJS.Cell) => applyTotalStyle(cell));

    ws.addRow([]);
    const noteRow = ws.addRow([
      `Ratio CET1 minimum COBAC: 8% | Total RWA: ${totalRwa.toFixed(3)} M XAF | Fonds propres min. requis: ${(totalRwa * 0.08).toFixed(3)} M XAF`,
    ]);
    noteRow.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF' + COLORS.subtitleFg }, name: 'Calibri' };
    ws.mergeCells(noteRow.number, 1, noteRow.number, 6);
  }
}
