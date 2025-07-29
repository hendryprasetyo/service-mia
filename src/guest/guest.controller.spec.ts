import { Test, TestingModule } from '@nestjs/testing';
import { GuestController } from './guest.controller';
import { GuestService } from './guest.service';
import { TestSetupModule } from 'src/config/test-setup.module';
import { mockHeaders, mockLoggerService } from 'src/config/__test__/mock';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { DestinationService } from 'src/destination/destination.service';
import {
  GetDetailPlaceDto,
  GetPlacesDto,
} from 'src/destination/destination.dto';
import { AuthRequest } from 'src/common/dtos/dto';

describe('GuestController', () => {
  let controller: GuestController;
  let request: AuthRequest;
  let payload: GetPlacesDto | GetDetailPlaceDto;
  const mockGuestService = {
    getBanners: jest.fn(),
    getPlaces: jest.fn(),
    getDetailPlace: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      controllers: [GuestController],
      providers: [
        { provide: GuestService, useValue: mockGuestService },
        { provide: DestinationService, useValue: mockGuestService },
        {
          provide: LoggerServiceImplementation,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    controller = module.get<GuestController>(GuestController);
  });

  describe('Get banners', () => {
    it('should successfully', async () => {
      mockGuestService.getBanners.mockResolvedValue({});
      const response = await controller.getBanners(mockHeaders);
      expect(response).toEqual({});
    });

    it('should return error get banners', async () => {
      const expectedResponse = 'internal server error';
      mockGuestService.getBanners.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.getBanners(mockHeaders);
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });

  describe('Get Places', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'SELLER' },
      } as AuthRequest;
      payload = {
        page: '1',
        limit: '1',
      } as GetPlacesDto;
    });
    it('should successfully', async () => {
      mockGuestService.getPlaces.mockResolvedValue({});
      const response = await controller.getPlaces(
        request,
        mockHeaders,
        payload as GetPlacesDto,
      );

      expect(response).toEqual({});
    });

    it('should return error get places', async () => {
      const expectedResponse = 'internal server error';
      mockGuestService.getPlaces.mockRejectedValue(new Error(expectedResponse));
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

  describe('Get Detail Place', () => {
    beforeEach(() => {
      payload = {
        destinationId:
          'e1380acad56a6aff8e894c7675155faacac895a6bf21b9c1380ed7ed7aae5e892d9ccda92069767e8c344aac1bf9bae2',
        mcId: '1b9685513efd8ba37d76f6abf9866fdfd98e56f1343116353f35e293787cdafe4dfbea0417f8dd00bf6ee287c2dc0414',
      } as GetDetailPlaceDto;
    });
    it('should successfully', async () => {
      mockGuestService.getDetailPlace.mockResolvedValue({});
      const response = await controller.getDetailPlace(
        mockHeaders,
        payload as GetDetailPlaceDto,
      );

      expect(response).toEqual({});
    });

    it('should return error get places', async () => {
      const expectedResponse = 'internal server error';
      mockGuestService.getDetailPlace.mockRejectedValue(
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
});
