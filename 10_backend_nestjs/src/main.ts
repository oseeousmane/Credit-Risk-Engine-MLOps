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

  // ── Session cookie hardening ──────────────────────────────────────────────
  // httpOnly : JS côté client ne peut pas lire le cookie (anti-XSS)
  // secure   : cookie transmis uniquement sur HTTPS (prod) ou HTTP (dev)
  // sameSite : 'lax' — protège contre CSRF tout en autorisant les redirections GET
  // maxAge   : 8h en prod (journée de travail), 24h en dev
  app.use(
    session({
      secret: config.get<string>('auth.sessionSecret')!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: isProduction ? 8 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
      },
    }),
  );

  // â”€â”€ Global API Prefix â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app.setGlobalPrefix('api/v1', {
    exclude: ['health/liveness', 'health/readiness', 'health/startup'],
  });

  // â”€â”€ Institutional Security Headers (Helmet) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // ── Helmet — Security Headers institutionnels ─────────────────────────────
  // CSP explicite en dev ET prod. Le mode dev est relâché (unsafe-inline pour
  // Next.js HMR) mais n'est jamais false — une politique nulle est pire qu'une
  // politique relâchée car elle n'offre aucune protection contre les injections.
  const cspDirectives = isProduction
    ? {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'"],
        styleSrc:   ["'self'", "'unsafe-inline'"],  // Tailwind inline styles
        imgSrc:     ["'self'", "data:", "blob:"],
        fontSrc:    ["'self'"],
        connectSrc: ["'self'"],
        frameSrc:   ["'none'"],
        objectSrc:  ["'none'"],
        upgradeInsecureRequests: [],
      }
    : {
        // Dev : politique relâchée pour Next.js HMR + Swagger UI
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc:   ["'self'", "'unsafe-inline'"],
        imgSrc:     ["'self'", "data:", "blob:", "https:"],
        fontSrc:    ["'self'", "data:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        frameSrc:   ["'self'"],
        objectSrc:  ["'none'"],
        upgradeInsecureRequests: [],
      };

  app.use(helmet({
    contentSecurityPolicy: { directives: cspDirectives },
    hsts: isProduction
      ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
      : false,
    xFrameOptions:        { action: 'deny' },
    xContentTypeOptions:  true,
    referrerPolicy:       { policy: 'strict-origin-when-cross-origin' },
    permittedCrossDomainPolicies: false,
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
