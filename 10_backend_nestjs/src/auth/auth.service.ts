import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';

// â”€â”€â”€ Bridge Flag â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// When `SELECT count(*) FROM "User" WHERE "passwordAlgorithm" = 'SHA256'` = 0,
// delete the entire block marked [LEGACY_SHA256_BRIDGE] below and this flag.
const LEGACY_SHA256_BRIDGE_ENABLED = true;

// SHA-256 pattern: 64 hex characters, NO bcrypt prefix
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    if (!email || !password) {
      throw new UnauthorizedException('Email and password are required');
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

    // â”€â”€â”€ [LEGACY_SHA256_BRIDGE] â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (LEGACY_SHA256_BRIDGE_ENABLED && user.passwordHash && SHA256_PATTERN.test(user.passwordHash)) {
      this.logger.warn(
        `[AUTH_LEGACY] Legacy SHA-256 account detected: ${email} (id=${user.id})`,
      );

      const sha256Hash = createHash('sha256').update(password).digest('hex');
      if (user.passwordHash !== sha256Hash) {
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
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      counterpartyId: user.counterpartyId ?? null,
    };

    const accessToken = this.jwtService.sign(payload);

    // @TODO: Security Hardening - Refresh Token Implementation
    // For a strict 15-minute access_token TTL, implement a secure HttpOnly refresh token:
    // const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d', secret: process.env.REFRESH_SECRET });
    // await this.prisma.user.update({ where: { id: user.id }, data: { currentHashedRefreshToken: bcrypt(refreshToken) } });

    this.logger.log(
      `[AUTH] Login success: ${email} | role=${user.role} | algo=${user.passwordAlgorithm}`,
    );

    return {
      access_token: accessToken,
      // refresh_token: refreshToken, // Uncomment when fully migrating the frontend to interceptors
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        counterpartyId: user.counterpartyId ?? null,
        clientFirm: user.clientFirm ?? null,
        passwordAlgorithm: user.passwordAlgorithm,
      },
    };
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
}
