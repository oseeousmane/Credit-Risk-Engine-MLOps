import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { WebhookService } from './webhook.service';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';

@Controller('webhooks')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  create(@Body() dto: CreateWebhookDto) {
    return this.webhookService.create(dto);
  }

  @Get()
  findAll() {
    return this.webhookService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.webhookService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.webhookService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.webhookService.remove(id);
  }
}
