import * as Path from 'path';
import Axios from 'axios';
import { ErrorEncryptionDto, TParamsCallApi } from 'src/common/dtos/dto';
import { Test, TestingModule } from '@nestjs/testing';
import { GeneralService } from './general.service';
import { FooterLayoutDto } from 'src/common/dtos/pages.dto';
import { LoggerServiceImplementation } from '../logger/logger.service';
import { TestSetupModule } from 'src/config/test-setup.module';
import { mockHeaders, mockLoggerService } from 'src/config/__test__/mock';

const PAGES_PATH = Path.join(__dirname, '../../../../assets/pages.json');
type TParamIsBlacklist = {
  start_date: string;
  end_date: string;
}[];
jest.mock('axios');
const mockedAxios = Axios as jest.Mocked<typeof Axios>;
describe('GeneralService', () => {
  let service: GeneralService;
  let payload: TParamsCallApi | TParamIsBlacklist;
  let base64: string = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...';
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
        status_desc: status_desc ?? 'Failed Decryption',
      },
    };
  };
  afterEach(() => {
    jest.restoreAllMocks(); // Reset semua spy/mocks
    jest.clearAllMocks(); // Bersihkan call history dll
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      providers: [
        GeneralService,
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<GeneralService>(GeneralService);
  });
  describe('Read From File', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });
    it('should return success without raw', async () => {
      const res = await service.readFromFile<FooterLayoutDto>(PAGES_PATH);
      expect(res).toBeDefined();
    });

    it('should return success with raw', async () => {
      const res = await service.readFromFile<FooterLayoutDto>(PAGES_PATH, true);
      expect(res).toBeDefined();
    });

    it('should return Error', async () => {
      try {
        await service.readFromFile('testString');
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            status: 500,
            message: error.message,
            status_code: '01500',
            status_desc: 'Internal Server Error',
          }),
        );
      }
    });
  });

  describe('callAPI', () => {
    beforeEach(() => {
      payload = {
        baseURL: 'https://indonesia.com',
        url: '/v2/charge',
        method: 'post',
        transactionid: mockHeaders.transactionid,
        payload: { test: 'a123' },
        provider: 'midtrans',
        serverKey: 'asdasdasdasd',
        headers: {
          Accept: 'application/json',
          Authorization: 'auth',
          'Content-Type': 'application/json',
        },
      };
      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue({ data: { success: true } }),
        put: jest.fn().mockResolvedValue({ data: { success: true } }),
        patch: jest.fn().mockResolvedValue({ data: { success: true } }),
        get: jest.fn().mockResolvedValue({ data: { success: true } }),
      } as unknown as typeof Axios);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });
    it('should return success with method POST', async () => {
      const res = await service.callAPI<FooterLayoutDto>(
        payload as TParamsCallApi,
      );
      expect(res).toBeDefined();
    });

    it('should return success with method GET', async () => {
      payload = {
        baseURL: 'https://indonesia.com',
        url: '/v2/charge',
        method: 'get',
        transactionid: mockHeaders.transactionid,
        payload: { test: 'a123' },
      };
      const res = await service.callAPI<FooterLayoutDto>(
        payload as TParamsCallApi,
      );
      expect(res).toBeDefined();
    });

    it('should return success with method PUT', async () => {
      payload = {
        ...payload,
        method: 'put',
      };
      const res = await service.callAPI<FooterLayoutDto>(
        payload as TParamsCallApi,
      );
      expect(res).toBeDefined();
    });

    it('should return success with method PATCH', async () => {
      payload = {
        ...payload,
        method: 'patch',
      };
      const res = await service.callAPI<FooterLayoutDto>(
        payload as TParamsCallApi,
      );
      expect(res).toBeDefined();
    });

    it('should return error provider midtrans with response method POST: status 401', async () => {
      mockedAxios.create.mockReturnValue({
        post: jest
          .fn()
          .mockRejectedValue({ response: { status: 401, data: {} } }),
      } as unknown as typeof Axios);
      try {
        await service.callAPI<FooterLayoutDto>(payload as TParamsCallApi);
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            status: 500,
            message: error.message,
            status_code: '01401',
            status_desc: 'Internal Server Error',
          }),
        );
      }
    });

    it('should return error provider midtrans with response method POST: status 400', async () => {
      mockedAxios.create.mockReturnValue({
        post: jest
          .fn()
          .mockRejectedValue({ response: { status: 400, data: {} } }),
      } as unknown as typeof Axios);
      try {
        await service.callAPI<FooterLayoutDto>(payload as TParamsCallApi);
      } catch (error) {
        expect(error).toEqual(
          expectedResponseError({
            status: 400,
            message: error.message,
            status_code: '01400',
            status_desc: 'Bad Request',
          }),
        );
      }
    });

    it('should return error provider midtrans without response method POST', async () => {
      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockRejectedValue(new Error('Axios Error')),
      } as unknown as typeof Axios);
      try {
        await service.callAPI<FooterLayoutDto>(payload as TParamsCallApi);
      } catch (error) {
        expect(error.message).toBe('Axios Error');
      }
    });
  });

  describe('isBlacklist', () => {
    beforeEach(() => {
      payload = [
        {
          start_date: '1735707499100',
          end_date: '1735837200000',
        },
      ];
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });
    it('should return success', async () => {
      const res = service.isBlacklist(payload as TParamIsBlacklist);
      expect(res).toBeDefined();
    });

    it('should return false', async () => {
      payload[0].start_date = 'isNaN';
      const res = service.isBlacklist(payload as TParamIsBlacklist);
      expect(res).toBe(false);
    });
  });

  describe('validateSqlInjection', () => {
    test('should not throw error for valid email inputs', () => {
      const validEmails = [
        { value: 'user@example.com' },
        { value: 'another_user@domain.co' },
        { value: 'user123@sub.domain.com' },
      ];
      expect(() => service.validateSqlInjection(validEmails)).not.toThrow();
    });

    test('should not throw error for non-injection inputs', () => {
      expect(() =>
        service.validateSqlInjection([
          { value: '123123', rules: ['isNumOfString'] },
          { value: 'http://example.com', rules: ['isUrl'] },
          { value: 'asd123', rules: ['isAlphanumeric'] },
          { value: 'ads@gmail.com', rules: ['isEmail'] },
          { value: 'ads', rules: ['isAlpha', 'isNotSpace', 'min:1', 'max:3'] },
        ]),
      ).not.toThrow();
    });

    test('should throw error invalid email format', () => {
      expect(() =>
        service.validateSqlInjection([
          { value: 'Hello world!', rules: ['isEmail'] },
        ]),
      ).toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Invalid email format'),
        }),
      );
    });

    test('should throw error invalid url format', () => {
      expect(() =>
        service.validateSqlInjection([{ value: 'Hello', rules: ['isUrl'] }]),
      ).toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Invalid URL format: Hello'),
        }),
      );
    });

    test('should throw error invalid Num Of String format', () => {
      expect(() =>
        service.validateSqlInjection([
          { value: '$', rules: ['isNumOfString'] },
        ]),
      ).toThrow(
        expect.objectContaining({
          message: expect.stringContaining(
            'Value must only contain numbers: $',
          ),
        }),
      );
    });

    test('should throw error invalid alpha numeric format', () => {
      expect(() =>
        service.validateSqlInjection([
          { value: '#', rules: ['isAlphanumeric'] },
        ]),
      ).toThrow(
        expect.objectContaining({
          message: expect.stringContaining(
            'Value must only contain letters and numbers: #',
          ),
        }),
      );
    });

    test('should throw error invalid alpha format', () => {
      expect(() =>
        service.validateSqlInjection([{ value: '#', rules: ['isAlpha'] }]),
      ).toThrow(
        expect.objectContaining({
          message: expect.stringContaining(
            'Value must only contain letters: #',
          ),
        }),
      );
    });

    test('should throw error invalid NotSpace format', () => {
      expect(() =>
        service.validateSqlInjection([
          { value: 'ad asd', rules: ['isNotSpace'] },
        ]),
      ).toThrow(
        expect.objectContaining({
          message: expect.stringContaining(
            'Value must not contain spaces: ad asd',
          ),
        }),
      );
    });

    test('should throw error invalid min format', () => {
      expect(() =>
        service.validateSqlInjection([{ value: 'ad', rules: ['min:10'] }]),
      ).toThrow(
        expect.objectContaining({
          message: expect.stringContaining(
            'Value must be at least 10 characters long: ad',
          ),
        }),
      );
    });

    test('should throw error invalid max format', () => {
      expect(() =>
        service.validateSqlInjection([{ value: 'ad3', rules: ['max:2'] }]),
      ).toThrow(
        expect.objectContaining({
          message: expect.stringContaining(
            'Value must be at most 2 characters long: ad3',
          ),
        }),
      );
    });

    // Test SQL injection patterns
    test('should throw error for SQL injection with UNION SELECT', () => {
      const inputs = [
        { value: 'SELECT * FROM users UNION SELECT username, password' },
      ];
      expect(() => service.validateSqlInjection(inputs)).toThrow(
        expect.objectContaining({
          message: expect.stringContaining('SQL injection detected in input'),
        }),
      );
    });

    test('should throw error for SQL injection with DROP TABLE', () => {
      const inputs = [{ value: 'DROP TABLE users' }];
      expect(() => service.validateSqlInjection(inputs)).toThrow(
        expect.objectContaining({
          message: expect.stringContaining('SQL injection detected in input'),
        }),
      );
    });

    test('should throw error for SQL injection with INSERT INTO', () => {
      const inputs = [
        {
          value:
            'INSERT INTO users (name, email) VALUES ("John", "john@example.com")',
        },
      ];
      expect(() => service.validateSqlInjection(inputs)).toThrow(
        expect.objectContaining({
          message: expect.stringContaining('SQL injection detected in input'),
        }),
      );
    });

    test('should throw error for SQL injection with SQL comment', () => {
      const inputs = [{ value: 'SELECT * FROM users -- comment' }];
      expect(() => service.validateSqlInjection(inputs)).toThrow(
        expect.objectContaining({
          message: expect.stringContaining('SQL injection detected in input'),
        }),
      );
    });

    test('should throw error for SQL injection with semicolon', () => {
      const inputs = [{ value: 'SELECT * FROM users; DROP TABLE users;' }];
      expect(() => service.validateSqlInjection(inputs)).toThrow(
        expect.objectContaining({
          message: expect.stringContaining('SQL injection detected in input'),
        }),
      );
    });

    test('should throw error for SQL injection with EXEC command', () => {
      const inputs = [{ value: 'EXEC xp_cmdshell "dir"' }];
      expect(() => service.validateSqlInjection(inputs)).toThrow(
        expect.objectContaining({
          message: expect.stringContaining('SQL injection detected in input'),
        }),
      );
    });

    test('should throw error for SQL injection with wildcard "*"', () => {
      const inputs = [{ value: 'SELECT * FROM users' }];
      expect(() => service.validateSqlInjection(inputs)).toThrow(
        expect.objectContaining({
          message: expect.stringContaining('SQL injection detected in input'),
        }),
      );
    });

    test('should throw error for SQL injection with AND/OR statement', () => {
      const inputs = [
        { value: 'SELECT * FROM users WHERE username = "admin" AND 1=1' },
      ];
      expect(() => service.validateSqlInjection(inputs)).toThrow(
        expect.objectContaining({
          message: expect.stringContaining('SQL injection detected in input'),
        }),
      );
    });
  });

  describe('Validate Image Base64', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });
    test('should pass for valid PNG image within size limit', async () => {
      await expect(
        service.validateImageBase64({
          maxSizeKB: 5120,
          base64,
        }),
      ).resolves.not.toThrow();
    });

    test('should pass for valid JPEG image within size limit', async () => {
      base64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...';
      await expect(
        service.validateImageBase64({
          maxSizeKB: 5120,
          base64,
        }),
      ).resolves.not.toThrow();
    });

    test('should fail for invalid format', async () => {
      base64 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBA...';
      await expect(
        service.validateImageBase64({ maxSizeKB: 5120, base64 }),
      ).rejects.toMatchObject({
        isHelperFail: true,
        message: 'Format Base64 tidak valid atau tidak ada prefix data:image.',
      });
    });

    test('should fail for unsupported format', async () => {
      base64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...';
      await expect(
        service.validateImageBase64({
          maxSizeKB: 5120,
          base64,
          allowedFormats: ['jpeg'],
        }),
      ).rejects.toMatchObject({
        isHelperFail: true,
        message: expect.stringContaining('Format gambar tidak diizinkan.'),
      });
    });

    test('should fail for image exceeding size limit', async () => {
      base64 = 'data:image/png;base64,' + 'A'.repeat(6 * 1024 * 1024);
      await expect(
        service.validateImageBase64({ maxSizeKB: 520, base64 }),
      ).rejects.toMatchObject({
        isHelperFail: true,
      });
    });

    test('should fail for invalid base64 format', async () => {
      await expect(
        service.validateImageBase64({
          maxSizeKB: 5120,
          base64: 'invalid_base64',
        }),
      ).rejects.toMatchObject({
        isHelperFail: true,
        message: expect.stringContaining('Format Base64 tidak valid'),
      });
    });
  });

  describe('Validate File', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });
    const mockFile = (sizeKB: number, mimetype: string): Express.Multer.File =>
      ({
        originalname: 'test.jpg',
        mimetype,
        size: sizeKB * 1024, // Convert to bytes
      }) as Express.Multer.File;
    it('should pass when file is valid', () => {
      const file = mockFile(100, 'image/jpeg');
      const allowedFormats = ['image/jpeg', 'image/png'];

      expect(() =>
        service.validateFile({
          file,
          maxSizeKB: 500,
          allowedFormats,
        }),
      ).not.toThrow();
    });

    it('should throw error when file size is too large', () => {
      const file = mockFile(600, 'image/jpeg');
      const allowedFormats = ['image/jpeg', 'image/png'];

      try {
        service.validateFile({
          file,
          maxSizeKB: 500,
          allowedFormats,
        });
      } catch (error) {
        expect(error).toEqual({
          isHelperFail: true,
          message: 'File test.jpg is too large. Max size is 500KB.',
          data: {
            status: 400,
            status_code: '00400',
            status_desc: 'Bad Request',
          },
        });
      }
    });
    it('should throw error when file format is not allowed', () => {
      const file = mockFile(100, 'application/pdf');
      const allowedFormats = ['image/jpeg', 'image/png'];

      try {
        service.validateFile({
          file,
          maxSizeKB: 500,
          allowedFormats,
        });
      } catch (error) {
        expect(error).toEqual({
          isHelperFail: true,
          message:
            'File test.jpg has an invalid format. Allowed formats: image/jpeg,image/png',
          data: {
            status: 400,
            status_code: '00400',
            status_desc: 'Bad Request',
          },
        });
      }
    });
  });
});
