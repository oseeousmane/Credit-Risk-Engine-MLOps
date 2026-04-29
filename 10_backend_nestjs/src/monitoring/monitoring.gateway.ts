import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { MonitoringService } from './monitoring.service';
import { Interval } from '@nestjs/schedule';

@WebSocketGateway({ cors: '*', namespace: '/monitoring' })
export class MonitoringGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly monitoringService: MonitoringService) {}

  // Push simulated live metrics every 5 seconds
  @Interval(5000)
  async pushLiveMetrics() {
    const metrics = await this.monitoringService.getLatestMetrics();
    this.server.emit('monitoring.metrics.updated', metrics);
  }

  // Push unresolved alerts every 10 seconds
  @Interval(10000)
  async pushAlerts() {
    const alerts = await this.monitoringService.getAlerts(false);
    this.server.emit('monitoring.alert.created', alerts);
  }

  @SubscribeMessage('request.metrics')
  async handleMetricsRequest() {
    return this.monitoringService.getLatestMetrics();
  }
}
