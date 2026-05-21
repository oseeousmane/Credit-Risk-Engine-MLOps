import { Controller, Get, Post, Body, Param, Req, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DecisioningService } from './decisioning.service';
import { DecisionStatus, Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PaginationDto } from '../common/dto/query.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ANALYST, Role.MANAGER, Role.CRO, Role.ADMIN)
@Controller('decisions')
export class DecisioningController {
  constructor(private readonly decisioningService: DecisioningService) {}

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.decisioningService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.decisioningService.findOne(id);
  }

  @Throttle({ scoring: { limit: 20, ttl: 60000 } })
  @Post('evaluate/:applicationId')
  evaluate(@Param('applicationId') applicationId: string) {
    return this.decisioningService.evaluateApplication(applicationId);
  }

  @Throttle({ scoring: { limit: 20, ttl: 60000 } })
  @Roles(Role.MANAGER, Role.CRO, Role.ADMIN)
  @Post('submit/:applicationId')
  submitDecision(
    @Param('applicationId') applicationId: string,
    @Body('overrideStatus') overrideStatus: DecisionStatus | undefined,
    @Body('overrideReason') overrideReason: string | undefined,
    @Req() req: any,
  ) {
    return this.decisioningService.submitDecision(
      applicationId,
      { id: req.user.id, role: req.user.role },
      overrideStatus,
      overrideReason,
    );
  }
}
