import { Controller, Post, Get, Body, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    // The passport strategy puts the validated user in req.user
    const accessToken = this.authService.generateJwtToken(req.user);

    // Redirect back to frontend with token (or set secure cookie)
    // Here we redirect to a secure handler route in the Next.js frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}`);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMe(@Req() req: any) {
    return req.user;
  }

  /**
   * Admin endpoint to check migration progress.
   * When migrationComplete is true, the SHA-256 bridge can be safely removed.
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('migration-status')
  getMigrationStatus() {
    return this.authService.getMigrationStatus();
  }
}
