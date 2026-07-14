import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StressTestingService } from './stress-testing.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.MANAGER, Role.CRO, Role.ADMIN)
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

  /**
   * GET /scenarios/transition-matrices
   * Retourne les matrices de transition calibrées pour les 3 scénarios.
   * Utilisé par le comité des risques pour valider les hypothèses de stress.
   */
  @Get('transition-matrices')
  getTransitionMatrices() {
    return this.stressTestingService.getTransitionMatrices();
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
