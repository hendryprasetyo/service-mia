import {
  Controller,
  Headers,
  Post,
  UploadedFiles,
  UseInterceptors,
  Body,
  Req,
  UseGuards,
  Get,
  Query,
  UsePipes,
} from '@nestjs/common';
import { UploadService } from './upload.service';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { AuthRequest, HeadersDto } from 'src/common/dtos/dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  UploadImagesDto,
  UploadImagesDtoSchema,
  UploadPresignUrlDto,
  UploadPresignUrlDtoSchema,
} from './upload.dto';
import { CustomHttpException } from 'src/common/helpers/lib/exception';
import { AuthGuard } from 'src/authentication/authentication.guard';
import { JoiValidationPipe } from 'src/common/pipes/validation.pipe';

@UseGuards(AuthGuard)
@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly logger: LoggerServiceImplementation,
  ) {}

  @Post('/images')
  @UseInterceptors(FilesInterceptor('images', 10))
  public async uploadImage(
    @Req() request: AuthRequest,
    @Headers() headers: HeadersDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() reqBody: UploadImagesDto,
  ) {
    const body = Object.assign({}, reqBody);
    const { error } = UploadImagesDtoSchema.validate(body, {
      abortEarly: false,
    });
    if (error) return new CustomHttpException(error.message, 400);

    try {
      const response = await this.uploadService.uploadImage(
        request,
        headers,
        files,
        reqBody,
      );
      return response;
    } catch (error) {
      this.logger.error(['Upload Controller', 'Upload Images', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }

  @Get('/sign-url')
  @UsePipes(
    new JoiValidationPipe<UploadPresignUrlDto>(UploadPresignUrlDtoSchema),
  )
  public async getPresignUrl(
    @Req() request: AuthRequest,
    @Headers() headers: HeadersDto,
    @Query() query: UploadPresignUrlDto,
  ) {
    try {
      const response = await this.uploadService.getPresignUrl(
        request,
        headers,
        query,
      );
      return response;
    } catch (error) {
      this.logger.error(['Upload Controller', 'Upload Pre Sign Url', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        stack: error?.stack,
        transactionid: headers.transactionid,
      });
      return Promise.reject(error);
    }
  }
}
