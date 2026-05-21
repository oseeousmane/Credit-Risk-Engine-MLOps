import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { ScoringService } from './scoring.service';
import { AdhocScoringDto } from './dto/adhoc-scoring.dto';
import { randomUUID } from 'crypto';

@Controller('scoring')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ANALYST, Role.MANAGER, Role.CRO, Role.ADMIN)
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  /**
   * POST /scoring/adhoc
   * Ad-hoc PD scoring without requiring an existing DB application.
   * Used by the scoring sandbox page. Rate-limited to 10 req/min per user.
   */
  @Throttle({ scoring: { limit: 10, ttl: 60000 } })
  @Post('adhoc')
  async adhocScore(@Body() body: AdhocScoringDto) {
    return this.scoringService.score({
      applicationId: `ADHOC-${randomUUID().slice(0, 8).toUpperCase()}`,
      pdCurrent: body.pdCurrent ?? 2.0,
      exposure: body.exposure ?? body.requestedAmount ?? 5,
      riskLevel: body.riskLevel ?? 'MED',
      requestedAmount: body.requestedAmount,
      sector: body.sector,
      internalRating: body.internalRating,
      yearsInBusiness: body.yearsInBusiness,
      watchlistFlag: body.watchlistFlag ?? false,
      revenue: body.revenue,
      ebitda: body.ebitda,
      totalDebt: body.totalDebt,
      operatingCashFlow: body.operatingCashFlow,
      collateralValue: body.collateralValue,
      collateralType: body.collateralType,
      tenorMonths: body.tenorMonths,
      facilityType: body.facilityType,
      daysPastDue: body.daysPastDue ?? 0,
      missedPayments24m: body.missedPayments24m ?? 0,
      bureauScore: body.bureauScore,
    });
  }
}
