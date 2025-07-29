import * as JWT from 'jsonwebtoken';
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from 'src/app.module';
import { RedisService } from 'src/database/redis/redis.service';
import { EmailService } from 'src/common/providers/nodemailer/sendEmail.service';
import { ResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import {
  RegisterDto,
  RegisterSendOtpDto,
  RegisterVerifyOtpDto,
} from 'src/authentication/authentication.dto';
import { EncryptionService } from 'src/common/helpers/encryption/encryption.service';
import {
  mockEmailService,
  mockHeaders,
  mockPrismaService,
  mockRedisService,
} from 'src/config/__test__/mock';

let payload: RegisterSendOtpDto | RegisterVerifyOtpDto | RegisterDto;

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let encryptionService: EncryptionService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .overrideProvider(EmailService)
      .useValue(mockEmailService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useLogger(app.get(LoggerServiceImplementation));
    encryptionService = app.get(EncryptionService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('[POST] /api/auth/register/send-otp', async () => {
    payload = { email: encryptionService.encryptPayload('test@example.com') };
    mockPrismaService.users.findUnique.mockResolvedValue(null);
    mockRedisService.setDataWithTTL.mockResolvedValue(undefined);
    mockEmailService.sendEmail.mockResolvedValue(undefined);
    const response = await request(app.getHttpServer())
      .post('/api/auth/register/send-otp')
      .send(payload)
      .set('transactionid', mockHeaders.transactionid)
      .set('channelid', mockHeaders.channelid)
      .set('language', mockHeaders.language)
      .expect(200);
    expect(response.body).toHaveProperty('statusCode', '00000');
    expect(response.body).toHaveProperty('message', 'success');
    expect(response.body).toHaveProperty(
      'transactionid',
      mockHeaders.transactionid,
    );
    expect(response.body.data).toHaveProperty('token');
    expect(response.body.data).toHaveProperty('otpExp');
  });

  it('[POST] /api/auth/register/verify-otp', async () => {
    payload = { otp: '123456', token: 'token' };
    jest
      .spyOn(JWT, 'verify')
      .mockResolvedValue({ email: 'test@example.com', step: 2 });
    mockRedisService.getData.mockResolvedValue(
      JSON.stringify({
        code: 123456,
        exp: Math.floor(Date.now() / 1000) + 300,
      }),
    );
    jest.spyOn(JWT, 'sign').mockReturnValue('mockNewToken');
    mockRedisService.deleteData.mockResolvedValue(undefined);
    const response = await request(app.getHttpServer())
      .post('/api/auth/register/verify-otp')
      .send(payload)
      .set('transactionid', mockHeaders.transactionid)
      .set('channelid', mockHeaders.channelid)
      .set('language', mockHeaders.language)
      .expect(200);
    expect(response.body).toHaveProperty('statusCode', '00000');
    expect(response.body).toHaveProperty('message', 'success');
    expect(response.body).toHaveProperty(
      'transactionid',
      mockHeaders.transactionid,
    );
    expect(response.body.data).toHaveProperty('token');
  });

  it('[POST] /api/auth/register', async () => {
    payload = {
      username: 'testuser',
      password: encryptionService.encryptPayload('password123'),
      confirmPassword: encryptionService.encryptPayload('password123'),
      firstName: 'test',
      lastName: 'user',
      token: 'token',
    };

    jest
      .spyOn(JWT, 'verify')
      .mockResolvedValue({ email: 'test@example.com', step: 3 });
    mockPrismaService.users.findFirst.mockResolvedValue(null);
    mockPrismaService.users.create.mockResolvedValue(null);
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(payload)
      .set('transactionid', mockHeaders.transactionid)
      .set('channelid', mockHeaders.channelid)
      .set('language', mockHeaders.language)
      .expect(200);
    expect(response.body).toHaveProperty('statusCode', '00000');
    expect(response.body).toHaveProperty('message', 'success');
    expect(response.body.data).toEqual({});
    expect(response.body).toHaveProperty(
      'transactionid',
      mockHeaders.transactionid,
    );
  });
});
