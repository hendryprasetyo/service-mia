import * as Path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { LocationService } from './location.service';
import { TestSetupModule } from 'src/config/test-setup.module';
import { GeneralService } from 'src/common/helpers/general/general.service';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import {
  mockGeneralService,
  mockHeaders,
  mockLoggerService,
} from 'src/config/__test__/mock';
import {
  GetCityDto,
  GetLocationDto,
  GetRecommendedAcomodationDto,
  GetRoutingDto,
} from './location.dto';

const AREA_PATH = Path.join(__dirname, '../../assets/area.json');
const COUNTRIES_PATH = Path.join(__dirname, '../../assets/countryList.json');
describe('LocationService', () => {
  let service: LocationService;
  let generalService: GeneralService;
  let payload:
    | GetLocationDto
    | GetCityDto
    | GetRoutingDto
    | GetRecommendedAcomodationDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      providers: [
        LocationService,
        GeneralService,
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);
    generalService = module.get<GeneralService>(GeneralService);
  });

  afterEach(() => {
    jest.restoreAllMocks(); // Reset semua spy/mocks
    jest.clearAllMocks(); // Bersihkan call history dll
  });

  describe('getCity', () => {
    beforeEach(() => {
      payload = {
        province: 'Jawa Barat',
      } as GetCityDto;
    });
    it('should return success', async () => {
      await generalService.readFromFile(AREA_PATH);
      const result = await service.getCity(payload as GetCityDto, mockHeaders);
      expect(result).toBeDefined();
    });

    it('should return success : without province', async () => {
      payload = { province: '' };
      await generalService.readFromFile(AREA_PATH);
      const result = await service.getCity(payload as GetCityDto, mockHeaders);
      expect(result).toBeDefined();
    });

    it('should throw an error', async () => {
      jest
        .spyOn(generalService, 'readFromFile')
        .mockRejectedValue(new Error('error reading file'));

      try {
        await service.getCity(payload as GetCityDto, mockHeaders);
      } catch (error) {
        expect(error.message).toBe('error reading file');
      }
    });
  });

  describe('getProvince', () => {
    it('should return success', async () => {
      await generalService.readFromFile(AREA_PATH);
      const result = await service.getProvince(mockHeaders);
      expect(result).toBeDefined();
    });

    it('should throw an error', async () => {
      jest
        .spyOn(generalService, 'readFromFile')
        .mockRejectedValue(new Error('error reading file'));

      try {
        await service.getProvince(mockHeaders);
      } catch (error) {
        expect(error.message).toBe('error reading file');
      }
    });
  });

  describe('getProvinceCoordinates', () => {
    it('should return success', async () => {
      await generalService.readFromFile(AREA_PATH);
      const result = await service.getProvinceCoordinates(mockHeaders);
      expect(result).toBeDefined();
    });

    it('should throw an error', async () => {
      jest
        .spyOn(generalService, 'readFromFile')
        .mockRejectedValue(new Error('error reading file'));

      try {
        await service.getProvinceCoordinates(mockHeaders);
      } catch (error) {
        expect(error.message).toBe('error reading file');
      }
    });
  });

  describe('getLocationDetail', () => {
    beforeEach(() => {
      payload = {
        latitude: '-6.7416681069628615',
        longitude: '107.0940399169922',
        zoom: '18',
      } as GetLocationDto;
    });
    it('should return success', async () => {
      const mockResponse = {
        address: {
          state: 'Jakarta',
          country: 'Indonesia',
          county: 'Central Jakarta',
        },
        display_name: 'Jakarta, Indonesia',
      };

      jest.spyOn(generalService, 'callAPI').mockResolvedValue(mockResponse);
      const result = await service.getLocationDetail(
        payload as GetLocationDto,
        mockHeaders,
      );
      expect(result).toEqual({
        display_name: 'Jakarta, Indonesia',
        province: 'Jakarta',
        country: 'Indonesia',
        city: 'Central Jakarta',
      });
    });

    it('should return success: empty string', async () => {
      const mockResponse = {};

      jest.spyOn(generalService, 'callAPI').mockResolvedValue(mockResponse);
      const result = await service.getLocationDetail(
        payload as GetLocationDto,
        mockHeaders,
      );
      expect(result).toEqual({
        display_name: '',
        province: '',
        country: '',
        city: '',
      });
    });

    it('should throw an error when callAPI fails', async () => {
      payload = { ...payload, zoom: '' };
      jest
        .spyOn(generalService, 'callAPI')
        .mockRejectedValue(new Error('API request failed'));

      await expect(
        service.getLocationDetail(payload as GetLocationDto, mockHeaders),
      ).rejects.toThrow('API request failed');

      expect(generalService.callAPI).toHaveBeenCalled();
    });
  });

  describe('getCountry', () => {
    it('should return success', async () => {
      await generalService.readFromFile(COUNTRIES_PATH);
      const result = await service.getCountry(mockHeaders);
      expect(result).toBeDefined();
    });

    it('should throw an error', async () => {
      jest
        .spyOn(generalService, 'readFromFile')
        .mockRejectedValue(new Error('error reading file'));

      try {
        await service.getCountry(mockHeaders);
      } catch (error) {
        expect(error.message).toBe('error reading file');
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

    it('should return success', async () => {
      const mockResponse = {
        status_code: '200',
        status_message: 'Success',
      };
      jest.spyOn(generalService, 'callAPI').mockResolvedValue(mockResponse);

      const result = await service.getRouting(
        mockHeaders,
        payload as GetRoutingDto,
      );

      expect(result).toBeDefined();
    });

    it('should throw an error', async () => {
      jest
        .spyOn(generalService, 'callAPI')
        .mockRejectedValue(new Error('Internal server error'));

      mockGeneralService.callAPI.mockRejectedValue(
        new Error('Internal server error'),
      );
      try {
        await service.getRouting(mockHeaders, payload as GetRoutingDto);
      } catch (error) {
        expect(error.message).toBe('Internal server error');
      }
    });
  });

  describe('getRecommendedAcomodation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
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

      const mockData = {
        INDONESIA: [
          {
            namobj: 'Stasiun Dekat',
            city: 'Kota A',
            province: 'Provinsi A',
            address: null,
            class: 'II',
            latitude: -6.2677,
            longitude: 107.0207,
            type: 'train',
            status: 'active',
          },
          {
            namobj: 'Stasiun Sedang',
            city: 'Kota B',
            province: 'Provinsi B',
            address: null,
            class: 'II',
            latitude: -6.2777,
            longitude: 107.0307,
            type: 'airport',
            status: 'active',
          },
          {
            namobj: 'Stasiun Sedang',
            city: 'Kota B',
            province: 'Provinsi B',
            address: null,
            class: 'II',
            latitude: -6.2777,
            longitude: 107.0307,
            type: 'bus',
            status: 'active',
          },
          {
            namobj: 'Stasiun Sedang',
            city: 'Kota B',
            province: 'Provinsi B',
            address: null,
            class: 'II',
            latitude: -6.2777,
            longitude: 107.0307,
            type: 'harbor',
            status: 'active',
          },
          {
            namobj: 'Stasiun Sedang',
            city: 'Kota B',
            province: 'Provinsi B',
            address: null,
            class: 'II',
            latitude: -6.27712,
            longitude: 107.03237,
            type: 'harbor',
            status: 'incative',
          },
          {
            namobj: 'Stasiun Sedang',
            city: 'Kota B',
            province: 'Provinsi B',
            address: null,
            class: 'II',
            latitude: -6.2777,
            longitude: 107.0307,
            type: 'train',
            status: 'active',
          },
          {
            namobj: 'Stasiun Jauh',
            city: 'Kota C',
            province: 'Provinsi C',
            address: null,
            class: 'II',
            latitude: -6.3977,
            longitude: 107.1507,
            type: 'train',
            status: 'active',
          },
          {
            namobj: 'Gambir',
            city: 'Jakarta',
            province: 'DKI Jakarta',
            address: 'Jl. Medan Merdeka',
            class: 'I',
            latitude: -6.176655,
            longitude: 106.830583,
            type: 'train',
            status: 'active',
          },
          {
            namobj: 'Halim Perdanakusuma',
            city: 'Jakarta',
            province: 'DKI Jakarta',
            address: 'Jl. Halim',
            class: 'I',
            latitude: -6.266655,
            longitude: 106.900583,
            type: 'airport',
            status: 'active',
          },
        ],
      };
      jest.spyOn(generalService, 'readFromFile').mockResolvedValue(mockData);
    });

    it('should return multiple types if typeAcomodation is all', async () => {
      const result = await service.getRecommendedAcomodation(
        mockHeaders,
        payload as GetRecommendedAcomodationDto,
      );
      expect(result).toBeDefined();
      expect(result.from.train).toBeDefined();
      expect(result.from.airport).toBeDefined();
      expect(result.disclaimer).toBeDefined();
    });

    it('should return empty result if country not found in data', async () => {
      payload = {
        ...payload,
        typeAcomodation: 'train',
      } as GetRecommendedAcomodationDto;

      jest.spyOn(generalService, 'readFromFile').mockResolvedValue({
        MALAYSIA: [], // Not INDONESIA
      });

      const result = await service.getRecommendedAcomodation(
        mockHeaders,
        payload as GetRecommendedAcomodationDto,
      );
      expect(result.from).toEqual({});
      expect(result.to).toEqual({});
    });

    it('should throw an error', async () => {
      jest
        .spyOn(generalService, 'readFromFile')
        .mockRejectedValue(new Error('error reading file'));

      try {
        await service.getRecommendedAcomodation(
          mockHeaders,
          payload as GetRecommendedAcomodationDto,
        );
      } catch (error) {
        expect(error.message).toBe('error reading file');
      }
    });
  });
});
