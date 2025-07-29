import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { LocationService } from './location.service';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { HeadersDto } from 'src/common/dtos/dto';
import { JoiValidationPipe } from 'src/common/pipes/validation.pipe';
import {
  GetCityDto,
  GetCityDtoSchema,
  GetLocationDto,
  GetLocationDtoSchema,
  GetRecommendedAcomodationDto,
  GetRecommendedAcomodationDtoSchema,
  GetRoutingDto,
  GetRoutingDtoSchema,
} from './location.dto';

@Controller('location')
export class LocationController {
  constructor(
    private readonly locationService: LocationService,
    private readonly logger: LoggerServiceImplementation,
  ) {}

  @Get('/city')
  @UsePipes(new JoiValidationPipe<GetCityDto>(GetCityDtoSchema))
  public async getCity(
    @Query() query: GetCityDto,
    @Headers() headers: HeadersDto,
  ) {
    try {
      const response = await this.locationService.getCity(query, headers);
      return response;
    } catch (error) {
      this.logger.error(['Location Controller', 'Get City', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Get('/province')
  public async getProvince(@Headers() headers: HeadersDto) {
    try {
      const response = await this.locationService.getProvince(headers);
      return response;
    } catch (error) {
      this.logger.error(['Location Controller', 'Get Province', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Get('/province/coordinates')
  public async getProvinceCoordinates(@Headers() headers: HeadersDto) {
    try {
      const response =
        await this.locationService.getProvinceCoordinates(headers);
      return response;
    } catch (error) {
      this.logger.error(
        ['Location Controller', 'Get Province Coordinates', 'ERROR'],
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

  @Get('/detail')
  @UsePipes(new JoiValidationPipe<GetLocationDto>(GetLocationDtoSchema))
  public async getLocationDetail(
    @Query() query: GetLocationDto,
    @Headers() headers: HeadersDto,
  ) {
    try {
      const response = await this.locationService.getLocationDetail(
        query,
        headers,
      );
      return response;
    } catch (error) {
      this.logger.error(['Location Controller', 'Get Location', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Get('/country')
  public async getCountry(@Headers() headers: HeadersDto) {
    try {
      const response = await this.locationService.getCountry(headers);
      return response;
    } catch (error) {
      this.logger.error(['Location Controller', 'Get Country', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Post('/routing')
  @UsePipes(new JoiValidationPipe<GetRoutingDto>(GetRoutingDtoSchema))
  public async getRouting(
    @Headers() headers: HeadersDto,
    @Body() reqBody: GetRoutingDto,
  ) {
    try {
      const response = await this.locationService.getRouting(headers, reqBody);
      return response;
    } catch (error) {
      this.logger.error(['Location Controller', 'Get Routing', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Post('/recommended/acomodation')
  @UsePipes(
    new JoiValidationPipe<GetRecommendedAcomodationDto>(
      GetRecommendedAcomodationDtoSchema,
    ),
  )
  public async getRecommendedAcomodation(
    @Headers() headers: HeadersDto,
    @Body() reqBody: GetRecommendedAcomodationDto,
  ) {
    try {
      const response = await this.locationService.getRecommendedAcomodation(
        headers,
        reqBody,
      );
      return response;
    } catch (error) {
      this.logger.error(
        ['Location Controller', 'Get Recommended Acomodation', 'ERROR'],
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
