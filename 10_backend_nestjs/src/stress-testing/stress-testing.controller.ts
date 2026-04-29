import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StressTestingService } from './stress-testing.service';

@UseGuards(AuthGuard('jwt'))
@Controller('scenarios')
export class StressTestingController {
  constructor(private readonly stressTestingService: StressTestingService) {}

  @Get()
  getSavedScenarios() {
    return this.stressTestingService.getSavedScenarios();
  }

  /** GET /scenarios/portfolio-analytics â€” Live portfolio IFRS 9 / ECL / concentration */
  @Get('portfolio-analytics')
  getPortfolioAnalytics() {
    return this.stressTestingService.getPortfolioAnalytics();
  }

  @Post('run')
  async runScenario(
    @Body() params: {
      unemploymentShock: number;
      creditSpreadBps: number;
      realGDPGrowth: number;
      horizon: string;
    },
  ): Promise<any> {
    return this.stressTestingService.runScenario(params);
  }
}
