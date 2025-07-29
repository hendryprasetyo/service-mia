import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { LoggerModule } from 'src/common/helpers/logger/logger.module';
import { EncryptionModule } from 'src/common/helpers/encryption/encryption.module';
import { GeneralModule } from 'src/common/helpers/general/general.module';
import { MidtransModule } from 'src/common/providers/midtrans/midtrans.module';
import { MysqlModule } from 'src/database/mysql/mysql.module';

@Module({
  imports: [
    LoggerModule,
    EncryptionModule,
    GeneralModule,
    MidtransModule,
    GeneralModule,
    MysqlModule,
    MidtransModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
