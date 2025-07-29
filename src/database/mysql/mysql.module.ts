import { Module } from '@nestjs/common';
import { DbService } from './mysql.service';
import { LoggerModule } from 'src/common/helpers/logger/logger.module';
import { EncryptionModule } from 'src/common/helpers/encryption/encryption.module';

@Module({
  imports: [LoggerModule, EncryptionModule],
  providers: [DbService],
  exports: [DbService],
})
export class MysqlModule {}
