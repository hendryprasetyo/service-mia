import { Module } from '@nestjs/common';
import { EmailService } from './sendEmail.service';
import { LoggerModule } from 'src/common/helpers/logger/logger.module';

@Module({
  imports: [LoggerModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
