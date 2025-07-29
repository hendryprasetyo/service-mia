import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import lib from '../helpers/lib/lib.service';
import { CustomHttpException } from '../helpers/lib/exception';
import { ThrottlerException } from '@nestjs/throttler';

@Catch(HttpException)
export class AllExceptionFilter implements ExceptionFilter {
  catch(exception: CustomHttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const request = host.switchToHttp().getRequest();
    const {
      statusCode: customStatusCode,
      message: customMessage,
      transactionid,
    } = lib.handleStatusAndMessage(exception);
    const status = exception.getStatus();

    let statusCode = customStatusCode;
    let message = customMessage;
    if (exception instanceof NotFoundException) {
      statusCode = '40404';
      message = 'Route not found';
    } else if (exception instanceof UnauthorizedException) {
      statusCode = '00401';
      message = 'Unauthorized Access';
    } else if (exception instanceof ForbiddenException) {
      statusCode = '00403';
      message = 'Forbidden';
    } else if (exception instanceof ThrottlerException) {
      statusCode = '40429';
      message = 'Too Many Requests';
    } else if (exception instanceof InternalServerErrorException) {
      statusCode = '00500';
      message = 'Internal Server Error';
    }
    if (!response.headersSent) {
      lib.responseHttpHandler({
        status,
        response,
        metaData: {
          statusCode,
          message,
          data: {},
          transactionid: request.headers.transactionid || transactionid,
        },
      });
    }
  }
}
