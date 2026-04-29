import { Module } from '@nestjs/common';
import { FeatureAnalyticsService } from './feature-analytics.service';
import { FeatureAnalyticsController } from './feature-analytics.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FeatureAnalyticsController],
  providers: [FeatureAnalyticsService],
  exports: [FeatureAnalyticsService],
})
export class FeatureAnalyticsModule {}
