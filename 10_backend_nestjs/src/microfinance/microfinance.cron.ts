import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MicrofinanceService } from './microfinance.service';

@Injectable()
export class MicrofinanceCronService {
  private readonly logger = new Logger(MicrofinanceCronService.name);

  constructor(private readonly microfinanceService: MicrofinanceService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleMarkSchedulesOverdue() {
    this.logger.log('Starting cron: markSchedulesOverdue');
    try {
      const result = await this.microfinanceService.markSchedulesOverdue();
      this.logger.log(`Cron markSchedulesOverdue completed. Processed: ${result.totalProcessed}, Overdue added/late: ${result.schedulesMarkedLate}, Delinquencies: ${result.delinquenciesOpened}`);
    } catch (error) {
      this.logger.error('Error running markSchedulesOverdue cron', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpireStaleOffers() {
    this.logger.log('Starting cron: expireStaleOffers');
    try {
      const result = await this.microfinanceService.expireStaleOffers();
      this.logger.log(`Cron expireStaleOffers completed. Expired: ${result.expiredCount}`);
    } catch (error) {
      this.logger.error('Error running expireStaleOffers cron', error);
    }
  }
}
