import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FeatureAnalyticsService } from './feature-analytics.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ANALYST, Role.MANAGER, Role.CRO, Role.ADMIN)
@Controller('feature-analytics')
export class FeatureAnalyticsController {
  constructor(private readonly service: FeatureAnalyticsService) {}

  /** GET /feature-analytics/missing-features â€” Most frequently imputed features */
  @Get('missing-features')
  getMostFrequentlyMissingFeatures(@Query('limit') limit?: string) {
    return this.service.getMostFrequentlyMissingFeatures(limit ? parseInt(limit, 10) : 30);
  }

  /** GET /feature-analytics/segmentation â€” Quality by sector / risk level */
  @Get('segmentation')
  getPayloadQualitySegmentation() {
    return this.service.getPayloadQualitySegmentation();
  }

  /** GET /feature-analytics/lineage-trend â€” Raw/Derived/Imputed ratios over time */
  @Get('lineage-trend')
  getLineageTrend(@Query('days') days?: string) {
    return this.service.getLineageTrend(days ? parseInt(days, 10) : 30);
  }

  /** GET /feature-analytics/summary â€” MRM-grade coverage overview */
  @Get('summary')
  getFeatureCoverageSummary() {
    return this.service.getFeatureCoverageSummary();
  }
}
