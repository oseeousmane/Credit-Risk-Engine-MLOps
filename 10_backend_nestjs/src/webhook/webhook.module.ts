import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { WebhookDispatcherService } from './webhook-dispatcher.service';

@Module({
  controllers: [WebhookController],
  providers: [WebhookService, WebhookDispatcherService],
  exports: [WebhookDispatcherService],
})
export class WebhookModule {}
