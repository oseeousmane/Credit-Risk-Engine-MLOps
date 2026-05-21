import { Controller, Post, Get, Body, Req, Res, Param, UseGuards, UnauthorizedException, HttpCode, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { Role } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Throttle({ auth: { limit: 10, ttl: 60000 } })
  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    return this.authService.login(email, password);
  }

  @Get('oidc/login')
  @UseGuards(AuthGuard('oidc'))
  oidcLogin() {
    // Redirects to IdP
  }

  @Get('oidc/callback')
  @UseGuards(AuthGuard('oidc'))
  async oidcCallback(@Req() req: any, @Res() res: Response) {
    const accessToken = this.authService.generateJwtToken(req.user);
    const frontendUrl = this.config.get<string>('auth.frontendUrl');
    const isProduction = this.config.get<string>('environment') === 'production';

    // Token set as HttpOnly cookie — never in the URL where it would be logged
    // or leaked via Referer headers. Frontend reads /auth/me after redirect.
    res.cookie('auth_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000, // 1 hour — matches JWT_TTL_PROD
      path: '/',
    });

    res.redirect(`${frontendUrl}/auth/callback`);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMe(@Req() req: any) {
    return req.user;
  }

  /**
   * GET /auth/session
   * Cookie-to-token exchange for the OIDC callback flow.
   * The OIDC callback sets an HttpOnly cookie; JS cannot read it directly.
   * This endpoint reads the cookie server-side and returns { access_token, user }
   * so the frontend can store it in localStorage and resume the standard Bearer flow.
   */
  @Throttle({ auth: { limit: 10, ttl: 60000 } })
  @Get('session')
  async getSession(@Req() req: any) {
    const cookieHeader: string = req.headers['cookie'] || '';
    const result = await this.authService.resolveSessionFromCookie(cookieHeader);
    if (!result) {
      throw new UnauthorizedException('No valid session found. Please log in again.');
    }
    return result;
  }

  /**
   * POST /auth/refresh
   * Issues a new access_token + rotated refresh_token.
   * Expects { refresh_token: string } in the body.
   * On reuse detection, the entire session is revoked.
   */
  @Throttle({ auth: { limit: 10, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refresh_token') refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('refresh_token is required');
    }
    return this.authService.refreshAccessToken(refreshToken);
  }

  /**
   * POST /auth/logout
   * Revokes the refresh token server-side. Access token expires naturally.
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: any) {
    await this.authService.logout(req.user.id);
  }

  /**
   * POST /auth/unlock/:userId — Admin: manually unlock a locked account.
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Post('unlock/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlockAccount(@Param('userId') userId: string) {
    await this.authService.unlockAccount(userId);
  }

  /**
   * Admin endpoint to check migration progress.
   * When migrationComplete is true, the SHA-256 bridge can be safely removed.
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Get('migration-status')
  getMigrationStatus() {
    return this.authService.getMigrationStatus();
  }
}
