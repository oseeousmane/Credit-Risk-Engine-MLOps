import { Module } from '@nestjs/common';
import { StressTestingService } from './stress-testing.service';
import { StressTestingController } from './stress-testing.controller';
import { RiskMathModule } from '../risk-math/risk-math.module';

@Module({
  imports: [RiskMathModule],
  controllers: [StressTestingController],
  providers: [StressTestingService],
})
export class StressTestingModule {}
