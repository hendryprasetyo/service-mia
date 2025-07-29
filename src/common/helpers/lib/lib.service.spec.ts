import LibService from './lib.service';
import { CustomHttpException } from './exception';
import { Response } from 'express';

jest.mock('express', () => ({
  Response: jest.fn().mockImplementation(() => ({
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  })),
}));

describe('LibService', () => {
  let mockResponse: Partial<Response<any, Record<string, any>>>;

  beforeEach(() => {
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  describe('responseHttpHandler', () => {
    it('should send the correct response with status and metadata', () => {
      const dataObj = {
        response: mockResponse as Response<any, Record<string, any>>,
        status: 200,
        metaData: {
          statusCode: '00201',
          message: 'success',
          data: {},
          transactionid: 'string',
        },
      };

      LibService.responseHttpHandler(dataObj);
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      expect(mockResponse.send).toHaveBeenCalledWith({
        statusCode: '00201',
        message: 'success',
        data: {},
        transactionid: 'string',
      });
    });
  });

  describe('handleStatusAndMessage', () => {
    it('should handle a 200 status and return the correct response code', () => {
      const exception = new CustomHttpException('Success', 200);
      const result = LibService.handleStatusAndMessage(exception);

      expect(result.statusCode).toBe('00201');
      expect(result.message).toBe('Success');
      expect(result.transactionid).toBeUndefined();
    });

    it('should handle a 300 status and return the correct response code', () => {
      const exception = new CustomHttpException('No content', 300);
      const result = LibService.handleStatusAndMessage(exception);

      expect(result.statusCode).toBe('00300');
      expect(result.message).toBe('No content');
      expect(result.transactionid).toBeUndefined();
    });

    it('should handle a 400 status and return the correct response code', () => {
      const exception = new CustomHttpException('Bad Request', 400);
      const result = LibService.handleStatusAndMessage(exception);

      expect(result.statusCode).toBe('00400');
      expect(result.message).toBe('Bad Request');
      expect(result.transactionid).toBeUndefined();
    });

    it('should handle a 500 status and return the correct response code', () => {
      const exception = new CustomHttpException('', 500);
      const result = LibService.handleStatusAndMessage(exception);

      expect(result.statusCode).toBe('00500');
      expect(result.message).toBe('Internal Server Error');
      expect(result.transactionid).toBeUndefined();
    });

    it('should include the transactionId from additionalInfo if available', () => {
      const exception = new CustomHttpException('Internal Server Error', 500);
      exception.additionalInfo = { transactionid: '123456' };

      const result = LibService.handleStatusAndMessage(exception);

      expect(result.transactionid).toBe('123456');
    });

    it('should handle a custom cause for status code', () => {
      const exception = new CustomHttpException('Service Unavailable', 503);
      exception.cause = '00301'; // Custom cause code
      const result = LibService.handleStatusAndMessage(exception);

      expect(result.statusCode).toBe('00301');
      expect(result.message).toBe('Service Unavailable');
    });
  });

  describe('formatCurrency', () => {
    it('should return Rp 0 : Default value', () => {
      const result = LibService.formatCurrency();
      expect(result).toBe('Rp 0');
    });
  });

  describe('isValidNIK', () => {
    it('should return false : invalid nik', () => {
      const result = LibService.isValidNIK('33');
      expect(result).toBe(false);
    });

    it('should return false : invalid birthday', () => {
      const result = LibService.isValidNIK('3326163208070197');
      expect(result).toBe(false);
    });

    it('should return true : year < 22', () => {
      const result = LibService.isValidNIK('3326160608070197');
      expect(result).toBe(true);
    });

    it('should return true : year > 22', () => {
      const result = LibService.isValidNIK('3326160608230197');
      expect(result).toBe(true);
    });
  });

  describe('markerData', () => {
    it('should correctly mask email', () => {
      const result = LibService.markerData('john.doe@example.com', 'email');
      expect(result).toBe('jo******@example.com');
    });

    it('should correctly mask NIK (valid case)', () => {
      const result = LibService.markerData('1234567890123456', 'nik', 4, '*');
      expect(result).toBe('123***********56');
    });

    it('should correctly mask NIK (invalid case)', () => {
      const result = LibService.markerData('12345', 'nik', 4, '*');
      expect(result).toBe('12345');
    });

    it('should correctly mask username', () => {
      const result = LibService.markerData('johnny123', 'username', 4, '*');
      expect(result).toBe('joh***123');
    });

    it('should mask NIK with default mask length and mask char', () => {
      const result = LibService.markerData('1234567890123456', 'nik');
      expect(result).toBe('123***********56');
    });

    it('should mask username with default mask length and mask char', () => {
      const result = LibService.markerData('johnny123', 'username');
      expect(result).toBe('joh***123');
    });

    it('should mask NIK for a short NIK (less than 16 digits)', () => {
      const result = LibService.markerData('1234567', 'nik');
      expect(result).toBe('123**67');
    });

    it('should mask email with default mask length and mask char', () => {
      const result = LibService.markerData('john.doe@example.com', 'email');
      expect(result).toBe('jo******@example.com');
    });

    it('should mask with custom maskChar', () => {
      const result = LibService.markerData('johnny123', 'username', 4, '#');
      expect(result).toBe('joh###123');
    });

    it('should mask with custom maskLength', () => {
      const result = LibService.markerData('johnny123', 'username', 2, '*');
      expect(result).toBe('joh***123');
    });

    it('should mask an entire string if the length is less than or equal to maskLength', () => {
      const result = LibService.markerData('1234', 'nik', 4, '*');
      expect(result).toBe('****');
    });

    it('should return default value', () => {
      const result = LibService.markerData(null, 'email');
      expect(result).toEqual(null);
    });

    it('should return the same value for invalid type', () => {
      const result = LibService.markerData(
        'john.doe@example.com',
        'address' as any,
        4,
        '*',
      );
      expect(result).toBe('john.doe@example.com');
    });
  });

  describe('formatNoOrder', () => {
    it('should return no order', () => {
      LibService.formatNoOrder('KYEAS');
    });
  });

  describe('generateTrxId', () => {
    it('should return no order', () => {
      LibService.generateTrxId();
    });
  });

  describe('sanitizeNulls', () => {
    it('should convert null values to empty strings', () => {
      const input = {
        name: 'John',
        age: null,
        address: null,
        email: 'john@example.com',
      };

      const result = LibService.sanitizeNulls(input);

      expect(result).toEqual({
        name: 'John',
        age: '',
        address: '',
        email: 'john@example.com',
      });
    });

    it('should leave non-null values untouched', () => {
      const input = {
        a: 123,
        b: false,
        c: 'test',
      };

      const result = LibService.sanitizeNulls(input);

      expect(result).toEqual(input);
    });

    it('should handle empty object', () => {
      const input = {};

      const result = LibService.sanitizeNulls(input);

      expect(result).toEqual({});
    });
  });

  describe('calculatePrice', () => {
    it('should calculate discount amount from percentage', () => {
      const result = LibService.calculatePrice({
        type: 'percentage',
        priceBeforeDiscVal: 20000,
        discountVal: 25,
      });
      expect(result).toBe(5000); // 25% of 20000
    });

    it('should calculate discount percentage from priceVal (non-percentage)', () => {
      const result = LibService.calculatePrice({
        type: 'non-percentage',
        priceBeforeDiscVal: 15000,
        priceVal: 12000,
      });
      expect(result).toBeCloseTo(20); // (15000 - 12000) / 15000 * 100
    });

    it('should return priceBeforeDiscVal if no valid type or values provided', () => {
      const result = LibService.calculatePrice({
        type: 'percentage',
        priceBeforeDiscVal: 10000,
        discountVal: -1,
      });
      expect(result).toBe(10000);
    });

    it('should return priceBeforeDiscVal for non-percentage with invalid priceVal', () => {
      const result = LibService.calculatePrice({
        type: 'non-percentage',
        priceBeforeDiscVal: 10000,
        priceVal: -1,
      });
      expect(result).toBe(10000);
    });
  });
});
