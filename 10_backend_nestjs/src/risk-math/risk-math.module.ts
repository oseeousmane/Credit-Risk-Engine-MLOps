import { Module } from '@nestjs/common';
import { RiskMathService } from './risk-math.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [RiskMathService],
  exports: [RiskMathService],
})
export class RiskMathModule {}
