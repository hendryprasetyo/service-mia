import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  Req,
  Request,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { Roles } from 'src/common/decorators/roles/role.decorator';
import { Role } from 'src/common/decorators/roles/role.enums';
import { RolesGuard } from 'src/authentication/role.guard';
import { AuthRequest, HeadersDto } from 'src/common/dtos/dto';
import { AuthGuard } from 'src/authentication/authentication.guard';
import {
  CreateUpdateBannerDto,
  CreateUpdateBannerDtoSchema,
  CreateDestinationCategoryDto,
  CreateDestinationCategoryDtoSchema,
  CreateVoucherDto,
  CreateVoucherDtoSchema,
  DetailBannerDtoSchema,
  DetailBannerDto,
  GetActiveVoucherDto,
  GetActiveVoucherDtoSchema,
  GetDefaultImageDto,
  GetDefaultImageDtoSchema,
} from './admin.dto';
import { JoiValidationPipe } from 'src/common/pipes/validation.pipe';

@UseGuards(AuthGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly logger: LoggerServiceImplementation,
  ) {}

  @Post('/create/destination-category')
  @Roles(Role.Admin)
  @UseGuards(RolesGuard)
  @UsePipes(
    new JoiValidationPipe<CreateDestinationCategoryDto>(
      CreateDestinationCategoryDtoSchema,
    ),
  )
  public async createDestinationCaegory(
    @Req() request: AuthRequest,
    @Body() reqBody: CreateDestinationCategoryDto,
    @Headers() headers: HeadersDto,
  ) {
    try {
      const response = await this.adminService.createDestinationCaegory(
        request,
        reqBody,
        headers,
      );
      return response;
    } catch (error) {
      this.logger.error(
        ['Admin Controller', 'Create Destination Category ', 'ERROR'],
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

  @Get('/destination-categories')
  @Roles(Role.Admin, Role.Seller)
  @UseGuards(RolesGuard)
  public async getDestinationCaegories(@Headers() headers: HeadersDto) {
    try {
      const response = await this.adminService.getDestinationCaegories(headers);
      return response;
    } catch (error) {
      this.logger.error(
        ['User Controller', 'GET Destination Categories', 'ERROR'],
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

  @Post('/create/voucher')
  @Roles(Role.Admin, Role.Seller)
  @UseGuards(RolesGuard)
  @UsePipes(new JoiValidationPipe<CreateVoucherDto>(CreateVoucherDtoSchema))
  public async createVoucher(
    @Req() request: AuthRequest,
    @Body() reqBody: CreateVoucherDto,
    @Headers() headers: HeadersDto,
  ) {
    try {
      const response = await this.adminService.createVoucher(
        request,
        reqBody,
        headers,
      );
      return response;
    } catch (error) {
      this.logger.error(
        ['Admin Controller', 'Create Destination Category ', 'ERROR'],
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

  @Get('/vouchers')
  @Roles(Role.Admin, Role.User, Role.Seller)
  @UseGuards(RolesGuard)
  @UsePipes(
    new JoiValidationPipe<GetActiveVoucherDto>(GetActiveVoucherDtoSchema),
  )
  public async getVoucher(
    @Request() request: AuthRequest,
    @Headers() headers: HeadersDto,
    @Query() query: GetActiveVoucherDto,
  ) {
    try {
      const response = await this.adminService.getVoucher(
        request,
        headers,
        query,
      );
      return response;
    } catch (error) {
      this.logger.error(['User Controller', 'GET Active Vouchers', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Post('/create/banner')
  @Roles(Role.Admin)
  @UseGuards(RolesGuard)
  @UsePipes(
    new JoiValidationPipe<CreateUpdateBannerDto>(CreateUpdateBannerDtoSchema),
  )
  public async createBanner(
    @Req() request: AuthRequest,
    @Body() reqBody: CreateUpdateBannerDto,
    @Headers() headers: HeadersDto,
  ) {
    try {
      const response = await this.adminService.createUpdateBanner(
        request,
        reqBody as CreateUpdateBannerDto,
        headers,
      );
      return response;
    } catch (error) {
      this.logger.error(['Admin Controller', 'Create Banner ', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Put('/update/banner')
  @Roles(Role.Admin)
  @UseGuards(RolesGuard)
  @UsePipes(
    new JoiValidationPipe<CreateUpdateBannerDto>(CreateUpdateBannerDtoSchema),
  )
  public async updateBanner(
    @Req() request: AuthRequest,
    @Body() reqBody: CreateUpdateBannerDto,
    @Headers() headers: HeadersDto,
  ) {
    try {
      const response = await this.adminService.createUpdateBanner(
        request,
        reqBody,
        headers,
      );
      return response;
    } catch (error) {
      this.logger.error(['Admin Controller', 'Update Banner ', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Get('/banner/:bannerId')
  @Roles(Role.Admin)
  @UseGuards(RolesGuard)
  @UsePipes(new JoiValidationPipe<DetailBannerDto>(DetailBannerDtoSchema))
  public async getDetailBanner(
    @Headers() headers: HeadersDto,
    @Param() param: DetailBannerDto,
  ) {
    try {
      const response = await this.adminService.getDetailBanner(headers, param);
      return response;
    } catch (error) {
      this.logger.error(['Admin Controller', 'Get Detail Banner', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Get('/asset/images')
  @Roles(Role.Admin)
  @UseGuards(RolesGuard)
  @UsePipes(new JoiValidationPipe<GetDefaultImageDto>(GetDefaultImageDtoSchema))
  public async getDefaultImage(
    @Headers() headers: HeadersDto,
    @Query() query: GetDefaultImageDto,
  ) {
    try {
      const response = await this.adminService.getDefaultImage(headers, query);
      return response;
    } catch (error) {
      this.logger.error(['Admin Controller', 'Get Default Images', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }
}
