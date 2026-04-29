import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-openidconnect';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class OidcStrategy extends PassportStrategy(Strategy, 'oidc') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      issuer: configService.get<string>('oidc.issuerUrl')!,
      authorizationURL: `${configService.get<string>('oidc.issuerUrl')}/auth`,
      tokenURL: `${configService.get<string>('oidc.issuerUrl')}/token`,
      userInfoURL: `${configService.get<string>('oidc.issuerUrl')}/me`,
      clientID: configService.get<string>('oidc.clientId')!,
      clientSecret: configService.get<string>('oidc.clientSecret')!,
      callbackURL: 'http://localhost:3001/api/v1/auth/oidc/callback',
      scope: 'openid profile email',
    });
  }

  async validate(issuer: string, profile: any, cb: (err: any, user?: any) => void) {
    try {
      const user = await this.authService.validateOidcUser(profile);
      return cb(null, user);
    } catch (err) {
      return cb(err, false);
    }
  }
}
