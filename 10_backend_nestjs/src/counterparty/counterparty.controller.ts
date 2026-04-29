import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CounterpartyService } from './counterparty.service';
import { CounterpartyQueryDto } from '../common/dto/query.dto';

@UseGuards(AuthGuard('jwt'))
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.counterpartyService.findOne(id);
  }
}
