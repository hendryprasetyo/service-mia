import { Body, Controller, Headers, Post } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { TranscationNotifDto } from './notification.dto';

@Controller('notification')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly logger: LoggerServiceImplementation,
  ) {}

  @Post('/payment/callback')
  public async orderCallback(
    @Body() reqBody: TranscationNotifDto,
    @Headers() headers: { transactionid: string },
  ) {
    try {
      const response = await this.notificationService.orderCallback(
        reqBody,
        headers,
      );
      return response;
    } catch (error) {
      this.logger.error(
        ['Notification Controller', 'Order Callback', 'ERROR'],
        {
          info: JSON.stringify(error),
          messages: error.message,
          stack: error?.stack,
          transactionid: headers.transactionid,
        },
      );
      return Promise.reject(error);
    }
  }
}
