import * as Path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { DestinationService } from './destination.service';
import { TestSetupModule } from 'src/config/test-setup.module';
import { EncryptionService } from 'src/common/helpers/encryption/encryption.service';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import {
  mockDbService,
  mockHeaders,
  mockLoggerService,
  mockRedisService,
} from 'src/config/__test__/mock';
import { DbService } from 'src/database/mysql/mysql.service';
import { AuthRequest } from 'src/common/dtos/dto';
import { GeneralService } from 'src/common/helpers/general/general.service';
import {
  CreatePlaceDestinationDto,
  GetDetailPlaceDto,
  GetPlacesDto,
  GetScheduleDestinationDto,
} from './destination.dto';
import { CustomHttpException } from 'src/common/helpers/lib/exception';
import { RedisService } from 'src/database/redis/redis.service';
import {
  ResponseQueryDetailPlace,
  ResponseQueryPlaces,
  ResponseQueryQuotaPlaceReserved,
  ResponseQueryReservedSchedule,
} from 'src/config/__test__/response/response';
import * as Moment from 'moment';

const DESTINATION_CONFIG_PATH = Path.join(
  __dirname,
  '../../assets/destinationConfig.json',
);

describe('DestinationService', () => {
  let service: DestinationService;
  let request: AuthRequest;
  let payload:
    | CreatePlaceDestinationDto
    | GetDetailPlaceDto
    | GetPlacesDto
    | GetScheduleDestinationDto;
  let encryptionService: EncryptionService;

  const MockGetCategory = [{ id: 'category_id', code: 'CP', name: 'Camping' }];
  const MockGetUser = [{ email: 'email@gmail.com' }];
  let mockGetCategory = MockGetCategory;
  let mockReservedSchedule = ResponseQueryReservedSchedule;
  let mockQuotaPlaceReserved = ResponseQueryQuotaPlaceReserved;
  let mockGetUser = MockGetUser;
  let mockGetPlaceDetail = ResponseQueryDetailPlace;
  let mockGetPlaces = ResponseQueryPlaces;
  let mockCountPlaces = [{ total: 1 }];
  let generalService: GeneralService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      providers: [
        DestinationService,
        EncryptionService,
        GeneralService,
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
        { provide: DbService, useValue: mockDbService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<DestinationService>(DestinationService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
    generalService = module.get<GeneralService>(GeneralService);
  });

  describe('createPlaceDestination', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'SELLER' },
      } as AuthRequest;
      payload = {
        name: 'Camping Gayatri',
        description:
          'Menikmati pendakian menuju puncak Gunung Gede dan Pangrango.',
        address:
          'Jalan Cibodas, Cipanas, Kabupaten Cianjur, Jawa Barat, Indonesia',
        price: 50000,
        isActive: true,
        type: 'RESERVATION',
        latitude: '-6.713611',
        longitude: '106.999722',
        city: 'Cianjur',
        province: 'Jawa Barat',
        country: 'Indonesia',
        images: [
          {
            imageText: 'mechant/asd1-12ds3sdasd-1q23',
            imageUrl: 'https://example.com/pendakian_gunung.jpg',
            primary: true,
          },
          {
            imageText: 'mechant/asd1-123dsaasd-1233eed3',
            imageUrl: 'https://example.com/puncak_gunung.jpg',
            primary: false,
          },
        ],
        facilities: [
          {
            name: 'Toilet',
            description: 'Toilet di basecamp dan sepanjang jalur pendakian.',
            isAvailable: true,
          },
          {
            name: 'Pos Pendakian',
            description:
              'Pos untuk istirahat dan pemberian informasi bagi pendaki.',
            isAvailable: true,
          },
        ],
        activities: [
          {
            name: 'Pendakian',
            description: 'Menikmati perjalanan menuju puncak gunung.',
            duration: 8,
            isActive: true,
          },
          {
            name: 'Camping',
            description:
              'Berkemah di sekitar basecamp atau sepanjang jalur pendakian.',
            duration: 2,
            isActive: true,
          },
        ],
        quota: [
          {
            day: 'sunday',
            value: 30,
          },
          {
            day: 'monday',
            value: 25,
          },
        ],
        phoneNumber: '081234567890',
        website: 'https://gununggede.com',
        categoryId:
          '5041ef01bd5c889962a0c4e81932ed5060967b673634bff1e0b058c6cdf7c7f793a75c85f7e6a32979840150405546d2',
      } as CreatePlaceDestinationDto;
      mockDbService.executeRawQuery.mockImplementation((params) => {
        if (params.logName === 'GET DESTINATION CATEGORY')
          return mockGetCategory;
        if (params.logName === 'GET USER') return mockGetUser;
      });
      mockDbService.executeInTransaction.mockImplementation((trxid, cb) => {
        return cb(
          mockDbService.executeRawQuery.mockImplementation(({ logName }) => {
            if (logName === 'INSERT PLACE DESTINATION') return [];
            if (logName === 'INSERT PLACE DESTINATION IMAGES') return [];
            if (logName === 'INSERT PLACE FACILITIES') return [];
            if (logName === 'INSERT PLACE ACTIVITIES') return [];
            if (logName === 'INSERT QUOTA PLACE') return [];
            if (logName === 'INSERT TRACKING BASECAMP') return [];
            if (logName === 'INSERT TRACKING BASECAMP IMAGES') return [];
            if (logName === 'INSERT TRACKING BASECAMP FACILITIES') return [];
            if (logName === 'INSERT TRACKING BASECAMP QUOTA') return [];
          }),
          mockRedisService.setSadd.mockResolvedValue('success'),
        );
      });
    });
    it('Should return success created place destination CP category', async () => {
      const res = await service.createPlaceDestination(
        request,
        payload as CreatePlaceDestinationDto,
        mockHeaders,
      );
      expect(res).toEqual(undefined);
    });

    it('Should return success created place destination GN category', async () => {
      mockGetCategory = MockGetCategory.map((item) => {
        return { ...item, code: 'GN' };
      });
      payload = {
        ...payload,
        altitude: 2958,
        basecamp: [
          {
            name: 'Basecamp Cibodas',
            description:
              'Basecamp untuk memulai pendakian ke puncak Gunung Gede.',
            phoneNumber: '081234567890',
            email: 'basecamp@gununggede.com',
            address: 'Jl. Raya Cibodas No. 1, Cianjur, Jawa Barat',
            isActive: true,
            latitude: '-6.713611',
            longitude: '106.999722',
            price: 10000,
            priceBeforeDiscount: 12000,
            city: 'Cianjur',
            province: 'Jawa Barat',
            country: 'Indonesia',
            images: [
              {
                imageText: 'mechant/asd1-123asd-qssws1',
                imageUrl: 'https://example.com/basecamp_view.jpg',
                primary: true,
              },
              {
                imageText: 'mechant/asd1-123asd-12ddses32',
                imageUrl: 'https://example.com/basecamp_tent.jpg',
                primary: false,
              },
            ],
            facilities: [
              {
                name: 'Toilet',
                description:
                  'Toilet di basecamp dan sepanjang jalur pendakian.',
                isAvailable: true,
              },
              {
                name: 'Parking Area',
                description:
                  'Pos untuk istirahat dan pemberian informasi bagi pendaki.',
                isAvailable: true,
              },
            ],
            quota: [
              {
                day: 'sunday',
                value: 30,
              },
              {
                day: 'monday',
                value: 25,
              },
            ],
          },
          {
            name: 'Basecamp Putri',
            description:
              'Basecamp untuk memulai pendakian ke puncak Gunung Gede.',
            phoneNumber: '081234567890',
            email: 'basecamp@gununggede.com',
            address: 'Jl. Raya Cibodas No. 1, Cianjur, Jawa Barat',
            isActive: true,
            price: 12000,
            latitude: '-6.713611',
            longitude: '106.999722',
            city: 'Cianjur',
            province: 'Jawa Barat',
            country: 'Indonesia',
            images: [
              {
                imageText: 'mechant/asd1-123asdsssdsd-qw1',
                imageUrl: 'https://example.com/basecamp_view.jpg',
                primary: true,
              },
              {
                imageText: 'mechant/asd1-123asd-dds1ddssdd2se32',
                imageUrl: 'https://example.com/basecamp_tent.jpg',
                primary: false,
              },
            ],
            facilities: [
              {
                name: 'Toilet',
                description:
                  'Toilet di basecamp dan sepanjang jalur pendakian.',
                isAvailable: true,
              },
              {
                name: 'Parking Area',
                description:
                  'Pos untuk istirahat dan pemberian informasi bagi pendaki.',
                isAvailable: true,
              },
            ],
            quota: [
              {
                day: 'sunday',
                value: 30,
              },
              {
                day: 'monday',
                value: 25,
              },
            ],
          },
        ],
        quota: [],
      } as CreatePlaceDestinationDto;
      const res = await service.createPlaceDestination(
        request,
        payload as CreatePlaceDestinationDto,
        mockHeaders,
      );
      expect(res).toEqual(undefined);
      mockGetCategory = MockGetCategory;
    });

    it('Should return error invalid decrypt categoryId', async () => {
      payload = {
        ...payload,
        categoryId: '@---',
      } as CreatePlaceDestinationDto;
      try {
        await service.createPlaceDestination(
          request,
          payload as CreatePlaceDestinationDto,
          mockHeaders,
        );
      } catch (error) {
        expect(error.isHelperFail).toBeTruthy();
        expect(error.message).toBe(error.message);
        expect(error.data.status).toBe(422);
      }
    });

    it('Should return error sql injection', async () => {
      payload = {
        ...payload,
        address: '@---',
      } as CreatePlaceDestinationDto;
      try {
        await service.createPlaceDestination(
          request,
          payload as CreatePlaceDestinationDto,
          mockHeaders,
        );
      } catch (error) {
        expect(error.isHelperFail).toBeTruthy();
        expect(error.message).toBe('SQL injection detected in input: @---');
      }
    });

    it('Should return Bad Request : user or category not found', async () => {
      mockGetCategory = [];
      mockGetUser = [];
      const res = (await service.createPlaceDestination(
        request,
        payload as CreatePlaceDestinationDto,
        mockHeaders,
      )) as CustomHttpException;
      expect(res.getStatus()).toBe(400);
      mockGetCategory = MockGetCategory;
      mockGetUser = MockGetUser;
    });

    it('Should return Bad Request : quota empty with category CP', async () => {
      payload = {
        ...payload,
        quota: [],
      } as CreatePlaceDestinationDto;
      const res = (await service.createPlaceDestination(
        request,
        payload as CreatePlaceDestinationDto,
        mockHeaders,
      )) as CustomHttpException;
      expect(res.getStatus()).toBe(400);
    });

    it('Should return Bad Request : basecamp empty with category GN', async () => {
      mockGetCategory = MockGetCategory.map((item) => {
        return { ...item, code: 'GN' };
      });
      const res = (await service.createPlaceDestination(
        request,
        payload as CreatePlaceDestinationDto,
        mockHeaders,
      )) as CustomHttpException;
      expect(res.getStatus()).toBe(400);
      mockGetCategory = MockGetCategory;
    });

    it('Should return 400 error DB: Duplicate entry', async () => {
      mockDbService.executeInTransaction.mockRejectedValue({
        code: 'ER_DUP_ENTRY',
        errno: 1062,
      });
      const res = (await service.createPlaceDestination(
        request,
        payload as CreatePlaceDestinationDto,
        mockHeaders,
      )) as CustomHttpException;
      expect(res.getStatus()).toBe(400);
    });

    it('Should return Bad Request : price empty without category GN', async () => {
      payload = {
        ...payload,
        price: null,
      } as CreatePlaceDestinationDto;
      const res = (await service.createPlaceDestination(
        request,
        payload as CreatePlaceDestinationDto,
        mockHeaders,
      )) as CustomHttpException;
      expect(res.getStatus()).toBe(400);
    });

    it('Should return 500 error DB', async () => {
      mockDbService.executeRawQuery.mockRejectedValue(
        new Error('Error syntax'),
      );
      try {
        await service.createPlaceDestination(
          request,
          payload as CreatePlaceDestinationDto,
          mockHeaders,
        );
      } catch (error) {
        expect(error.message).toBe('Error syntax');
      }
    });
  });

  describe('getPlaces', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'SELLER' },
      } as AuthRequest;
      payload = {
        category: 'gn',
        search: 'gn',
        type: 'RESERVATION',
        page: '1',
        limit: '20',
      } as GetPlacesDto;
      mockRedisService.getSrandmember.mockResolvedValue(['unique-id']);
      mockDbService.executeRawQuery.mockImplementation(({ logName }) => {
        if (logName === 'GET PLACES DESTINATION') return mockGetPlaces;
        if (logName === 'GET TOTAL PLACES') return mockCountPlaces;
      });
    });

    it('Should return success', async () => {
      const response = await service.getPlaces(
        request,
        mockHeaders,
        payload as GetPlacesDto,
      );

      expect(response).toBeDefined();
    });

    it('Should return success: with different price_before_discount', async () => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'USER' },
      } as AuthRequest;
      payload = {
        page: '1',
      } as GetPlacesDto;
      mockGetPlaces = ResponseQueryPlaces.map((item) => {
        return {
          ...item,
          altitude: null,
          price_before_discount: 600000,
        };
      });
      mockCountPlaces = [{ total: 0 }];
      const response = await service.getPlaces(
        request,
        mockHeaders,
        payload as GetPlacesDto,
      );

      expect(response).toBeDefined();
    });

    it('Should return 400 : max limit', async () => {
      payload = {
        limit: '30',
      } as GetPlacesDto;

      const response = (await service.getPlaces(
        request,
        mockHeaders,
        payload as GetPlacesDto,
      )) as CustomHttpException;

      expect(response.getStatus()).toBe(400);
    });

    it('Should return error DB', async () => {
      mockDbService.executeRawQuery.mockRejectedValue(
        new Error('Error syntax'),
      );
      try {
        await service.getPlaces(request, mockHeaders, payload as GetPlacesDto);
      } catch (error) {
        expect(error.message).toBe('Error syntax');
      }
    });
  });

  describe('getDetailPlace', () => {
    beforeEach(() => {
      payload = {
        destinationId:
          'e1380acad56a6aff8e894c7675155faacac895a6bf21b9c1380ed7ed7aae5e892d9ccda92069767e8c344aac1bf9bae2',
        mcId: '1b9685513efd8ba37d76f6abf9866fdfd98e56f1343116353f35e293787cdafe4dfbea0417f8dd00bf6ee287c2dc0414',
      } as GetDetailPlaceDto;
      mockDbService.executeRawQuery.mockImplementation(({ logName }) => {
        if (logName === 'GET DETAIL PLACE DESTINATION')
          return mockGetPlaceDetail;
      });
    });
    it('Should return success : without discount price', async () => {
      const res = await service.getDetailPlace(
        mockHeaders,
        payload as GetDetailPlaceDto,
      );
      expect(res).toBeDefined();
    });

    it('Should return success : with discount price and without altitude', async () => {
      mockGetPlaceDetail = ResponseQueryDetailPlace.map((items) => {
        return {
          ...items,
          price_before_discount: 740000,
          altitude: null,
          basecamp: items.basecamp.map((bc) => ({
            ...bc,
            price_before_discount_bc: 100000,
          })),
        };
      });
      const res = await service.getDetailPlace(
        mockHeaders,
        payload as GetDetailPlaceDto,
      );
      expect(res).toBeDefined();
    });

    it('Should return error invalid decrypt destinationId', async () => {
      payload = {
        ...payload,
        destinationId: '@---',
      } as GetDetailPlaceDto;
      try {
        await service.getDetailPlace(mockHeaders, payload as GetDetailPlaceDto);
      } catch (error) {
        expect(error.isHelperFail).toBeTruthy();
        expect(error.message).toBe(error.message);
        expect(error.data.status).toBe(422);
      }
    });

    it('Should return error sql injection', async () => {
      payload = {
        ...payload,
        destinationId: encryptionService.encryptEntityID('@---'),
      } as GetDetailPlaceDto;
      try {
        await service.getDetailPlace(mockHeaders, payload as GetDetailPlaceDto);
      } catch (error) {
        expect(error.isHelperFail).toBeTruthy();
        expect(error.message).toBe('SQL injection detected in input: @---');
      }
    });
    it('Should return 404 notfound', async () => {
      mockGetPlaceDetail = [];
      const res = (await service.getDetailPlace(
        mockHeaders,
        payload as GetDetailPlaceDto,
      )) as CustomHttpException;
      expect(res.getStatus()).toBe(404);
      mockGetPlaceDetail = ResponseQueryDetailPlace;
    });

    it('Should return error DB', async () => {
      mockDbService.executeRawQuery.mockRejectedValue(
        new Error('Error syntax'),
      );
      try {
        await service.getDetailPlace(mockHeaders, payload as GetDetailPlaceDto);
      } catch (error) {
        expect(error.message).toBe('Error syntax');
      }
    });
  });

  describe('getDestinationType', () => {
    it('Should return success : without discount price', async () => {
      await generalService.readFromFile(DESTINATION_CONFIG_PATH);
      const res = await service.getDestinationType(mockHeaders);
      expect(res).toBeDefined();
    });
    it('should throw an error', async () => {
      jest
        .spyOn(generalService, 'readFromFile')
        .mockRejectedValue(new Error('error reading file'));

      try {
        await service.getDestinationType(mockHeaders);
      } catch (error) {
        expect(error.message).toBe('error reading file');
      }
    });
  });

  describe('getScheduleDestination', () => {
    beforeEach(() => {
      payload = {
        identifier: '1f02c9e9-c4d6-6c62-8d45-789339148bbf',
        startTime: Moment().valueOf().toString(),
        categoryCode: 'GN',
        endTime: Moment().add(4, 'days').valueOf().toString(),
      } as GetScheduleDestinationDto;

      mockDbService.executeRawQuery.mockImplementation(({ logName }) => {
        if (logName === 'GET RESERVED SCHEDULE') return mockReservedSchedule;
        if (logName === 'GET QUOTA PLACE') return mockQuotaPlaceReserved;
      });
    });

    it('Should return success', async () => {
      const res = await service.getScheduleDestination(
        mockHeaders,
        payload as GetScheduleDestinationDto,
      );
      expect(res).toBeDefined();
      expect(res.available_date.length).toBe(5);
    });

    it('should fallback to quota_place when reservedRows is empty', async () => {
      mockReservedSchedule = [];
      mockDbService.executeRawQuery.mockImplementation(({ logName }) => {
        if (logName === 'GET RESERVED SCHEDULE') return mockReservedSchedule;
        if (logName === 'GET QUOTA PLACE') return mockQuotaPlaceReserved;
      });

      payload = {
        ...payload,
        categoryCode: 'CP',
      } as GetScheduleDestinationDto;

      const res = await service.getScheduleDestination(
        mockHeaders,
        payload as GetScheduleDestinationDto,
      );
      expect(res).toBeDefined();
      expect(res.available_date.length).toBe(5);
    });

    it('should return only dates with quota > 0', async () => {
      mockReservedSchedule = [
        {
          date: Moment().format('DD-MM-YYYY'),
          current_quota: 0,
        },
      ];
      mockQuotaPlaceReserved = [
        { day: Moment().format('dddd').toLowerCase(), quota: 0 }, // juga 0
      ];

      mockDbService.executeRawQuery.mockImplementation(({ logName }) => {
        if (logName === 'GET RESERVED SCHEDULE') return mockReservedSchedule;
        if (logName === 'GET QUOTA PLACE') return mockQuotaPlaceReserved;
      });

      payload = {
        ...payload,
        startTime: Moment().startOf('day').valueOf().toString(),
        endTime: Moment().startOf('day').valueOf().toString(),
      } as GetScheduleDestinationDto;

      const res = await service.getScheduleDestination(mockHeaders, payload);
      expect(res.available_date).toEqual([]); // Tidak ada yang memenuhi syarat quota > 0
    });

    it('should set startTime to current date if startTime is in the past', async () => {
      const yesterday = Moment().subtract(1, 'day').startOf('day');
      const fourDaysLater = Moment().add(4, 'days').endOf('day');

      payload = {
        ...payload,
        startTime: yesterday.valueOf().toString(),
        endTime: fourDaysLater.valueOf().toString(),
      } as GetScheduleDestinationDto;

      mockReservedSchedule = Array.from({ length: 5 }, (_, i) => ({
        date: Moment().add(i, 'days').format('DD-MM-YYYY'),
        current_quota: 100,
      }));

      mockDbService.executeRawQuery.mockImplementation(({ logName }) => {
        if (logName === 'GET RESERVED SCHEDULE') return mockReservedSchedule;
        if (logName === 'GET QUOTA PLACE') return mockQuotaPlaceReserved;
      });

      const res = await service.getScheduleDestination(mockHeaders, payload);
      expect(res.available_date.length).toBeGreaterThan(0);
    });

    it('should return empty if both startTime and endTime are before today', async () => {
      const pastDay = Moment()
        .subtract(2, 'days')
        .startOf('day')
        .valueOf()
        .toString();

      payload = {
        ...payload,
        startTime: pastDay,
        endTime: pastDay,
      } as GetScheduleDestinationDto;

      const res = await service.getScheduleDestination(mockHeaders, payload);
      expect(res.available_date).toEqual([]);
    });

    it('should skip date if quotaMap does not have entry for the day', async () => {
      mockReservedSchedule = [];

      const tomorrow = Moment().add(1, 'day');
      const dayName = tomorrow.format('dddd').toLowerCase();

      mockQuotaPlaceReserved = mockQuotaPlaceReserved.filter(
        (q) => q.day !== dayName,
      );

      mockDbService.executeRawQuery.mockImplementation(({ logName }) => {
        if (logName === 'GET RESERVED SCHEDULE') return mockReservedSchedule;
        if (logName === 'GET QUOTA PLACE') return mockQuotaPlaceReserved;
      });

      payload = {
        ...payload,
        startTime: tomorrow.startOf('day').valueOf().toString(),
        endTime: tomorrow.endOf('day').valueOf().toString(),
      } as GetScheduleDestinationDto;

      const res = await service.getScheduleDestination(mockHeaders, payload);

      expect(res.available_date).toEqual([]);
    });

    it('should throw an error', async () => {
      mockDbService.executeRawQuery.mockRejectedValue(
        new Error('Error syntax'),
      );

      try {
        await service.getScheduleDestination(
          mockHeaders,
          payload as GetScheduleDestinationDto,
        );
      } catch (error) {
        expect(error.message).toBe('Error syntax');
      }
    });
  });
});
