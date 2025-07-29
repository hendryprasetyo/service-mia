import { Module } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { AuthenticationController } from './authentication.controller';
import { LoggerModule } from 'src/common/helpers/logger/logger.module';
import { RedisModule } from 'src/database/redis/redis.module';
import { EncryptionModule } from 'src/common/helpers/encryption/encryption.module';
import { RabbitMqModule } from 'src/common/providers/rabbitmq/rabbitmq.module';
import { GeneralModule } from 'src/common/helpers/general/general.module';
import { MysqlModule } from 'src/database/mysql/mysql.module';
import { OAuthModule } from 'src/common/providers/oAuth/oAuth.module';

@Module({
  imports: [
    LoggerModule,
    RedisModule,
    EncryptionModule,
    RabbitMqModule,
    GeneralModule,
    MysqlModule,
    OAuthModule,
  ],
  controllers: [AuthenticationController],
  providers: [AuthenticationService],
})
export class AuthenticationModule {}
