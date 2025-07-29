import { Test, TestingModule } from '@nestjs/testing';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { TestSetupModule } from 'src/config/test-setup.module';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { mockHeaders, mockLoggerService } from 'src/config/__test__/mock';
import {
  GetCityDto,
  GetLocationDto,
  GetRecommendedAcomodationDto,
  GetRoutingDto,
} from './location.dto';

describe('LocationController', () => {
  let controller: LocationController;
  let payload:
    | GetLocationDto
    | GetCityDto
    | GetRoutingDto
    | GetRecommendedAcomodationDto;
  const mockLocationService = {
    getLocationDetail: jest.fn(),
    getCity: jest.fn(),
    getProvince: jest.fn(),
    getProvinceCoordinates: jest.fn(),
    getCountry: jest.fn(),
    getRouting: jest.fn(),
    getRecommendedAcomodation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      controllers: [LocationController],
      providers: [
        { provide: LocationService, useValue: mockLocationService },
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
      ],
    }).compile();

    controller = module.get<LocationController>(LocationController);
  });

  describe('getCity', () => {
    beforeEach(() => {
      payload = {
        province: 'Jawa Barat',
      } as GetCityDto;
    });
    it('Should be return Success', async () => {
      mockLocationService.getCity.mockResolvedValue([]);
      const res = await controller.getCity(payload as GetCityDto, mockHeaders);
      expect(res).toEqual([]);
    });

    it('Should be return Error', async () => {
      mockLocationService.getCity.mockRejectedValue(
        new Error('Error reading file'),
      );
      try {
        await controller.getCity(payload as GetCityDto, mockHeaders);
      } catch (error) {
        expect(error.message).toBe('Error reading file');
      }
    });
  });

  describe('getProvince', () => {
    it('Should be return Success', async () => {
      mockLocationService.getProvince.mockResolvedValue([]);
      const res = await controller.getProvince(mockHeaders);
      expect(res).toEqual([]);
    });

    it('Should be return Error', async () => {
      mockLocationService.getProvince.mockRejectedValue(
        new Error('Error reading file'),
      );
      try {
        await controller.getProvince(mockHeaders);
      } catch (error) {
        expect(error.message).toBe('Error reading file');
      }
    });
  });

  describe('getProvinceCoordinates', () => {
    it('Should be return Success', async () => {
      mockLocationService.getProvinceCoordinates.mockResolvedValue([]);
      const res = await controller.getProvinceCoordinates(mockHeaders);
      expect(res).toEqual([]);
    });

    it('Should be return Error', async () => {
      mockLocationService.getProvinceCoordinates.mockRejectedValue(
        new Error('Error reading file'),
      );
      try {
        await controller.getProvinceCoordinates(mockHeaders);
      } catch (error) {
        expect(error.message).toBe('Error reading file');
      }
    });
  });

  describe('getLocationDetail', () => {
    it('Should be return Success', async () => {
      mockLocationService.getLocationDetail.mockResolvedValue([]);
      const res = await controller.getLocationDetail(
        payload as GetLocationDto,
        mockHeaders,
      );
      expect(res).toEqual([]);
    });

    it('Should be return Error', async () => {
      mockLocationService.getLocationDetail.mockRejectedValue(
        new Error('Error reading file'),
      );
      try {
        await controller.getLocationDetail(
          payload as GetLocationDto,
          mockHeaders,
        );
      } catch (error) {
        expect(error.message).toBe('Error reading file');
      }
    });
  });

  describe('getCountry', () => {
    it('Should be return Success', async () => {
      mockLocationService.getCountry.mockResolvedValue([]);
      const res = await controller.getCountry(mockHeaders);
      expect(res).toEqual([]);
    });

    it('Should be return Error', async () => {
      mockLocationService.getCountry.mockRejectedValue(
        new Error('Error reading file'),
      );
      try {
        await controller.getCountry(mockHeaders);
      } catch (error) {
        expect(error.message).toBe('Error reading file');
      }
    });
  });

  describe('getRouting', () => {
    beforeEach(() => {
      payload = {
        from: {
          latitude: '-6.211022644466842]',
          longitude: '106.81557509797302',
        },
        to: {
          latitude: '-8.049257073851127',
          longitude: '112.9209351539612',
        },
        profile: 'cycling-mountain',
        returnType: 'geojson',
      } as GetRoutingDto;
    });
    it('Should be return Success', async () => {
      mockLocationService.getRouting.mockResolvedValue([]);
      const res = await controller.getRouting(
        mockHeaders,
        payload as GetRoutingDto,
      );
      expect(res).toEqual([]);
    });

    it('Should be return Error', async () => {
      mockLocationService.getRouting.mockRejectedValue(
        new Error('Error service failed'),
      );
      try {
        await controller.getRouting(mockHeaders, payload as GetRoutingDto);
      } catch (error) {
        expect(error.message).toBe('Error service failed');
      }
    });
  });

  describe('getRecommendedAcomodation', () => {
    beforeEach(() => {
      payload = {
        typeAcomodation: 'all',
        from: {
          latitude: '-6.267704',
          longitude: '107.020765',
          country: 'indonesia',
        },
        to: {
          latitude: '-7.795676',
          longitude: '110.366539',
          country: 'indonesia',
        },
      } as GetRecommendedAcomodationDto;
    });
    it('Should be return Success', async () => {
      mockLocationService.getRecommendedAcomodation.mockResolvedValue([]);
      const res = await controller.getRecommendedAcomodation(
        mockHeaders,
        payload as GetRecommendedAcomodationDto,
      );
      expect(res).toEqual([]);
    });

    it('Should be return Error', async () => {
      mockLocationService.getRecommendedAcomodation.mockRejectedValue(
        new Error('Error service failed'),
      );
      try {
        await controller.getRecommendedAcomodation(
          mockHeaders,
          payload as GetRecommendedAcomodationDto,
        );
      } catch (error) {
        expect(error.message).toBe('Error service failed');
      }
    });
  });
});
