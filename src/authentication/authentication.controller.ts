import {
  Body,
  Controller,
  Get,
  Headers,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UsePipes,
} from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import {
  CallbackOauthDto,
  LoginDto,
  loginDtoSchema,
  LoginGoggleDto,
  loginGoogleDtoSchema,
  RegisterDto,
  registerDtoSchema,
  RegisterSendOtpDto,
  registerSendOtpDtoSchema,
  RegisterVerifyOtpDto,
  registerVerifyOtpDtoSchema,
  ResetPasswordDto,
  resetPasswordDtoSchema,
  VerifyTokenForgotPasswordDto,
  VerifyTokenForgotPasswordDtoSchema,
} from './authentication.dto';
import { HeadersDto } from 'src/common/dtos/dto';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { JoiValidationPipe } from '../common/pipes/validation.pipe';
import { Request, Response } from 'express';

@Controller('auth')
export class AuthenticationController {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly logger: LoggerServiceImplementation,
  ) {}

  @Post('/register/send-otp')
  @UsePipes(new JoiValidationPipe<RegisterSendOtpDto>(registerSendOtpDtoSchema))
  public async registerSendOtp(
    @Body() reqBody: RegisterSendOtpDto,
    @Headers() headers: HeadersDto,
  ) {
    try {
      const response = await this.authenticationService.registerSendOtp(
        reqBody,
        headers,
      );
      return response;
    } catch (error) {
      this.logger.error(['Auth Controller', 'Register Send OTP', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Post('/register/verify-otp')
  @UsePipes(
    new JoiValidationPipe<RegisterVerifyOtpDto>(registerVerifyOtpDtoSchema),
  )
  public async registerVerifyOtp(
    @Body() reqVerifyOtp: RegisterVerifyOtpDto,
    @Headers() headers: HeadersDto,
  ) {
    try {
      const response = await this.authenticationService.registerVerifyOtp(
        reqVerifyOtp,
        headers,
      );
      return response;
    } catch (error) {
      this.logger.error(['Auth Controller', 'Register Verify OTP', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Post('/register')
  @UsePipes(new JoiValidationPipe<RegisterDto>(registerDtoSchema))
  public async register(
    @Body() reqBody: RegisterDto,
    @Headers() headers: HeadersDto,
  ) {
    try {
      const response = await this.authenticationService.register(
        reqBody,
        headers,
      );
      return response;
    } catch (error) {
      this.logger.error(['Auth Controller', 'Register', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Post('/login')
  @UsePipes(new JoiValidationPipe<LoginDto>(loginDtoSchema))
  public async login(
    @Body() reqBody: LoginDto,
    @Res() reply: Response,
    @Headers() headers: HeadersDto,
  ) {
    try {
      const response = await this.authenticationService.login(
        reqBody,
        reply,
        headers,
      );
      return response;
    } catch (error) {
      this.logger.error(['Auth Controller', 'Login', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Get('/refresh-token')
  public async refreshToken(
    @Req() request: Request,
    @Res() reply: Response,
    @Headers() headers: HeadersDto,
  ) {
    try {
      const response = await this.authenticationService.refreshToken(
        request,
        reply,
        headers,
      );
      return response;
    } catch (error) {
      this.logger.error(['Auth Controller', 'Refresh Token', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Post('/logout')
  public async logout(
    @Req() request: Request,
    @Res() reply: Response,
    @Headers() headers: HeadersDto,
  ) {
    try {
      const response = await this.authenticationService.logout(
        request,
        reply,
        headers,
      );
      return response;
    } catch (error) {
      this.logger.error(['Auth Controller', 'Refresh Token', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Post('/forgot-password')
  @UsePipes(new JoiValidationPipe<RegisterSendOtpDto>(registerSendOtpDtoSchema))
  public async forgotPassword(
    @Body() reqBody: RegisterSendOtpDto,
    @Headers() headers: HeadersDto,
  ) {
    try {
      const response = await this.authenticationService.forgotPassword(
        reqBody,
        headers,
      );
      return response;
    } catch (error) {
      this.logger.error(['Auth Controller', 'Forgot Password', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Get('/forgot-password/verify')
  @UsePipes(
    new JoiValidationPipe<VerifyTokenForgotPasswordDto>(
      VerifyTokenForgotPasswordDtoSchema,
    ),
  )
  public async verifyTokenForgotPassword(
    @Query() query: VerifyTokenForgotPasswordDto,
    @Headers() headers: HeadersDto,
  ) {
    try {
      const response =
        await this.authenticationService.verifyTokenForgotPassword(
          query,
          headers,
        );
      return response;
    } catch (error) {
      this.logger.error(
        ['Auth Controller', 'Verify Token Forgot Password', 'ERROR'],
        {
          info: JSON.stringify(error),
          messages: error.message,
          stack: error?.stack,
          transactionid: headers.transactionid,
        },
      );
      return Promise.reject(error);
    }
  }

  @Patch('/reset-password')
  @UsePipes(new JoiValidationPipe<ResetPasswordDto>(resetPasswordDtoSchema))
  public async resetPassword(
    @Body() reqBody: ResetPasswordDto,
    @Headers() headers: HeadersDto,
  ) {
    try {
      const response = await this.authenticationService.resetPassword(
        reqBody,
        headers,
      );
      return response;
    } catch (error) {
      this.logger.error(['Auth Controller', 'Reset Password', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }
  @Get('/google')
  @UsePipes(new JoiValidationPipe<LoginGoggleDto>(loginGoogleDtoSchema))
  public async loginGoogle(
    @Headers() headers: HeadersDto,
    @Query() query: LoginGoggleDto,
  ) {
    try {
      const response = await this.authenticationService.loginGoogle(
        headers,
        query,
      );
      return response;
    } catch (error) {
      this.logger.error(['Auth Controller', 'Login Goggle', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }
  @Get('/google/callback')
  public async loginGoogleCallback(
    @Query() query: CallbackOauthDto,
    @Headers() headers: HeadersDto,
    @Res() reply: Response,
  ) {
    try {
      const response = await this.authenticationService.loginGoogleCallback(
        query,
        headers,
        reply,
      );
      return response;
    } catch (error) {
      this.logger.error(['Auth Controller', 'Login Goggle Callback', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }
}
