import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ModelRegistryService } from './model-registry.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('model-registry')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ModelRegistryController {
  constructor(private readonly registryService: ModelRegistryService) {}

  @Get()
  async findAll() {
    return this.registryService.findAll();
  }

  @Post('versions/:id/promote')
  @Roles(Role.CRO, Role.ADMIN) // Only CRO or ADMIN can promote a model
  async promote(@Param('id') id: string, @Request() req: any) {
    return this.registryService.promoteToChampion(id, req.user.userId);
  }

  @Post(':id/rollback')
  @Roles(Role.CRO, Role.ADMIN, Role.MANAGER)
  async rollback(@Param('id') id: string, @Request() req: any) {
    return this.registryService.rollback(id, req.user.userId);
  }

  @Post('register-prod-champion')
  @Roles(Role.CRO, Role.ADMIN, Role.MANAGER)
  async registerProdChampion(@Body() data: any, @Request() req: any) {
    return this.registryService.registerProdChampion(data, req.user.userId);
  }
}
