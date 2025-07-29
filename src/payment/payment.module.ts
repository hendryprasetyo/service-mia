import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { LoggerModule } from 'src/common/helpers/logger/logger.module';
import { EncryptionModule } from 'src/common/helpers/encryption/encryption.module';
import { GeneralModule } from 'src/common/helpers/general/general.module';
import { MidtransModule } from 'src/common/providers/midtrans/midtrans.module';
import { RedisModule } from 'src/database/redis/redis.module';
import { MysqlModule } from 'src/database/mysql/mysql.module';
import { PaymentRepository } from './payment.repository';

@Module({
  imports: [
    LoggerModule,
    EncryptionModule,
    GeneralModule,
    MidtransModule,
    RedisModule,
    MysqlModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentRepository],
})
export class PaymentModule {}
