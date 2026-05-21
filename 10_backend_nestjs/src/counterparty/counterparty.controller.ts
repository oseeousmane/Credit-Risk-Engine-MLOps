import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CounterpartyService } from './counterparty.service';
import { CounterpartyQueryDto } from '../common/dto/query.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ANALYST, Role.MANAGER, Role.CRO, Role.ADMIN)
@Controller('counterparties')
export class CounterpartyController {
  constructor(private readonly counterpartyService: CounterpartyService) {}

  @Get()
  findAll(@Query() query: CounterpartyQueryDto) {
    return this.counterpartyService.findAll(query);
  }

  @Get('kpis')
  getKpis() {
    return this.counterpartyService.getPortfolioKpis();
  }

  @Get('top-exposures')
  getTopExposures(@Query('limit') limit?: string) {
    return this.counterpartyService.getTopExposures(limit ? parseInt(limit, 10) : 5);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.counterpartyService.findOne(id);
  }
}
