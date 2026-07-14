import { Module, forwardRef } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { PipelineController } from './pipeline.controller';
import { AuditModule } from '../audit/audit.module';
import { DecisioningModule } from '../decisioning/decisioning.module';

@Module({
  imports: [AuditModule, forwardRef(() => DecisioningModule)],
  controllers: [PipelineController],
  providers: [PipelineService],
  exports: [PipelineService],
})
export class PipelineModule {}
