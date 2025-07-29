import * as _ from 'lodash';
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ObjectDto } from '../dtos/dto';
import lib from '../helpers/lib/lib.service';
import { CustomHttpException } from '../helpers/lib/exception';
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse();
    const request = context.switchToHttp().getRequest();
    const { transactionid } = request.headers;
    let status = 200;
    let statusCode = '00000';
    let message = 'success';

    return next.handle().pipe(
      tap(
        (data: ObjectDto | null) => {
          if (data instanceof CustomHttpException) {
            const { statusCode: customStatusCode, message: customMessage } =
              lib.handleStatusAndMessage(data);
            status = data.getStatus();
            statusCode = customStatusCode;
            message = customMessage;
            if (_.isEmpty(data.additionalInfo)) {
              data = {};
            } else {
              data = data.additionalInfo;
            }
          }
          if (!response.headersSent) {
            lib.responseHttpHandler({
              status,
              response,
              metaData: {
                statusCode,
                message,
                data: _.isEmpty(data) ? {} : data,
                transactionid,
              },
            });
          }
        },
        (err) => {
          status = 500;
          statusCode = '00500';
          message = 'Internal Server Error';

          if (err?.isHelperFail) {
            status = err.data.status;
            statusCode = err.data.status_code;
            message = err.data.status_desc;
          }
          if (!response.headersSent) {
            lib.responseHttpHandler({
              status,
              response,
              metaData: {
                statusCode,
                message,
                data: {},
                transactionid,
              },
            });
          }
        },
      ),
    );
  }
}
