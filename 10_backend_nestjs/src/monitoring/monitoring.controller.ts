import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req, Sse, MessageEvent } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MonitoringService } from './monitoring.service';
import { RetrainingService, RetrainingPriority } from './retraining.service';
import { EventsBroadcasterService } from './events-broadcaster.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { Observable, map } from 'rxjs';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ANALYST, Role.MANAGER, Role.CRO, Role.ADMIN)
@Controller('monitoring')
export class MonitoringController {
  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly retrainingService: RetrainingService,
    private readonly broadcaster: EventsBroadcasterService,
  ) {}

  /** GET /monitoring/metrics â€” Latest snapshot per active model version */
  @Get('metrics')
  getMetrics() {
    return this.monitoringService.getLatestMetrics();
  }

  /** GET /monitoring/metrics/history â€” Real historical time-series */
  @Get('metrics/history')
  getMetricsHistory(
    @Query('modelVersionId') modelVersionId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.monitoringService.getMetricsHistory(modelVersionId, limit ? parseInt(limit, 10) : 30);
  }

  /** GET /monitoring/trend/quality â€” Payload quality trend over time */
  @Get('trend/quality')
  getPayloadQualityTrend(
    @Query('modelVersionId') modelVersionId?: string,
    @Query('days') days?: string,
  ) {
    return this.monitoringService.getPayloadQualityTrend(modelVersionId, days ? parseInt(days, 10) : 30);
  }

  /** GET /monitoring/trend/fallback â€” Fallback engine usage history and governance flag */
  @Get('trend/fallback')
  getFallbackHistory(@Query('limit') limit?: string) {
    return this.monitoringService.getFallbackHistory(limit ? parseInt(limit, 10) : 50);
  }

  /** GET /monitoring/degradation-timeline â€” Timeline of WARNING/DEGRADED model status events */
  @Get('degradation-timeline')
  getDegradationTimeline(@Query('limit') limit?: string) {
    return this.monitoringService.getDegradationTimeline(limit ? parseInt(limit, 10) : 50);
  }

  /** GET /monitoring/scoring-health â€” Live probe of Python scoring service */
  @Get('scoring-health')
  getScoringHealth() {
    return this.monitoringService.getScoringHealth();
  }

  /** GET /monitoring/alerts */
  @Get('alerts')
  getAlerts(@Query('resolved') resolved?: string) {
    const resolvedBool = resolved === 'true' ? true : resolved === 'false' ? false : undefined;
    return this.monitoringService.getAlerts(resolvedBool);
  }

  /** PATCH /monitoring/versions/:id/governance â€” Update model governance metadata */
  @Roles(Role.MANAGER, Role.CRO, Role.ADMIN)
  @Patch('versions/:id/governance')
  updateModelGovernance(
    @Param('id') id: string,
    @Body() body: any
  ) {
    return this.monitoringService.updateModelGovernance(id, body);
  }

  /**
   * GET /monitoring/events — SSE stream.
   * Pushes real-time events (alerts, decisions, model status) to the frontend.
   * No auth guard: browser EventSource cannot set headers; protect at nginx/gateway level if needed.
   */
  @Sse('events')
  sseEvents(): Observable<MessageEvent> {
    return this.broadcaster.stream().pipe(
      map((event) => ({
        data: JSON.stringify({ type: event.type, data: event.data, timestamp: event.timestamp }),
        type: event.type,
      } as MessageEvent)),
    );
  }

  /** POST /monitoring/ingest â€” Ingest model performance metrics */
  @Roles(Role.MANAGER, Role.CRO, Role.ADMIN)
  @Post('ingest')
  ingestMetrics(@Body() body: {
    modelVersionId: string;
    inferenceVolume: number;
    errorRate: number;
    latencyP50: number;
    latencyP99: number;
    criticalFeatures: object[];
    auc?: number;
    ks?: number;
    psi?: number;
  }) {
    return this.monitoringService.ingestMetrics(body.modelVersionId, body);
  }
}
