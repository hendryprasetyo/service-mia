import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { AuthRequest, HeadersDto } from 'src/common/dtos/dto';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { FulfillmentDtoSchema, FulfillmentDto } from './payment.dto';
import { JoiValidationPipe } from 'src/common/pipes/validation.pipe';
import { AuthGuard } from 'src/authentication/authentication.guard';
import { Roles } from 'src/common/decorators/roles/role.decorator';
import { Role } from 'src/common/decorators/roles/role.enums';
import { RolesGuard } from 'src/authentication/role.guard';

@UseGuards(AuthGuard)
@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly logger: LoggerServiceImplementation,
  ) {}

  @Get('/list')
  @Roles(Role.Admin, Role.User)
  @UseGuards(RolesGuard)
  public async paymentList(@Headers() headers: HeadersDto) {
    try {
      const response = await this.paymentService.paymentList(headers);
      return response;
    } catch (error) {
      this.logger.error(['Payment Controller', 'Payment List', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Post('/fulfillment')
  @Roles(Role.User)
  @UseGuards(RolesGuard)
  @UsePipes(new JoiValidationPipe<FulfillmentDto>(FulfillmentDtoSchema))
  public async fulfillment(
    @Req() request: AuthRequest,
    @Body() reqBody: FulfillmentDto,
    @Headers() headers: HeadersDto,
  ) {
    try {
      const response = await this.paymentService.fulfillment(
        request,
        reqBody,
        headers,
      );
      return response;
    } catch (error) {
      this.logger.error(
        ['Payment Controller', 'Payment Fullfillment', 'ERROR'],
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
