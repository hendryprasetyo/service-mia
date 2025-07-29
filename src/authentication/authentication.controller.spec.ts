import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
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
import { Request, Response } from 'express';
import { TestSetupModule } from 'src/config/test-setup.module';
import {
  mockHeaders,
  mockLoggerService,
  mockReply,
  mockRequest,
} from 'src/config/__test__/mock';

describe('AuthenticationController', () => {
  let payload:
    | RegisterSendOtpDto
    | RegisterVerifyOtpDto
    | RegisterDto
    | LoginDto
    | ResetPasswordDto
    | VerifyTokenForgotPasswordDto
    | CallbackOauthDto
    | LoginGoggleDto;
  let controller: AuthenticationController;

  const mockAuthenticationService = {
    registerSendOtp: jest.fn(),
    registerVerifyOtp: jest.fn(),
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    verifyTokenForgotPassword: jest.fn(),
    loginGoogle: jest.fn(),
    loginGoogleCallback: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      controllers: [AuthenticationController],
      providers: [
        { provide: AuthenticationService, useValue: mockAuthenticationService },
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
      ],
    }).compile();

    controller = module.get<AuthenticationController>(AuthenticationController);
  });
  afterEach(() => {
    jest.restoreAllMocks(); // Reset semua spy/mocks
    jest.clearAllMocks(); // Bersihkan call history dll
  });
  describe('registerSendOtp', () => {
    beforeEach(() => {
      payload = { email: 'sample@gmail.com' };
    });
    it('should successfully send OTP and return a success message', async () => {
      const expectedResponse = { message: 'OTP sent successfully' };

      mockAuthenticationService.registerSendOtp.mockResolvedValue(
        expectedResponse,
      );

      const response = await controller.registerSendOtp(
        payload as RegisterSendOtpDto,
        mockHeaders,
      );

      expect(response).toEqual(expectedResponse);
      expect(mockAuthenticationService.registerSendOtp).toHaveBeenCalledWith(
        payload,
        mockHeaders,
      );
    });

    it('should log an error when an exception occurs while sending OTP', async () => {
      const mockError = new Error('Failed to send OTP');

      mockAuthenticationService.registerSendOtp.mockRejectedValue(mockError);

      try {
        await controller.registerSendOtp(
          payload as RegisterSendOtpDto,
          mockHeaders,
        );
      } catch (error) {
        expect(error.message).toBe(mockError.message);
      }
    });
  });

  describe('registerVerifyOtp', () => {
    beforeEach(() => {
      payload = {
        otp: '123456',
        token: 'token',
      };
    });
    it('should successfully verify OTP and return a success message', async () => {
      const expectedResponse = { message: 'OTP verified successfully' };

      mockAuthenticationService.registerVerifyOtp.mockResolvedValue(
        expectedResponse,
      );

      const response = await controller.registerVerifyOtp(
        payload as RegisterVerifyOtpDto,
        mockHeaders,
      );

      expect(response).toEqual(expectedResponse);
      expect(mockAuthenticationService.registerVerifyOtp).toHaveBeenCalledWith(
        payload,
        mockHeaders,
      );
    });

    it('should log an error when an exception occurs during OTP verification', async () => {
      const mockError = new Error('Failed to verify OTP');

      mockAuthenticationService.registerVerifyOtp.mockRejectedValue(mockError);

      try {
        await controller.registerVerifyOtp(
          payload as RegisterVerifyOtpDto,
          mockHeaders,
        );
      } catch (error) {
        expect(error.message).toBe(mockError.message);
      }
    });
  });

  describe('register', () => {
    beforeEach(() => {
      payload = {
        username: 'testuser',
        password: 'password123',
        confirmPassword: 'password123',
        firstName: 'test',
        lastName: 'user',
        token: 'token',
      };
    });
    it('should successfully complete registration and return a success message', async () => {
      const expectedResponse = { message: 'Registration successful' };

      mockAuthenticationService.register.mockResolvedValue(expectedResponse);

      const response = await controller.register(
        payload as RegisterDto,
        mockHeaders,
      );

      expect(response).toEqual(expectedResponse);
      expect(mockAuthenticationService.register).toHaveBeenCalledWith(
        payload,
        mockHeaders,
      );
    });

    it('should log an error when an exception occurs during registration', async () => {
      const mockError = new Error('Registration failed');

      mockAuthenticationService.register.mockRejectedValue(mockError);

      try {
        await controller.register(payload as RegisterDto, mockHeaders);
      } catch (error) {
        expect(error.message).toBe(mockError.message);
      }
    });
  });

  describe('Login', () => {
    beforeEach(() => {
      payload = {
        identifierLogin: 'testuser',
        password: 'password123',
      };
    });
    it('should successfully login and set the cookie', async () => {
      const expectedResponse = { access_token: 'access token' };

      mockAuthenticationService.login.mockResolvedValue(expectedResponse);

      const response = await controller.login(
        payload as LoginDto,
        mockReply as Response,
        mockHeaders,
      );

      expect(response).toEqual(expectedResponse);
      expect(mockAuthenticationService.login).toHaveBeenCalledWith(
        payload,
        mockReply,
        mockHeaders,
      );
    });

    it('should log an error when an exception occurs during login', async () => {
      const mockError = new Error('Login failed');

      mockAuthenticationService.login.mockRejectedValue(mockError);

      try {
        await controller.login(
          payload as LoginDto,
          mockReply as Response,
          mockHeaders,
        );
      } catch (error) {
        expect(error.message).toBe(mockError.message);
      }
    });
  });

  describe('Refresh Token Auth', () => {
    it('should successfully refresh token and set the cookie', async () => {
      const expectedResponse = { access_token: 'access token' };

      mockAuthenticationService.refreshToken.mockResolvedValue(
        expectedResponse,
      );

      const response = await controller.refreshToken(
        mockRequest as Request,
        mockReply as Response,
        mockHeaders,
      );

      expect(response).toEqual(expectedResponse);
      expect(mockAuthenticationService.refreshToken).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        mockHeaders,
      );
    });

    it('should log an error when an exception occurs during refresh token', async () => {
      const mockError = new Error('refresh token failed');

      mockAuthenticationService.refreshToken.mockRejectedValue(mockError);

      try {
        await controller.refreshToken(
          mockRequest as Request,
          mockReply as Response,
          mockHeaders,
        );
      } catch (error) {
        expect(error.message).toBe(mockError.message);
      }
    });
  });

  describe('Logout', () => {
    it('should successfully logout and delete the cookie', async () => {
      mockAuthenticationService.logout.mockResolvedValue({});

      const response = await controller.logout(
        mockRequest as Request,
        mockReply as Response,
        mockHeaders,
      );

      expect(response).toEqual({});
      expect(mockAuthenticationService.logout).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        mockHeaders,
      );
    });

    it('should log an error when an exception occurs during logout', async () => {
      const mockError = new Error('logout failed');

      mockAuthenticationService.logout.mockRejectedValue(mockError);

      try {
        await controller.logout(
          mockRequest as Request,
          mockReply as Response,
          mockHeaders,
        );
      } catch (error) {
        expect(error.message).toBe(mockError.message);
      }
    });
  });

  describe('Forgot Password', () => {
    beforeEach(() => {
      payload = {
        email: 'testing@gmail.com',
      };
    });
    it('should successfully forgotPassword', async () => {
      mockAuthenticationService.forgotPassword.mockResolvedValue({});

      const response = await controller.forgotPassword(
        payload as RegisterSendOtpDto,
        mockHeaders,
      );

      expect(response).toEqual({});
      expect(mockAuthenticationService.forgotPassword).toHaveBeenCalledWith(
        payload as RegisterSendOtpDto,
        mockHeaders,
      );
    });

    it('should log an error when an exception occurs during forgotPassword', async () => {
      const mockError = new Error('forgotPassword failed');

      mockAuthenticationService.forgotPassword.mockRejectedValue(mockError);

      try {
        await controller.forgotPassword(
          payload as RegisterSendOtpDto,
          mockHeaders,
        );
      } catch (error) {
        expect(error.message).toBe(mockError.message);
      }
    });
  });

  describe('Verify Token Forgot Password', () => {
    beforeEach(() => {
      payload = {
        token: 'token',
      };
    });
    it('should successfully forgotPassword', async () => {
      mockAuthenticationService.verifyTokenForgotPassword.mockResolvedValue({});

      const response = await controller.verifyTokenForgotPassword(
        payload as VerifyTokenForgotPasswordDto,
        mockHeaders,
      );

      expect(response).toEqual({});
    });

    it('should log an error when an exception occurs during forgotPassword', async () => {
      const mockError = new Error('forgotPassword failed');

      mockAuthenticationService.verifyTokenForgotPassword.mockRejectedValue(
        mockError,
      );

      try {
        await controller.verifyTokenForgotPassword(
          payload as VerifyTokenForgotPasswordDto,
          mockHeaders,
        );
      } catch (error) {
        expect(error.message).toBe(mockError.message);
      }
    });
  });

  describe('Reset Password', () => {
    beforeEach(() => {
      payload = {
        email: 'testing@gmail.com',
      };
    });
    it('should successfully resetPassword', async () => {
      mockAuthenticationService.resetPassword.mockResolvedValue({});

      const response = await controller.resetPassword(
        payload as ResetPasswordDto,
        mockHeaders,
      );

      expect(response).toEqual({});
      expect(mockAuthenticationService.resetPassword).toHaveBeenCalledWith(
        payload as ResetPasswordDto,
        mockHeaders,
      );
    });

    it('should log an error when an exception occurs during resetPassword', async () => {
      const mockError = new Error('resetPassword failed');

      mockAuthenticationService.resetPassword.mockRejectedValue(mockError);

      try {
        await controller.resetPassword(
          payload as ResetPasswordDto,
          mockHeaders,
        );
      } catch (error) {
        expect(error.message).toBe(mockError.message);
      }
    });
  });

  describe('Login Google', () => {
    beforeEach(() => {
      payload = { redirectPath: '/' };
      mockAuthenticationService.loginGoogle.mockResolvedValue(
        'https://xxxx.com',
      );
    });

    it('should successfully login google', async () => {
      const response = await controller.loginGoogle(
        mockHeaders,
        payload as LoginGoggleDto,
      );

      expect(response).toEqual('https://xxxx.com');
    });

    it('should log an error when an exception occurs during login Google', async () => {
      const mockError = new Error('loginGoogle failed');

      mockAuthenticationService.loginGoogle.mockRejectedValue(mockError);

      try {
        await controller.loginGoogle(mockHeaders, payload as LoginGoggleDto);
      } catch (error) {
        expect(error.message).toBe(mockError.message);
      }
    });
  });

  describe('Login Google callback', () => {
    beforeEach(() => {
      payload = { code: 'string' } as CallbackOauthDto;
    });
    it('should successfully login google', async () => {
      mockAuthenticationService.loginGoogleCallback.mockResolvedValue(
        'https://xxxx.com',
      );

      const response = await controller.loginGoogleCallback(
        payload as CallbackOauthDto,
        mockHeaders,
        mockReply as Response,
      );

      expect(response).toEqual('https://xxxx.com');
    });

    it('should log an error when an exception occurs during login Google', async () => {
      const mockError = new Error('loginGoogleCallback failed');

      mockAuthenticationService.loginGoogleCallback.mockRejectedValue(
        mockError,
      );

      try {
        await controller.loginGoogleCallback(
          payload as CallbackOauthDto,
          mockHeaders,
          mockReply as Response,
        );
      } catch (error) {
        expect(error.message).toBe(mockError.message);
      }
    });
  });
});
