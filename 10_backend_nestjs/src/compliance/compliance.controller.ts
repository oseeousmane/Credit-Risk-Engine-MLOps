import { Controller, Get, Patch, Body, Param, Req, Query, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { ComplianceService } from './compliance.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.MANAGER, Role.CRO, Role.ADMIN)
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('items')
  getItems() {
    return this.complianceService.getItems();
  }

  @Roles(Role.CRO, Role.ADMIN)
  @Patch('items/:id')
  updateItem(
    @Param('id') id: string,
    @Body() body: { status?: string; detail?: string; lastValidated?: string },
    @Req() req: any,
  ) {
    return this.complianceService.updateItem(
      id,
      {
        status: body.status,
        detail: body.detail,
        lastValidated: body.lastValidated ? new Date(body.lastValidated) : undefined,
      },
      req.user.id,
    );
  }

  @Get('documents')
  getDocuments() {
    return this.complianceService.getDocuments();
  }

  /**
   * GET /compliance/audit
   * Returns paginated audit events for the Compliance page.
   * Optional: ?startDate=2026-01-01&endDate=2026-03-31 for period filtering.
   */
  @Get('audit')
  getAudit(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.complianceService.getAuditEvents(
      Number(page),
      Number(limit),
      startDate ? new Date(startDate) : undefined,
      endDate   ? new Date(endDate)   : undefined,
    );
  }

  /**
   * GET /compliance/export/audit
   * Downloads audit events as a CSV file — no row cap (full trail).
   * Optional: ?startDate=2026-01-01&endDate=2026-03-31 for period filtering.
   */
  @Get('export/audit')
  async exportAudit(
    @Req() req: any,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const csv = await this.complianceService.exportAuditCsv(
      req.user.id,
      startDate ? new Date(startDate) : undefined,
      endDate   ? new Date(endDate)   : undefined,
    );
    const filename = `audit_trail_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // â”€â”€ Phase 4: Portfolio & Regulatory Reporting Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * GET /compliance/reports/ifrs9-stages
   * IFRS 9 Stage distribution report â€” committee pack ready.
   */
  @Get('reports/ifrs9-stages')
  getIfrs9StageReport(@Req() req: any) {
    return this.complianceService.getIfrs9StageReport(req.user.id);
  }

  /**
   * GET /compliance/reports/fallback-incidents
   * Fallback engine incident report for MRM governance.
   */
  @Get('reports/fallback-incidents')
  getFallbackIncidents(@Req() req: any, @Query('limit') limit?: string) {
    return this.complianceService.getFallbackIncidents(req.user.id, limit ? parseInt(limit, 10) : 100);
  }

  /**
   * GET /compliance/reports/overrides
   * ML override activity report â€” MRM sign-off track.
   */
  @Get('reports/overrides')
  getOverrideActivityReport(@Req() req: any, @Query('limit') limit?: string) {
    return this.complianceService.getOverrideActivityReport(req.user.id, limit ? parseInt(limit, 10) : 100);
  }

  /**
   * GET /compliance/reports/portfolio
   * Portfolio ECL summary by sector â€” regulatory reporting ready.
   */
  @Get('reports/portfolio')
  getPortfolioReport(@Req() req: any) {
    return this.complianceService.getPortfolioReport(req.user.id);
  }
}
