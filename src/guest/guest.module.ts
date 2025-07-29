import { Module } from '@nestjs/common';
import { GuestService } from './guest.service';
import { GuestController } from './guest.controller';
import { LoggerModule } from 'src/common/helpers/logger/logger.module';
import { RedisModule } from 'src/database/redis/redis.module';
import { MysqlModule } from 'src/database/mysql/mysql.module';
import { DestinationModule } from 'src/destination/destination.module';
import { EncryptionModule } from 'src/common/helpers/encryption/encryption.module';
import { DestinationService } from 'src/destination/destination.service';
import { GeneralModule } from 'src/common/helpers/general/general.module';

@Module({
  imports: [
    LoggerModule,
    EncryptionModule,
    RedisModule,
    MysqlModule,
    RedisModule,
    DestinationModule,
    GeneralModule,
  ],
  controllers: [GuestController],
  providers: [GuestService, DestinationService],
})
export class GuestModule {}
