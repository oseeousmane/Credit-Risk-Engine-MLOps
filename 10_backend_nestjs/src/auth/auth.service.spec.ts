import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

// â”€â”€ Mocks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const mockUser = {
  id: 'user-uuid-001',
  email: 'analyst@riskengine.com',
  name: 'Test Analyst',
  role: 'ANALYST',
  counterpartyId: null,
  passwordAlgorithm: 'BCRYPT',
  passwordMigratedAt: null,
  clientFirm: null,
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
  verify: jest.fn(),
};

const mockAudit = {
  log: jest.fn().mockResolvedValue({ id: 'audit-001' }),
};

const mockConfig = {
  get: jest.fn((key: string) => key === 'oidc.allowedDomains' ? [] : undefined),
};

// â”€â”€ Test Suite â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: AuditService, useValue: mockAudit },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('login â†’ bcrypt (modern accounts)', () => {
    it('should return access_token on valid bcrypt credentials', async () => {
      const plainPassword = 'Demo@2026!';
      const hash = await bcrypt.hash(plainPassword, 4);

      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: hash,
        passwordAlgorithm: 'BCRYPT',
      });

      const result = await service.login('analyst@riskengine.com', plainPassword);

      expect(result.access_token).toBe('mock.jwt.token');
      expect(result.user.email).toBe('analyst@riskengine.com');
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      const hash = await bcrypt.hash('correct-password', 4);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: hash,
      });
      mockPrisma.user.update.mockResolvedValue({ failedLoginAttempts: 1 });

      await expect(service.login('analyst@riskengine.com', 'wrong-password'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login('unknown@example.com', 'password'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when email/password are empty', async () => {
      await expect(service.login('', 'password')).rejects.toThrow(UnauthorizedException);
      await expect(service.login('email@test.com', '')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login â†’ SHA-256 legacy migration', () => {
    it('should authenticate legacy SHA-256 account and silently migrate to bcrypt', async () => {
      const plainPassword = 'OldPassword123';
      const sha256Hash = createHash('sha256').update(plainPassword).digest('hex');

      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: sha256Hash,
        passwordAlgorithm: 'SHA256',
      });
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, passwordAlgorithm: 'BCRYPT' });

      const result = await service.login('analyst@riskengine.com', plainPassword);

      // Login succeeds
      expect(result.access_token).toBe('mock.jwt.token');

      // User record is updated to bcrypt
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({ passwordAlgorithm: 'BCRYPT' }),
        }),
      );

      // Audit event is written
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'AUTH_LEGACY_MIGRATION',
          entityType: 'User',
          entityId: mockUser.id,
        }),
      );
    });

    it('should reject wrong password for legacy SHA-256 account without migrating', async () => {
      const sha256Hash = createHash('sha256').update('correct-password').digest('hex');
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: sha256Hash,
        passwordAlgorithm: 'SHA256',
      });
      mockPrisma.user.update.mockResolvedValue({ failedLoginAttempts: 1 });

      await expect(service.login('analyst@riskengine.com', 'wrong-password'))
        .rejects.toThrow(UnauthorizedException);

      // Migration must NOT happen on failed auth — recordFailedAttempt() is allowed
      expect(mockPrisma.user.update).not.toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ passwordAlgorithm: 'BCRYPT' }) }),
      );
      expect(mockAudit.log).not.toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'AUTH_LEGACY_MIGRATION' }),
      );
    });
  });

  describe('getMigrationStatus', () => {
    it('should report migration complete when no legacy accounts remain', async () => {
      mockPrisma.user.count
        .mockResolvedValueOnce(10)   // total
        .mockResolvedValueOnce(0)    // legacy SHA256
        .mockResolvedValueOnce(10);  // bcrypt

      const status = await service.getMigrationStatus();

      expect(status.total).toBe(10);
      expect(status.legacy).toBe(0);
      expect(status.migrationComplete).toBe(true);
      expect(status.bridgeSafeToRemove).toBe(true);
    });

    it('should report bridge still needed when legacy accounts exist', async () => {
      mockPrisma.user.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(3)   // 3 legacy accounts remain
        .mockResolvedValueOnce(7);

      const status = await service.getMigrationStatus();

      expect(status.legacy).toBe(3);
      expect(status.migrationComplete).toBe(false);
      expect(status.bridgeSafeToRemove).toBe(false);
    });
  });

  describe('hashPassword (static)', () => {
    it('should produce a valid bcrypt hash', async () => {
      const hash = await AuthService.hashPassword('test-password');
      const isValid = await bcrypt.compare('test-password', hash);
      expect(isValid).toBe(true);
    }, 15000);
  });

  describe('resolveSessionFromCookie', () => {
    it('should return access_token and user when cookie is valid', async () => {
      const cookieHeader = 'auth_token=valid.jwt.here; other_cookie=foo';
      mockJwt.verify.mockReturnValue({ sub: mockUser.id, email: mockUser.email, role: mockUser.role });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.resolveSessionFromCookie(cookieHeader);

      expect(result).not.toBeNull();
      expect(result!.access_token).toBe('valid.jwt.here');
      expect(result!.user.id).toBe(mockUser.id);
    });

    it('should return null when auth_token cookie is absent', async () => {
      const result = await service.resolveSessionFromCookie('other_cookie=foo');
      expect(result).toBeNull();
      expect(mockJwt.verify).not.toHaveBeenCalled();
    });

    it('should return null when jwt.verify throws (expired or tampered token)', async () => {
      mockJwt.verify.mockImplementation(() => { throw new Error('invalid signature'); });
      const result = await service.resolveSessionFromCookie('auth_token=bad.token');
      expect(result).toBeNull();
    });

    it('should return null when token is valid but user no longer exists in DB', async () => {
      mockJwt.verify.mockReturnValue({ sub: 'deleted-user-id', email: 'x@x.com', role: 'ANALYST' });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.resolveSessionFromCookie('auth_token=valid.jwt.here');
      expect(result).toBeNull();
    });
  });
});
