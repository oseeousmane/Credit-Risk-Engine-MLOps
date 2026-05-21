import { Controller, Get, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PipelineService } from './pipeline.service';
import { PipelineStage, Role } from '@prisma/client';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ANALYST, Role.MANAGER, Role.CRO, Role.ADMIN)
@Controller('pipeline')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('stage') stage?: string
  ) {
    return this.pipelineService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      stage,
    });
  }

  @Get('board')
  getBoard() {
    return this.pipelineService.getStageGroups();
  }

  @Patch(':id/stage')
  moveStage(
    @Param('id') id: string,
    @Body('stage') stage: PipelineStage,
    @Req() req: any,
  ) {
    return this.pipelineService.moveStage(id, stage, req.user);
  }

  @Roles(Role.ANALYST, Role.MANAGER, Role.CRO, Role.ADMIN)
  @Patch('documents/:docId/validate')
  validateDocument(
    @Param('docId') docId: string,
    @Body('comment') comment: string,
    @Req() req: any,
  ) {
    return this.pipelineService.validateDocument(docId, req.user, comment);
  }

  @Roles(Role.ANALYST, Role.MANAGER, Role.CRO, Role.ADMIN)
  @Patch('documents/:docId/reject')
  rejectDocument(
    @Param('docId') docId: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.pipelineService.rejectDocument(docId, req.user, reason);
  }
}
