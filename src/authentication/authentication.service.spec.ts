import * as JWT from 'jsonwebtoken';
import * as Bcrypt from 'bcryptjs';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationService } from './authentication.service';
import { RedisService } from 'src/database/redis/redis.service';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { HttpException } from '@nestjs/common';
import {
  CallbackOauthDto,
  LoginDto,
  LoginGoggleDto,
  RegisterDto,
  RegisterSendOtpDto,
  RegisterVerifyOtpDto,
  ResetPasswordDto,
  VerifyTokenForgotPasswordDto,
} from './authentication.dto';
import { EncryptionService } from 'src/common/helpers/encryption/encryption.service';
import { Request, Response } from 'express';
import { TestSetupModule } from 'src/config/test-setup.module';
import {
  mockDbService,
  mockHeaders,
  mockLoggerService,
  mockOAuthService,
  mockRabbitMQService,
  mockRedisService,
  mockReply,
  mockRequest,
} from 'src/config/__test__/mock';
import { RabbitmqService } from 'src/common/providers/rabbitmq/rabbitmq.service';
import { GeneralService } from 'src/common/helpers/general/general.service';
import { DbService } from 'src/database/mysql/mysql.service';
import { OAuthService } from 'src/common/providers/oAuth/oAuth.service';

let payload:
  | RegisterSendOtpDto
  | RegisterVerifyOtpDto
  | RegisterDto
  | LoginDto
  | ResetPasswordDto
  | VerifyTokenForgotPasswordDto
  | CallbackOauthDto
  | LoginGoggleDto;

