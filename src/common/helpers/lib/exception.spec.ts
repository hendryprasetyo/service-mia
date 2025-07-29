import { HttpStatus } from '@nestjs/common';
import { CustomHttpException } from './exception';

describe('CustomHttpException', () => {
  it('should create an instance of CustomHttpException', () => {
    const exception = new CustomHttpException(
      'Not Found',
      HttpStatus.NOT_FOUND,
    );

    expect(exception).toBeInstanceOf(CustomHttpException);
    expect(exception.message).toBe('Not Found');
    expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
  });

  it('should include additionalInfo if provided', () => {
    const additionalInfo = { transactionid: '12345', someOtherInfo: 'test' };
    const exception = new CustomHttpException(
      'Something went wrong',
      HttpStatus.BAD_REQUEST,
      undefined,
      additionalInfo,
    );

    expect(exception.additionalInfo).toEqual(additionalInfo);
  });

  it('should return response and additionalInfo from getResponse()', () => {
    const additionalInfo = { transactionid: '12345' };
    const exception = new CustomHttpException(
      'Internal Server Error',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      additionalInfo,
    );

    const response = exception.getResponse();

    expect(response.response).toBe('Internal Server Error'); // Expected response from super.getResponse()
    expect(response.additionalInfo).toEqual(additionalInfo);
  });

  it('should handle case where additionalInfo is not provided', () => {
    const exception = new CustomHttpException(
      'Unauthorized',
      HttpStatus.UNAUTHORIZED,
    );

    const response = exception.getResponse();

    expect(response.response).toBe('Unauthorized'); // Expected response from super.getResponse()
    expect(response.additionalInfo).toBeUndefined();
  });
});
