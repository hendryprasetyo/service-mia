import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { DestinationService } from './destination.service';
import { AuthGuard } from 'src/authentication/authentication.guard';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { Roles } from 'src/common/decorators/roles/role.decorator';
import { Role } from 'src/common/decorators/roles/role.enums';
import { RolesGuard } from 'src/authentication/role.guard';
import { JoiValidationPipe } from 'src/common/pipes/validation.pipe';
import { AuthRequest, HeadersDto } from 'src/common/dtos/dto';
import {
  CreatePlaceDestinationDto,
  CreatePlaceDestinationDtoSchema,
  GetDetailPlaceDto,
  GetDetailPlaceDtoSchema,
  GetPlacesDto,
  GetPlacesDtoSchema,
  GetScheduleDestinationDto,
  GetScheduleDestinationDtoSchema,
} from './destination.dto';

@UseGuards(AuthGuard)
@Controller('destination')
export class DestinationController {
  constructor(
    private readonly destinationService: DestinationService,
    private readonly logger: LoggerServiceImplementation,
  ) {}

  @Post('/create/place')
  @Roles(Role.Seller)
  @UseGuards(RolesGuard)
  @UsePipes(
    new JoiValidationPipe<CreatePlaceDestinationDto>(
      CreatePlaceDestinationDtoSchema,
    ),
  )
  public async createPlaceDestination(
    @Req() request: AuthRequest,
    @Body() reqBody: CreatePlaceDestinationDto,
    @Headers() headers: HeadersDto,
  ) {
    try {
      const response = await this.destinationService.createPlaceDestination(
        request,
        reqBody,
        headers,
      );
      return response;
    } catch (error) {
      this.logger.error(
        ['Destination Controller', 'Create Place Destination ', 'ERROR'],
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

  @Get('/places')
  @Roles(Role.Seller, Role.Admin, Role.User)
  @UsePipes(new JoiValidationPipe<GetPlacesDto>(GetPlacesDtoSchema))
  public async getPlaces(
    @Req() request: AuthRequest,
    @Headers() headers: HeadersDto,
    @Query() query: GetPlacesDto,
  ) {
    try {
      const response = await this.destinationService.getPlaces(
        request,
        headers,
        query,
      );
      return response;
    } catch (error) {
      this.logger.error(
        ['Destination Controller', 'Get Places Destination ', 'ERROR'],
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

  @Get('/place/detail')
  @Roles(Role.Seller, Role.Admin, Role.User)
  @UsePipes(new JoiValidationPipe<GetDetailPlaceDto>(GetDetailPlaceDtoSchema))
  public async getDetailPlace(
    @Headers() headers: HeadersDto,
    @Query() query: GetDetailPlaceDto,
  ) {
    try {
      const response = await this.destinationService.getDetailPlace(
        headers,
        query,
      );
      return response;
    } catch (error) {
      this.logger.error(
        ['Destination Controller', 'Get Detail Place Destination ', 'ERROR'],
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

  @Get('/type')
  public async getDestinationType(@Headers() headers: HeadersDto) {
    try {
      const response =
        await this.destinationService.getDestinationType(headers);
      return response;
    } catch (error) {
      this.logger.error(
        ['Destination Controller', 'Get Destination Type', 'ERROR'],
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

  @Get('/place/schedule')
  @Roles(Role.Seller, Role.Admin, Role.User)
  @UsePipes(
    new JoiValidationPipe<GetScheduleDestinationDto>(
      GetScheduleDestinationDtoSchema,
    ),
  )
  public async getScheduleDestination(
    @Headers() headers: HeadersDto,
    @Query() query: GetScheduleDestinationDto,
  ) {
    try {
      const response = await this.destinationService.getScheduleDestination(
        headers,
        query,
      );
      return response;
    } catch (error) {
      this.logger.error(
        ['Destination Controller', 'Get Detail Place Destination ', 'ERROR'],
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
