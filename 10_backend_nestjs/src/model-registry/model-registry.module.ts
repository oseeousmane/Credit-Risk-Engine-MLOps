import { Module } from '@nestjs/common';
import { ModelRegistryService } from './model-registry.service';
import { ModelRegistryController } from './model-registry.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [ModelRegistryService],
  controllers: [ModelRegistryController],
  exports: [ModelRegistryService],
})
export class ModelRegistryModule {}
