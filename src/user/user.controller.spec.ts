import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TestSetupModule } from 'src/config/test-setup.module';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { mockHeaders, mockLoggerService } from 'src/config/__test__/mock';
import { AuthGuard } from 'src/authentication/authentication.guard';
import { RolesGuard } from 'src/authentication/role.guard';
import { AuthRequest } from 'src/common/dtos/dto';
import { UpdateToSellerDto, UploadIdentityDto } from './user.dto';
import { EncryptionService } from 'src/common/helpers/encryption/encryption.service';

describe('UserController', () => {
  let controller: UserController;
  let encryptionService: EncryptionService;
  let request: AuthRequest;
  let payload: UploadIdentityDto | UpdateToSellerDto;
  const mockUserService = {
    uploadIdentity: jest.fn(),
    getUserIdentity: jest.fn(),
    updateToSeller: jest.fn(),
    getMenuList: jest.fn(),
    getUserProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      controllers: [UserController],
      providers: [
        EncryptionService,
        { provide: UserService, useValue: mockUserService },
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<UserController>(UserController);
    encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  describe('Upload Identity', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'USER' },
      } as AuthRequest;
      payload = {
        identityType: 'ktp',
        image:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAACfcAAAG5CAYAAAAp5Jx',
        nik: encryptionService.encryptPayload('3201010101010001'),
      };
    });

    it('should successfully upload identity', async () => {
      mockUserService.uploadIdentity.mockResolvedValue({});
      const response = await controller.uploadIdentity(
        request,
        payload as UploadIdentityDto,
        mockHeaders,
      );

      expect(response).toEqual({});
    });

    it('should return error upload user identity', async () => {
      const expectedResponse = 'User Service Error';
      mockUserService.uploadIdentity.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.uploadIdentity(
          request,
          payload as UploadIdentityDto,
          mockHeaders,
        );
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });

  describe('GET Identity', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'USER' },
      } as AuthRequest;
    });

    it('should successfully get identity', async () => {
      mockUserService.getUserIdentity.mockResolvedValue({});
      const response = await controller.getUserIdentity(request, mockHeaders);

      expect(response).toEqual({});
    });

    it('should return error get user identity', async () => {
      const expectedResponse = 'User Service Error';
      mockUserService.getUserIdentity.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.getUserIdentity(request, mockHeaders);
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });

  describe('GET User Profile', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'USER' },
      } as AuthRequest;
    });

    it('should successfully get user profile', async () => {
      mockUserService.getUserProfile.mockResolvedValue({});
      const response = await controller.getUserProfile(request, mockHeaders);

      expect(response).toEqual({});
    });

    it('should return error get user profile', async () => {
      const expectedResponse = 'User Service Error';
      mockUserService.getUserProfile.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.getUserProfile(request, mockHeaders);
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });

  describe('Update To Seller', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'USER' },
      } as AuthRequest;

      payload = {
        name: 'testing seller name',
        bio: 'testing',
      };
    });

    it('should successfully get identity', async () => {
      mockUserService.updateToSeller.mockResolvedValue({});
      const response = await controller.updateToSeller(
        request,
        mockHeaders,
        payload as UpdateToSellerDto,
      );

      expect(response).toEqual({});
    });

    it('should return error get user identity', async () => {
      const expectedResponse = 'User Service Error';
      mockUserService.updateToSeller.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.updateToSeller(
          request,
          mockHeaders,
          payload as UpdateToSellerDto,
        );
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });

  describe('GET Menu List', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'ADMIN' },
      } as AuthRequest;
    });

    it('should successfully get menu list', async () => {
      mockUserService.getMenuList.mockResolvedValue({});
      const response = await controller.getMenuList(request, mockHeaders);

      expect(response).toEqual({});
    });

    it('should return error get user menu list', async () => {
      const expectedResponse = 'User Service Error';
      mockUserService.getMenuList.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.getMenuList(request, mockHeaders);
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });
});
