import { Module } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { OrchestrationService } from './orchestration.service';
import { RegistryService } from './registry.service';
import { RegistryController } from './registry.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [RegistryController],
  providers: [ScoringService, OrchestrationService, RegistryService],
  exports: [ScoringService, OrchestrationService, RegistryService],
})
export class ScoringModule {}
