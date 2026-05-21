import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { CounterpartyModule } from './counterparty/counterparty.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { DecisioningModule } from './decisioning/decisioning.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { StressTestingModule } from './stress-testing/stress-testing.module';
import { ClientPortalModule } from './client-portal/client-portal.module';
import { AdminModule } from './admin/admin.module';
import { ScoringModule } from './scoring/scoring.module';
import { ComplianceModule } from './compliance/compliance.module';
import { ScheduleModule } from '@nestjs/schedule';
import { RiskMathModule } from './risk-math/risk-math.module';
import { FeatureAnalyticsModule } from './feature-analytics/feature-analytics.module';
import { ModelRegistryModule } from './model-registry/model-registry.module';
import { FeatureContractModule } from './feature-contract/feature-contract.module';
import { MicrofinanceModule } from './microfinance/microfinance.module';
import { WebhookModule } from './webhook/webhook.module';
import { ReportingModule } from './reporting/reporting.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { configValidationSchema } from './config/config.schema';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: configValidationSchema,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    AuditModule,
    ScoringModule,
    CounterpartyModule,
    PipelineModule,
    DecisioningModule,
    MonitoringModule,
    StressTestingModule,
    ClientPortalModule,
    AdminModule,
    ComplianceModule,
    RiskMathModule,
    FeatureAnalyticsModule,
    ModelRegistryModule,
    FeatureContractModule,
    MicrofinanceModule,
    WebhookModule,
    ReportingModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ([
        {
          name: 'short',
          ttl: 60000,
          limit: config.get<number>('security.throttling.short') || 100,
        },
        {
          name: 'scoring',
          ttl: 60000,
          limit: config.get<number>('security.throttling.scoring') || 20,
        },
        {
          name: 'auth',
          ttl: 60000,
          limit: config.get<number>('security.throttling.auth') || 10,
        },
      ]),
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
