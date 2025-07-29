import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { LoggerModule } from 'src/common/helpers/logger/logger.module';
import { RedisModule } from 'src/database/redis/redis.module';
import { GeneralModule } from 'src/common/helpers/general/general.module';
import { RabbitMqModule } from 'src/common/providers/rabbitmq/rabbitmq.module';
import { MysqlModule } from 'src/database/mysql/mysql.module';
import { MidtransModule } from 'src/common/providers/midtrans/midtrans.module';

@Module({
  imports: [
    LoggerModule,
    RedisModule,
    GeneralModule,
    RabbitMqModule,
    MysqlModule,
    MidtransModule,
    RedisModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
})
export class NotificationModule {}
