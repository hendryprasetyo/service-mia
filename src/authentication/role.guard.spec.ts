import { RolesGuard } from './role.guard'; // Sesuaikan path dengan struktur file kamu
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { AuthRequest } from 'src/common/dtos/dto';

describe('RolesGuard', () => {
  let rolesGuard: RolesGuard;
  let reflector;

  beforeEach(() => {
    reflector = { get: jest.fn() } as unknown as Reflector;
    rolesGuard = new RolesGuard(reflector);
  });

  describe('canActivate', () => {
    let context: ExecutionContext;
    let request: AuthRequest;

    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'ADMIN' },
      } as AuthRequest;

      context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
        getHandler: jest.fn(),
      } as unknown as ExecutionContext;
    });

    it('should return true if no roles are defined in the handler', () => {
      reflector.get.mockReturnValue(undefined);

      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should return true if user role matches one of the allowed roles', () => {
      const roles = ['ADMIN', 'USER'];
      reflector.get.mockReturnValue(roles);

      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should throw UnauthorizedException if role does not match any of the allowed roles', () => {
      const roles = ['USER', 'SELLER'];
      reflector.get.mockReturnValue(roles);

      request.auth.role = 'ADMIN';

      expect(() => rolesGuard.canActivate(context)).toThrow(
        UnauthorizedException,
      );
    });
  });
});
