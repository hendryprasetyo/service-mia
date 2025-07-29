import { Module } from '@nestjs/common';
import { AssetService } from './asset.service';
import { AssetController } from './asset.controller';
import { LoggerModule } from 'src/common/helpers/logger/logger.module';
import { GeneralModule } from 'src/common/helpers/general/general.module';
import { EncryptionModule } from 'src/common/helpers/encryption/encryption.module';
import { MysqlModule } from 'src/database/mysql/mysql.module';

@Module({
  imports: [LoggerModule, GeneralModule, EncryptionModule, MysqlModule],
  controllers: [AssetController],
  providers: [AssetService],
})
export class AssetModule {}
