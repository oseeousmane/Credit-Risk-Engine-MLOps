import { RolesGuard } from './roles.guard';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

describe('RolesGuard (Unit)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  const mockExecutionContext = (userRole?: Role): ExecutionContext => {
    const req = {
      user: userRole ? { id: 'test-user', role: userRole } : undefined,
    };
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(req),
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow access if no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(mockExecutionContext(Role.ANALYST))).toBe(true);
  });

  it('should deny access if no user is present on the request', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.MANAGER]);
    expect(guard.canActivate(mockExecutionContext())).toBe(false);
  });

  it('should deny access if user role does not match required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.MANAGER, Role.CRO]);
    expect(guard.canActivate(mockExecutionContext(Role.ANALYST))).toBe(false);
  });

  it('should allow access if user has one of the required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.MANAGER, Role.CRO]);
    expect(guard.canActivate(mockExecutionContext(Role.MANAGER))).toBe(true);
  });

  it('should deny access for CLIENT attempting to hit internal ADMIN routes', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    expect(guard.canActivate(mockExecutionContext(Role.CLIENT))).toBe(false);
  });
});
