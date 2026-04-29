import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log({
    eventType,
    entityType,
    entityId,
    actorId,
    previousValue,
    newValue,
  }: {
    eventType: string;
    entityType: string;
    entityId: string;
    actorId?: string;
    previousValue?: object;
    newValue?: object;
  }) {
    const event = await this.prisma.auditEvent.create({
      data: {
        eventType,
        entityType,
        entityId,
        actorId: actorId ?? null,
        previousValue: previousValue ?? undefined,
        newValue: newValue ?? undefined,
      },
    });

    this.logger.log(`AUDIT [${eventType}] ${entityType}#${entityId} by ${actorId ?? 'SYSTEM'}`);
    return event;
  }

  async findAll(entityType?: string, entityId?: string) {
    return this.prisma.auditEvent.findMany({
      where: {
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: { actor: { select: { name: true, role: true } } },
    });
  }
}
