import { Injectable, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface ContractValidationResult {
  compliant: boolean;
  missingCritical: string[];
  imputationRate: number;
  imputedFeaturesCount: number;
  qualityBand: 'HIGH' | 'MEDIUM' | 'LOW';
}

@Injectable()
export class FeatureContractService implements OnModuleInit {
  private readonly logger = new Logger(FeatureContractService.name);
  private contract: any = null;

  onModuleInit() {
    this.loadContract();
  }

  private loadContract() {
    try {
      // Resolve path relative to the backend project root (assuming execution from dist/ or src/)
      const contractPath = path.resolve(process.cwd(), '../FEATURE_CONTRACT.json');
      const fileContent = fs.readFileSync(contractPath, 'utf-8');
      this.contract = JSON.parse(fileContent);
      this.logger.log(`Feature Contract loaded: v${this.contract.contract_meta.version} (${this.contract.contract_meta.total_feature_count} features)`);
    } catch (error) {
      // Also try one directory up in case of different CWD
      try {
         const altPath = path.resolve(process.cwd(), 'FEATURE_CONTRACT.json');
         const fileContent = fs.readFileSync(altPath, 'utf-8');
         this.contract = JSON.parse(fileContent);
         this.logger.log(`Feature Contract loaded: v${this.contract.contract_meta.version} (${this.contract.contract_meta.total_feature_count} features)`);
      } catch (err2) {
         this.logger.error(`Failed to load FEATURE_CONTRACT.json. Make sure it exists in the project root.`);
      }
    }
  }

  getContract() {
    if (!this.contract) {
      this.loadContract();
    }
    return this.contract;
  }

  getSchemaVersion(): string {
    return this.getContract()?.contract_meta?.version ?? 'unknown';
  }

  validatePayload(payload: Record<string, any>): ContractValidationResult {
    const contract = this.getContract();
    if (!contract) {
      throw new BadRequestException('Feature contract not available.');
    }

    const criticalFields: string[] = contract.imputation_policy.critical_non_nullable_fields || [];
    const missingCritical = criticalFields.filter(field => payload[field] === undefined || payload[field] === null);

    const providedCount = Object.keys(payload).length;
    const totalFeatures = contract.contract_meta.total_feature_count;

    // Calculate imputed features (assuming any feature not in payload is imputed)
    const imputedFeaturesCount = Math.max(0, totalFeatures - providedCount);
    const imputationRate = imputedFeaturesCount / totalFeatures;

    const maxAllowedRate = contract.imputation_policy.max_allowed_imputation_rate;
    const compliant = missingCritical.length === 0 && imputationRate <= maxAllowedRate;

    let qualityBand: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    const bands = contract.imputation_policy.quality_bands;
    if (imputedFeaturesCount <= bands.HIGH.max_imputed_features) {
      qualityBand = 'HIGH';
    } else if (imputedFeaturesCount <= bands.MEDIUM.max_imputed_features) {
      qualityBand = 'MEDIUM';
    }

    return {
      compliant,
      missingCritical,
      imputationRate: parseFloat(imputationRate.toFixed(4)),
      imputedFeaturesCount,
      qualityBand
    };
  }
}
