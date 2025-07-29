import { Test, TestingModule } from '@nestjs/testing';
import { AssetController } from './asset.controller';
import { AssetService } from './asset.service';
import {
  mockDbService,
  mockHeaders,
  mockLoggerService,
} from 'src/config/__test__/mock';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { TestSetupModule } from 'src/config/test-setup.module';
import { EncryptionService } from 'src/common/helpers/encryption/encryption.service';
import { DbService } from 'src/database/mysql/mysql.service';
import { AuthGuard } from 'src/authentication/authentication.guard';
import { RolesGuard } from 'src/authentication/role.guard';
import { updateTranslationDto } from './asset.dto';
describe('AssetController', () => {
  let controller: AssetController;
  let payload: { pageId: string } | updateTranslationDto;
  const mockAssetService = {
    getTranslation: jest.fn(),
    getCountries: jest.fn(),
    updateTranslation: jest.fn(),
    getPolicy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      controllers: [AssetController],
      providers: [
        EncryptionService,
        { provide: AssetService, useValue: mockAssetService },
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
        { provide: DbService, useValue: mockDbService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AssetController>(AssetController);
  });

  describe('Translation', () => {
    it('should return success', async () => {
      mockAssetService.getTranslation.mockResolvedValue({});
      const response = await controller.getTranslation(
        mockHeaders,
        payload as { pageId: string },
      );
      expect(response).toEqual({});
    });

    it('should return error', async () => {
      const expectedResponse = 'Payment Service Error';
      mockAssetService.getTranslation.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.getTranslation(
          mockHeaders,
          payload as { pageId: string },
        );
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });

  describe('Countries', () => {
    it('should return success', async () => {
      mockAssetService.getCountries.mockResolvedValue([]);
      const response = await controller.getCountries(mockHeaders);
      expect(response).toEqual([]);
    });

    it('should return error', async () => {
      const expectedResponse = 'File countries not exist';
      mockAssetService.getCountries.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.getCountries(mockHeaders);
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });

  describe('GetPolicy', () => {
    it('should return success', async () => {
      mockAssetService.getPolicy.mockResolvedValue([]);
      const response = await controller.getPolicy(mockHeaders);
      expect(response).toEqual([]);
    });

    it('should return error', async () => {
      const expectedResponse = 'File countries not exist';
      mockAssetService.getPolicy.mockRejectedValue(new Error(expectedResponse));
      try {
        await controller.getPolicy(mockHeaders);
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });

  describe('Update Translation', () => {
    beforeEach(() => {
      payload = {
        items: [
          {
            langCode: 'id',
            key: 'sssdddd',
            value: 'test1sdjkashdkjah',
          },
          {
            langCode: 'id',
            key: 'asdasd',
            value: 'test',
          },
        ],
      };
    });
    it('should return success', async () => {
      mockAssetService.updateTranslation.mockResolvedValue('success');
      const response = await controller.updateTranslation(
        mockHeaders,
        payload as updateTranslationDto,
      );
      expect(response).toBe('success');
    });

    it('should return error', async () => {
      const expectedResponse = 'File transalation not exist';
      mockAssetService.updateTranslation.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.updateTranslation(
          mockHeaders,
          payload as updateTranslationDto,
        );
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });
});
