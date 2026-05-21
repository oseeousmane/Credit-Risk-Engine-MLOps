import { Module } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { ScoringController } from './scoring.controller';
import { OrchestrationService } from './orchestration.service';
import { RegistryService } from './registry.service';
import { RegistryController } from './registry.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [RegistryController, ScoringController],
  providers: [ScoringService, OrchestrationService, RegistryService],
  exports: [ScoringService, OrchestrationService, RegistryService],
})
export class ScoringModule {}
