import * as Moment from 'moment';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { TestSetupModule } from 'src/config/test-setup.module';
import { EncryptionService } from 'src/common/helpers/encryption/encryption.service';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import {
  mockDbService,
  mockHeaders,
  mockLoggerService,
  mockRabbitMQService,
  mockRedisService,
} from 'src/config/__test__/mock';
import { AuthRequest } from 'src/common/dtos/dto';
import {
  CreateUpdateBannerDto,
  CreateDestinationCategoryDto,
  CreateVoucherDto,
  DetailBannerDto,
  GetActiveVoucherDto,
  GetDefaultImageDto,
} from './admin.dto';
import { DbService } from 'src/database/mysql/mysql.service';
import { GeneralService } from 'src/common/helpers/general/general.service';
import { RabbitmqService } from 'src/common/providers/rabbitmq/rabbitmq.service';
import { RedisService } from 'src/database/redis/redis.service';
import {
  ResponseQueryActiveVouchers,
  ResponseQueryDetailBanner,
  ResponseQueryGetBanners,
} from 'src/config/__test__/response/response';
import { CustomHttpException } from 'src/common/helpers/lib/exception';

describe('AdminService', () => {
  let service: AdminService;
  let request: AuthRequest;
  let payload:
    | CreateDestinationCategoryDto
    | CreateVoucherDto
    | CreateUpdateBannerDto
    | DetailBannerDto
    | GetActiveVoucherDto
    | GetDefaultImageDto;
  let generalService: GeneralService;
  let mockResponseQueryGetBanners = ResponseQueryGetBanners;
  let mockResponseQueryGetDetailBanner = ResponseQueryDetailBanner;
  let mockResponseQueryActiveVouchers = ResponseQueryActiveVouchers;
  let mockResponseQueryGetVoucher = [];
  let mockResponseTTL = 100;
  const validUnixCurrent = Moment().valueOf();
  const validUnixTomorow = Moment().add(1, 'days').valueOf();
  // let encryptionService: EncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      providers: [
        AdminService,
        EncryptionService,
        GeneralService,
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
        { provide: DbService, useValue: mockDbService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: RabbitmqService, useValue: mockRabbitMQService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    generalService = module.get<GeneralService>(GeneralService);
  });

  describe('createDestinationCaegory', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'ADMIN' },
      } as AuthRequest;
      payload = {
        name: 'Hiking',
        description:
          'A category that includes hiking trails, mountain adventures, and trekking spots from around the world.',
        code: 'HKNG-001',
        imageId: 'iVBORw0KGgoAAAANSUhEUgAACfcAAAG5CAYAAAAp5Jx',
        isActive: true,
      };

      mockDbService.executeInTransaction.mockImplementation((trxid, cb) => {
        return cb(
          mockDbService.executeRawQuery.mockImplementation(({ logName }) => {
            if (logName === 'CREATE DESTINATION CATEGORY') return [];
          }),
          mockRabbitMQService.sendToQueue.mockResolvedValue('success'),
        );
      });
    });
    it('Should return success : image exist', async () => {
      await service.createDestinationCaegory(
        request,
        payload as CreateDestinationCategoryDto,
        mockHeaders,
      );
    });

    it('Should return error : category already exist', async () => {
      mockDbService.executeInTransaction.mockRejectedValue({
        code: 'ER_DUP_ENTRY',
        errno: 1062,
      });

      const res = (await service.createDestinationCaegory(
        request,
        payload as CreateDestinationCategoryDto,
        mockHeaders,
      )) as CustomHttpException;
      expect(res.getStatus()).toBe(400);
    });
    it('Should return error sql injection', async () => {
      payload = {
        ...payload,
        code: '@---',
      } as CreateDestinationCategoryDto;
      try {
        await service.createDestinationCaegory(
          request,
          payload as CreateDestinationCategoryDto,
          mockHeaders,
        );
      } catch (error) {
        expect(error.isHelperFail).toBeTruthy();
        expect(error.message).toBe(
          `SQL injection detected in input: ${payload.code}`,
        );
      }
    });

    it('Should return error DB', async () => {
      mockDbService.executeInTransaction.mockRejectedValue(
        new Error('Error syntax'),
      );
      try {
        await service.createDestinationCaegory(
          request,
          payload as CreateDestinationCategoryDto,
          mockHeaders,
        );
      } catch (error) {
        expect(error.message).toBe('Error syntax');
      }
    });
  });

  describe('createVoucher', () => {
    beforeEach(() => {
      request = {
        auth: {
          id: 'unique-user-id',
          exp: 123,
          iat: 123,
          role: process.env.ROLE_ADMIN,
        },
      } as AuthRequest;
      payload = {
        imageId: 'iVBORw0KGgoAAAANSUhEUgAACfcAAAG5CAYAAAAp5Jx',
        name: 'Diskon 50%',
        code: 'DISKON50',
        description: 'Voucher diskon 50% untuk semua produk.',
        value: 50,
        type: 'discount',
        usingType: 'disposable',
        startDate: '1738123270000',
        endDate: '1895889670000',
        isActive: true,
        valueType: 'percentage',
      } as CreateVoucherDto;
      mockDbService.executeInTransaction.mockImplementation(
        async (trxid, cb) => {
          cb(
            mockDbService.executeRawQuery.mockImplementation((params) => {
              if (params.logName === 'GET VOUCHER')
                return mockResponseQueryGetVoucher;
              if (params.logName === 'CREATE VOUCHER') return [];
            }),
          );
        },
      );
    });
    it('Should return success: admin', async () => {
      await service.createVoucher(
        request,
        payload as CreateVoucherDto,
        mockHeaders,
      );
    });

    it('Should return error 400: merchant', async () => {
      process.env.ROLE_SELLER = 'qwe';
      mockResponseQueryGetVoucher = [{ code: 'asdasd' }];
      request = {
        auth: {
          id: 'unique-user-id',
          exp: 123,
          iat: 123,
          role: process.env.ROLE_SELLER,
        },
      } as AuthRequest;
      await service.createVoucher(
        request,
        payload as CreateVoucherDto,
        mockHeaders,
      );
    });

    it('Should return error sql injection', async () => {
      payload = {
        ...payload,
        code: '@---',
      } as CreateVoucherDto;
      try {
        await service.createVoucher(
          request,
          payload as CreateVoucherDto,
          mockHeaders,
        );
      } catch (error) {
        expect(error.isHelperFail).toBeTruthy();
      }
    });

    it('Should return error DB', async () => {
      mockDbService.executeInTransaction.mockRejectedValue(
        new Error('Error syntax'),
      );
      try {
        await service.createVoucher(
          request,
          payload as CreateVoucherDto,
          mockHeaders,
        );
      } catch (error) {
        expect(error.message).toBe('Error syntax');
      }
    });
  });

  describe('getDestinationCaegories', () => {
    beforeEach(() => {});
    it('Should return success', async () => {
      mockDbService.executeRawQuery.mockResolvedValue([
        { id: 'string', name: 'string', created_at: '2025-01-29 10:43:01.534' },
      ]);
      await service.getDestinationCaegories(mockHeaders);
    });

    it('Should return error DB', async () => {
      mockDbService.executeRawQuery.mockRejectedValue(
        new Error('Error syntax'),
      );
      try {
        await service.getDestinationCaegories(mockHeaders);
      } catch (error) {
        expect(error.message).toBe('Error syntax');
      }
    });
  });

  describe('getVoucher', () => {
    beforeEach(() => {
      request = {
        auth: {
          id: 'unique-user-id',
          exp: 123,
          iat: 123,
          role: process.env.ROLE_USER,
        },
      } as AuthRequest;
      payload = {
        spendPrice: '20000',
      } as GetActiveVoucherDto;
      mockDbService.executeRawQuery.mockImplementation(({ logName }) => {
        if (logName === 'GET ACTIVE VOUCHER') {
          return mockResponseQueryActiveVouchers;
        }
      });
    });

    it('Should return success', async () => {
      const res = await service.getVoucher(
        request,
        mockHeaders,
        payload as GetActiveVoucherDto,
      );
      expect(res).toBeDefined();
      expect(res).toHaveLength(5);
    });

    it('Should fallback to first dominant voucher when no price type found', async () => {
      mockResponseQueryActiveVouchers = [
        {
          code: 'DISKON10',
          name: 'Diskon 10%',
          value: 10,
          using_type: 'disposable',
          image_url: 'url',
          image_text: 'text',
          type: 'discount',
          value_type: 'percentage', // Not 'price'
          start_date: '17000988222',
          end_date: '17000988222',
          min_spend: null,
          source: 'mia',
        },
        {
          code: 'DISKON20',
          name: 'Diskon 20%',
          value: 20,
          using_type: 'disposable',
          image_url: 'url',
          image_text: 'text',
          type: 'discount',
          value_type: 'percentage', // Still not 'price'
          start_date: '17000988222',
          end_date: '17000988222',
          min_spend: null,
          source: 'mia',
        },
      ];

      const res = await service.getVoucher(
        request,
        mockHeaders,
        payload as GetActiveVoucherDto,
      );

      expect(res).toHaveLength(2);

      const recommended = res.find((v) => v.is_recommended === true);
      expect(recommended).toBeDefined();
      expect(recommended?.code).toBe('DISKON10');
    });

    it('Should return success', async () => {
      payload = { spendPrice: '' };
      mockResponseQueryActiveVouchers = [];
      const res = await service.getVoucher(
        request,
        mockHeaders,
        payload as GetActiveVoucherDto,
      );
      expect(res).toEqual([]);
      mockResponseQueryActiveVouchers = ResponseQueryActiveVouchers;
    });

    it('Should return error DB', async () => {
      mockDbService.executeRawQuery.mockRejectedValue(
        new Error('Error syntax'),
      );
      try {
        await service.getVoucher(
          request,
          mockHeaders,
          payload as GetActiveVoucherDto,
        );
      } catch (error) {
        expect(error.message).toBe('Error syntax');
      }
    });
  });

  describe('createBanner', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'ADMIN' },
        url: '/admin/create/banner',
        method: 'post',
      } as AuthRequest;
      payload = {
        title: 'Promo Akhir Tahun with date',
        description: 'Diskon hingga 50% untuk produk-produk terpilih.',
        priority: 1,
        imageUrl: 'https://example.com/images/promo2025.jpg',
        imageText: 'admin/98127ajshd-asdaskd-asdkljkjh',
        type: 'PROMO',
        position: 'TOP',
        startActive: validUnixCurrent.toString(),
        endActive: validUnixTomorow.toString(),
        isActive: true,
      } as CreateUpdateBannerDto;

      mockDbService.executeInTransaction.mockImplementation((trxid, cb) => {
        return cb(
          mockRedisService.getData.mockResolvedValue(
            mockResponseQueryGetBanners,
          ),
          mockDbService.executeRawQuery.mockImplementation((params) => {
            if (params.logName === 'INSERT BANNER') return [];
          }),
          mockRedisService.setDataWithTTL.mockResolvedValue('success'),
        );
      });
    });

    it('Should return success', async () => {
      await service.createUpdateBanner(
        request,
        payload as CreateUpdateBannerDto,
        mockHeaders,
      );
    });

    it('Should return success : without date', async () => {
      payload = {
        ...payload,
        startActive: null,
      } as CreateUpdateBannerDto;
      await service.createUpdateBanner(
        request,
        payload as CreateUpdateBannerDto,
        mockHeaders,
      );
    });

    it('Should return success', async () => {
      payload = {
        ...payload,
        startActive: validUnixTomorow.toString(),
        priority: 100,
      } as CreateUpdateBannerDto;

      mockResponseQueryGetBanners = ResponseQueryGetBanners.map((item, i) => ({
        ...item,
        priority: i + 1,
      }));
      await service.createUpdateBanner(
        request,
        payload as CreateUpdateBannerDto,
        mockHeaders,
      );
      mockResponseQueryGetBanners = ResponseQueryGetBanners;
    });

    it('Should return error DB', async () => {
      mockDbService.executeInTransaction.mockRejectedValue(
        new Error('Error syntax'),
      );
      try {
        await service.createUpdateBanner(
          request,
          payload as CreateUpdateBannerDto,
          mockHeaders,
        );
      } catch (error) {
        expect(error.message).toBe('Error syntax');
      }
    });
  });

  describe('updateBanner', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'ADMIN' },
        url: '/admin/update/banner',
        method: 'put',
      } as AuthRequest;
      payload = {
        bannerId: '1eff0e85-fd3f-6520-b2bc-83c1cffebd86',
        title: 'Promo Akhir Tahun with date',
        description: 'Diskon hingga 50% untuk produk-produk terpilih.',
        priority: 1,
        imageUrl: 'https://example.com/images/promo2025.jpg',
        imageText: 'admin/98127ajshd-asdaskd-asdkljkjh',
        type: 'PROMO',
        position: 'TOP',
        startActive: validUnixCurrent.toString(),
        endActive: validUnixTomorow.toString(),
        isActive: true,
      } as CreateUpdateBannerDto;

      mockDbService.executeInTransaction.mockImplementation((trxid, cb) => {
        return cb(
          mockRedisService.getData.mockResolvedValue(
            mockResponseQueryGetBanners,
          ),
          mockRedisService.getTTL.mockResolvedValue(mockResponseTTL),
          mockDbService.executeRawQuery.mockImplementation((params) => {
            if (params.logName === 'INSERT BANNER') return [];
            if (params.logName === 'UPDATE BANNER') return [];
          }),
          mockRedisService.setDataWithTTL.mockResolvedValue('success'),
        );
      });
    });

    it('Should return success', async () => {
      await service.createUpdateBanner(
        request,
        payload as CreateUpdateBannerDto,
        mockHeaders,
      );
    });

    it('Should return success', async () => {
      mockResponseTTL = 0;
      payload = {
        ...payload,
        priority: 100,
      } as CreateUpdateBannerDto;

      mockResponseQueryGetBanners = ResponseQueryGetBanners.map((item, i) => ({
        ...item,
        priority: i + 1,
      }));
      await service.createUpdateBanner(
        request,
        payload as CreateUpdateBannerDto,
        mockHeaders,
      );
      mockResponseQueryGetBanners = ResponseQueryGetBanners;
      mockResponseTTL = 100;
    });

    it('Should return error 400: bannerId notfound', async () => {
      payload = {
        ...payload,
        bannerId: null,
      } as CreateUpdateBannerDto;

      const res = (await service.createUpdateBanner(
        request,
        payload as CreateUpdateBannerDto,
        mockHeaders,
      )) as CustomHttpException;
      expect(res.getStatus()).toBe(400);
    });

    it('Should return error DB', async () => {
      mockDbService.executeInTransaction.mockRejectedValue(
        new Error('Error syntax'),
      );
      try {
        await service.createUpdateBanner(
          request,
          payload as CreateUpdateBannerDto,
          mockHeaders,
        );
      } catch (error) {
        expect(error.message).toBe('Error syntax');
      }
    });
  });

  describe('getDetailBanner', () => {
    beforeEach(() => {
      payload = {
        bannerId: '1eff1bec-517d-6b50-be0e-4fe07fc4851c',
      } as DetailBannerDto;

      mockDbService.executeRawQuery.mockImplementation(({ logName }) => {
        if (logName === 'GET DETAIL BANNER')
          return mockResponseQueryGetDetailBanner;
      });
    });

    it('Should return success', async () => {
      const res = await service.getDetailBanner(
        mockHeaders,
        payload as DetailBannerDto,
      );
      expect(res).toBeDefined();
    });

    it('Should return 404', async () => {
      mockResponseQueryGetDetailBanner = [];
      const res = (await service.getDetailBanner(
        mockHeaders,
        payload as DetailBannerDto,
      )) as CustomHttpException;
      expect(res.getStatus()).toBe(404);
      mockResponseQueryGetDetailBanner = ResponseQueryDetailBanner;
    });

    it('Should return error DB', async () => {
      mockDbService.executeRawQuery.mockRejectedValue(
        new Error('Error syntax'),
      );
      try {
        await service.getDetailBanner(mockHeaders, payload as DetailBannerDto);
      } catch (error) {
        expect(error.message).toBe('Error syntax');
      }
    });
  });

  describe('getDefaultImage', () => {
    beforeEach(() => {
      payload = {
        type: 'image_default_voucher',
      } as GetDefaultImageDto;
    });

    it('Should return images that match platform and categories', async () => {
      const mockData = {
        image_default_voucher: [
          {
            id: 'img-1',
            image_url: 'url-1',
            image_text: 'text-1',
            platform: ['WEB'],
            categories: ['WEB'],
            enable: true,
            is_new: false,
            is_default: false,
          },
        ],
      };

      jest.spyOn(generalService, 'readFromFile').mockResolvedValue(mockData);

      const res = await service.getDefaultImage(
        mockHeaders,
        payload as GetDefaultImageDto,
      );

      expect(res).toEqual([
        {
          id: 'img-1',
          image_url: 'url-1',
          image_text: 'text-1',
          is_new: false,
          is_default: false,
        },
      ]);
    });

    it('Should fallback to default image if no match found', async () => {
      const mockData = {
        image_default_voucher: [
          {
            id: 'img-default',
            image_url: 'url-default',
            image_text: 'text-default',
            platform: ['ANDROID'],
            categories: ['ANDROID'],
            enable: true,
            is_new: true,
            is_default: true,
          },
        ],
      };

      jest.spyOn(generalService, 'readFromFile').mockResolvedValue(mockData);

      const res = await service.getDefaultImage(
        mockHeaders,
        payload as GetDefaultImageDto,
      );

      expect(res).toEqual([
        {
          id: 'img-default',
          image_url: 'url-default',
          image_text: 'text-default',
          is_new: true,
          is_default: true,
        },
      ]);
    });

    it('Should return error', async () => {
      jest
        .spyOn(generalService, 'readFromFile')
        .mockRejectedValue(new Error('error reading file'));

      await expect(
        service.getDefaultImage(mockHeaders, payload as GetDefaultImageDto),
      ).rejects.toThrow('error reading file');
    });
  });
});
