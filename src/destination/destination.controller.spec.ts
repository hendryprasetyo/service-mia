import { Test, TestingModule } from '@nestjs/testing';
import { DestinationController } from './destination.controller';
import { DestinationService } from './destination.service';
import { TestSetupModule } from 'src/config/test-setup.module';
import { AuthGuard } from 'src/authentication/authentication.guard';
import { RolesGuard } from 'src/authentication/role.guard';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { mockHeaders, mockLoggerService } from 'src/config/__test__/mock';
import { AuthRequest } from 'src/common/dtos/dto';
import {
  CreatePlaceDestinationDto,
  GetDetailPlaceDto,
  GetPlacesDto,
  GetScheduleDestinationDto,
} from './destination.dto';

describe('DestinationController', () => {
  let controller: DestinationController;
  let request: AuthRequest;
  let payload:
    | CreatePlaceDestinationDto
    | GetPlacesDto
    | GetDetailPlaceDto
    | GetScheduleDestinationDto;

  const mockDestinationService = {
    createPlaceDestination: jest.fn(),
    getPlaces: jest.fn(),
    getDetailPlace: jest.fn(),
    getDestinationType: jest.fn(),
    getScheduleDestination: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      controllers: [DestinationController],
      providers: [
        { provide: DestinationService, useValue: mockDestinationService },
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<DestinationController>(DestinationController);
  });

  describe('Create Place Destination', () => {
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
        altitude: 2958,
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
    });

    it('should successfully created place destination', async () => {
      mockDestinationService.createPlaceDestination.mockResolvedValue({});
      const response = await controller.createPlaceDestination(
        request,
        payload as CreatePlaceDestinationDto,
        mockHeaders,
      );
      expect(response).toEqual({});
    });

    it('should successfully created Place Destination GN', async () => {
      payload = {
        name: 'Pendakian Gunung Gede Pangrango',
        description:
          'Menikmati pendakian menuju puncak Gunung Gede dan Pangrango.',
        address:
          'Jalan Cibodas, Cipanas, Kabupaten Cianjur, Jawa Barat, Indonesia',
        price: 50000,
        altitude: 2958,
        isActive: true,
        type: 'RESERVATION',
        latitude: '-6.713611',
        longitude: '106.999722',
        city: 'Cianjur',
        province: 'Jawa Barat',
        country: 'Indonesia',
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
        phoneNumber: '081234567890',
        website: 'https://gununggede.com',
        categoryId:
          '5041ef01bd5c889962a0c4e81932ed5060967b673634bff1e0b058c6cdf7c7f793a75c85f7e6a32979840150405546d2',
      } as CreatePlaceDestinationDto;
      mockDestinationService.createPlaceDestination.mockResolvedValue({});
      const response = await controller.createPlaceDestination(
        request,
        payload as CreatePlaceDestinationDto,
        mockHeaders,
      );

      expect(response).toEqual({});
    });

    it('should return error Created Place destination', async () => {
      const expectedResponse = 'User Service Error';
      mockDestinationService.createPlaceDestination.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.createPlaceDestination(
          request,
          payload as CreatePlaceDestinationDto,
          mockHeaders,
        );
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });

  describe('Get Places Destination', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'SELLER' },
      } as AuthRequest;
      payload = {
        page: '1',
        limit: '1',
      } as GetPlacesDto;
    });
    it('should successfully get places', async () => {
      mockDestinationService.getPlaces.mockResolvedValue([]);
      const response = await controller.getPlaces(
        request,
        mockHeaders,
        payload as GetPlacesDto,
      );

      expect(response).toEqual([]);
    });

    it('should return error get places', async () => {
      const expectedResponse = 'User Service Error';
      mockDestinationService.getPlaces.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.getPlaces(
          request,
          mockHeaders,
          payload as GetPlacesDto,
        );
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });

  describe('Get Detail Place Destination', () => {
    beforeEach(() => {
      payload = {
        destinationId:
          'e1380acad56a6aff8e894c7675155faacac895a6bf21b9c1380ed7ed7aae5e892d9ccda92069767e8c344aac1bf9bae2',
        mcId: '1b9685513efd8ba37d76f6abf9866fdfd98e56f1343116353f35e293787cdafe4dfbea0417f8dd00bf6ee287c2dc0414',
      } as GetDetailPlaceDto;
    });
    it('should successfully get place detail', async () => {
      mockDestinationService.getDetailPlace.mockResolvedValue([]);
      const response = await controller.getDetailPlace(
        mockHeaders,
        payload as GetDetailPlaceDto,
      );

      expect(response).toEqual([]);
    });

    it('should return error get place detail', async () => {
      const expectedResponse = 'User Service Error';
      mockDestinationService.getDetailPlace.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.getDetailPlace(
          mockHeaders,
          payload as GetDetailPlaceDto,
        );
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });

  describe('Get Destination Type', () => {
    it('should successfully get destination type', async () => {
      mockDestinationService.getDestinationType.mockResolvedValue([]);
      const response = await controller.getDestinationType(mockHeaders);

      expect(response).toEqual([]);
    });

    it('should return error get place detail', async () => {
      const expectedResponse = 'User Service Error';
      mockDestinationService.getDestinationType.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.getDestinationType(mockHeaders);
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });

  describe('Get Destination Shcedule', () => {
    beforeEach(() => {
      payload = {
        identifier: '1f02c9e9-c4d6-6c62-8d45-789339148bbf',
        startTime: '1746032400000',
        categoryCode: 'GN',
        endTime: '1748710799999',
      } as GetScheduleDestinationDto;
    });
    it('should successfully get destination type', async () => {
      mockDestinationService.getScheduleDestination.mockResolvedValue([]);
      const response = await controller.getScheduleDestination(
        mockHeaders,
        payload as GetScheduleDestinationDto,
      );

      expect(response).toEqual([]);
    });

    it('should return error get place detail', async () => {
      const expectedResponse = 'User Service Error';
      mockDestinationService.getScheduleDestination.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.getScheduleDestination(
          mockHeaders,
          payload as GetScheduleDestinationDto,
        );
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });
});
