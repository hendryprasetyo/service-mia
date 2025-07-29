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
import { UserService } from './user.service';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { Roles } from 'src/common/decorators/roles/role.decorator';
import { Role } from 'src/common/decorators/roles/role.enums';
import { RolesGuard } from 'src/authentication/role.guard';
import { AuthRequest, HeadersDto } from 'src/common/dtos/dto';
import { AuthGuard } from 'src/authentication/authentication.guard';
import {
  UpdateToSellerDto,
  UpdateToSellerDtoSchema,
  UploadIdentityDto,
  UploadIdentityDtoSchema,
} from './user.dto';
import { JoiValidationPipe } from 'src/common/pipes/validation.pipe';

@UseGuards(AuthGuard)
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly logger: LoggerServiceImplementation,
  ) {}

  @Post('/upload/identity')
  @Roles(Role.User)
  @UseGuards(RolesGuard)
  @UsePipes(new JoiValidationPipe<UploadIdentityDto>(UploadIdentityDtoSchema))
  public async uploadIdentity(
    @Req() request: AuthRequest,
    @Body() reqBody: UploadIdentityDto,
    @Headers() headers: HeadersDto,
  ) {
    try {
      const response = await this.userService.uploadIdentity(
        request,
        reqBody,
        headers,
      );
      return response;
    } catch (error) {
      this.logger.error(['User Controller', 'Upload Identity', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Get('/identity')
  @Roles(Role.User)
  @UseGuards(RolesGuard)
  public async getUserIdentity(
    @Req() request: AuthRequest,
    @Headers() headers: HeadersDto,
  ) {
    try {
      const response = await this.userService.getUserIdentity(request, headers);
      return response;
    } catch (error) {
      this.logger.error(['User Controller', 'Get Identity User', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Get('/profile')
  public async getUserProfile(
    @Req() request: AuthRequest,
    @Headers() headers: HeadersDto,
  ) {
    try {
      const response = await this.userService.getUserProfile(request, headers);
      return response;
    } catch (error) {
      this.logger.error(['User Controller', 'Get Profile User', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Post('/update/seller')
  @Roles(Role.User)
  @UseGuards(RolesGuard)
  @UsePipes(new JoiValidationPipe<UpdateToSellerDto>(UpdateToSellerDtoSchema))
  public async updateToSeller(
    @Req() request: AuthRequest,
    @Headers() headers: HeadersDto,
    @Body() reqBody: UpdateToSellerDto,
  ) {
    try {
      const response = await this.userService.updateToSeller(
        request,
        headers,
        reqBody,
      );
      return response;
    } catch (error) {
      this.logger.error(['User Controller', 'Update To Seller', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Get('/menu/list')
  @Roles(Role.Seller, Role.Admin)
  @UseGuards(RolesGuard)
  public async getMenuList(
    @Req() request: AuthRequest,
    @Headers() headers: HeadersDto,
  ) {
    try {
      const response = await this.userService.getMenuList(request, headers);
      return response;
    } catch (error) {
      this.logger.error(['User Controller', 'Get Menu List', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }
}
