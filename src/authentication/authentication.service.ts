import { v6 as uuidv6 } from 'uuid';
import * as Bcrypt from 'bcryptjs';
import * as Moment from 'moment';
import * as Crypto from 'crypto';
import * as _ from 'lodash';
import FormatEmail from 'src/common/constants/format-email';
import { Injectable, HttpStatus } from '@nestjs/common';
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
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { HeadersDto } from 'src/common/dtos/dto';
import { RedisService } from 'src/database/redis/redis.service';
import { EncryptionService } from 'src/common/helpers/encryption/encryption.service';
import { Request, Response } from 'express';
import { CustomHttpException } from 'src/common/helpers/lib/exception';
import { RabbitmqService } from 'src/common/providers/rabbitmq/rabbitmq.service';
import { GeneralService } from 'src/common/helpers/general/general.service';
import { DbService } from 'src/database/mysql/mysql.service';
import { OAuthService } from 'src/common/providers/oAuth/oAuth.service';

@Injectable()
export class AuthenticationService {
  constructor(
    private pool: DbService,
    private readonly logger: LoggerServiceImplementation,
    private readonly redisService: RedisService,
    private readonly encryptionService: EncryptionService,
    private readonly rabbitmqService: RabbitmqService,
    private readonly generalHelper: GeneralService,
    private readonly oAuthService: OAuthService,
  ) {}

