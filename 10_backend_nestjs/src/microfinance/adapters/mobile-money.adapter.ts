import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MobileMoneyTransactionResult {
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  providerRef: string | null;
  failureReason?: string;
}

@Injectable()
export class MobileMoneyAdapter {
  private readonly logger = new Logger(MobileMoneyAdapter.name);
  private readonly isLiveMode: boolean;

  constructor(private configService: ConfigService) {
    this.isLiveMode = this.configService.get<boolean>('integrations.momoLiveMode', false);
    if (this.isLiveMode) {
      this.logger.warn('MOMO_LIVE_MODE is TRUE. Real transactions will be attempted if implemented.');
    } else {
      this.logger.log('MOMO_LIVE_MODE is FALSE. Operating in Sandbox mode.');
    }
  }

  async disburseFunds(
    phone: string,
    amount: number,
    internalRef: string,
  ): Promise<MobileMoneyTransactionResult> {
    if (this.isLiveMode) {
      this.logger.error(`Live disbursement requested for ref ${internalRef} but no live integration exists.`);
      // Constraint 2: The adapter must fail closed in live mode.
      throw new NotImplementedException(
        'LIVE_INTEGRATION_NOT_IMPLEMENTED: Cannot process live transactions.',
      );
    }

    // Sandbox mode: Simulate success after 1 second
    this.logger.log(`[SANDBOX] Simulating disbursement of ${amount} to ${phone} (Ref: ${internalRef})`);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 5% chance of failure in sandbox to test error handling
    const isSuccess = Math.random() > 0.05;

    if (isSuccess) {
      return {
        status: 'SUCCESS',
        providerRef: `MOMO-SANDBOX-TX-${Date.now()}`,
      };
    } else {
      return {
        status: 'FAILED',
        providerRef: null,
        failureReason: 'Insufficient sandbox liquidity or simulated network error',
      };
    }
  }

  async processCollection(
    phone: string,
    amount: number,
    internalRef: string,
  ): Promise<MobileMoneyTransactionResult> {
    if (this.isLiveMode) {
      this.logger.error(`Live collection requested for ref ${internalRef} but no live integration exists.`);
      throw new NotImplementedException(
        'LIVE_INTEGRATION_NOT_IMPLEMENTED: Cannot process live transactions.',
      );
    }

    // Sandbox mode: Simulate collection prompt accepted
    this.logger.log(`[SANDBOX] Simulating collection prompt for ${amount} to ${phone} (Ref: ${internalRef})`);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const isSuccess = Math.random() > 0.10; // 10% chance of user declining the prompt

    if (isSuccess) {
      return {
        status: 'SUCCESS',
        providerRef: `MOMO-SANDBOX-COL-${Date.now()}`,
      };
    } else {
      return {
        status: 'FAILED',
        providerRef: null,
        failureReason: 'User declined USSD prompt or timeout',
      };
    }
  }
}
