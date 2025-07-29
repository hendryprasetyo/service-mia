import { Controller, Get, Headers } from '@nestjs/common';
import { PagesService } from './pages.service';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { HeadersDto } from 'src/common/dtos/dto';

@Controller('pages')
export class PagesController {
  constructor(
    private readonly pagesService: PagesService,
    private readonly logger: LoggerServiceImplementation,
  ) {}

  @Get('/footer-layout')
  public async getFooterLayout(@Headers() headers: HeadersDto) {
    try {
      const response = await this.pagesService.getFooterLayout(headers);
      return response;
    } catch (error) {
      this.logger.error(['Page Controller', 'Get Footer Layout', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Get('/merchant/form-register')
  public async getFormMerchantRegister(@Headers() headers: HeadersDto) {
    try {
      const response = await this.pagesService.getFormMerchantRegister(headers);
      return response;
    } catch (error) {
      this.logger.error(
        ['Page Controller', 'GET Form Merchant Register', 'ERROR'],
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
