import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AssetService } from './asset.service';
import { HeadersDto } from 'src/common/dtos/dto';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { updateTranslationDto, updateTranslationDtoSchema } from './asset.dto';
import { JoiValidationPipe } from 'src/common/pipes/validation.pipe';
import { AuthGuard } from 'src/authentication/authentication.guard';
import { Roles } from 'src/common/decorators/roles/role.decorator';
import { Role } from 'src/common/decorators/roles/role.enums';
import { RolesGuard } from 'src/authentication/role.guard';

@Controller('asset')
export class AssetController {
  constructor(
    private readonly assetService: AssetService,
    private readonly logger: LoggerServiceImplementation,
  ) {}

  @Get('/translation/:pageId')
  public async getTranslation(
    @Headers() headers: HeadersDto,
    @Param() param: { pageId: string },
  ) {
    try {
      const response = await this.assetService.getTranslation(headers, param);
      return response;
    } catch (error) {
      this.logger.error(['Asset Controller', 'Get Translation', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Get('/countries')
  public async getCountries(@Headers() headers: HeadersDto) {
    try {
      const response = await this.assetService.getCountries(headers);
      return response;
    } catch (error) {
      this.logger.error(['Asset Controller', 'Get Countries', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Get('/policy')
  public async getPolicy(@Headers() headers: HeadersDto) {
    try {
      const response = await this.assetService.getPolicy(headers);
      return response;
    } catch (error) {
      this.logger.error(['Asset Controller', 'Get Policy', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @UseGuards(AuthGuard)
  @Patch('/translation/update')
  @Roles(Role.Admin)
  @UseGuards(RolesGuard)
  @UsePipes(
    new JoiValidationPipe<updateTranslationDto>(updateTranslationDtoSchema),
  )
  public async updateTranslation(
    @Headers() headers: HeadersDto,
    @Body() reqBody: updateTranslationDto,
  ) {
    try {
      const response = await this.assetService.updateTranslation(
        headers,
        reqBody,
      );
      return response;
    } catch (error) {
      this.logger.error(['Asset Controller', 'Update Translation', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }
}
