import {
  Controller,
  Post,
  UseGuards,
  Req,
  Headers,
  UsePipes,
  Body,
  Param,
  Get,
  Query,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { AuthGuard } from 'src/authentication/authentication.guard';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { Roles } from 'src/common/decorators/roles/role.decorator';
import { Role } from 'src/common/decorators/roles/role.enums';
import { AuthRequest, HeadersDto } from 'src/common/dtos/dto';
import { JoiValidationPipe } from 'src/common/pipes/validation.pipe';
import {
  CancelOrderDto,
  CancelOrderDtoSchema,
  GetOrderDetailDto,
  GetOrderDetailDtoSchema,
  GetOrderListDto,
  GetOrderListDtoSchema,
} from './order.dto';

@UseGuards(AuthGuard)
@Controller('order')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly logger: LoggerServiceImplementation,
  ) {}

  @Get('/list')
  @UsePipes(new JoiValidationPipe<GetOrderListDto>(GetOrderListDtoSchema))
  public async getOrderList(
    @Req() request: AuthRequest,
    @Headers() headers: HeadersDto,
    @Query() query: GetOrderListDto,
  ) {
    try {
      return await this.orderService.getOrderList(request, headers, query);
    } catch (error) {
      this.logger.error(['Order Controller', 'GET Order List', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Post('/cancel')
  @Roles(Role.User)
  @UsePipes(new JoiValidationPipe<CancelOrderDto>(CancelOrderDtoSchema))
  public async cancelOrder(
    @Req() request: AuthRequest,
    @Headers() headers: HeadersDto,
    @Body() reqBody: CancelOrderDto,
  ) {
    try {
      return await this.orderService.cancelOrder(request, headers, reqBody);
    } catch (error) {
      this.logger.error(['Order Controller', 'Cancel Order', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Get('/:orderId')
  @Roles(Role.User)
  @UsePipes(new JoiValidationPipe<GetOrderDetailDto>(GetOrderDetailDtoSchema))
  public async getDetailOrder(
    @Req() request: AuthRequest,
    @Headers() headers: HeadersDto,
    @Param() param: GetOrderDetailDto,
  ) {
    try {
      return await this.orderService.getDetailOrder(request, headers, param);
    } catch (error) {
      this.logger.error(['Order Controller', 'GET Order Detail', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }
}
