import { Test, TestingModule } from '@nestjs/testing';
import { CloudinaryService } from './cloudinary.service';
import * as Stream from 'stream';
import * as Cloudinary from 'cloudinary';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { mockLoggerService } from 'src/config/__test__/mock';
import { TDeleteCloudinaryDTO, TUploadCloudinaryDTO } from './cloudinary.dto';

// Mock Cloudinary
jest.mock('cloudinary', () => ({
  v2: {
    uploader: {
      upload_stream: jest.fn() as jest.Mock,
      upload: jest.fn() as jest.Mock,
      destroy: jest.fn() as jest.Mock,
    },
    config: jest.fn(),
  },
}));

describe('CloudinaryService', () => {
  let service: CloudinaryService;
  let payload: TUploadCloudinaryDTO | TDeleteCloudinaryDTO;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudinaryService,
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<CloudinaryService>(CloudinaryService);
  });

  describe('uploadToCloudinary', () => {
    beforeEach(() => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'mock-file.png',
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: Buffer.from('mock-file'),
        size: 1234,
        destination: '',
        filename: '',
        path: '',
        stream: Stream.Readable.from(Buffer.from('mock-file')),
      };
      payload = {
        data: mockFile,
        resourceType: 'image',
        transactionid: 'transaction123',
        publicId: 'test_id',
      };
    });
    it('should upload file using upload_stream when data is a buffer', async () => {
      const mockResult = { public_id: 'test_id', url: 'http://test-url' };
      (Cloudinary.v2.uploader.upload_stream as jest.Mock).mockImplementation(
        (options, callback) => callback(null, mockResult),
      );

      const result = await service.uploadToCloudinary(
        payload as TUploadCloudinaryDTO,
      );

      expect(result).toEqual(mockResult);
      expect(Cloudinary.v2.uploader.upload_stream).toHaveBeenCalled();
    });

    it('should error upload file using upload_stream when data is a buffer', async () => {
      const mockResult = 'Internal Cloud Error';
      (Cloudinary.v2.uploader.upload_stream as jest.Mock).mockImplementation(
        (options, callback) => {
          callback(new Error(mockResult), null); // Pass the error to the callback
        },
      );

      try {
        await service.uploadToCloudinary(payload as TUploadCloudinaryDTO);
      } catch (error) {
        expect(error.message).toEqual(mockResult);
      }
    });

    it('should upload base64 string when data is a base64 string', async () => {
      const mockBase64: string = 'data:image/png;base64,abc123';
      const mockResult = { public_id: 'test_id', url: 'http://test-url' };
      (Cloudinary.v2.uploader.upload as jest.Mock).mockResolvedValue(
        mockResult,
      );
      payload = {
        ...payload,
        data: mockBase64,
      } as TUploadCloudinaryDTO;

      const result = await service.uploadToCloudinary(
        payload as TUploadCloudinaryDTO,
      );

      expect(result).toEqual(mockResult);
      expect(Cloudinary.v2.uploader.upload).toHaveBeenCalledWith(
        mockBase64,
        expect.objectContaining({
          resource_type: 'image',
          folder: 'customer',
          public_id: 'test_id',
          backup: true,
          notification_url: process.env.API_CALLBACK_CLOUDINARY,
        }),
      );
    });

    it('should error upload base64 string when data is a base64 string', async () => {
      const mockBase64: string = 'data:image/png;base64,abc123';
      const mockResult = 'Internal Cloud Error';
      (Cloudinary.v2.uploader.upload as jest.Mock).mockRejectedValue(
        new Error(mockResult),
      );
      payload = {
        ...payload,
        data: mockBase64,
      } as TUploadCloudinaryDTO;

      try {
        await service.uploadToCloudinary(payload as TUploadCloudinaryDTO);
      } catch (error) {
        expect(error.message).toEqual(mockResult);
      }
    });

    it('should reject file upload if mimetype is not an image', async () => {
      const mockInvalidFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'invalid-file.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf', // Not image/*
        buffer: Buffer.from('mock-pdf-content'),
        size: 2048,
        destination: '',
        filename: '',
        path: '',
        stream: Stream.Readable.from(Buffer.from('mock-pdf-content')),
      };

      payload = {
        ...payload,
        data: mockInvalidFile,
      } as TUploadCloudinaryDTO;

      await expect(
        service.uploadToCloudinary(payload as TUploadCloudinaryDTO),
      ).rejects.toThrow('Invalid file type, only images are allowed.');
    });

    it('should throw error when data is invalid', async () => {
      await expect(
        service.uploadToCloudinary({
          data: null,
          resourceType: 'image',
          transactionid: 'transaction123',
          publicId: 'test_id',
        }),
      ).rejects.toThrow('Invalid data format');
    });
  });

  describe('cloudinaryDeleteImg', () => {
    beforeEach(() => {
      payload = {
        resourceType: 'image',
        transactionid: 'transaction123',
        publicId: 'test_id',
      };
    });
    it('should delete image successfully', async () => {
      const mockResponse = { result: 'ok' };
      (Cloudinary.v2.uploader.destroy as jest.Mock).mockResolvedValue(
        mockResponse,
      );

      const result = await service.cloudinaryDeleteImg(
        payload as TDeleteCloudinaryDTO,
      );
      expect(result).toBe(true);
      expect(Cloudinary.v2.uploader.destroy).toHaveBeenCalledWith('test_id', {
        resource_type: 'image',
      });
    });

    it('should return false if delete fails', async () => {
      const mockError = new Error('Delete failed');
      (Cloudinary.v2.uploader.destroy as jest.Mock).mockRejectedValue(
        mockError,
      );

      const result = await service.cloudinaryDeleteImg(
        payload as TDeleteCloudinaryDTO,
      );
      expect(result).toBe(false);
    });
  });
});
