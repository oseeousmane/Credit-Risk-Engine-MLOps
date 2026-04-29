import { Controller, Get, Res, HttpStatus, Inject } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class AppController {
  private readonly scoringUrl: string;
  private readonly isProduction: boolean;

  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {
    this.scoringUrl = this.config.get<string>('integrations.scoringServiceUrl') ?? 'http://localhost:8000';
    this.isProduction = this.config.get<string>('environment') === 'production';
  }

  // â”€â”€ Liveness: Is the process alive? â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Used by Kubernetes livenessProbe. Returns immediately â€” no DB calls.
  // If this returns non-200, the container is restarted.
  @Get('liveness')
  @ApiOperation({ summary: 'Liveness probe â€” is the process running?' })
  @ApiResponse({ status: 200, description: 'Process is alive.' })
  liveness(): { status: string; timestamp: string } {
    return { status: 'OK', timestamp: new Date().toISOString() };
  }

  // â”€â”€ Readiness: Are all critical dependencies reachable? â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Used by Kubernetes readinessProbe. Returns 503 if DB is down.
  // Python scoring service unavailability is reported but does NOT cause 503
  // because the fallback rule engine provides business continuity.
  @Get('readiness')
  @ApiOperation({
    summary: 'Readiness probe â€” are dependencies available?',
    description:
      'Checks database connectivity (critical) and Python scoring engine (non-critical â€” fallback active if DOWN).',
  })
  @ApiResponse({ status: 200, description: 'All critical dependencies are reachable.' })
  @ApiResponse({ status: 503, description: 'One or more critical dependencies are unavailable.' })
  async readiness(@Res() res: any) {
    const checks: Record<string, string> = {};
    let httpCode = HttpStatus.OK;

    // 1. Database â€” CRITICAL dependency
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks['database'] = 'UP';
    } catch (err) {
      checks['database'] = 'DOWN';
      checks['database_detail'] = this.isProduction
        ? 'database_unavailable'
        : (err as Error).message;
      httpCode = HttpStatus.SERVICE_UNAVAILABLE;
    }

    // 2. Python scoring engine â€” NON-CRITICAL (fallback rule engine is active if DOWN)
    try {
      const resp = await fetch(`${this.scoringUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      checks['scoring_engine'] = resp.ok ? 'UP' : 'DEGRADED';
    } catch {
      // Not escalated to 503 â€” ScoringService has a built-in fallback rule engine
      checks['scoring_engine'] = 'DOWN (fallback_active)';
    }

    return res.status(httpCode).json({
      status: httpCode === HttpStatus.OK ? 'OK' : 'DEGRADED',
      checks,
      timestamp: new Date().toISOString(),
    });
  }

  // â”€â”€ Startup: Has the application fully initialized? â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Used by Kubernetes startupProbe. Prevents premature traffic before Prisma
  // has established its connection pool. Mirrors readiness but is conceptually
  // separate â€” used only during the initial boot window.
  @Get('startup')
  @ApiOperation({ summary: 'Startup probe â€” has the application finished initializing?' })
  @ApiResponse({ status: 200, description: 'Application has fully started.' })
  @ApiResponse({ status: 503, description: 'Application is still starting up.' })
  async startup(@Res() res: any) {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return res.status(HttpStatus.OK).json({
        status: 'STARTED',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'STARTING',
        database: 'connecting',
        error: this.isProduction ? 'database_unavailable' : (err as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
