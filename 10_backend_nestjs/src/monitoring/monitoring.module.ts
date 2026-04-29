import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { MonitoringGateway } from './monitoring.gateway';
import { AuditModule } from '../audit/audit.module';
import { ScoringModule } from '../scoring/scoring.module';
import { RetrainingService } from './retraining.service';

@Module({
  imports: [ScheduleModule.forRoot(), AuditModule, ScoringModule],
  controllers: [MonitoringController],
  providers: [MonitoringService, MonitoringGateway, RetrainingService],
  exports: [MonitoringService, RetrainingService],
})
export class MonitoringModule {}
