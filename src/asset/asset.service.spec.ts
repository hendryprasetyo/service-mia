import * as fs from 'fs/promises';
import { Test, TestingModule } from '@nestjs/testing';
import { AssetService } from './asset.service';
import { TestSetupModule } from 'src/config/test-setup.module';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { mockHeaders, mockLoggerService } from 'src/config/__test__/mock';
import { GeneralService } from 'src/common/helpers/general/general.service';
import { updateTranslationDto } from './asset.dto';
import { CustomHttpException } from 'src/common/helpers/lib/exception';

describe('AssetService', () => {
  let service: AssetService;
  let payload: { pageId: string } | updateTranslationDto;
  let generalService: GeneralService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      providers: [
        AssetService,
        GeneralService,
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<AssetService>(AssetService);
    generalService = module.get<GeneralService>(GeneralService);
  });
  afterEach(() => {
    jest.restoreAllMocks(); // Reset semua spy/mocks
    jest.clearAllMocks(); // Bersihkan call history dll
  });

  describe('translation', () => {
    beforeEach(() => {
      payload = {
        pageId: '12333',
      };
    });

    it('should return success', async () => {
      await service.getTranslation(mockHeaders, payload as { pageId: string });
    });

    it('should return Error', async () => {
      jest
        .spyOn(generalService, 'readFromFile')
        .mockRejectedValue(new Error('error reading file'));
      try {
        await service.getTranslation(
          mockHeaders,
          payload as { pageId: string },
        );
      } catch (error) {
        expect(error.message).toBe('error reading file');
      }
    });
  });

  describe('countries', () => {
    it('should return success', async () => {
      await service.getCountries(mockHeaders);
    });

    it('should return Error', async () => {
      jest
        .spyOn(generalService, 'readFromFile')
        .mockRejectedValue(new Error('error reading file'));
      try {
        await service.getCountries(mockHeaders);
      } catch (error) {
        expect(error.message).toBe('error reading file');
      }
    });
  });

  describe('getPolicy', () => {
    it('should return success', async () => {
      await service.getPolicy(mockHeaders);
    });

    it('should return Error', async () => {
      jest
        .spyOn(generalService, 'readFromFile')
        .mockRejectedValue(new Error('error reading file'));
      try {
        await service.getPolicy(mockHeaders);
      } catch (error) {
        expect(error.message).toBe('error reading file');
      }
    });
  });

  describe('updateTranslation', () => {
    beforeEach(() => {
      payload = {
        items: [
          {
            langCode: 'en',
            key: 'greeting',
            value: 'Hello',
          },
          {
            langCode: 'id',
            key: 'greeting',
            value: 'Halo',
          },
        ],
      };
    });

    it('should successfully update translation and write to file', async () => {
      jest.spyOn(generalService, 'readFromFile').mockResolvedValueOnce({
        en: { greeting: 'Hi' },
        id: { greeting: 'Hai' },
      });

      // Mocking file write
      const writeFileMock = jest
        .spyOn(fs, 'writeFile')
        .mockResolvedValue(undefined);

      await service.updateTranslation(
        mockHeaders,
        payload as updateTranslationDto,
      );

      // Verifying the file was written
      expect(writeFileMock).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify(
          { en: { greeting: 'Hello' }, id: { greeting: 'Halo' } },
          null,
          2,
        ),
      );
    });

    it('should throw an error if there are more than 20 items', async () => {
      const mockRequestItem = Array(21).fill({
        langCode: 'en',
        key: 'greeting',
        value: 'Hello',
      });
      payload = {
        items: mockRequestItem,
      };
      try {
        await service.updateTranslation(
          mockHeaders,
          payload as updateTranslationDto,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(CustomHttpException);
        expect(error.message).toBe('Bad Request');
        expect(error.status).toBe(400);
      }
    });

    it('should throw an error if key is not found in translations', async () => {
      jest.spyOn(generalService, 'readFromFile').mockResolvedValueOnce({
        en: { greeting: 'Hi' },
      });

      payload = {
        items: [
          {
            langCode: 'en',
            key: 'farewell',
            value: 'Goodbye',
          },
        ],
      };

      try {
        await service.updateTranslation(
          mockHeaders,
          payload as updateTranslationDto,
        );
      } catch (error) {
        expect(error.isValidate).toBe(true);
        expect(error.message).toBe('key farewell notfound');
      }
    });

    it('should handle errors while reading from file', async () => {
      jest
        .spyOn(generalService, 'readFromFile')
        .mockRejectedValue(new Error('error reading file'));

      try {
        await service.updateTranslation(
          mockHeaders,
          payload as updateTranslationDto,
        );
      } catch (error) {
        expect(error.message).toBe('error reading file');
      }
    });

    it('should handle errors while writing to file', async () => {
      jest.spyOn(generalService, 'readFromFile').mockResolvedValueOnce({
        en: { greeting: 'Hi' },
        id: { greeting: 'Hai' },
      });

      jest
        .spyOn(fs, 'writeFile')
        .mockRejectedValue(new Error('error writing file'));

      try {
        await service.updateTranslation(
          mockHeaders,
          payload as updateTranslationDto,
        );
      } catch (error) {
        expect(error.message).toBe('error writing file');
      }
    });
  });
});
