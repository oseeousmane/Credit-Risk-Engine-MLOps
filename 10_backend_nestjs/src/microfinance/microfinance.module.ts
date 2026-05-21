import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { MicrofinanceController } from './microfinance.controller';
import { MicrofinanceService } from './microfinance.service';
import { MobileMoneyAdapter } from './adapters/mobile-money.adapter';
import { MicrofinanceCronService } from './microfinance.cron';

@Module({
  imports: [AuditModule],
  controllers: [MicrofinanceController],
  providers: [MicrofinanceService, MobileMoneyAdapter, MicrofinanceCronService],
  exports: [MicrofinanceService],
})
export class MicrofinanceModule {}
