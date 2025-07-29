import * as cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggerServiceImplementation } from './common/helpers/logger/logger.service';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionFilter } from './common/interceptors/execption.interceptor';
import { json } from 'express';

async function main() {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(),
  );
  app.enableCors({
    origin: JSON.parse(process.env.ENABLE_ORIGIN_CORS || '[]'),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.use(json({ limit: '15mb' }));
  app.useGlobalFilters(new AllExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useLogger(app.get(LoggerServiceImplementation));
  const logger = app.get(LoggerServiceImplementation);

  app.enableShutdownHooks();
  await app.listen(process.env.PORT, () =>
    logger.log(['INFO'], {
      messages: `Server started on port ${process.env.PORT}`,
    }),
  );
}
main();
