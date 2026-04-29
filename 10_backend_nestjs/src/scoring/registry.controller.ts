import { Controller, Get, Post, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RegistryService } from './registry.service';
import { Role } from '@prisma/client';

/**
 * RegistryController â€” Phase 4 MLOps Orchestration
 *
 * Exposes model lifecycle operations. Lifecycle mutations (promote, archive,
 * request-review) are scoped to RISK_MANAGER and CRO roles.
 */
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('registry')
export class RegistryController {
  constructor(private readonly registryService: RegistryService) {}

  /** GET /registry/versions â€” All model versions with lifecycle metadata */
  @Get('versions')
  getAllVersions() {
    return this.registryService.getAllVersions();
  }

  /** GET /registry/champion â€” Current active champion model */
  @Get('champion')
  getChampion() {
    return this.registryService.getChampion();
  }

  /** GET /registry/compare â€” Side-by-side champion-challenger evaluation */
  @Get('compare')
  compareVersions(
    @Query('versionA') versionA: string,
    @Query('versionB') versionB: string,
  ) {
    return this.registryService.compareVersions(versionA, versionB);
  }

  /** POST /registry/promote/:id â€” Promote a version to champion */
  @Roles(Role.MANAGER, Role.CRO)
  @Post('promote/:id')
  promoteToChampion(@Param('id') id: string, @Req() req: any) {
    return this.registryService.promoteToChampion(id, req.user?.id);
  }

  /** POST /registry/challenger/:id â€” Mark a version as shadow/challenger */
  @Roles(Role.MANAGER, Role.CRO)
  @Post('challenger/:id')
  markAsChallenger(@Param('id') id: string, @Req() req: any) {
    return this.registryService.markAsChallenger(id, req.user?.id);
  }

  /** POST /registry/archive/:id â€” Archive a deprecated model version */
  @Roles(Role.MANAGER, Role.CRO)
  @Post('archive/:id')
  archiveModel(@Param('id') id: string, @Req() req: any) {
    return this.registryService.archiveModel(id, req.user?.id);
  }

  /** POST /registry/request-review/:id â€” Flag a model for governance review */
  @Roles(Role.MANAGER, Role.CRO)
  @Post('request-review/:id')
  requestReview(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.registryService.requestReview(id, reason, req.user?.id);
  }

  /**
   * POST /registry/retrain/:id â€” Trigger retraining hook (Airflow-compatible)
   * Emits an auditable retraining request. Future: calls Airflow REST API.
   */
  @Roles(Role.MANAGER, Role.CRO)
  @Post('retrain/:id')
  requestRetraining(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.registryService.requestRetraining(id, reason, req.user?.id);
  }
}
