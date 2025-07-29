import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthenticationModule } from './authentication/authentication.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from './common/helpers/logger/logger.module';
import { RequestMiddleware } from './common/middleware/request/request.middleware';
import { RedisModule } from './database/redis/redis.module';
import { ConfigModule } from '@nestjs/config';
import { EncryptionModule } from './common/helpers/encryption/encryption.module';
import { PagesModule } from './pages/pages.module';
import { PaymentModule } from './payment/payment.module';
import { AssetModule } from './asset/asset.module';
import { NotificationModule } from './notification/notification.module';
import { UserModule } from './user/user.module';
import { EmailModule } from './common/providers/nodemailer/sendEmail.module';
import { AdminModule } from './admin/admin.module';
import { OrderModule } from './order/order.module';
import { DestinationModule } from './destination/destination.module';
import { GeneralModule } from './common/helpers/general/general.module';
import { CloudinaryModule } from './common/providers/cloudinary/cloudinary.module';
import { GuestModule } from './guest/guest.module';
import { LocationModule } from './location/location.module';
import { UploadModule } from './upload/upload.module';
import { HealthModule } from './health/health.module';
import { RabbitMqModule } from './common/providers/rabbitmq/rabbitmq.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV || 'dev'}`,
      isGlobal: true,
    }),
    AuthenticationModule,
    PagesModule,
    LoggerModule,
    EncryptionModule,
    RedisModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 30,
      },
    ]),
    PagesModule,
    PaymentModule,
    AssetModule,
    NotificationModule,
    UserModule,
    EmailModule,
    AdminModule,
    OrderModule,
    DestinationModule,
    GeneralModule,
    CloudinaryModule,
    GuestModule,
    LocationModule,
    UploadModule,
    HealthModule,
    RabbitMqModule,
  ],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestMiddleware).forRoutes('*');
  }
}
