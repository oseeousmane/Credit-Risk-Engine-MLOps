import { Module } from '@nestjs/common';
import { CounterpartyService } from './counterparty.service';
import { CounterpartyController } from './counterparty.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [CounterpartyController],
  providers: [CounterpartyService],
})
export class CounterpartyModule {}
