import { Controller, Get, Patch, Body, Param, Req, Query, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { ComplianceService } from './compliance.service';

@UseGuards(AuthGuard('jwt'))
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('items')
  getItems() {
    return this.complianceService.getItems();
  }

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
   */
  @Get('audit')
  getAudit(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.complianceService.getAuditEvents(Number(page), Number(limit));
  }

  /**
   * GET /compliance/export/audit
   * Downloads audit events as a CSV file.
   */
  @Get('export/audit')
  async exportAudit(@Res() res: Response) {
    const csv = await this.complianceService.exportAuditCsv();
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
  getIfrs9StageReport() {
    return this.complianceService.getIfrs9StageReport();
  }

  /**
   * GET /compliance/reports/fallback-incidents
   * Fallback engine incident report for MRM governance.
   */
  @Get('reports/fallback-incidents')
  getFallbackIncidents(@Query('limit') limit?: string) {
    return this.complianceService.getFallbackIncidents(limit ? parseInt(limit, 10) : 100);
  }

  /**
   * GET /compliance/reports/overrides
   * ML override activity report â€” MRM sign-off track.
   */
  @Get('reports/overrides')
  getOverrideActivityReport(@Query('limit') limit?: string) {
    return this.complianceService.getOverrideActivityReport(limit ? parseInt(limit, 10) : 100);
  }

  /**
   * GET /compliance/reports/portfolio
   * Portfolio ECL summary by sector â€” regulatory reporting ready.
   */
  @Get('reports/portfolio')
  getPortfolioReport() {
    return this.complianceService.getPortfolioReport();
  }
}
