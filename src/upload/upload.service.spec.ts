import * as sharp from 'sharp';
import { Test, TestingModule } from '@nestjs/testing';
import { UploadService } from './upload.service';
import { TestSetupModule } from 'src/config/test-setup.module';
import { GeneralService } from 'src/common/helpers/general/general.service';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import {
  mockDbService,
  mockHeaders,
  mockLoggerService,
  mockRabbitMQService,
} from 'src/config/__test__/mock';
import { UploadImagesDto, UploadPresignUrlDto } from './upload.dto';
import { RabbitmqService } from 'src/common/providers/rabbitmq/rabbitmq.service';
import { CustomHttpException } from 'src/common/helpers/lib/exception';
import { AuthRequest } from 'src/common/dtos/dto';
import { DbService } from 'src/database/mysql/mysql.service';

describe('UploadService', () => {
  let service: UploadService;
  let payload: UploadImagesDto | UploadPresignUrlDto;
  let request: AuthRequest;
  let files: Express.Multer.File[];
  const generateTestImageBuffer = async () => {
    return await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .jpeg()
      .toBuffer();
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      providers: [
        UploadService,
        GeneralService,
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
        { provide: RabbitmqService, useValue: mockRabbitMQService },
        { provide: DbService, useValue: mockDbService },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  describe('uploadImage', () => {
    beforeEach(async () => {
      const testBuffer = await generateTestImageBuffer();
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'USER' },
      } as AuthRequest;
      payload = {
        isPrimary: 'true',
      } as UploadImagesDto;
      files = [
        {
          originalname: 'image.jpg',
          mimetype: 'image/jpeg',
          buffer: testBuffer,
          size: testBuffer.length,
          fieldname: 'images',
          encoding: '7bit',
          destination: '',
          filename: '',
          path: '',
          stream: null,
        },
      ];
    });

    it('should return success : single image ', async () => {
      const result = await service.uploadImage(
        request,
        mockHeaders,
        files,
        payload as UploadImagesDto,
      );
      expect(result[0].image_text).toBeDefined();
    });

    it('should return success : more then one images ', async () => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'ANOMALI' },
      } as AuthRequest;
      const testBuffer = await generateTestImageBuffer();
      files = [
        {
          originalname: 'image.jpg',
          mimetype: 'image/jpeg',
          buffer: testBuffer,
          size: testBuffer.length,
          fieldname: 'images',
          encoding: '7bit',
          destination: '',
          filename: '',
          path: '',
          stream: null,
        },
        {
          originalname: 'image.jpg',
          mimetype: 'image/jpeg',
          buffer: testBuffer,
          size: testBuffer.length,
          fieldname: 'images',
          encoding: '7bit',
          destination: '',
          filename: '',
          path: '',
          stream: null,
        },
      ];
      const result = await service.uploadImage(
        request,
        mockHeaders,
        files,
        payload as UploadImagesDto,
      );
      expect(result[0].image_text).toBeDefined();
    });

    it('should return error 400: error rabbit mq', async () => {
      mockRabbitMQService.sendToQueue.mockRejectedValue(
        new Error('error send producer'),
      );
      const result = (await service.uploadImage(
        request,
        mockHeaders,
        files,
        payload as UploadImagesDto,
      )) as CustomHttpException;
      expect(result.getStatus()).toBe(400);
    });

    it('should return error: error readfile', async () => {
      const generalService = service['generalService'];
      jest
        .spyOn(generalService, 'readFromFile')
        .mockRejectedValue(new Error('error read file'));

      try {
        await service.uploadImage(
          request,
          mockHeaders,
          files,
          payload as UploadImagesDto,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('error read file');
      }
    });

    it('should return error : validate file size ', async () => {
      const testBuffer = await generateTestImageBuffer();
      const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024);
      files = [
        {
          originalname: 'image.jpg',
          mimetype: 'image/jpeg',
          buffer: testBuffer,
          size: oversizedBuffer.length,
          fieldname: 'images',
          encoding: '7bit',
          destination: '',
          filename: '',
          path: '',
          stream: null,
        },
      ];
      try {
        await service.uploadImage(
          request,
          mockHeaders,
          files,
          payload as UploadImagesDto,
        );
      } catch (error) {
        expect(error.isHelperFail).toBeTruthy();
      }
    });

    it('should return error 400 : missing files ', async () => {
      files = [];
      const result = (await service.uploadImage(
        request,
        mockHeaders,
        files,
        payload as UploadImagesDto,
      )) as CustomHttpException;
      expect(result.getStatus()).toBe(400);
    });
  });

  describe('getPresignUrl', () => {
    beforeEach(async () => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'USER' },
      } as AuthRequest;
      payload = {
        locationKey: 'place_key',
        count: '1',
      } as UploadPresignUrlDto;
      mockDbService.executeRawQuery.mockResolvedValue('success');
    });

    it('should return success', async () => {
      const result = await service.getPresignUrl(
        request,
        mockHeaders,
        payload as UploadPresignUrlDto,
      );
      expect(result[0].cloud_name).toBeDefined();
      expect(result[0].api_key).toBeDefined();
      expect(result[0].timestamp).toBeDefined();
      expect(result[0].signature).toBeDefined();
      expect(result[0].public_id).toBeDefined();
      expect(result[0].folder_name).toBeDefined();
      expect(result[0].upload_url).toBeDefined();
    });

    it('should return error 400: max limit count', async () => {
      payload = {
        locationKey: 'place_key',
        count: '0',
      } as UploadPresignUrlDto;
      const result = (await service.getPresignUrl(
        request,
        mockHeaders,
        payload as UploadPresignUrlDto,
      )) as CustomHttpException;
      expect(result.getStatus()).toBe(400);
    });

    it('should return error 400: folder notfound', async () => {
      payload = {
        locationKey: 'notfound_key',
        count: '1',
      } as UploadPresignUrlDto;
      const result = (await service.getPresignUrl(
        request,
        mockHeaders,
        payload as UploadPresignUrlDto,
      )) as CustomHttpException;
      expect(result.getStatus()).toBe(400);
    });

    it('should return error 500', async () => {
      mockDbService.executeRawQuery.mockRejectedValue(
        new Error('DB connection error'),
      );
      try {
        await service.getPresignUrl(
          request,
          mockHeaders,
          payload as UploadPresignUrlDto,
        );
      } catch (error) {
        expect(error.message).toBe('DB connection error');
      }
    });
  });
});