describe('AuthenticationService', () => {
  let service: AuthenticationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      providers: [
        AuthenticationService,
        EncryptionService,
        GeneralService,
        { provide: DbService, useValue: mockDbService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
        { provide: RabbitmqService, useValue: mockRabbitMQService },
        { provide: OAuthService, useValue: mockOAuthService },
      ],
    }).compile();

    service = module.get<AuthenticationService>(AuthenticationService);
  });
  afterEach(() => {
    jest.restoreAllMocks(); // Reset semua spy/mocks
    jest.clearAllMocks(); // Bersihkan call history dll
  });

  describe('registerSendOtp', () => {
    it('should return error 400 SQL INJECTION', async () => {
      payload = { email: 'test@' };
      try {
        await service.registerSendOtp(payload, mockHeaders);
      } catch (error) {
        expect(error.isHelperFail).toBe(true);
        expect(error.data.status).toBe(400);
        expect(error.data.status_code).toBe('44400');
        expect(error.data.status_desc).toBe('Bad Request');
      }
    });

    it('should return error 422 Failed Encryption', async () => {
      payload = { email: 'test@example.com' };
      try {
        await service.registerSendOtp(payload, mockHeaders);
      } catch (error) {
        expect(error.isHelperFail).toBe(true);
        expect(error.data.status).toBe(422);
        expect(error.data.status_code).toBe('01422');
        expect(error.data.status_desc).toBe('Unprocessable Entity');
      }
    });

    it('should return token and OTP expiration when email does not exist', async () => {
      payload = {
        email: 'test@example.com',
      };
      const mockToken = 'test-token';
      const mockExpirationTime = Math.floor(Date.now() / 1000) + 300;

      mockDbService.executeRawQuery.mockResolvedValue(null);
      mockRedisService.setDataWithTTL.mockResolvedValue(undefined);
      mockRabbitMQService.sendToQueue.mockResolvedValue('success');

      jest.spyOn(JWT, 'sign').mockReturnValue(mockToken);

      const result = await service.registerSendOtp(payload, mockHeaders);

      expect(result).toEqual({ token: mockToken, otpExp: mockExpirationTime });
      expect(mockRedisService.setDataWithTTL).toHaveBeenCalledWith(
        expect.objectContaining({
          key: `otp-register-${payload.email}`,
        }),
      );
      expect(mockRabbitMQService.sendToQueue).toHaveBeenCalled();
    });

    it('should throw HttpException if email already exists', async () => {
      payload = {
        email: 'test@example.com',
      };

      mockDbService.executeRawQuery.mockResolvedValue([{ id: 1 }]);

      const result = (await service.registerSendOtp(
        payload,
        mockHeaders,
      )) as HttpException;
      expect(result.message).toBe('Email already exist');
      expect(result.getStatus()).toBe(400);
    });

    it('should return Internal server error', async () => {
      payload = {
        email: 'test@example.com',
      };
      mockDbService.executeRawQuery.mockRejectedValue(new Error('Error redis'));
      try {
        await service.registerSendOtp(payload, mockHeaders);
      } catch (error) {
        expect(error.message).toBe('Error redis');
      }
    });
  });

  describe('registerVerifyOtp', () => {
    it('should return invalid step token', async () => {
      payload = { otp: '123456', token: 'test-token' };

      jest
        .spyOn(JWT, 'verify')
        .mockResolvedValue({ email: 'test@example.com', step: 3 });

      const result = (await service.registerVerifyOtp(
        payload,
        mockHeaders,
      )) as HttpException;
      expect(result.message).toBe('Bad Request');
      expect(result.getStatus()).toBe(400);
    });

    it('should return expired otp', async () => {
      payload = { otp: '123456', token: 'test-token' };
      const mockOtp = {
        code: 123456,
        exp: Math.floor(Date.now() / 1000) - 300,
      };

      jest
        .spyOn(JWT, 'verify')
        .mockResolvedValue({ email: 'test@example.com', step: 2 });
      mockRedisService.getData.mockResolvedValue(mockOtp);
      mockRedisService.deleteData.mockResolvedValue(undefined);

      const result = (await service.registerVerifyOtp(
        payload,
        mockHeaders,
      )) as HttpException;
      expect(result.message).toBe('Your OTP has expired. Please resend it.');
      expect(result.getStatus()).toBe(400);
    });

    it('should return a new token if OTP is valid', async () => {
      payload = { otp: '123456', token: 'test-token' };
      const mockOtp = {
        code: 123456,
        exp: Math.floor(Date.now() / 1000) + 300,
      };
      const mockNewToken = 'new-test-token';

      jest
        .spyOn(JWT, 'verify')
        .mockResolvedValue({ email: 'test@example.com', step: 2 });
      mockRedisService.getData.mockResolvedValue(mockOtp);
      jest.spyOn(JWT, 'sign').mockReturnValue(mockNewToken);
      mockRedisService.deleteData.mockResolvedValue(undefined);

      const result = await service.registerVerifyOtp(payload, mockHeaders);
      expect(result).toEqual({ token: mockNewToken });
      expect(mockRedisService.getData).toHaveBeenCalledWith({
        key: `otp-register-test@example.com`,
        transactionid: mockHeaders.transactionid,
        returnType: 'object',
      });
      expect(mockRedisService.deleteData).toHaveBeenCalledWith({
        key: `otp-register-test@example.com`,
        transactionid: mockHeaders.transactionid,
      });
    });

    it('should throw HttpException if OTP is invalid', async () => {
      payload = { otp: '123456', token: 'test-token' };

      jest
        .spyOn(JWT, 'verify')
        .mockResolvedValue({ email: 'test@example.com', step: 2 });
      mockRedisService.getData.mockResolvedValue(null);

      const result = (await service.registerVerifyOtp(
        payload,
        mockHeaders,
      )) as HttpException;
      expect(result.message).toBe('Invalid OTP');
      expect(result.getStatus()).toBe(400);
    });

    it('should throw error helper fail verify jwt : Token has expired', async () => {
      payload = { otp: '123456', token: 'test-token' };

      jest
        .spyOn(JWT, 'verify')
        .mockRejectedValue({ name: 'TokenExpiredError' });
      try {
        await service.registerVerifyOtp(payload, mockHeaders);
      } catch (error) {
        expect(error.isHelperFail).toBe(true);
        expect(error.message).toBe('Token has expired');
        expect(error.data.status).toBe(400);
        expect(error.data.status_code).toBe('11403');
        expect(error.data.status_desc).toBe('Unprocessable Entity');
      }
    });

    it('should throw error helper fail verify jwt : Invalid token payload', async () => {
      payload = { otp: '123456', token: 'test-token' };

      jest
        .spyOn(JWT, 'verify')
        .mockRejectedValue({ name: 'JsonWebTokenError' });

      try {
        await service.registerVerifyOtp(payload, mockHeaders);
      } catch (error) {
        expect(error.isHelperFail).toBe(true);
        expect(error.message).toBe('Invalid token payload');
        expect(error.data.status).toBe(400);
        expect(error.data.status_code).toBe('01400');
        expect(error.data.status_desc).toBe('Unprocessable Entity');
      }
    });

    it('should return Error verify jwt : Unexpected error', async () => {
      payload = { otp: '123456', token: 'test-token' };

      jest.spyOn(JWT, 'verify').mockRejectedValue({ name: 'Unexpeced Error' });

      try {
        await service.registerVerifyOtp(payload, mockHeaders);
      } catch (error) {
        expect(error.isHelperFail).toBe(true);
        expect(error.data.status).toBe(422);
        expect(error.data.status_code).toBe('01422');
        expect(error.data.status_desc).toBe('Unprocessable Entity');
      }
    });

    it('should return Unexpected error redis', async () => {
      payload = { otp: '123456', token: 'test-token' };
      const mockOtp = {
        code: 123456,
        exp: Math.floor(Date.now() / 1000) + 300,
      };
      const mockNewToken = 'new-test-token';

      jest
        .spyOn(JWT, 'verify')
        .mockResolvedValue({ email: 'test@example.com', step: 2 });
      mockRedisService.getData.mockResolvedValue(mockOtp);
      jest.spyOn(JWT, 'sign').mockReturnValue(mockNewToken);
      mockRedisService.deleteData.mockRejectedValue(
        new Error('error delete data'),
      );

      try {
        await service.registerVerifyOtp(payload, mockHeaders);
      } catch (error) {
        expect(error.message).toBe('error delete data');
      }
    });
  });

  describe('register', () => {
    beforeEach(() => {
      payload = {
        token: 'valid-token',
        username: 'testuser',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        confirmPassword: 'password123',
      };
    });

    it('should return error 400 Invalid Password', async () => {
      payload = {
        ...payload,
        password: 'te st',
      } as RegisterDto;
      try {
        await service.register(payload as RegisterDto, mockHeaders);
      } catch (error) {
        expect(error.isHelperFail).toBe(true);
        expect(error.data.status).toBe(400);
        expect(error.data.status_code).toBe('44400');
        expect(error.data.status_desc).toBe(
          `Value must not contain spaces: te st`,
        );
      }
    });

    it('should return 400 invalid token step', async () => {
      jest
        .spyOn(JWT, 'verify')
        .mockResolvedValue({ email: 'test@example.com', step: 4 });

      const result = (await service.register(
        payload as RegisterDto,
        mockHeaders,
      )) as HttpException;

      expect(result.message).toBe('Bad Request');
      expect(result.getStatus()).toBe(400);
    });

    it('should return 400 user already exist', async () => {
      jest
        .spyOn(JWT, 'verify')
        .mockResolvedValue({ email: 'test@example.com', step: 3 });

      mockDbService.executeInTransaction.mockImplementation(
        async (trxid, cb) => {
          return cb(
            mockDbService.executeRawQuery.mockImplementation((params) => {
              if (params.logName === 'GET USER REGISTER')
                return [{ id: 'unqiue_id' }];
            }),
          );
        },
      );

      const result = (await service.register(
        payload as RegisterDto,
        mockHeaders,
      )) as HttpException;
      expect(result.message).toBe('Email or Username already exist');
      expect(result.getStatus()).toBe(400);
    });

    it('should return success if registration is successful', async () => {
      jest
        .spyOn(JWT, 'verify')
        .mockResolvedValue({ email: 'test@example.com', step: 3 });

      mockDbService.executeInTransaction.mockImplementation(
        async (trxid, cb) => {
          return cb(
            mockDbService.executeRawQuery.mockImplementation((params) => {
              if (params.logName === 'GET USER REGISTER') return [];
              if (params.logName === 'INSERT USER PROFILE') return [];
              if (params.logName === 'INSERT USER') return [];
              mockRabbitMQService.sendToQueue.mockResolvedValue('success');
              return;
            }),
          );
        },
      );
      jest.spyOn(Bcrypt, 'hashSync').mockReturnValue('hashed-password');

      const result = await service.register(
        payload as RegisterDto,
        mockHeaders,
      );

      expect(result).toEqual(undefined);
    });

    it('should throw HttpException Failed verify jwt', async () => {
      jest
        .spyOn(JWT, 'verify')
        .mockRejectedValue({ name: 'TokenExpiredError' });
      try {
        await service.register(payload as RegisterDto, mockHeaders);
      } catch (error) {
        expect(error.isHelperFail).toBe(true);
        expect(error.message).toBe('Token has expired');
        expect(error.data.status).toBe(400);
        expect(error.data.status_code).toBe('11403');
        expect(error.data.status_desc).toBe('Unprocessable Entity');
      }
    });

    it('should return error Failed verify jwt', async () => {
      jest.spyOn(JWT, 'verify').mockRejectedValue({ name: 'Unexpected error' });
      try {
        await service.register(payload as RegisterDto, mockHeaders);
      } catch (error) {
        expect(error.isHelperFail).toBe(true);
        expect(error.data.status).toBe(422);
        expect(error.data.status_code).toBe('01422');
        expect(error.data.status_desc).toBe('Unprocessable Entity');
      }
    });

    it('should return unexpected error db', async () => {
      jest
        .spyOn(JWT, 'verify')
        .mockResolvedValue({ email: 'test@example.com', step: 3 });

      mockDbService.executeInTransaction.mockImplementation(
        async (trxid, cb) => {
          return cb(
            mockDbService.executeRawQuery.mockImplementation((params) => {
              if (params.logName === 'GET USER REGISTER')
                throw new Error('error find user');
              return;
            }),
          );
        },
      );

      try {
        await service.register(payload as RegisterDto, mockHeaders);
      } catch (error) {
        expect(error.message).toBe('error find user');
      }
    });
  });

  describe('login', () => {
    beforeEach(() => {
      payload = {
        identifierLogin: 'testuser',
        password: 'password123',
      };
    });
    it('should return error 422 Unprocessable Entity', async () => {
      payload = {
        identifierLogin: 'testuser',
        password: 'password123',
      };
      try {
        await service.login(payload, mockReply as Response, mockHeaders);
      } catch (error) {
        expect(error.isHelperFail).toBe(true);
        expect(error.data.status).toBe(422);
        expect(error.data.status_code).toBe('01422');
        expect(error.data.status_desc).toBe('Unprocessable Entity');
      }
    });

    it('should return error 400 user not found', async () => {
      mockDbService.executeRawQuery.mockImplementation((params) => {
        if (params.logName === 'GET USER LOGIN') return null;
      });
      mockRedisService.getData.mockResolvedValue(null);
      mockRedisService.setDataWithTTL.mockResolvedValue(null);

      const result = (await service.login(
        payload as LoginDto,
        mockReply as Response,
        mockHeaders,
      )) as HttpException;
      expect(result.message).toBe('User Not Found');
      expect(result.getStatus()).toBe(400);
    });

    it('should return error 429 bot detection', async () => {
      mockDbService.executeRawQuery.mockResolvedValue([{ id: 'unique-id' }]);

      mockRedisService.getData.mockResolvedValue(7);

      const result = (await service.login(
        payload as LoginDto,
        mockReply as Response,
        mockHeaders,
      )) as HttpException;
      expect(result.message).toBe('To Many Request, try again later!');
      expect(result.getStatus()).toBe(429);
    });

    it('should return error 429 to many request invalid password', async () => {
      mockDbService.executeRawQuery.mockResolvedValue([{ id: 'unique-id' }]);
      mockRedisService.setDataWithTTL.mockResolvedValue(null);
      mockRedisService.getData.mockImplementation((dataObj) => {
        if (
          dataObj.key ===
          'locking-login-deviceid-D3C52F96-C874-488D-9642-312BC6708E26'
        ) {
          return 3;
        }

        if (dataObj.key === 'locking-login-user-unique-id') {
          return 3;
        }
        return null;
      });

      const result = (await service.login(
        payload as LoginDto,
        mockReply as Response,
        mockHeaders,
      )) as HttpException;
      expect(result.message).toBe('To Many Request Invalid Password');
      expect(result.getStatus()).toBe(429);
    });

    it('should return error 400 to many request invalid password : with empty locking user', async () => {
      mockDbService.executeRawQuery.mockResolvedValue([{ id: 'unique-id' }]);
      mockRedisService.getData.mockImplementation((dataObj) => {
        if (
          dataObj.key ===
          'locking-login-deviceid-D3C52F96-C874-488D-9642-312BC6708E26'
        ) {
          return 3;
        }

        if (dataObj.key === 'locking-login-user-unique-id') {
          return null;
        }
        return null;
      });
      jest.spyOn(Bcrypt, 'compareSync').mockResolvedValue(false);
      mockRedisService.setDataWithTTL.mockResolvedValue(null);

      const result = (await service.login(
        payload as LoginDto,
        mockReply as Response,
        mockHeaders,
      )) as HttpException;
      expect(result.message).toBe('Invalid Password');
      expect(result.getStatus()).toBe(400);
    });

    it('should return error 400 to many request invalid password : with locking user', async () => {
      mockDbService.executeRawQuery.mockResolvedValue([{ id: 'unique-id' }]);
      mockRedisService.getData.mockImplementation((dataObj) => {
        if (
          dataObj.key ===
          'locking-login-deviceid-D3C52F96-C874-488D-9642-312BC6708E26'
        ) {
          return 3;
        }

        if (dataObj.key === 'locking-login-user-unique-id') {
          return 2;
        }
        return null;
      });
      jest.spyOn(Bcrypt, 'compareSync').mockResolvedValue(false);
      mockRedisService.setDataWithTTL.mockResolvedValue(null);

      const result = (await service.login(
        payload as LoginDto,
        mockReply as Response,
        mockHeaders,
      )) as HttpException;
      expect(result.message).toBe('Invalid Password');
      expect(result.getStatus()).toBe(400);
    });

    it('should return success login', async () => {
      mockDbService.executeRawQuery.mockImplementation((params) => {
        if (['GET USER LOGIN', 'UPDATE USER LOGIN'].includes(params.logName))
          return [{ id: 'unique-id' }];
      });
      mockRedisService.getData.mockImplementation((dataObj) => {
        if (
          dataObj.key ===
          'locking-login-deviceid-D3C52F96-C874-488D-9642-312BC6708E26'
        ) {
          return 3;
        }

        if (dataObj.key === 'locking-login-user-unique-id') {
          return 2;
        }
        return null;
      });
      jest.spyOn(Bcrypt, 'compareSync').mockResolvedValue(true);

      const result = (await service.login(
        payload as LoginDto,
        mockReply as Response,
        mockHeaders,
      )) as { access_token: string };
      expect(result.access_token).toBeDefined();
    });

    it('should return error findFirst error', async () => {
      mockDbService.executeRawQuery.mockRejectedValue(
        new Error('DB connection error'),
      );
      try {
        await service.login(
          payload as LoginDto,
          mockReply as Response,
          mockHeaders,
        );
      } catch (error) {
        expect(error.message).toBe('DB connection error');
      }
    });
  });

  describe('Refresh Token', () => {
    it('should return error 401 Unauthorized : cookie not exist', async () => {
      mockRequest.cookies = {
        [process.env.KEY_COOKIE_RESFRESH_TOKEN]: null,
      };
      const result = (await service.refreshToken(
        mockRequest as Request,
        mockReply as Response,
        mockHeaders,
      )) as HttpException;
      expect(result.getStatus()).toBe(401);
      expect(result.message).toBe('Unauthorized');
      expect(result.cause).toBe('00401');
    });

    it('should return error 401 Unauthorized : user not exisit', async () => {
      mockRequest.cookies = {
        [process.env.KEY_COOKIE_RESFRESH_TOKEN]: 'coookie refresh token',
      };
      jest.spyOn(JWT, 'verify').mockReturnValue({ id: 'unique-id' });
      mockDbService.executeRawQuery.mockResolvedValue(null);
      const result = (await service.refreshToken(
        mockRequest as Request,
        mockReply as Response,
        mockHeaders,
      )) as HttpException;
      expect(result.getStatus()).toBe(401);
      expect(result.message).toBe('Unauthorized');
      expect(result.cause).toBe('00401');
    });

    it('should return successfully refresh token', async () => {
      mockRequest.cookies = {
        [process.env.KEY_COOKIE_RESFRESH_TOKEN]: 'coookie refresh token',
      };
      jest.spyOn(JWT, 'verify').mockReturnValue({ id: 'unique-id' });
      mockDbService.executeRawQuery.mockResolvedValue([{ role: 'USER' }]);
      jest.spyOn(JWT, 'sign').mockReturnValue('new-access-token');
      const result = (await service.refreshToken(
        mockRequest as Request,
        mockReply as Response,
        mockHeaders,
      )) as { access_token: string };
      expect(result.access_token).toBe('new-access-token');
      expect(mockReply.cookie).toHaveBeenCalledWith(
        process.env.KEY_COOKIE_ACCESS_TOKEN,
        'new-access-token',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          maxAge: +process.env.MAX_AGE_COOKIE_AUTH,
          sameSite: 'lax',
        }),
      );
    });
    it('should throw error verify jwt', async () => {
      mockRequest.cookies = {
        [process.env.KEY_COOKIE_RESFRESH_TOKEN]: 'coookie refresh token',
      };
      jest
        .spyOn(JWT, 'verify')
        .mockRejectedValue({ name: 'TokenExpiredError' });

      try {
        (await service.refreshToken(
          mockRequest as Request,
          mockReply as Response,
          mockHeaders,
        )) as HttpException;
      } catch (error) {
        expect(error.message).toBe('Token has expired');
      }
    });

    it('should throw error findFirst error', async () => {
      mockRequest.cookies = {
        [process.env.KEY_COOKIE_RESFRESH_TOKEN]: 'coookie refresh token',
      };
      jest.spyOn(JWT, 'verify').mockReturnValue({ id: 'unique-id' });
      mockDbService.executeRawQuery.mockRejectedValue(
        new Error('DB connection error'),
      );
      try {
        await service.refreshToken(
          mockRequest as Request,
          mockReply as Response,
          mockHeaders,
        );
      } catch (error) {
        expect(error.message).toBe('DB connection error');
      }
    });
  });

  describe('Logout', () => {
    it('should return success : cookie refresh token not exist', async () => {
      mockRequest.cookies = {
        [process.env.KEY_COOKIE_RESFRESH_TOKEN]: null,
        [process.env.KEY_COOKIE_ACCESS_TOKEN]: 'valid token',
      };
      const result = await service.logout(
        mockRequest as Request,
        mockReply as Response,
        mockHeaders,
      );
      expect(result).toEqual({});
      expect(mockReply.clearCookie).toHaveBeenCalled();
    });

    it('should return success : cookie refresh token exist baut user notfound in db', async () => {
      mockRequest.cookies = {
        [process.env.KEY_COOKIE_RESFRESH_TOKEN]: 'valid-refresh-token',
      };
      jest.spyOn(JWT, 'verify').mockReturnValue({ id: 'uniqueid' });
      mockDbService.executeInTransaction.mockImplementation((trxid, cb) => {
        return cb(
          mockDbService.executeRawQuery.mockImplementation((params) => {
            if (params.logName === 'GET USER LOGOUT') return null;
          }),
        );
      });
      const result = await service.logout(
        mockRequest as Request,
        mockReply as Response,
        mockHeaders,
      );
      expect(result).toEqual({});
      expect(mockReply.clearCookie).toHaveBeenCalled();
    });

    it('should return success : cookie refresh token exist baut user founded in db', async () => {
      mockRequest.cookies = {
        [process.env.KEY_COOKIE_RESFRESH_TOKEN]: 'valid-refresh-token',
      };
      jest.spyOn(JWT, 'verify').mockReturnValue({ id: 'uniqueid' });
      mockDbService.executeInTransaction.mockImplementation((trxid, cb) => {
        return cb(
          mockDbService.executeRawQuery.mockImplementation((params) => {
            if (params.logName === 'GET USER LOGOUT')
              return [{ id: 'unique_id' }];
            if (params.logName === 'UPDATE USER LOGOUT') return [];
          }),
        );
      });
      const result = await service.logout(
        mockRequest as Request,
        mockReply as Response,
        mockHeaders,
      );
      expect(result).toEqual({});
      expect(mockReply.clearCookie).toHaveBeenCalled();
    });

    it('should return success : cookie refresh exist but error verify token', async () => {
      mockRequest.cookies = {
        [process.env.KEY_COOKIE_RESFRESH_TOKEN]: 'valid-refresh-token',
      };
      jest.spyOn(JWT, 'verify').mockRejectedValue({ name: 'unexpected error' });
      const result = await service.logout(
        mockRequest as Request,
        mockReply as Response,
        mockHeaders,
      );
      expect(result).toEqual({});
      expect(mockReply.clearCookie).toHaveBeenCalled();
    });

    it('should return error unexpected error service', async () => {
      mockRequest.cookies = {
        [process.env.KEY_COOKIE_RESFRESH_TOKEN]: 'valid-refresh-token',
      };
      jest.spyOn(JWT, 'verify').mockReturnValue({ id: 'uniqueid' });
      mockDbService.executeInTransaction.mockRejectedValue(
        new Error('error connect DB'),
      );
      try {
        await service.logout(
          mockRequest as Request,
          mockReply as Response,
          mockHeaders,
        );
        expect(mockReply.clearCookie).toHaveBeenCalled();
      } catch (error) {
        expect(error.message).toBe('error connect DB');
      }
    });
  });

  describe('forgotPassword', () => {
    it('should return error HTTPExeption User not found', async () => {
      mockDbService.executeRawQuery.mockResolvedValue(null);

      payload = {
        email: 'testuser@gmail.com',
      };
      const result = (await service.forgotPassword(
        payload,
        mockHeaders,
      )) as HttpException;
      expect(result.getStatus()).toBe(400);
      expect(result.message).toBe('User Not Found');
      expect(result.cause).toBe('01400');
    });

    it('should return success', async () => {
      mockDbService.executeRawQuery.mockResolvedValue([
        {
          id: 'unique_id',
          username: 'jhon',
        },
      ]);
      mockRedisService.setDataWithTTL.mockResolvedValue('success');
      mockRabbitMQService.sendToQueue.mockResolvedValue('success');
      payload = {
        email: 'testuser@gmail.com',
      };
      const result = await service.forgotPassword(payload, mockHeaders);
      expect(result).toEqual(undefined);
    });

    it('should return Internal server error', async () => {
      payload = {
        email: 'testuser@gmail.com',
      };
      mockDbService.executeRawQuery.mockRejectedValue(new Error('Error DB'));
      try {
        await service.forgotPassword(payload, mockHeaders);
      } catch (error) {
        expect(error.message).toBe('Error DB');
      }
    });
  });

  describe('verifyTokenForgotPassword', () => {
    beforeEach(() => {
      payload = {
        token: 'token',
      };
      mockRedisService.getData.mockResolvedValue({ user_id: 'unqie' });
    });

    it('should return success', async () => {
      const result = await service.verifyTokenForgotPassword(
        payload as VerifyTokenForgotPasswordDto,
        mockHeaders,
      );
      expect(result).toEqual(undefined);
    });

    it('should return error HTTPExecption user not found in Redis', async () => {
      mockRedisService.getData.mockResolvedValue(null);
      const result = (await service.verifyTokenForgotPassword(
        payload as VerifyTokenForgotPasswordDto,
        mockHeaders,
      )) as HttpException;
      expect(result.getStatus()).toBe(400);
      expect(result.message).toBe('Bad Request');
    });

    it('should return Internal server error', async () => {
      mockRedisService.getData.mockRejectedValue(new Error('Error redis'));
      try {
        await service.verifyTokenForgotPassword(
          payload as VerifyTokenForgotPasswordDto,
          mockHeaders,
        );
      } catch (error) {
        expect(error.message).toBe('Error redis');
      }
    });
  });

  describe('resetPassword', () => {
    beforeEach(() => {
      payload = {
        token: 'token',
        newPassword: 'password',
        confirmPassword: 'password',
      };
    });
    it('should return error 422 Unprocessable Entity', async () => {
      payload = {
        ...payload,
        newPassword: 'password',
      };
      try {
        await service.resetPassword(payload as ResetPasswordDto, mockHeaders);
      } catch (error) {
        expect(error.isHelperFail).toBe(true);
        expect(error.data.status).toBe(422);
        expect(error.data.status_code).toBe('01422');
        expect(error.data.status_desc).toBe('Unprocessable Entity');
      }
    });

    it('should return error HTTPExecption user not found in Redis', async () => {
      mockRedisService.getData.mockResolvedValue(null);
      const result = (await service.resetPassword(
        payload as ResetPasswordDto,
        mockHeaders,
      )) as HttpException;
      expect(result.getStatus()).toBe(400);
      expect(result.message).toBe('User Not Found');
    });

    it('should return error HTTPExecption user not found in DB MYSQL', async () => {
      mockRedisService.getData.mockResolvedValue({ user_id: 'unqie' });
      mockDbService.executeInTransaction.mockImplementation((trxid, cb) => {
        return cb(
          mockDbService.executeRawQuery.mockImplementation((params) => {
            if (params.logName === 'GET USER RESET PASSWORD') return null;
          }),
        );
      });
      const result = (await service.resetPassword(
        payload as ResetPasswordDto,
        mockHeaders,
      )) as HttpException;
      expect(result.getStatus()).toBe(400);
      expect(result.message).toBe('User Not Found');
    });

    it('should return success', async () => {
      mockRedisService.getData.mockResolvedValue({ user_id: 'unqie' });
      mockDbService.executeInTransaction.mockImplementation((trxid, cb) => {
        return cb(
          mockDbService.executeRawQuery.mockImplementation((params) => {
            if (params.logName === 'GET USER RESET PASSWORD')
              return [{ id: 'unique_id' }];
            if (params.logName === 'UPDATE PASSWORD USER') return 'susccess';
          }),
          mockRedisService.deleteData.mockResolvedValue('success'),
        );
      });
      const result = await service.resetPassword(
        payload as ResetPasswordDto,
        mockHeaders,
      );
      expect(result).toEqual(undefined);
    });

    it('should return Internal server error', async () => {
      mockRedisService.getData.mockRejectedValue(new Error('Error redis'));
      try {
        await service.resetPassword(payload as ResetPasswordDto, mockHeaders);
      } catch (error) {
        expect(error.message).toBe('Error redis');
      }
    });
  });

  describe('loginGoogle', () => {
    beforeEach(() => {
      payload = { redirectPath: '/' };
      mockOAuthService.authorizationUrl.mockResolvedValue('http://xxxx.com');
      mockRedisService.setDataWithTTL.mockResolvedValue('success');
    });
    it('should return success', async () => {
      const res = await service.loginGoogle(
        mockHeaders,
        payload as LoginGoggleDto,
      );
      expect(res).toBe('http://xxxx.com');
    });

    it('should return Internal server error', async () => {
      mockRedisService.setDataWithTTL.mockRejectedValue(
        new Error('Error redis'),
      );
      try {
        await service.loginGoogle(mockHeaders, payload as LoginGoggleDto);
      } catch (error) {
        expect(error.message).toBe('Error redis');
      }
    });
  });

  describe('loginGoogleCallback', () => {
    beforeEach(() => {
      payload = { code: 'asd' } as CallbackOauthDto;
      mockOAuthService.userInfo.mockResolvedValue({
        email: 'asdasd@gmail.com',
        name: 'jhon',
      });
      mockDbService.executeRawQuery.mockImplementation((params) => {
        if (['GET USER LOGIN', 'UPDATE USER LOGIN'].includes(params.logName))
          return [{ id: 'unique-id', role: 'USER' }];
      });
      mockDbService.executeInTransaction.mockImplementation(
        async (trxid, cb) => {
          return cb(
            mockDbService.executeRawQuery.mockImplementation(({ logName }) => {
              if (logName === 'INSERT USER PROFILE') return [];
              if (logName === 'INSERT USER') return [];
              mockRabbitMQService.sendToQueue.mockResolvedValue('success');
              return;
            }),
          );
        },
      );
      jest.spyOn(Bcrypt, 'compareSync').mockResolvedValue(true);
      jest.spyOn(Bcrypt, 'hashSync').mockReturnValue('hashed-password');
    });
    it('should return success: user exist', async () => {
      const result = (await service.loginGoogleCallback(
        payload as CallbackOauthDto,
        mockHeaders,
        mockReply as Response,
      )) as { access_token: string };
      expect(result.access_token).toBeDefined();
    });

    it('should return success: user not exist', async () => {
      mockDbService.executeRawQuery.mockImplementation((params) => {
        if (['GET USER LOGIN', 'UPDATE USER LOGIN'].includes(params.logName))
          return [];
      });
      const result = (await service.loginGoogleCallback(
        payload as CallbackOauthDto,
        mockHeaders,
        mockReply as Response,
      )) as { access_token: string };
      expect(result.access_token).toBeDefined();
    });

    it('should return Internal server error', async () => {
      mockOAuthService.userInfo.mockRejectedValue(new Error('Error google'));
      try {
        await service.loginGoogleCallback(
          payload as CallbackOauthDto,
          mockHeaders,
          mockReply as Response,
        );
      } catch (error) {
        expect(error.message).toBe('Error google');
      }
    });
  });
});
