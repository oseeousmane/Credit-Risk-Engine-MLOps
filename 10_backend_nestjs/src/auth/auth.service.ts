import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcryptjs';
import { createHash, timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';

// â”€â”€â”€ Bridge Flag â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SHA-256 bridge — migration vers bcrypt(12). OFF par défaut (secure by default).
// Activer UNIQUEMENT pendant la migration avec SHA256_BRIDGE_ENABLED=true.
// Désactiver dès que getMigrationStatus().migrationComplete === true.
const LEGACY_SHA256_BRIDGE_ENABLED =
  process.env.SHA256_BRIDGE_ENABLED === 'true';

// SHA-256 pattern: 64 hex characters, NO bcrypt prefix
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

// ─── Account Lockout Policy ────────────────────────────────────────────────────
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Appelé par le AppModule au démarrage pour vérifier l'état de la migration SHA-256.
   * Logue une alerte si des comptes SHA-256 subsistent et rappelle la deadline.
   */
  async auditSha256BridgeOnStartup(): Promise<void> {
    if (!LEGACY_SHA256_BRIDGE_ENABLED) {
      this.logger.log('[AUTH_BRIDGE] SHA256 bridge inactive (default). Set SHA256_BRIDGE_ENABLED=true to enable migration.');
      return;
    }
    this.logger.warn('[AUTH_BRIDGE] SHA256 bridge ACTIVE — migration mode. Disable once migrationComplete=true.');
    try {
      const status = await this.getMigrationStatus();
      if (status.migrationComplete) {
        this.logger.log(
          '[AUTH_BRIDGE] Migration complete: 0 SHA-256 accounts remain. ' +
          'Unset SHA256_BRIDGE_ENABLED and remove the bridge on next deploy.',
        );
      } else {
        this.logger.warn(
          `[AUTH_BRIDGE] ${status.legacy} SHA-256 account(s) pending migration (${status.total} total). ` +
          'Accounts migrate silently on next login. Monitor via GET /admin/auth/migration-status.',
        );
      }
    } catch {
      // Si la DB n'est pas encore prete au startup, on ignore silencieusement
    }
  }

  async login(email: string, password: string) {
    if (!email || !password) {
      throw new UnauthorizedException('Email and password are required');
    }

    // ── Dev-only demo bypass — works without a live DB ────────────────────────
    // Activated only when NODE_ENV !== 'production'. Never reachable in prod.
    if (process.env.NODE_ENV !== 'production') {
      const DEMO_USERS: Record<string, { password: string; role: Role; name: string; id: string }> = {
        'analyst@riskengine.com': { password: 'Demo@2026', role: 'ANALYST' as Role, name: 'Demo Analyst', id: 'demo-analyst-001' },
        'manager@riskengine.com': { password: 'Demo@2026', role: 'MANAGER' as Role, name: 'Demo Manager', id: 'demo-manager-001' },
        'cro@riskengine.com':     { password: 'Demo@2026', role: 'CRO'     as Role, name: 'Demo CRO',     id: 'demo-cro-001'     },
        'admin@riskengine.com':   { password: 'Demo@2026', role: 'ADMIN'   as Role, name: 'Demo Admin',   id: 'demo-admin-001'   },
      };
      const demo = DEMO_USERS[email];
      if (demo && demo.password === password) {
        const payload = { sub: demo.id, email, role: demo.role, name: demo.name, counterpartyId: null };
        const access_token = this.jwtService.sign(payload);
        const refresh_token = this.jwtService.sign(
          { sub: demo.id },
          { secret: this.config.get<string>('auth.refreshSecret')!, expiresIn: '24h' } as JwtSignOptions,
        );
        this.logger.log(`[AUTH_DEMO] Demo login: ${email} | role=${demo.role}`);
        return {
          access_token,
          refresh_token,
          user: { id: demo.id, name: demo.name, email, role: demo.role, counterpartyId: null, clientFirm: null },
        };
      }
    }

    const allowedDomains = this.config.get<string[]>('oidc.allowedDomains') || [];
    const domain = email.split('@')[1];
    if (allowedDomains.includes(domain)) {
      throw new UnauthorizedException('Enterprise users must authenticate via SSO');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { clientFirm: { select: { id: true, name: true } } },
    });

    if (!user) {
      // Timing-safe: compare against a dummy hash to prevent user enumeration
      await bcrypt.compare(password, '$2b$12$dummyhashtopreventtimingattack00000');
      throw new UnauthorizedException('Invalid credentials');
    }

    // ─── Lockout check ────────────────────────────────────────────────────────
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(`Account locked. Try again in ${minutesLeft} minute(s).`);
    }

    // â”€â”€â”€ [LEGACY_SHA256_BRIDGE] â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (LEGACY_SHA256_BRIDGE_ENABLED && user.passwordHash && SHA256_PATTERN.test(user.passwordHash)) {
      this.logger.warn(
        `[AUTH_LEGACY] Legacy SHA-256 account detected: ${email} (id=${user.id})`,
      );

      const sha256Hash = createHash('sha256').update(password).digest('hex');
      const storedBuf = Buffer.from(user.passwordHash, 'utf8');
      const computedBuf = Buffer.from(sha256Hash, 'utf8');
      if (storedBuf.length !== computedBuf.length || !timingSafeEqual(storedBuf, computedBuf)) {
        await this.recordFailedAttempt(user.id);
        throw new UnauthorizedException('Invalid credentials');
      }

      // â”€â”€ Silent migration: rehash with bcrypt â”€â”€
      const bcryptHash = await bcrypt.hash(password, 12);
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: bcryptHash,
          passwordAlgorithm: 'BCRYPT',
          passwordMigratedAt: new Date(),
        },
      });

      // Write audit event for compliance traceability
      await this.audit.log({
        eventType: 'AUTH_LEGACY_MIGRATION',
        entityType: 'User',
        entityId: user.id,
        previousValue: { algorithm: 'SHA256' },
        newValue: { algorithm: 'BCRYPT', migratedAt: new Date().toISOString() },
      });

      this.logger.log(
        `[AUTH_LEGACY] âœ“ Migration complete for ${email} (SHA256 â†’ BCRYPT). Update DB field 'passwordAlgorithm'.`,
      );
    }
    // â”€â”€â”€ [END LEGACY_SHA256_BRIDGE] â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    else {
      // Standard bcrypt verification (all modern accounts)
      if (!user.passwordHash) {
        throw new UnauthorizedException('User does not have a local password. Please use SSO.');
      }
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        await this.recordFailedAttempt(user.id);
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    // ─── Reset lockout counters on successful auth ─────────────────────────
    await this.clearFailedAttempts(user.id);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      counterpartyId: user.counterpartyId ?? null,
    };

    const accessToken = this.jwtService.sign(payload);

    // Refresh token — signed with REFRESH_SECRET (separate key), stored as bcrypt hash
    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      { secret: this.config.get<string>('auth.refreshSecret')!, expiresIn: this.config.get<string>('auth.refreshTtl') || '7d' } as JwtSignOptions,
    );
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { hashedRefreshToken },
    });

    this.logger.log(
      `[AUTH] Login success: ${email} | role=${user.role} | algo=${user.passwordAlgorithm}`,
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        counterpartyId: user.counterpartyId ?? null,
        clientFirm: user.clientFirm ?? null,
      },
    };
  }

  async refreshAccessToken(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify<{ sub: string }>(refreshToken, {
        secret: this.config.get<string>('auth.refreshSecret')!,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, name: true, counterpartyId: true, hashedRefreshToken: true },
    });

    if (!user?.hashedRefreshToken) {
      throw new UnauthorizedException('Session revoked. Please log in again.');
    }

    const isValid = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
    if (!isValid) {
      // Token reuse detected — invalidate session entirely
      await this.prisma.user.update({ where: { id: user.id }, data: { hashedRefreshToken: null } });
      throw new UnauthorizedException('Refresh token reuse detected. Session terminated.');
    }

    // Rotate: issue new access + refresh tokens
    const newPayload = { sub: user.id, email: user.email, role: user.role, name: user.name, counterpartyId: user.counterpartyId ?? null };
    const newAccessToken = this.jwtService.sign(newPayload);
    const newRefreshToken = this.jwtService.sign(
      { sub: user.id },
      { secret: this.config.get<string>('auth.refreshSecret')!, expiresIn: this.config.get<string>('auth.refreshTtl') || '7d' } as JwtSignOptions,
    );
    const newHashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    await this.prisma.user.update({ where: { id: user.id }, data: { hashedRefreshToken: newHashedRefreshToken } });

    return { access_token: newAccessToken, refresh_token: newRefreshToken };
  }

  async logout(userId: string) {
    if (process.env.NODE_ENV !== 'production' && userId?.startsWith('demo-')) return;
    await this.prisma.user.update({ where: { id: userId }, data: { hashedRefreshToken: null } });
  }

  // â”€â”€â”€ [SSO / OIDC INTEGRATION] â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async validateOidcUser(profile: any) {
    const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
    if (!email) {
      throw new UnauthorizedException('No email found in OIDC profile');
    }

    const name = profile.displayName || profile.name?.givenName || email;

    // Explicit, conservative Role Mapping (No silent privilege escalation)
    let role: Role = Role.ANALYST; // Default
    const groups = profile._json?.groups || [];
    if (groups.includes('CRO_Group')) {
      role = Role.CRO;
    } else if (groups.includes('Risk_Managers')) {
      role = Role.MANAGER;
    }

    let user = await this.prisma.user.findUnique({ where: { email } });

    const allowedDomains = this.config.get<string[]>('oidc.allowedDomains') || [];
    const domain = email.split('@')[1];

    if (!user) {
      // Domain-aware Auto-provisioning
      if (!allowedDomains.includes(domain)) {
         throw new UnauthorizedException(`Auto-provisioning denied for domain: ${domain}. Explicit configuration required.`);
      }

      user = await this.prisma.user.create({
        data: {
          email,
          name,
          role,
          authProvider: 'OIDC',
          externalId: profile.id,
        }
      });
      await this.audit.log({
        eventType: 'USER_PROVISIONED_OIDC',
        entityType: 'User',
        entityId: user.id,
        newValue: { email, role, groups }
      });
    } else {
      // User exists, update auth provider linkage if necessary
      if (user.authProvider !== 'OIDC') {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { authProvider: 'OIDC', externalId: profile.id }
        });
      }
    }

    return user;
  }

  generateJwtToken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      counterpartyId: user.counterpartyId ?? null,
    };
    return this.jwtService.sign(payload);
  }

  /**
   * Hash a plain-text password using bcrypt (rounds=12).
   * Use this when creating/resetting users programmatically.
   */
  static async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12);
  }

  /**
   * Returns migration status for operational monitoring.
   * Call this to know when the bridge can be safely removed.
   */
  async getMigrationStatus() {
    const [total, legacy, migrated] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { passwordAlgorithm: 'SHA256' } }),
      this.prisma.user.count({ where: { passwordAlgorithm: 'BCRYPT' } }),
    ]);
    return {
      total,
      legacy,
      migrated,
      migrationComplete: legacy === 0,
      bridgeSafeToRemove: legacy === 0,
    };
  }

  /**
   * Resolves an HttpOnly auth_token cookie into an explicit { access_token, user } payload.
   * Used by the OIDC callback flow: the frontend has no direct access to HttpOnly cookies,
   * so it calls GET /auth/session (with credentials: 'include') to exchange the cookie for
   * a token it can store in localStorage and use as a Bearer header on subsequent requests.
   */
  async resolveSessionFromCookie(cookieHeader: string): Promise<{ access_token: string; user: any } | null> {
    const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
    const token = match?.[1];
    if (!token) return null;

    try {
      const payload = this.jwtService.verify<{ sub: string; email: string; role: string }>(token);
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
      if (!user) return null;
      return { access_token: token, user };
    } catch {
      return null;
    }
  }

  // ─── Account Lockout Helpers ───────────────────────────────────────────────

  private async recordFailedAttempt(userId: string): Promise<void> {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });

    if (updated.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      await this.prisma.user.update({
        where: { id: userId },
        data: { lockedUntil },
      });
      await this.audit.log({
        eventType: 'ACCOUNT_LOCKED',
        entityType: 'User',
        entityId: userId,
        newValue: { lockedUntil: lockedUntil.toISOString(), attempts: updated.failedLoginAttempts },
      });
      this.logger.warn(`[AUTH] Account locked: id=${userId} after ${MAX_FAILED_ATTEMPTS} failed attempts`);
    }
  }

  private async clearFailedAttempts(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  async unlockAccount(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
    await this.audit.log({
      eventType: 'ACCOUNT_UNLOCKED',
      entityType: 'User',
      entityId: userId,
      newValue: { unlockedAt: new Date().toISOString() },
    });
    this.logger.log(`[AUTH] Account manually unlocked by admin: id=${userId}`);
  }
}
