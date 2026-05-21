import { Module } from '@nestjs/common';
import { DecisioningService } from './decisioning.service';
import { DecisioningController } from './decisioning.controller';
import { AuditModule } from '../audit/audit.module';
import { PipelineModule } from '../pipeline/pipeline.module';
import { ScoringModule } from '../scoring/scoring.module';
import { RiskMathModule } from '../risk-math/risk-math.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { WebhookModule } from '../webhook/webhook.module';

@Module({
  imports: [AuditModule, PipelineModule, ScoringModule, RiskMathModule, MonitoringModule, WebhookModule],
  controllers: [DecisioningController],
  providers: [DecisioningService],
})
export class DecisioningModule {}
