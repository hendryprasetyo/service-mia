import * as Path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { PagesService } from './pages.service';
import { TestSetupModule } from 'src/config/test-setup.module';
import { GeneralService } from 'src/common/helpers/general/general.service';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { mockHeaders, mockLoggerService } from 'src/config/__test__/mock';

const PAGES_PATH = Path.join(__dirname, '../../assets/pages.json');

describe('PagesService', () => {
  let service: PagesService;
  let generalService: GeneralService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      providers: [
        PagesService,
        GeneralService,
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<PagesService>(PagesService);
    generalService = module.get<GeneralService>(GeneralService);
  });
  afterEach(() => {
    jest.restoreAllMocks(); // Reset semua spy/mocks
    jest.clearAllMocks(); // Bersihkan call history dll
  });

  describe('getFooterLayout', () => {
    it('should return success', async () => {
      await generalService.readFromFile(PAGES_PATH);
      const result = await service.getFooterLayout(mockHeaders);
      expect(result.pc).toBeDefined();
    });

    it('should return Error', async () => {
      jest
        .spyOn(generalService, 'readFromFile')
        .mockRejectedValue(new Error('error reading file'));
      try {
        await service.getFooterLayout(mockHeaders);
      } catch (error) {
        expect(error.message).toBe('error reading file');
      }
    });
  });

  describe('getFormMerchantRegister', () => {
    it('should return success', async () => {
      await generalService.readFromFile(PAGES_PATH);
      await service.getFormMerchantRegister(mockHeaders);
    });

    it('should return Error', async () => {
      jest
        .spyOn(generalService, 'readFromFile')
        .mockRejectedValue(new Error('error reading file'));
      try {
        await service.getFormMerchantRegister(mockHeaders);
      } catch (error) {
        expect(error.message).toBe('error reading file');
      }
    });
  });
});
