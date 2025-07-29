import { HttpException, HttpExceptionOptions } from '@nestjs/common';

export interface AdditionalInfo {
  transactionid?: string;
  [key: string]: unknown;
}

export class CustomHttpException extends HttpException {
  constructor(
    message: string,
    statusCode: number,
    options?: HttpExceptionOptions,
    public additionalInfo?: AdditionalInfo,
  ) {
    super(message, statusCode, options);
  }

  getResponse() {
    const response = super.getResponse();
    return {
      response,
      additionalInfo: this.additionalInfo,
    };
  }
}
