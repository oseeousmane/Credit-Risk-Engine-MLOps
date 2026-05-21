import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { ReportingService } from './reporting.service';

@Controller('reporting')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.CRO, Role.ADMIN)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  /**
   * GET /reporting/ifrs9-cobac
   * Generates and streams an IFRS 9 / COBAC regulatory Excel report.
   * Restricted to CRO and ADMIN roles.
   */
  @Get('ifrs9-cobac')
  async getIfrs9CobacReport(@Res() res: Response) {
    const buffer = await this.reportingService.generateIfrs9CobacReport();
    const filename = `COBAC_IFRS9_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
