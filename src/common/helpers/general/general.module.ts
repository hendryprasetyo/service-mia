import { Module } from '@nestjs/common';
import { GeneralService } from './general.service';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [LoggerModule],
  providers: [GeneralService],
  exports: [GeneralService],
})
export class GeneralModule {}
