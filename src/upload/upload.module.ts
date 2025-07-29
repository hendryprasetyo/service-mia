import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { LoggerModule } from 'src/common/helpers/logger/logger.module';
import { RabbitMqModule } from 'src/common/providers/rabbitmq/rabbitmq.module';
import { GeneralModule } from 'src/common/helpers/general/general.module';
import { EncryptionModule } from 'src/common/helpers/encryption/encryption.module';
import { MysqlModule } from 'src/database/mysql/mysql.module';

@Module({
  imports: [
    LoggerModule,
    RabbitMqModule,
    EncryptionModule,
    MysqlModule,
    GeneralModule,
  ],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
