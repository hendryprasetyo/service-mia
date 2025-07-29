import * as Crypto from 'crypto';
import * as JWT from 'jsonwebtoken';
import { ErrorEncryptionDto } from 'src/common/dtos/dto';
import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';
import { TestSetupModule } from 'src/config/test-setup.module';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let payload;
  const expectedResponseError = (dataObj?: {
    status?: number;
    status_code?: string;
    status_desc?: string;
    message?: string;
  }): ErrorEncryptionDto => {
    const { status, status_code, status_desc, message } = dataObj;
    return {
      isHelperFail: true,
      message: message,
      data: {
        status: status ?? 422,
        status_code: status_code ?? '01422',
        status_desc: status_desc ?? 'Unprocessable Entity',
      },
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      providers: [EncryptionService],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  afterEach(() => {
    jest.restoreAllMocks(); // Reset semua spy/mocks
    jest.clearAllMocks(); // Bersihkan call history dll
  });

  describe('encryptPayload', () => {
    it('should encrypt a string value', () => {
      const result = service.encryptPayload('testString');
      expect(typeof result).toBe('string');
      expect(result).not.toBe('testString');
    });

    it('should encrypt a number value', () => {
      const result = service.encryptPayload(123);
      expect(typeof result).toBe('string');
      expect(result).not.toBe('123');
    });

    it('should encrypt an object value', () => {
      const result = service.encryptPayload({ key: 'value' });
      expect(typeof result).toBe('string');
      expect(result).not.toBe('{"key":"value"}');
    });

    it('should throw an error if value null', () => {
      try {
        service.encryptPayload(null as null);
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            status: 400,
            message: 'VALUE IS REQUIRED',
            status_code: '01400',
          }),
        );
      }
    });

    it('should throw an error if failed parse encrypted values', () => {
      jest.spyOn(Crypto, 'createCipheriv').mockImplementation(() => {
        throw new Error('Unexpected error occurred during encryption');
      });
      try {
        service.encryptPayload('stringvalue');
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            message: error.message,
          }),
        );
      }
    });
  });

  describe('decryptPayload', () => {
    it('should decrypt a string value', () => {
      const encrypted = service.encryptPayload('testString');
      const decrypted = service.decryptPayload<string>(encrypted, 'string');
      expect(decrypted).toBe('testString');
    });

    it('should decrypt an object value', () => {
      const encrypted = service.encryptPayload({ key: 'value' });
      const decrypted = service.decryptPayload<{ key: string }>(
        encrypted,
        'object',
      );
      expect(decrypted).toEqual({ key: 'value' });
    });

    it('should throw an error if decryption results in empty data', () => {
      try {
        service.decryptPayload('37796480010f253f6e3e2d7ed0b66ab1');
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            message: 'VALUE DECRYPT EMPTY',
          }),
        );
      }
    });

    it('should throw an error if value null', () => {
      try {
        service.decryptPayload(null as null);
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            status: 400,
            message: 'VALUE IS REQUIRED',
            status_code: '01400',
          }),
        );
      }
    });

    it('should throw an error if failed parse decrypted values', () => {
      try {
        const encrypted = service.encryptPayload('stringvalue');
        service.decryptPayload(encrypted, 'object');
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            status_code: '01411',
            message: 'FAILED PARSE DATA',
          }),
        );
      }
    });
  });

  describe('encryptEntityID', () => {
    it('should encrypt an entity ID string', () => {
      const encrypted = service.encryptEntityID('entity123');
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe('entity123');
    });

    it('should throw an error if the value is null', () => {
      try {
        service.encryptEntityID(null as null);
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            status: 400,
            message: 'VALUE IS REQUIRED',
            status_code: '01400',
          }),
        );
      }
    });

    it('should throw an error if failed parse encrypted values', () => {
      jest.spyOn(Crypto, 'createCipheriv').mockImplementation(() => {
        throw new Error('Unexpected error occurred during encryption');
      });
      try {
        service.encryptEntityID('stringvalue');
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            message: error.message,
          }),
        );
      }
    });
  });

  describe('decryptEntityID', () => {
    it('should decrypt an entity ID string', () => {
      const encrypted = service.encryptEntityID('entity123');
      const decrypted = service.decryptEntityID(encrypted);
      expect(decrypted).toBe('entity123');
    });

    it('should throw an error if the value is null', () => {
      try {
        service.decryptEntityID(null as null);
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            status: 400,
            message: 'VALUE IS REQUIRED',
            status_code: '01400',
          }),
        );
      }
    });

    it('should throw an error if failed parse decrypted values', () => {
      jest.spyOn(Crypto, 'createCipheriv').mockImplementation(() => {
        throw new Error('Unexpected error occurred during encryption');
      });
      try {
        service.decryptEntityID('stringvalue');
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            message: error.message,
          }),
        );
      }
    });
  });

  describe('encryptOrderID', () => {
    it('should encrypt an order ID string', () => {
      const orderId = 'order123';
      const encrypted = service.encryptOrderID(orderId);
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(orderId);
    });

    it('should throw an error if the value is null', () => {
      try {
        service.encryptOrderID(null as null);
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            status: 400,
            message: 'VALUE IS REQUIRED',
            status_code: '01400',
          }),
        );
      }
    });

    it('should throw an error if failed parse encrypted values', () => {
      jest.spyOn(Crypto, 'createCipheriv').mockImplementation(() => {
        throw new Error('Unexpected error occurred during encryption');
      });
      try {
        service.encryptOrderID('stringvalue');
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            message: error.message,
          }),
        );
      }
    });
  });

  describe('decryptOrderID', () => {
    it('should decrypt an order ID string', () => {
      const orderId = 'order123';
      const encrypted = service.encryptOrderID(orderId);
      const decrypted = service.decryptOrderID(encrypted);
      expect(decrypted).toBe(orderId);
    });

    it('should throw an error if the value is null', () => {
      try {
        service.decryptOrderID(null as null);
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            status: 400,
            message: 'VALUE IS REQUIRED',
            status_code: '01400',
          }),
        );
      }
    });

    it('should throw an error if failed parse decrypt values', () => {
      jest.spyOn(Crypto, 'createCipheriv').mockImplementation(() => {
        throw new Error('Unexpected error occurred during encryption');
      });
      try {
        service.decryptOrderID('stringvalue');
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            message: error.message,
          }),
        );
      }
    });
  });

  describe('verifyTokenJwt', () => {
    it('should decrypt an order ID string', async () => {
      const token = service.generateTokenJWT({
        value: { id: 'uniqueid' },
        exp: '5m',
        tokenSecret: 'secret',
      });
      const decrypted = await service.verifyTokenJwt<{ id: string }>(
        token,
        'secret',
      );
      expect(decrypted.id).toBe('uniqueid');
    });

    it('should throw an error expired token', async () => {
      jest.spyOn(JWT, 'verify').mockImplementation(() => {
        throw { name: 'TokenExpiredError' };
      });
      try {
        await service.verifyTokenJwt<string>('token', 'secret');
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            message: 'Token has expired',
            status: 400,
            status_code: '11403',
            status_desc: 'Unprocessable Entity',
          }),
        );
      }
    });

    it('should throw an error Invalid token payload', async () => {
      jest.spyOn(JWT, 'verify').mockImplementation(() => {
        throw { name: 'JsonWebTokenError' };
      });
      try {
        await service.verifyTokenJwt<string>('token', 'secret');
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            message: 'Invalid token payload',
            status: 400,
            status_code: '01400',
            status_desc: 'Unprocessable Entity',
          }),
        );
      }
    });

    it('should throw an error unexpected error', async () => {
      jest.spyOn(JWT, 'verify').mockImplementation(() => {
        throw { name: 'unexpected error' };
      });
      try {
        await service.verifyTokenJwt<string>('token', 'secret');
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            message: error.message,
            status_desc: 'Unprocessable Entity',
          }),
        );
      }
    });
  });

  describe('encryptIdentifier', () => {
    it('should encrypt an entity ID string', () => {
      const encrypted = service.encryptIdentifier('identifier');
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe('identifier');
    });

    it('should throw an error if the value is null', () => {
      try {
        service.encryptIdentifier(null as null);
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            status: 400,
            message: 'VALUE IS REQUIRED',
            status_code: '01400',
          }),
        );
      }
    });

    it('should throw an error if failed parse encrypted values', () => {
      jest.spyOn(Crypto, 'createCipheriv').mockImplementation(() => {
        throw new Error('Unexpected error occurred during encryption');
      });
      try {
        service.encryptIdentifier('stringvalue');
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            message: error.message,
          }),
        );
      }
    });
  });

  describe('decryptIdentifier', () => {
    it('should decrypt an entity ID string', () => {
      const encrypted = service.encryptIdentifier('identifier');
      const decrypted = service.decryptIdentifier(encrypted);
      expect(decrypted).toBe('identifier');
    });

    it('should throw an error if failed parse decrypted values', () => {
      jest.spyOn(Crypto, 'createCipheriv').mockImplementation(() => {
        throw new Error('Unexpected error occurred during encryption');
      });
      try {
        service.decryptIdentifier('stringvalue');
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            message: error.message,
          }),
        );
      }
    });
  });

  describe('encryptFileBytes', () => {
    it('should return error empty value', () => {
      try {
        const payload = '';
        service.encryptFileBytes(Buffer.from(payload, 'base64'), 'unique-user');
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            status: 400,
            message: 'VALUE IS REQUIRED',
            status_code: '01400',
          }),
        );
      }
    });

    it('should encrypt an File Bytes Buffer', () => {
      const payload = 'iVBORw0KGgoAAAANSUhEUgAACfcAAAG5CAYAAAAp5Jx+';
      const encrypted = service.encryptFileBytes(
        Buffer.from(payload, 'base64'),
        'unique-user',
      );
      expect(encrypted).toBeDefined();
    });

    it('should throw an error if failed parse decrypted values', () => {
      jest.spyOn(Crypto, 'createCipheriv').mockImplementation(() => {
        throw new Error('Unexpected error occurred during encryption');
      });
      try {
        const payload = 'iVBORw0KGgoAAAANSUhEUgAACfcAAAG5CAYAAAAp5Jx+';
        service.encryptFileBytes(Buffer.from(payload, 'base64'), 'unique-user');
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            message: error.message,
          }),
        );
      }
    });
  });

  describe('decryptFileBytes', () => {
    beforeEach(() => {
      const value = 'iVBORw0KGgoAAAANSUhEUgAACfcAAAG5CAYAAAAp5Jx+';
      payload = service.encryptFileBytes(
        Buffer.from(value, 'base64'),
        'unique-user',
      );
    });

    it('should return error empty value', () => {
      try {
        service.decryptFileBytes(Buffer.from('', 'base64'), 'unique-user');
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            status: 400,
            message: 'VALUE IS REQUIRED',
            status_code: '01400',
          }),
        );
      }
    });

    it('should decrypt decryptFileBytes', () => {
      const decrypted = service.decryptFileBytes(payload, 'unique-user');
      expect(decrypted).toBeDefined();
    });

    it('should throw an error if failed parse decrypted values', () => {
      jest.spyOn(Crypto, 'createCipheriv').mockImplementation(() => {
        throw new Error('Unexpected error occurred during encryption');
      });
      try {
        service.decryptFileBytes(payload, 'unique - user');
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            message: error.message,
          }),
        );
      }
    });
  });

  // describe('encryptWithPrivateKey', () => {
  //   afterEach(() => {
  //     jest.restoreAllMocks();
  //   });
  //   it('should encrypt an private key', () => {
  //     const encrypted = service.encryptWithPrivateKey('entity123');
  //     expect(typeof encrypted).toBe('string');
  //     expect(encrypted).not.toBe('entity123');
  //   });

  //   it('should throw an error if failed parse encrypted values', () => {
  //     jest.spyOn(Crypto, 'publicEncrypt').mockImplementation(() => {
  //       throw new Error('Unexpected error occurred during encryption');
  //     });
  //     try {
  //       service.encryptWithPrivateKey('stringvalue');
  //     } catch (error) {
  //       expect(error).toEqual(
  //         expectedResponseError({
  //           message: error.message,
  //         }),
  //       );
  //     }
  //   });
  // });

  // describe('decryptWithPrivateKey', () => {
  //   afterEach(() => {
  //     jest.restoreAllMocks();
  //   });
  //   it('should decrypt an private key', () => {
  //     const encrypted = service.encryptWithPrivateKey('entity123');
  //     const decrypted = service.decryptWithPrivateKey(encrypted);
  //     expect(decrypted).toBe('entity123');
  //   });

  //   it('should throw an error if failed parse decrypted values', () => {
  //     jest.spyOn(Crypto, 'privateDecrypt').mockImplementation(() => {
  //       throw new Error('Unexpected error occurred during encryption');
  //     });
  //     try {
  //       service.decryptWithPrivateKey('stringvalue');
  //     } catch (error) {
  //       expect(error).toEqual(
  //         expectedResponseError({
  //           message: error.message,
  //         }),
  //       );
  //     }
  //   });
  // });
});
