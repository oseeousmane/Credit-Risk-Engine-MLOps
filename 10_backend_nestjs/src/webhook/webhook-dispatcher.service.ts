import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { WebhookEvent } from './dto/webhook.dto';

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [1000, 2000, 4000];

@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fire-and-forget: caller does not await this.
   * Dispatches the event to all active matching subscriptions, with retries.
   */
  dispatch(event: WebhookEvent, payload: Record<string, unknown>): void {
    this.dispatchAsync(event, payload).catch((err) =>
      this.logger.error(`[WEBHOOK] Unhandled dispatch error: ${err.message}`),
    );
  }

  private async dispatchAsync(event: WebhookEvent, payload: Record<string, unknown>): Promise<void> {
    const subscriptions = await this.prisma.webhookSubscription.findMany({
      where: { active: true, events: { has: event } },
    });

    if (subscriptions.length === 0) return;

    const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });

    await Promise.allSettled(
      subscriptions.map((sub: { id: string; url: string; secret: string }) =>
        this.deliverWithRetry(sub, event, body, payload),
      ),
    );
  }

  private async deliverWithRetry(
    sub: { id: string; url: string; secret: string },
    event: string,
    body: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    let lastStatusCode: number | null = null;
    let lastResponseBody: string | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const signature = this.sign(sub.secret, body);
        const res = await fetch(sub.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Event': event,
            'X-Webhook-Signature': `sha256=${signature}`,
            'X-Webhook-Attempt': String(attempt),
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });

        lastStatusCode = res.status;
        lastResponseBody = await res.text().catch(() => null);

        if (res.ok) {
          await this.logDelivery(sub.id, event, payload, lastStatusCode, true, attempt, lastResponseBody);
          this.logger.log(`[WEBHOOK] Delivered ${event} → ${sub.url} (attempt ${attempt}, status ${res.status})`);
          return;
        }

        this.logger.warn(`[WEBHOOK] Non-2xx from ${sub.url}: ${res.status} (attempt ${attempt}/${MAX_ATTEMPTS})`);
      } catch (err: any) {
        this.logger.warn(`[WEBHOOK] Fetch error → ${sub.url}: ${err.message} (attempt ${attempt}/${MAX_ATTEMPTS})`);
      }

      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]));
      }
    }

    await this.logDelivery(sub.id, event, payload, lastStatusCode, false, MAX_ATTEMPTS, lastResponseBody);
    this.logger.error(`[WEBHOOK] All ${MAX_ATTEMPTS} attempts failed for ${event} → ${sub.url}`);
  }

  private sign(secret: string, body: string): string {
    return createHmac('sha256', secret).update(body).digest('hex');
  }

  private async logDelivery(
    subscriptionId: string,
    event: string,
    payload: Record<string, unknown>,
    statusCode: number | null,
    success: boolean,
    attemptCount: number,
    responseBody: string | null,
  ): Promise<void> {
    await this.prisma.webhookDelivery.create({
      data: { subscriptionId, event, payload: payload as any, statusCode, success, attemptCount, responseBody },
    }).catch((err: Error) => this.logger.error(`[WEBHOOK] Failed to log delivery: ${err.message}`));
  }
}
