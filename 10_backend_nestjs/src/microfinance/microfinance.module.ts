import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { MicrofinanceController } from './microfinance.controller';
import { MicrofinanceService } from './microfinance.service';

@Module({
  imports: [AuditModule],
  controllers: [MicrofinanceController],
  providers: [MicrofinanceService],
  exports: [MicrofinanceService],
})
export class MicrofinanceModule {}
