import { Module } from '@nestjs/common';
import { DestinationService } from './destination.service';
import { DestinationController } from './destination.controller';
import { LoggerModule } from 'src/common/helpers/logger/logger.module';
import { EncryptionModule } from 'src/common/helpers/encryption/encryption.module';
import { MysqlModule } from 'src/database/mysql/mysql.module';
import { GeneralModule } from 'src/common/helpers/general/general.module';
import { RedisModule } from 'src/database/redis/redis.module';

@Module({
  imports: [
    LoggerModule,
    EncryptionModule,
    MysqlModule,
    GeneralModule,
    RedisModule,
  ],
  controllers: [DestinationController],
  providers: [DestinationService],
})
export class DestinationModule {}
