import { Module } from '@nestjs/common';
import { FeatureContractService } from './feature-contract.service';
import { FeatureContractController } from './feature-contract.controller';

@Module({
  providers: [FeatureContractService],
  controllers: [FeatureContractController],
  exports: [FeatureContractService],
})
export class FeatureContractModule {}
