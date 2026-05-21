import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import session from 'express-session';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { StructuredLoggerService } from './common/logger/structured-logger.service';

async function bootstrap() {
  const structuredLogger = new StructuredLoggerService();
  const app = await NestFactory.create(AppModule, { logger: structuredLogger });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const isProduction = config.get<string>('environment') === 'production';

  app.use(
    session({
      secret: config.get<string>('auth.sessionSecret')!,
      resave: false,
      saveUninitialized: false,
    }),
  );

  // â”€â”€ Global API Prefix â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app.setGlobalPrefix('api/v1', {
    exclude: ['health/liveness', 'health/readiness', 'health/startup'],
  });

  // â”€â”€ Institutional Security Headers (Helmet) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app.use(helmet({
    contentSecurityPolicy: isProduction ? undefined : false,
    hsts: isProduction,
  }));

  // â”€â”€ CORS â€” restricted to the configured frontend origin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const allowedOrigin = config.get<string>('auth.frontendUrl');
  app.enableCors({
    origin: allowedOrigin,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // â”€â”€ Global Validation Pipe â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: isProduction, // institutional posture: mask error details in prod
    }),
  );

  // â”€â”€ Global Exception Filter (x-request-id correlation) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app.useGlobalFilters(new HttpExceptionFilter());

  // â”€â”€ Global Upstream Timeout Interceptor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new TimeoutInterceptor(reflector));

  // â”€â”€ Swagger UI (Development & Staging only â€” NEVER in Production) â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // This guard is the critical security control. Removing it would expose
  // internal route structure, DTOs, and auth scheme to external discovery.
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Octaix Risk Engine API')
      .setDescription(
        'Institutional Credit Risk Orchestration Platform â€” Internal API Reference.\n\n' +
        'âš ï¸ This documentation is only available in non-production environments.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT',
      )
      .addTag('auth', 'Authentication & Session Management')
      .addTag('scoring', 'ML Scoring & Decisioning')
      .addTag('monitoring', 'MLOps Monitoring & Drift')
      .addTag('pipeline', 'Credit Application Pipeline')
      .addTag('model-registry', 'Model Lifecycle & Registry')
      .addTag('health', 'Health & Readiness Probes')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
    });
    logger.log('ðŸ“– Swagger UI: http://localhost:' + (config.get<number>('port') || 3001) + '/api/docs');
  }

  app.enableShutdownHooks();

  const port = config.get<number>('port') || 3001;
  await app.listen(port);

  logger.log(`ðŸš€ Institutional Risk Engine started on port ${port}`);
  logger.log(`ðŸ›¡ï¸  Posture: ${isProduction ? 'HARDENED (Production)' : 'Development'}`);
  logger.log(`ðŸŒ CORS origin: ${allowedOrigin}`);
  logger.log(`ðŸ©º Health probes: /health/liveness | /health/readiness | /health/startup`);
}
bootstrap();
