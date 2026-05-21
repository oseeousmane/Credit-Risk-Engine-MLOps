import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';

@Injectable()
export class WebhookService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWebhookDto) {
    return this.prisma.webhookSubscription.create({
      data: {
        url: dto.url,
        secret: dto.secret,
        events: dto.events,
        description: dto.description,
      },
      select: { id: true, url: true, events: true, active: true, description: true, createdAt: true },
    });
  }

  async findAll() {
    return this.prisma.webhookSubscription.findMany({
      select: { id: true, url: true, events: true, active: true, description: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const sub = await this.prisma.webhookSubscription.findUnique({
      where: { id },
      select: {
        id: true, url: true, events: true, active: true, description: true, createdAt: true,
        deliveries: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!sub) throw new NotFoundException(`Webhook subscription ${id} not found`);
    return sub;
  }

  async update(id: string, dto: UpdateWebhookDto) {
    await this.findOne(id);
    return this.prisma.webhookSubscription.update({
      where: { id },
      data: dto,
      select: { id: true, url: true, events: true, active: true, description: true, updatedAt: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.webhookSubscription.delete({ where: { id } });
    return { deleted: true };
  }
}
