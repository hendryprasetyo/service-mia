import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { TestSetupModule } from 'src/config/test-setup.module';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { mockHeaders, mockLoggerService } from 'src/config/__test__/mock';
import { AuthGuard } from 'src/authentication/authentication.guard';
import { RolesGuard } from 'src/authentication/role.guard';
import { AuthRequest } from 'src/common/dtos/dto';
import {
  CreateUpdateBannerDto,
  CreateDestinationCategoryDto,
  CreateVoucherDto,
  DetailBannerDto,
  GetActiveVoucherDto,
  GetDefaultImageDto,
} from './admin.dto';
import { EncryptionService } from 'src/common/helpers/encryption/encryption.service';

describe('AdminController', () => {
  let controller: AdminController;
  // let encryptionService: EncryptionService;
  let request: AuthRequest;
  let payload:
    | CreateDestinationCategoryDto
    | CreateVoucherDto
    | CreateUpdateBannerDto
    | DetailBannerDto
    | GetActiveVoucherDto
    | GetDefaultImageDto;

  const mockAdminService = {
    createDestinationCaegory: jest.fn(),
    getDestinationCaegories: jest.fn(),
    createVoucher: jest.fn(),
    getVoucher: jest.fn(),
    createUpdateBanner: jest.fn(),
    getDetailBanner: jest.fn(),
    getDefaultImage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      controllers: [AdminController],
      providers: [
        EncryptionService,
        { provide: AdminService, useValue: mockAdminService },
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AdminController>(AdminController);
    // encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  describe('Create Destination Category', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'ADMIN' },
      } as AuthRequest;
      payload = {
        name: 'Hiking',
        description:
          'A category that includes hiking trails, mountain adventures, and trekking spots from around the world.',
        code: 'HKNG-001',
        imageId: 'iVBORw0KGgoAAAANSUhEUgAAAAUA...',
        isActive: true,
      };
    });

    it('should successfully created Category', async () => {
      mockAdminService.createDestinationCaegory.mockResolvedValue({});
      const response = await controller.createDestinationCaegory(
        request,
        payload as CreateDestinationCategoryDto,
        mockHeaders,
      );

      expect(response).toEqual({});
    });

    it('should return error Created Category', async () => {
      const expectedResponse = 'User Service Error';
      mockAdminService.createDestinationCaegory.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.createDestinationCaegory(
          request,
          payload as CreateDestinationCategoryDto,
          mockHeaders,
        );
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });

  describe('Get Destination Category', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'ADMIN' },
      } as AuthRequest;
    });

    it('should successfully get Category', async () => {
      mockAdminService.getDestinationCaegories.mockResolvedValue({});
      const response = await controller.getDestinationCaegories(mockHeaders);

      expect(response).toEqual({});
    });

    it('should return error get Category', async () => {
      const expectedResponse = 'User Service Error';
      mockAdminService.getDestinationCaegories.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.getDestinationCaegories(mockHeaders);
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });

  describe('Create Voucher', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'ADMIN' },
      } as AuthRequest;
      payload = {
        imageId: 'default',
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
    });

    it('should successfully created Category', async () => {
      mockAdminService.createVoucher.mockResolvedValue({});
      const response = await controller.createVoucher(
        request,
        payload as CreateVoucherDto,
        mockHeaders,
      );

      expect(response).toEqual({});
    });

    it('should return error Created Category', async () => {
      const expectedResponse = 'User Service Error';
      mockAdminService.createVoucher.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.createVoucher(
          request,
          payload as CreateVoucherDto,
          mockHeaders,
        );
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });

  describe('Get voucher', () => {
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
    });

    it('should successfully get Voucher', async () => {
      mockAdminService.getVoucher.mockResolvedValue({});
      const response = await controller.getVoucher(
        request,
        mockHeaders,
        payload as GetActiveVoucherDto,
      );

      expect(response).toEqual({});
    });

    it('should return error get Voucher', async () => {
      const expectedResponse = 'User Service Error';
      mockAdminService.getVoucher.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.getVoucher(
          request,
          mockHeaders,
          payload as GetActiveVoucherDto,
        );
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });

  describe('Create Banner', () => {
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
        startActive: '1740157200000',
        endActive: '1740207600000',
        isActive: true,
      } as CreateUpdateBannerDto;
    });

    it('should successfully create banner', async () => {
      mockAdminService.createUpdateBanner.mockResolvedValue({});
      const response = await controller.createBanner(
        request,
        payload as CreateUpdateBannerDto,
        mockHeaders,
      );

      expect(response).toEqual({});
    });

    it('should return error create banner', async () => {
      const expectedResponse = 'User Service Error';
      mockAdminService.createUpdateBanner.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.createBanner(
          request,
          payload as CreateUpdateBannerDto,
          mockHeaders,
        );
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });

  describe('Update Banner', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'ADMIN' },
        url: '/admin/update/banner',
        method: 'put',
      } as AuthRequest;
      payload = {
        bannerId: 'unique-banner-id',
        title: 'Promo Akhir Tahun with date',
        description: 'Diskon hingga 50% untuk produk-produk terpilih.',
        priority: 1,
        imageUrl: 'https://example.com/images/promo2025.jpg',
        imageText: 'admin/98127ajshd-asdaskd-asdkljkjh',
        type: 'PROMO',
        position: 'TOP',
        startActive: '1740157200000',
        endActive: '1740207600000',
        isActive: true,
      } as CreateUpdateBannerDto;
    });

    it('should successfully update banner', async () => {
      mockAdminService.createUpdateBanner.mockResolvedValue({});
      const response = await controller.updateBanner(
        request,
        payload as CreateUpdateBannerDto,
        mockHeaders,
      );

      expect(response).toEqual({});
    });

    it('should return error update banner', async () => {
      const expectedResponse = 'User Service Error';
      mockAdminService.createUpdateBanner.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.updateBanner(
          request,
          payload as CreateUpdateBannerDto,
          mockHeaders,
        );
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });

  describe('Get detail banner', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'ADMIN' },
      } as AuthRequest;
      payload = {
        bannerId: '1eff1bec-517d-6b50-be0e-4fe07fc4851c',
      } as DetailBannerDto;
    });
    it('should successfully get detail banner', async () => {
      mockAdminService.getDetailBanner.mockResolvedValue({});
      const response = await controller.getDetailBanner(
        mockHeaders,
        payload as DetailBannerDto,
      );
      expect(response).toEqual({});
    });

    it('should return error get detail banner', async () => {
      const expectedResponse = 'internal server error';
      mockAdminService.getDetailBanner.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.getDetailBanner(
          mockHeaders,
          payload as DetailBannerDto,
        );
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });

  describe('Get Default Images', () => {
    beforeEach(() => {
      payload = {
        type: 'image_default_voucher',
      } as GetDefaultImageDto;
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'ADMIN' },
      } as AuthRequest;
    });

    it('should successfully get default images', async () => {
      mockAdminService.getDefaultImage.mockResolvedValue({});
      const response = await controller.getDefaultImage(
        mockHeaders,
        payload as GetDefaultImageDto,
      );
      expect(response).toEqual({});
    });

    it('should return error get default images', async () => {
      const expectedResponse = 'internal server error';
      mockAdminService.getDefaultImage.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.getDefaultImage(
          mockHeaders,
          payload as GetDefaultImageDto,
        );
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });
});
