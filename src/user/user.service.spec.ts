import * as Path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { TestSetupModule } from 'src/config/test-setup.module';
import { EncryptionService } from 'src/common/helpers/encryption/encryption.service';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import {
  mockDbService,
  mockHeaders,
  mockLoggerService,
} from 'src/config/__test__/mock';
import { AuthRequest } from 'src/common/dtos/dto';
import { UpdateToSellerDto, UploadIdentityDto } from './user.dto';
import { CustomHttpException } from 'src/common/helpers/lib/exception';
import { DbService } from 'src/database/mysql/mysql.service';
import { GeneralService } from 'src/common/helpers/general/general.service';
import { ResponseQueryUserProfile } from 'src/config/__test__/response/response';
const PAGES_PATH = Path.join(__dirname, '../../assets/pages.json');
describe('UserService', () => {
  let service: UserService;
  let request: AuthRequest;
  let payload: UploadIdentityDto | UpdateToSellerDto;
  let encryptionService: EncryptionService;
  let generalService: GeneralService;
  let mockResponseQueryUserProfile = ResponseQueryUserProfile;

  const MockQueryUser = [{ email: 'xample@gmail.com' }];
  let mockQueryUser = MockQueryUser;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      providers: [
        UserService,
        EncryptionService,
        GeneralService,
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
        { provide: DbService, useValue: mockDbService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
    generalService = module.get<GeneralService>(GeneralService);
  });
  afterEach(() => {
    jest.restoreAllMocks(); // Reset semua spy/mocks
    jest.clearAllMocks(); // Bersihkan call history dll
  });

  describe('Upload identity', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'USER' },
      } as AuthRequest;
      payload = {
        identityType: 'ktp',
        image:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAACfcAAAG5CAYAAAAp5Jx',
        nik: '3326160608070197',
      };
    });
    it('Should return success upload user identity', async () => {
      process.env.MAX_SIZE_KTP_IN_MB = '';
      mockDbService.executeInTransaction.mockImplementation((trxid, cb) => {
        return cb(
          mockDbService.executeRawQuery.mockImplementation((params) => {
            if (params.logName === 'INSERT USER IDENTITY') return [];
            if (params.logName === 'UPDATE USER VERIFIED') return [];
          }),
        );
      });
      const response = await service.uploadIdentity(
        request,
        payload as UploadIdentityDto,
        mockHeaders,
      );
      expect(response).toEqual({});
    });

    it('Should return error upload user identity : Invalid format image', async () => {
      payload = {
        ...payload,
        image:
          'data:image/pdf;base64,iVBORw0KGgoAAAANSUhEUgAACfcAAAG5CAYAAAAp5Jx',
      };
      const res = (await service.uploadIdentity(
        request,
        payload as UploadIdentityDto,
        mockHeaders,
      )) as CustomHttpException;
      expect(res.getStatus()).toBe(400);
    });

    it('Should return error upload user identity : Invalid size image', async () => {
      process.env.MAX_SIZE_KTP_IN_MB = '0';
      const res = (await service.uploadIdentity(
        request,
        payload as UploadIdentityDto,
        mockHeaders,
      )) as CustomHttpException;
      expect(res.getStatus()).toBe(400);
      process.env.MAX_SIZE_KTP_IN_MB = '5';
    });

    it('Should return error upload user identity : Invalid NIK', async () => {
      payload = {
        ...payload,
        nik: '3326',
      };
      const res = (await service.uploadIdentity(
        request,
        payload as UploadIdentityDto,
        mockHeaders,
      )) as CustomHttpException;
      expect(res.getStatus()).toBe(400);
    });

    it('Should return error upload user identity', async () => {
      mockDbService.executeInTransaction.mockRejectedValue(
        new Error('Created error'),
      );
      try {
        await service.uploadIdentity(
          request,
          payload as UploadIdentityDto,
          mockHeaders,
        );
      } catch (error) {
        expect(error.message).toBe('Created error');
      }
    });

    it('Should return error upload user identity : BYPASS ERROR', async () => {
      mockDbService.executeInTransaction.mockRejectedValue({
        code: 'ER_DUP_ENTRY',
        errno: 1062,
      });

      const res = (await service.uploadIdentity(
        request,
        payload as UploadIdentityDto,
        mockHeaders,
      )) as CustomHttpException;
      expect(res.getStatus()).toBe(400);
      expect(res.message).toBe('This identifier already used');
    });
  });
  describe('GET profile', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'USER' },
      } as AuthRequest;
      mockDbService.executeRawQuery.mockResolvedValue(
        mockResponseQueryUserProfile,
      );
    });
    it('Should return success', async () => {
      const response = await service.getUserProfile(request, mockHeaders);
      expect(response).toBeDefined();
    });

    it('Should return success: with phone number', async () => {
      mockResponseQueryUserProfile = mockResponseQueryUserProfile.map(
        (res) => ({
          ...res,
          phone_number: '1231231231',
        }),
      );
      mockDbService.executeRawQuery.mockResolvedValue(
        mockResponseQueryUserProfile,
      );
      const response = await service.getUserProfile(request, mockHeaders);
      expect(response).toBeDefined();
      mockResponseQueryUserProfile = ResponseQueryUserProfile;
    });

    it('Should return 400 : empty', async () => {
      mockDbService.executeRawQuery.mockResolvedValue(null);
      const response = (await service.getUserProfile(
        request,
        mockHeaders,
      )) as CustomHttpException;
      expect(response.getStatus()).toBe(400);
      expect(response.message).toBe('Bad Request');
    });

    it('Should return error', async () => {
      mockDbService.executeRawQuery.mockRejectedValue(
        new Error('finding error'),
      );
      try {
        await service.getUserProfile(request, mockHeaders);
      } catch (error) {
        expect(error.message).toBe('finding error');
      }
    });
  });

  describe('GET identity', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'USER' },
      } as AuthRequest;
    });
    it('Should return success get user identity', async () => {
      mockDbService.executeRawQuery.mockResolvedValue([
        {
          image: encryptionService.encryptFileBytes(
            Buffer.from('test', 'base64'),
            'unique-user-id',
          ),
          format_base64: 'data:image/png;base64,',
        },
      ]);
      const response = await service.getUserIdentity(request, mockHeaders);
      expect(response).toBeDefined();
    });

    it('Should return success get user identity: empty', async () => {
      mockDbService.executeRawQuery.mockResolvedValue(null);
      const response = (await service.getUserIdentity(
        request,
        mockHeaders,
      )) as CustomHttpException;
      expect(response.getStatus()).toBe(400);
      expect(response.message).toBe('Bad Request');
    });

    it('Should return error get user identity', async () => {
      mockDbService.executeRawQuery.mockRejectedValue(
        new Error('finding error'),
      );
      try {
        await service.getUserIdentity(request, mockHeaders);
      } catch (error) {
        expect(error.message).toBe('finding error');
      }
    });

    it('Should return error get user identity : BYPASS ERROR', async () => {
      mockDbService.executeRawQuery.mockRejectedValue({
        code: 'P2002',
        message: 'not defind',
      });
      try {
        await service.getUserIdentity(request, mockHeaders);
      } catch (error) {
        expect(error.message).toBe('not defind');
      }
    });
  });

  describe('UPDATE User To Seller', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'USER' },
      } as AuthRequest;
      payload = {
        name: 'testing seller name',
        bio: 'testing',
      };

      mockDbService.executeInTransaction.mockImplementation((trxid, cb) => {
        return cb(
          mockDbService.executeRawQuery.mockImplementation((params) => {
            if (params.logName === 'GET USER UPDATE TO SELLER')
              return mockQueryUser;
            if (params.logName === 'UPDATE USER ROLE') return [];
          }),
        );
      });
    });
    it('Should return success', async () => {
      const response = await service.updateToSeller(
        request,
        mockHeaders,
        payload as UpdateToSellerDto,
      );
      expect(response).toEqual(undefined);
    });

    it('Should return Bad Request: user notfound', async () => {
      mockQueryUser = [];
      const response = (await service.updateToSeller(
        request,
        mockHeaders,
        payload as UpdateToSellerDto,
      )) as CustomHttpException;
      expect(response.getStatus()).toBe(400);
      mockQueryUser = MockQueryUser;
    });

    it('Should return error', async () => {
      mockDbService.executeInTransaction.mockRejectedValue(
        new Error('Internal server error'),
      );
      try {
        await service.updateToSeller(
          request,
          mockHeaders,
          payload as UpdateToSellerDto,
        );
      } catch (error) {
        expect(error.message).toBe('Internal server error');
      }
    });
  });

  describe('getMenuList', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'USER' },
      } as AuthRequest;
    });

    it('should return success : Role USER', async () => {
      await generalService.readFromFile(PAGES_PATH);
      const result = await service.getMenuList(request, mockHeaders);
      expect(result).toBeDefined();
    });

    it('should return success : Role SELLER', async () => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'SELLER' },
      } as AuthRequest;
      await generalService.readFromFile(PAGES_PATH);
      const result = await service.getMenuList(request, mockHeaders);
      expect(result).toBeDefined();
    });

    it('should return success : Role ADMIN', async () => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'ADMIN' },
      } as AuthRequest;
      await generalService.readFromFile(PAGES_PATH);
      const result = await service.getMenuList(request, mockHeaders);
      expect(result).toBeDefined();
    });

    it('should return Error', async () => {
      jest
        .spyOn(generalService, 'readFromFile')
        .mockRejectedValue(new Error('error reading file'));
      try {
        await service.getMenuList(request, mockHeaders);
      } catch (error) {
        expect(error.message).toBe('error reading file');
      }
    });
  });
});
