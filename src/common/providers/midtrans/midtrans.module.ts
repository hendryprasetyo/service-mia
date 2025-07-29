import { Module } from '@nestjs/common';
import { MidtransService } from './midtrans.service';
import { LoggerModule } from 'src/common/helpers/logger/logger.module';
import { GeneralModule } from 'src/common/helpers/general/general.module';

@Module({
  imports: [LoggerModule, GeneralModule],
  providers: [MidtransService],
  exports: [MidtransService],
})
export class MidtransModule {}