  private __generateOtp(length = 6): number {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private __clearCookies(dataObj: { reply: Response; key: string }): void {
    const { reply, key } = dataObj;

    reply.clearCookie(key, {
      httpOnly: process.env.IS_HTTP_ONLY_COOKIE_AUTH === 'true',
      secure: process.env.IS_SECURE_COOKIE_AUTH === 'true',
      sameSite: process.env.COOKIE_AUTH_SAME_SITE as 'lax' | 'strict' | 'none',
      domain: process.env.DOMAIN_COOKIE_AUTH as string,
      path: '/',
    });
  }

  private __generateResetToken(): string {
    return Crypto.randomBytes(32).toString('hex');
  }

  private __hashResetToken(token: string): string {
    return Crypto.createHash('sha256').update(token).digest('hex');
  }

  private async __setAuthCookies(dataObj: {
    userId: string;
    transactionid: string;
    role: string;
    reply: Response;
  }): Promise<{ accessToken: string }> {
    const { userId, transactionid, reply, role } = dataObj;
    const accessToken: string = this.encryptionService.generateTokenJWT({
      value: { id: userId, role },
      tokenSecret: process.env.ACCESS_TOKEN_SECRET,
      exp: process.env.EXP_ACCESS_TOKEN,
    });

    const refreshToken: string = this.encryptionService.generateTokenJWT({
      value: { id: userId, role },
      tokenSecret: process.env.REFRESH_TOKEN_SECRET,
      exp: process.env.EXP_REFRESH_TOKEN,
    });
    await this.pool.executeRawQuery({
      transactionid,
      query: `
      UPDATE users
      SET refresh_token = ?
      WHERE id = ?;`,
      params: [refreshToken, userId],
      logName: 'UPDATE USER LOGIN',
      isWriteOperation: true,
    });

    reply.cookie(process.env.KEY_COOKIE_RESFRESH_TOKEN, refreshToken, {
      httpOnly: process.env.IS_HTTP_ONLY_COOKIE_AUTH === 'true',
      secure: process.env.IS_SECURE_COOKIE_AUTH === 'true',
      maxAge: +process.env.MAX_AGE_COOKIE_AUTH,
      sameSite: process.env.COOKIE_AUTH_SAME_SITE as 'lax' | 'strict' | 'none',
      domain: process.env.DOMAIN_COOKIE_AUTH as string,
      path: '/',
    });
    reply.cookie(process.env.KEY_COOKIE_ACCESS_TOKEN, accessToken, {
      httpOnly: process.env.IS_HTTP_ONLY_COOKIE_AUTH === 'true',
      secure: process.env.IS_SECURE_COOKIE_AUTH === 'true',
      maxAge: +process.env.MAX_AGE_COOKIE_AUTH,
      sameSite: process.env.COOKIE_AUTH_SAME_SITE as 'lax' | 'strict' | 'none',
      domain: process.env.DOMAIN_COOKIE_AUTH as string,
      path: '/',
    });
    return { accessToken };
  }

  public async registerSendOtp(
    reqBody: RegisterSendOtpDto,
    headers: HeadersDto,
  ) {
    const { transactionid } = headers;
    try {
      this.generalHelper.validateSqlInjection([
        { value: reqBody.email, rules: ['isEmail', 'max:191', 'isNotSpace'] },
      ]);

      const user = await this.pool.executeRawQuery({
        transactionid,
        query: `SELECT id FROM users WHERE email = ?;`,
        logName: 'GET USER',
        params: [reqBody.email],
        isWriteOperation: false,
      });

      if (!_.isEmpty(user))
        return new CustomHttpException(
          'Email already exist',
          HttpStatus.BAD_REQUEST,
          { cause: '01400' },
        );

      const expirationTime = Math.floor(Date.now() / 1000) + 300;
      const recipientName = reqBody.email.substring(
        0,
        reqBody.email.indexOf('@'),
      );
      const otpCode = this.__generateOtp();
      const messageRabbit = {
        type: 'send-email',
        data: {
          to: reqBody.email,
          text: `Hey ${recipientName}`,
          subject: 'OTP Verification',
          html: FormatEmail.formatEmailOTPRegisterUser({
            recipientName,
            otpCode: String(otpCode),
          }),
        },
        transactionid,
      };

      await Promise.all([
        this.redisService.setDataWithTTL({
          key: `otp-register-${reqBody.email}`,
          value: JSON.stringify({
            code: otpCode,
            exp: expirationTime,
          }),
          ttl: 360,
          transactionid,
        }),
        this.rabbitmqService.sendToQueue({
          queue: 'notification-queue',
          message: JSON.stringify(messageRabbit),
          transactionid,
        }),
      ]);

      const tokenStep = this.encryptionService.generateTokenJWT({
        tokenSecret: process.env.OTP_SECRET,
        value: { step: 2, email: reqBody.email },
        exp: '5m',
      });
      return {
        token: tokenStep,
        otpExp: expirationTime,
      };
    } catch (error) {
      this.logger.error(['Auth Service', 'Register Send OTP', 'ERROR'], {
        info: `${error.message}`,
        transactionid,
      });

      return Promise.reject(error);
    }
  }

  public async registerVerifyOtp(
    registerData: RegisterVerifyOtpDto,
    headers: HeadersDto,
  ) {
    const { transactionid } = headers;
    const { otp, token } = registerData;
    try {
      const verifyToken = await this.encryptionService.verifyTokenJwt<{
        email: string;
        step: number;
      }>(token, process.env.OTP_SECRET);

      if (verifyToken.step !== 2) {
        this.logger.error(['Auth Service', 'Register Verify OTP', 'ERROR'], {
          messages: 'Previos Step Invalid',
          transactionid,
        });
        return new CustomHttpException('Bad Request', HttpStatus.BAD_REQUEST);
      }

      const resultOtpFromRedis = await this.redisService.getData<{
        exp: number;
        code: number;
      }>({
        key: `otp-register-${verifyToken?.email}`,
        transactionid,
        returnType: 'object',
      });

      if (!_.isEmpty(resultOtpFromRedis)) {
        const currentDate = Math.floor(Date.now() / 1000);
        if (Number(resultOtpFromRedis.exp) < currentDate) {
          await this.redisService.deleteData({
            key: `otp-register-${verifyToken?.email}`,
            transactionid,
          });
          return new CustomHttpException(
            'Your OTP has expired. Please resend it.',
            HttpStatus.BAD_REQUEST,
            { cause: '01400' },
          );
        }

        if (Number(resultOtpFromRedis.code) === Number(otp)) {
          await this.redisService.deleteData({
            key: `otp-register-${verifyToken?.email}`,
            transactionid,
          });
          const tokenStep = this.encryptionService.generateTokenJWT({
            tokenSecret: process.env.OTP_SECRET,
            value: { step: 3, email: verifyToken?.email },
            exp: '5m',
          });
          return {
            token: tokenStep,
          };
        }
      }

      return new CustomHttpException('Invalid OTP', HttpStatus.BAD_REQUEST, {
        cause: '01400',
      });
    } catch (error) {
      this.logger.error(['Auth Service', 'Register Verify OTP', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });

      return Promise.reject(error);
    }
  }

  public async register(reqBody: RegisterDto, headers: HeadersDto) {
    const { transactionid } = headers;
    const { token, username, firstName, lastName, password } = reqBody;
    try {
      this.generalHelper.validateSqlInjection([
        {
          value: password,
          rules: [
            'isPassword',
            'isNotSpace',
            'min:8',
            'isAlphanumeric',
            'max:191',
          ],
        },
      ]);
      const verifyToken = await this.encryptionService.verifyTokenJwt<{
        email: string;
        step: number;
      }>(token, process.env.OTP_SECRET);

      if (verifyToken.step !== 3) {
        this.logger.error(['Auth Service', 'Register', 'ERROR'], {
          messages: 'Previos Step Invalid',
          transactionid,
        });
        return new CustomHttpException('Bad Request', HttpStatus.BAD_REQUEST);
      }

      return await this.pool.executeInTransaction(
        transactionid,
        async (connection) => {
          const findUser = await this.pool.executeRawQuery({
            transactionid,
            query: `SELECT id FROM users WHERE username = ? OR email = ?;`,
            logName: 'GET USER REGISTER',
            params: [username, verifyToken.email],
            pool: connection,
            isWriteOperation: false,
          });

          if (!_.isEmpty(findUser))
            return new CustomHttpException(
              'Email or Username already exist',
              HttpStatus.BAD_REQUEST,
              { cause: '01400' },
            );
          const salt = Bcrypt.genSaltSync(10);
          const hashPassword = Bcrypt.hashSync(password, salt);
          const messageRabbit = {
            type: 'send-email',
            data: {
              to: verifyToken.email,
              text: `Hey ${username}`,
              subject: 'Registration Account Wild Book',
              html: FormatEmail.formatEmailRegistrationSuccess({
                recipientName: firstName,
                userEmail: verifyToken.email,
                registrationDate: Moment()
                  .locale(headers.language)
                  .utcOffset('+0700')
                  .format('dddd, D MMMM YYYY'),
              }),
            },
            transactionid,
          };
          const userId = uuidv6();
          await this.pool.executeRawQuery({
            transactionid,
            query: `
            INSERT INTO users (
            id,
            username,
            email,
            password
            ) VALUES (?, ?, ?, ?);`,
            logName: 'INSERT USER',
            params: [userId, username, verifyToken.email, hashPassword],
            pool: connection,
            isWriteOperation: true,
          });
          await this.pool.executeRawQuery({
            transactionid,
            query: `
            INSERT INTO user_profiles (
            user_id,
            first_name,
            last_name,
            email,
            avatar,
            avatar_text
            ) VALUES (?, ?, ?, ?, ?, ?);`,
            logName: 'INSERT USER PROFILE',
            params: [
              userId,
              firstName,
              lastName,
              verifyToken.email,
              process.env.DEFAULT_AVATAR_URL,
              process.env.DEFAULT_AVATAR_TEXT,
            ],
            pool: connection,
            isWriteOperation: true,
          });
          await this.rabbitmqService.sendToQueue({
            queue: 'notification-queue',
            message: JSON.stringify(messageRabbit),
            transactionid,
            isErrorOptional: true,
          });
          return;
        },
      );
    } catch (error) {
      this.logger.error(['Auth Service', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });
      return Promise.reject(error);
    }
  }

  public async login(reqBody: LoginDto, reply: Response, headers: HeadersDto) {
    const { transactionid, deviceid } = headers;
    const { identifierLogin, password } = reqBody;

    try {
      this.generalHelper.validateSqlInjection([
        {
          value: identifierLogin,
          rules: ['isNotSpace', 'min:3', 'max:191'],
        },
        {
          value: password,
          rules: [
            'isPassword',
            'isNotSpace',
            'min:8',
            'isAlphanumeric',
            'max:191',
          ],
        },
      ]);

      const keyLockingDeviceId = `locking-login-deviceid-${deviceid}`;
      const result = await Promise.all([
        this.pool.executeRawQuery({
          transactionid,
          query: `SELECT id, password, role FROM users WHERE email = ? OR username = ?;`,
          logName: 'GET USER LOGIN',
          params: [identifierLogin, identifierLogin],
          isWriteOperation: false,
        }),
        this.redisService.getData<string>({
          key: keyLockingDeviceId,
          transactionid,
        }),
      ]);
      const attempLockingDeviceid: number = result[1] ? Number(result[1]) : 0;

      if (_.isEmpty(result[0])) {
        await this.redisService.setDataWithTTL({
          key: keyLockingDeviceId,
          transactionid,
          ttl: 600,
          value: String(attempLockingDeviceid + 1),
        });
        return new CustomHttpException(
          'User Not Found',
          HttpStatus.BAD_REQUEST,
          { cause: '01400' },
        );
      }

      if (Number(result[1]) >= 7)
        return new CustomHttpException(
          'To Many Request, try again later!',
          HttpStatus.TOO_MANY_REQUESTS,
          { cause: '01400' },
        );

      const keyLockingUser = `locking-login-user-${result[0][0].id}`;

      const attempLockingUser = await this.redisService.getData<string>({
        key: keyLockingUser,
        transactionid,
      });
      const parseAttempLockingUser = Number(attempLockingUser);
      if (parseAttempLockingUser >= 3) {
        await this.redisService.setDataWithTTL({
          key: keyLockingDeviceId,
          transactionid,
          ttl: 600,
          value: String(attempLockingDeviceid + 1),
        });
        return new CustomHttpException(
          'To Many Request Invalid Password',
          HttpStatus.TOO_MANY_REQUESTS,
          { cause: '01400' },
        );
      }

      const isPasswordMatch = await Bcrypt.compareSync(
        password,
        result[0][0].password,
      );
      if (!isPasswordMatch) {
        await Promise.all([
          this.redisService.setDataWithTTL({
            key: keyLockingDeviceId,
            transactionid,
            ttl: 600,
            value: String(attempLockingDeviceid + 1),
          }),
          this.redisService.setDataWithTTL({
            key: keyLockingUser,
            transactionid,
            ttl: 600,
            value: attempLockingUser
              ? String(Number(attempLockingUser) + 1)
              : '1',
          }),
        ]);
        return new CustomHttpException(
          'Invalid Password',
          HttpStatus.BAD_REQUEST,
          { cause: '01400' },
        );
      }

      const accessToken: string = this.encryptionService.generateTokenJWT({
        value: { id: result[0][0].id, role: result[0][0].role },
        tokenSecret: process.env.ACCESS_TOKEN_SECRET,
        exp: process.env.EXP_ACCESS_TOKEN,
      });

      const refreshToken: string = this.encryptionService.generateTokenJWT({
        value: { id: result[0][0].id, role: result[0][0].role },
        tokenSecret: process.env.REFRESH_TOKEN_SECRET,
        exp: process.env.EXP_REFRESH_TOKEN,
      });
      await this.pool.executeRawQuery({
        transactionid,
        query: `
        UPDATE users
        SET refresh_token = ?
        WHERE id = ?;`,
        params: [refreshToken, result[0][0].id],
        logName: 'UPDATE USER LOGIN',
        isWriteOperation: true,
      });

      reply.cookie(process.env.KEY_COOKIE_RESFRESH_TOKEN, refreshToken, {
        httpOnly: process.env.IS_HTTP_ONLY_COOKIE_AUTH === 'true',
        secure: process.env.IS_SECURE_COOKIE_AUTH === 'true',
        maxAge: +process.env.MAX_AGE_COOKIE_AUTH,
        sameSite: process.env.COOKIE_AUTH_SAME_SITE as
          | 'lax'
          | 'strict'
          | 'none',
        domain: process.env.DOMAIN_COOKIE_AUTH as string,
        path: '/',
      });
      reply.cookie(process.env.KEY_COOKIE_ACCESS_TOKEN, accessToken, {
        httpOnly: process.env.IS_HTTP_ONLY_COOKIE_AUTH === 'true',
        secure: process.env.IS_SECURE_COOKIE_AUTH === 'true',
        maxAge: +process.env.MAX_AGE_COOKIE_AUTH,
        sameSite: process.env.COOKIE_AUTH_SAME_SITE as
          | 'lax'
          | 'strict'
          | 'none',
        domain: process.env.DOMAIN_COOKIE_AUTH as string,
        path: '/',
      });

      return { access_token: accessToken };
    } catch (error) {
      this.logger.error(['Auth Service', 'Login', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });

      return Promise.reject(error);
    }
  }

  public async refreshToken(
    request: Request,
    reply: Response,
    headers: HeadersDto,
  ) {
    const { transactionid } = headers;
    try {
      const refreshToken =
        request.cookies[process.env.KEY_COOKIE_RESFRESH_TOKEN];

      if (_.isEmpty(refreshToken))
        return new CustomHttpException(
          'Unauthorized',
          HttpStatus.UNAUTHORIZED,
          {
            cause: '00401',
          },
        );

      const verifyToken = await this.encryptionService.verifyTokenJwt<{
        id: string;
      }>(refreshToken, process.env.REFRESH_TOKEN_SECRET);

      const findingUser = await this.pool.executeRawQuery<{ role: string }[]>({
        transactionid,
        query: `SELECT role FROM users WHERE id = ?;`,
        params: [verifyToken.id],
        logName: 'GET USER REFRESH TOKEN',
        isWriteOperation: false,
      });
      if (_.isEmpty(findingUser))
        return new CustomHttpException(
          'Unauthorized',
          HttpStatus.UNAUTHORIZED,
          {
            cause: '00401',
          },
        );
      const newAccessToken = this.encryptionService.generateTokenJWT({
        value: { id: verifyToken.id, role: findingUser[0].role },
        tokenSecret: process.env.ACCESS_TOKEN_SECRET,
        exp: process.env.EXP_ACCESS_TOKEN,
      });

      reply.cookie(process.env.KEY_COOKIE_ACCESS_TOKEN, newAccessToken, {
        httpOnly: process.env.IS_HTTP_ONLY_COOKIE_AUTH === 'true',
        secure: process.env.IS_SECURE_COOKIE_AUTH === 'true',
        maxAge: +process.env.MAX_AGE_COOKIE_AUTH,
        sameSite: process.env.COOKIE_AUTH_SAME_SITE as
          | 'lax'
          | 'strict'
          | 'none',
        domain: process.env.DOMAIN_COOKIE_AUTH as string,
        path: '/',
      });

      return { access_token: newAccessToken };
    } catch (error) {
      this.logger.error(['Auth Service', 'Refresh Token', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });

      return Promise.reject(error);
    }
  }

  public async logout(request: Request, reply: Response, headers: HeadersDto) {
    const { transactionid } = headers;
    try {
      const refreshToken =
        request.cookies[process.env.KEY_COOKIE_RESFRESH_TOKEN];
      const accessToken = request.cookies[process.env.KEY_COOKIE_ACCESS_TOKEN];

      if (!_.isEmpty(accessToken)) {
        this.__clearCookies({
          reply,
          key: process.env.KEY_COOKIE_ACCESS_TOKEN,
        });
      }

      if (_.isEmpty(refreshToken)) {
        this.logger.error(['Auth Service', 'Refresh Token', 'BYPASS ERROR'], {
          messages: 'Cookie refresh token not found',
          transactionid,
        });
        return {};
      }
      this.__clearCookies({
        reply,
        key: process.env.KEY_COOKIE_RESFRESH_TOKEN,
      });

      const verifyToken = await this.encryptionService.verifyTokenJwt<{
        id: string;
      }>(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      return await this.pool.executeInTransaction(
        transactionid,
        async (connection) => {
          const findUser = await this.pool.executeRawQuery<{ id: string }[]>({
            transactionid,
            query: `
            SELECT id FROM users WHERE id = ? FOR UPDATE;`,
            pool: connection,
            params: [verifyToken.id],
            logName: 'GET USER LOGOUT',
            isWriteOperation: false,
          });
          if (_.isEmpty(findUser)) return {};
          await this.pool.executeRawQuery({
            transactionid,
            query: `
            UPDATE users
            SET refresh_token = null
            WHERE id = ?;
            `,
            params: [findUser[0].id],
            logName: 'UPDATE USER LOGOUT',
            pool: connection,
            isWriteOperation: true,
          });
          return {};
        },
      );
    } catch (error) {
      if (error.isHelperFail) {
        this.logger.error(['Auth Service', 'Logout', 'BYPASS ERROR'], {
          messages: `${error.message}`,
          transactionid,
        });
        return Promise.resolve({});
      }

      this.logger.error(['Auth Service', 'Logout', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });
      return Promise.reject(error);
    }
  }

  /**
   * If necessary, you need to improve email sending security
   */
  public async forgotPassword(
    reqBody: RegisterSendOtpDto,
    headers: HeadersDto,
  ) {
    const { transactionid } = headers;
    try {
      const user = await this.pool.executeRawQuery<
        { id: string; username: string }[]
      >({
        transactionid,
        query: `
            SELECT id, username 
            FROM users 
            WHERE email = ?;`,
        params: [reqBody.email],
        logName: 'GET USER FORGOT PASSWORD',
        isWriteOperation: false,
      });
      if (_.isEmpty(user))
        return new CustomHttpException(
          'User Not Found',
          HttpStatus.BAD_REQUEST,
          {
            cause: '01400',
          },
        );

      const generateResetToken = this.__generateResetToken();
      const resetToken = this.__hashResetToken(generateResetToken);
      await this.redisService.setDataWithTTL({
        key: resetToken,
        ttl: 300,
        value: JSON.stringify({ user_id: user[0].id }),
        transactionid,
      });
      const messageRabbit = {
        type: 'send-email',
        data: {
          to: reqBody.email,
          text: `Hi ${user[0].username}`,
          subject: 'Reset Your Password',
          html: FormatEmail.forgotPassword({
            recipientName: user[0].username,
            token: generateResetToken,
            baseUrl: process.env.BASE_URL_CLIENT,
          }),
        },
        transactionid,
      };
      await this.rabbitmqService.sendToQueue({
        queue: 'notification-queue',
        message: JSON.stringify(messageRabbit),
        transactionid,
      });
      return;
    } catch (error) {
      this.logger.error(['Auth Service', 'Forgot password', 'ERROR'], {
        info: `${error.message}`,
        transactionid,
      });

      return Promise.reject(error);
    }
  }

  public async verifyTokenForgotPassword(
    query: VerifyTokenForgotPasswordDto,
    headers: HeadersDto,
  ) {
    const { transactionid } = headers;
    try {
      const { token } = query;
      const findingUser = await this.redisService.getData<{ user_id: string }>({
        key: this.__hashResetToken(token),
        transactionid,
        returnType: 'object',
      });

      if (_.isEmpty(findingUser))
        return new CustomHttpException('Bad Request', HttpStatus.BAD_REQUEST);

      return;
    } catch (error) {
      this.logger.error(
        ['Auth Service', 'Verify Token Forgot Password', 'ERROR'],
        {
          info: `${error.message}`,
          transactionid,
        },
      );

      return Promise.reject(error);
    }
  }

  public async resetPassword(reqBody: ResetPasswordDto, headers: HeadersDto) {
    const { transactionid } = headers;
    try {
      const { newPassword, token } = reqBody;
      const findingUser = await this.redisService.getData<{ user_id: string }>({
        key: this.__hashResetToken(token),
        transactionid,
        returnType: 'object',
      });

      if (_.isEmpty(findingUser))
        return new CustomHttpException(
          'User Not Found',
          HttpStatus.BAD_REQUEST,
          {
            cause: '01400',
          },
        );

      return await this.pool.executeInTransaction(
        transactionid,
        async (connection) => {
          const user = await this.pool.executeRawQuery<{ id: string }[]>({
            transactionid,
            query: `
            SELECT id
            FROM users
            WHERE id = ?
            FOR UPDATE;
            `,
            params: [findingUser.user_id],
            logName: 'GET USER RESET PASSWORD',
            pool: connection,
            isWriteOperation: false,
          });
          if (!user)
            return new CustomHttpException(
              'User Not Found',
              HttpStatus.BAD_REQUEST,
              {
                cause: '01400',
              },
            );

          const salt = Bcrypt.genSaltSync(10);
          const hashPassword = Bcrypt.hashSync(newPassword, salt);
          await this.pool.executeRawQuery({
            transactionid,
            query: `
            UPDATE users
            SET password = ?
            WHERE id = ?;
            `,
            logName: 'UPDATE PASSWORD USER',
            params: [hashPassword, user[0].id],
            pool: connection,
            isWriteOperation: true,
          });

          await this.redisService.deleteData({
            key: this.__hashResetToken(token),
            transactionid,
            isErrorOptional: true,
          });
          return;
        },
      );
    } catch (error) {
      this.logger.error(['Auth Service', 'Reset Password', 'ERROR'], {
        info: `${error.message}`,
        transactionid,
      });

      return Promise.reject(error);
    }
  }

  public async loginGoogle(headers: HeadersDto, query: LoginGoggleDto) {
    const { transactionid, deviceid } = headers;
    try {
      await this.redisService.setDataWithTTL({
        key: `login-oauth-${deviceid}`,
        transactionid,
        ttl: 300,
        value: query.redirectPath,
        isErrorOptional: true,
      });
      const url = this.oAuthService.authorizationUrl();
      this.logger.log(['Auth Service', 'OAuth', 'INFO'], {
        info: { url },
        transactionid,
      });
      return url;
    } catch (error) {
      this.logger.error(['Auth Service', 'Login OAuth', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });
      return Promise.reject(error);
    }
  }

  public async loginGoogleCallback(
    query: CallbackOauthDto,
    headers: HeadersDto,
    reply: Response,
  ) {
    const { transactionid, deviceid } = headers;

    try {
      const { email, name } = await this.oAuthService.userInfo(
        query.code,
        transactionid,
      );
      const keyRedis = `login-oauth-${deviceid}`;

      const [findUser, redirectPathName] = await Promise.all([
        this.pool.executeRawQuery<{ role: string; id: string }[]>({
          transactionid,
          query: `SELECT id, role FROM users WHERE email = ?;`,
          logName: 'GET USER LOGIN',
          params: [email],
          isWriteOperation: false,
        }),
        this.redisService.getData({
          key: keyRedis,
          transactionid,
        }),
      ]);
      let userAuthId = findUser[0]?.id;
      let userAuthRole = findUser[0]?.role;

      if (_.isEmpty(findUser)) {
        const randomBytes = Crypto.randomBytes(5).toString('hex');
        const salt = Bcrypt.genSaltSync(10);
        const hashPassword = Bcrypt.hashSync(name + randomBytes, salt);
        userAuthId = await this.pool.executeInTransaction(
          transactionid,
          async (connection) => {
            const messageRabbit = {
              type: 'send-email',
              data: {
                to: email,
                text: `Hey ${name}`,
                subject: 'Registration Account Wild Book',
                html: FormatEmail.formatEmailRegistrationSuccess({
                  recipientName: name,
                  userEmail: email,
                  registrationDate: Moment()
                    .locale(headers.language)
                    .utcOffset('+0700')
                    .format('dddd, D MMMM YYYY'),
                }),
              },
              transactionid,
            };
            const userId = uuidv6();
            await this.pool.executeRawQuery({
              transactionid,
              query: `
            INSERT INTO users (
            id,
            username,
            email,
            password
            ) VALUES (?, ?, ?, ?);`,
              logName: 'INSERT USER',
              params: [userId, name, email, hashPassword],
              pool: connection,
              isWriteOperation: true,
            });
            await this.pool.executeRawQuery({
              transactionid,
              query: `
              INSERT INTO user_profiles (
              user_id,
              first_name,
              last_name,
              email,
              avatar,
              avatar_text
              ) VALUES (?, ?, ?, ?, ?, ?);`,
              logName: 'INSERT USER PROFILE',
              params: [userId, name, name, email, 'default', 'default'],
              pool: connection,
              isWriteOperation: true,
            });
            await this.rabbitmqService.sendToQueue({
              queue: 'notification-queue',
              message: JSON.stringify(messageRabbit),
              transactionid,
              isErrorOptional: true,
            });
            return userId;
          },
        );
        userAuthRole = 'USER';
      }

      const [{ accessToken }] = await Promise.all([
        this.__setAuthCookies({
          reply,
          role: userAuthRole,
          transactionid,
          userId: userAuthId,
        }),
        this.redisService.deleteData({
          key: keyRedis,
          transactionid,
          isErrorOptional: true,
        }),
      ]);

      return {
        access_token: accessToken,
        redirectPathName: redirectPathName || '/',
      };
    } catch (error) {
      this.logger.error(['Auth Service', 'Callback OAuth', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });

      return Promise.reject(error);
    }
  }
}
