import { Test, TestingModule } from '@nestjs/testing';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { TestSetupModule } from 'src/config/test-setup.module';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { mockHeaders, mockLoggerService } from 'src/config/__test__/mock';
import { UploadImagesDto, UploadPresignUrlDto } from './upload.dto';
import { CustomHttpException } from 'src/common/helpers/lib/exception';
import { AuthRequest } from 'src/common/dtos/dto';
import { AuthGuard } from 'src/authentication/authentication.guard';

describe('UploadController', () => {
  let controller: UploadController;
  let payload: UploadImagesDto | UploadPresignUrlDto;
  let request: AuthRequest;
  const mockUploadService = {
    uploadImage: jest.fn(),
    getPresignUrl: jest.fn(),
  };

  const filesMock = [
    {
      originalname: 'image.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('mock'),
    },
  ] as Express.Multer.File[];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      controllers: [UploadController],
      providers: [
        { provide: UploadService, useValue: mockUploadService },
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<UploadController>(UploadController);
  });

  describe('uploadImage', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'USER' },
      } as AuthRequest;
      payload = {
        ratio: '1/1',
        isPrimary: 'true',
      } as UploadImagesDto;
    });
    it('should return success when service returns data', async () => {
      mockUploadService.uploadImage.mockResolvedValue('success');

      const result = await controller.uploadImage(
        request,
        mockHeaders,
        filesMock,
        payload as UploadImagesDto,
      );
      expect(result).toBe('success');
    });

    it('should return error 400: validation', async () => {
      payload = {
        isPrimary: 'notvalid',
      };
      const result = (await controller.uploadImage(
        request,
        mockHeaders,
        filesMock,
        payload as UploadImagesDto,
      )) as CustomHttpException;
      expect(result.getStatus()).toBe(400);
    });

    it('Should be return Error', async () => {
      mockUploadService.uploadImage.mockRejectedValue(
        new Error('Error reading file'),
      );
      try {
        await controller.uploadImage(
          request,
          mockHeaders,
          filesMock,
          payload as UploadImagesDto,
        );
      } catch (error) {
        expect(error.message).toBe('Error reading file');
      }
    });
  });

  describe('getPresignUrl', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'USER' },
      } as AuthRequest;
      payload = {
        locationKey: 'place_key',
        count: '1',
      } as UploadPresignUrlDto;
    });
    it('should return success when service returns data', async () => {
      mockUploadService.getPresignUrl.mockResolvedValue('success');

      const result = await controller.getPresignUrl(
        request,
        mockHeaders,
        payload as UploadPresignUrlDto,
      );
      expect(result).toBe('success');
    });

    it('Should be return Error', async () => {
      mockUploadService.getPresignUrl.mockRejectedValue(
        new Error('Error reading file'),
      );
      try {
        await controller.getPresignUrl(
          request,
          mockHeaders,
          payload as UploadPresignUrlDto,
        );
      } catch (error) {
        expect(error.message).toBe('Error reading file');
      }
    });
  });
});
