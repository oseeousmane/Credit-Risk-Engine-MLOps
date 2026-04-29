import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DecisioningService } from './decisioning.service';
import { DecisionStatus } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';

@UseGuards(AuthGuard('jwt'))
@Controller('decisions')
export class DecisioningController {
  constructor(private readonly decisioningService: DecisioningService) {}

  @Get()
  findAll() {
    return this.decisioningService.findAll();
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
