import { Test, TestingModule } from '@nestjs/testing';
import { GuestService } from './guest.service';
import { TestSetupModule } from 'src/config/test-setup.module';
import { DbService } from 'src/database/mysql/mysql.service';
import {
  mockDbService,
  mockHeaders,
  mockLoggerService,
  mockRedisService,
} from 'src/config/__test__/mock';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { RedisService } from 'src/database/redis/redis.service';
import { TQueryGetBanners } from './guest.dto';
import { ResponseQueryGetBanners } from 'src/config/__test__/response/response';
import { GeneralService } from 'src/common/helpers/general/general.service';

describe('GuestService', () => {
  let service: GuestService;
  let mockResponseQueryGetBanners = ResponseQueryGetBanners;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      providers: [
        GuestService,
        GeneralService,
        { provide: DbService, useValue: mockDbService },
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<GuestService>(GuestService);
  });

  describe('getBanners', () => {
    beforeEach(() => {
      mockDbService.executeRawQuery.mockImplementation(({ logName }) => {
        if (logName === 'GET BANNERS') return mockResponseQueryGetBanners;
      });
      mockRedisService.getData.mockResolvedValue([]);
      mockRedisService.setDataWithTTL.mockResolvedValue('success');
    });
    it('Should return success : with data', async () => {
      const result = (await service.getBanners(
        mockHeaders,
      )) as TQueryGetBanners[];
      expect(result).toBeDefined();
    });

    it('Should return success : without data', async () => {
      mockResponseQueryGetBanners = [];
      const result = (await service.getBanners(
        mockHeaders,
      )) as TQueryGetBanners[];
      expect(result).toBeDefined();
      mockResponseQueryGetBanners = ResponseQueryGetBanners;
    });

    it('Should return error DB', async () => {
      mockDbService.executeRawQuery.mockRejectedValue(
        new Error('Error syntax'),
      );
      try {
        await service.getBanners(mockHeaders);
      } catch (error) {
        expect(error.message).toBe('Error syntax');
      }
    });
  });
});
