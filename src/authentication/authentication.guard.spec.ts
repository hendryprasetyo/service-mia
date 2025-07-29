import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from './authentication.guard';
import { EncryptionService } from 'src/common/helpers/encryption/encryption.service';
import { TestSetupModule } from 'src/config/test-setup.module';
import { DbService } from 'src/database/mysql/mysql.service';
import { mockDbService, mockLoggerService } from 'src/config/__test__/mock';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';

describe('AuthGuard', () => {
  let authGuard: AuthGuard;

  const mockEncryptionService = {
    verifyTokenJwt: jest.fn(),
  };

  const mockRequest = (token?: string): Partial<Request> => ({
    headers: {
      authorization: token ? `Bearer ${token}` : undefined,
    },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      providers: [
        AuthGuard,
        { provide: EncryptionService, useValue: mockEncryptionService },
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
        { provide: DbService, useValue: mockDbService },
      ],
    }).compile();

    authGuard = module.get<AuthGuard>(AuthGuard);
  });

  describe('canActivate', () => {
    it('should return true if token is valid', async () => {
      const token = 'valid-token';
      const payload = { id: 1 };

      // Mocking token verification
      mockEncryptionService.verifyTokenJwt.mockResolvedValue(payload);
      mockDbService.executeRawQuery.mockResolvedValue([{ id: 'unique_id' }]);

      const context: Partial<ExecutionContext> = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest(token)),
        }),
      };

      const result = await authGuard.canActivate(context as ExecutionContext);

      expect(result).toBe(true);
      expect(mockEncryptionService.verifyTokenJwt).toHaveBeenCalledWith(
        token,
        process.env.ACCESS_TOKEN_SECRET,
      );
    });

    it('should throw UnauthorizedException if user not found in db', async () => {
      const token = 'valid-token';
      const payload = { id: 1 };

      // Mocking token verification
      mockEncryptionService.verifyTokenJwt.mockResolvedValue(payload);
      mockDbService.executeRawQuery.mockResolvedValue(null);

      const context: Partial<ExecutionContext> = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest(token)),
        }),
      };

      try {
        await authGuard.canActivate(context as ExecutionContext);
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
      }
    });

    it('should throw UnauthorizedException if no token is provided', async () => {
      const context: Partial<ExecutionContext> = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest()),
        }),
      };

      try {
        await authGuard.canActivate(context as ExecutionContext);
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
      }
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      const token = 'invalid-token';

      mockEncryptionService.verifyTokenJwt.mockRejectedValue(
        new Error('Invalid token'),
      );

      const context: Partial<ExecutionContext> = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest(token)),
        }),
      };

      try {
        await authGuard.canActivate(context as ExecutionContext);
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
      }
    });

    it('should throw ForbidenException if token is expired', async () => {
      const token = 'invalid-token';

      mockEncryptionService.verifyTokenJwt.mockRejectedValue({
        data: { status_code: '11403' },
      });

      const context: Partial<ExecutionContext> = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest(token)),
        }),
      };

      try {
        await authGuard.canActivate(context as ExecutionContext);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });
  });
});
