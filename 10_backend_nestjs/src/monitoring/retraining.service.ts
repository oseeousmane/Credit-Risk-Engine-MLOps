import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export enum RetrainingPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

@Injectable()
export class RetrainingService {
  private readonly logger = new Logger(RetrainingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * REQUEST_RETRAINING â€” Governed creation of a retraining event.
   * Does NOT execute the training script directly; creates an auditable record
   * for an external orchestrator (e.g., Airflow, Kubeflow, or a Python worker).
   */
  async requestRetraining(modelId: string, actorId: string, priority: RetrainingPriority, reason: string) {
    const model = await this.prisma.modelRegistry.findUniqueOrThrow({
      where: { id: modelId },
    });

    this.logger.log(`[Retraining] Requesting retraining for ${model.name}. Priority: ${priority}. Reason: ${reason}`);

    // Create an auditable record in the database
    // We'll use the AuditEvent table for now, or we could create a dedicated RetrainingTask table
    // For this implementation, we'll log it as a specific audit event that the external system can poll or listen to.

    const event = await this.audit.log({
      eventType: 'MODEL_RETRAINING_REQUESTED',
      entityType: 'ModelRegistry',
      entityId: modelId,
      actorId,
      newValue: {
        modelName: model.name,
        priority,
        reason,
        requestedAt: new Date().toISOString(),
        status: 'PENDING_ORCHESTRATION',
      },
    });

    // In a real system, we might push to a Message Queue (RabbitMQ/Kafka) here.
    this.logger.debug(`[Retraining] Event ${event.id} persisted. Awaiting external worker pick-up.`);

    return {
      requestId: event.id,
      status: 'PENDING_ORCHESTRATION',
      message: `Retraining request for ${model.name} has been logged and queued for the orchestration layer.`,
    };
  }
}
