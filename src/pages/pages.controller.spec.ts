import { Test, TestingModule } from '@nestjs/testing';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';
import { TestSetupModule } from 'src/config/test-setup.module';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { mockHeaders, mockLoggerService } from 'src/config/__test__/mock';

describe('PagesController', () => {
  let controller: PagesController;

  const mockPagesService = {
    getFooterLayout: jest.fn(),
    getFormMerchantRegister: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      controllers: [PagesController],
      providers: [
        { provide: PagesService, useValue: mockPagesService },
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
      ],
    }).compile();

    controller = module.get<PagesController>(PagesController);
  });

  describe('getFooterLayout', () => {
    it('Should be return Success', async () => {
      mockPagesService.getFooterLayout.mockResolvedValue([]);
      const res = await controller.getFooterLayout(mockHeaders);
      expect(res).toEqual([]);
    });

    it('Should be return Error', async () => {
      mockPagesService.getFooterLayout.mockRejectedValue(
        new Error('Error reading file'),
      );
      try {
        await controller.getFooterLayout(mockHeaders);
      } catch (error) {
        expect(error.message).toBe('Error reading file');
      }
    });
  });

  describe('get form merchant', () => {
    it('Should be return Success', async () => {
      mockPagesService.getFormMerchantRegister.mockResolvedValue([]);
      const res = await controller.getFormMerchantRegister(mockHeaders);
      expect(res).toEqual([]);
    });

    it('Should be return Error', async () => {
      mockPagesService.getFormMerchantRegister.mockRejectedValue(
        new Error('Error reading file'),
      );
      try {
        await controller.getFormMerchantRegister(mockHeaders);
      } catch (error) {
        expect(error.message).toBe('Error reading file');
      }
    });
  });
});
