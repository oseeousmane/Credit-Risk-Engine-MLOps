import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('auth.jwtSecret')!,
    });
  }

  async validate(payload: { sub: string; email: string; role: string; name?: string }) {
    // Dev-only: demo users have synthetic IDs that don't exist in DB
    if (process.env.NODE_ENV !== 'production' && payload.sub?.startsWith('demo-')) {
      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name ?? payload.email,
        role: payload.role,
        counterpartyId: null,
        authProvider: 'LOCAL',
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        counterpartyId: true,
        authProvider: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
