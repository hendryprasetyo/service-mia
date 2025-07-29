import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { LoggerModule } from 'src/common/helpers/logger/logger.module';
import { EncryptionModule } from 'src/common/helpers/encryption/encryption.module';
import { MysqlModule } from 'src/database/mysql/mysql.module';
import { GeneralModule } from 'src/common/helpers/general/general.module';
import { RabbitMqModule } from 'src/common/providers/rabbitmq/rabbitmq.module';

@Module({
  imports: [
    MysqlModule,
    LoggerModule,
    EncryptionModule,
    GeneralModule,
    RabbitMqModule,
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
