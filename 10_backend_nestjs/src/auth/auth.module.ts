import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import session from 'express-session';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { OidcStrategy } from './oidc.strategy';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    AuditModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('auth.jwtSecret')!,
        signOptions: {
          expiresIn: config.get<string>('auth.ttl')! as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, OidcStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        session({
          secret: process.env.SESSION_SECRET || 'temporary-oidc-session-secret',
          resave: false,
          saveUninitialized: false,
          cookie: { maxAge: 120000 }, // 2 minutes TTL for OIDC flow
        }),
      )
      .forRoutes('auth/oidc/*');
  }
}
