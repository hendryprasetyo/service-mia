import { Module } from '@nestjs/common';
import { LoggerModule } from 'src/common/helpers/logger/logger.module';
import { RabbitmqService } from './rabbitmq.service';
import { EmailModule } from '../nodemailer/sendEmail.module';
import { GeneralModule } from 'src/common/helpers/general/general.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [LoggerModule, EmailModule, GeneralModule, CloudinaryModule],
  providers: [RabbitmqService],
  exports: [RabbitmqService],
})
export class RabbitMqModule {}
