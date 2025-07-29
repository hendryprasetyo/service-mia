import { Controller, Get, Headers, Query, Req } from '@nestjs/common';
import { GuestService } from './guest.service';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { AuthRequest, HeadersDto } from 'src/common/dtos/dto';
import { DestinationService } from 'src/destination/destination.service';
import {
  GetDetailPlaceDto,
  GetDetailPlaceDtoSchema,
  GetPlacesDto,
} from 'src/destination/destination.dto';
import { JoiValidationPipe } from 'src/common/pipes/validation.pipe';

@Controller('guest')
export class GuestController {
  constructor(
    private readonly guestService: GuestService,
    private readonly logger: LoggerServiceImplementation,
    private readonly destinationService: DestinationService,
  ) {}

  @Get('/banners')
  public async getBanners(@Headers() headers: HeadersDto) {
    try {
      const response = await this.guestService.getBanners(headers);
      return response;
    } catch (error) {
      this.logger.error(['Guest Controller', 'Get Banners', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Get('/places')
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
      this.logger.error(['Guest Controller', 'Get Places', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Get('/place/detail')
  public async getDetailPlace(
    @Headers() headers: HeadersDto,
    @Query(new JoiValidationPipe<GetDetailPlaceDto>(GetDetailPlaceDtoSchema))
    query: GetDetailPlaceDto,
  ) {
    try {
      const response = await this.destinationService.getDetailPlace(
        headers,
        query,
      );
      return response;
    } catch (error) {
      this.logger.error(['Guest Controller', 'Get Places', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }
}
