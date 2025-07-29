import * as sharp from 'sharp';
import * as Moment from 'moment';
import * as Path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { AuthRequest, HeadersDto } from 'src/common/dtos/dto';
import { CustomHttpException } from 'src/common/helpers/lib/exception';
import { RabbitmqService } from 'src/common/providers/rabbitmq/rabbitmq.service';
import { GeneralService } from 'src/common/helpers/general/general.service';
import {
  UploadConfig,
  UploadImagesDto,
  UploadPresignUrlDto,
} from './upload.dto';
import { createHash } from 'crypto';
import { DbService } from 'src/database/mysql/mysql.service';
const UPLOAD_CONFIG_PATH = Path.join(
  __dirname,
  '../../assets/uploadConfig.json',
);

@Injectable()
export class UploadService {
  constructor(
    private readonly logger: LoggerServiceImplementation,
    private readonly rabbitMq: RabbitmqService,
    private readonly generalService: GeneralService,
    private readonly pool: DbService,
  ) {}

  public async uploadImage(
    request: AuthRequest,
    headers: HeadersDto,
    files: Express.Multer.File[],
    reqBody: UploadImagesDto,
  ) {
    const { transactionid } = headers;
    try {
      const { ratio = '1/1', isPrimary } = reqBody;
      const role = request.auth.role;
      if (!files || files.length === 0) {
        return new CustomHttpException('Bad Request', 400);
      }
      const MAX_FILE_SIZE = +process.env.MAX_SIZE_IMAGE_PLACE_KB;
      const ALLOWED_MIME_TYPES = JSON.parse(
        process.env.ALLOWED_TYPE_IMAGE_PLACE,
      );
      const baseUrlImageUrl = process.env.CLOUDINARY_IMAGE_PREFIX;
      for (const file of files) {
        this.generalService.validateFile({
          file,
          allowedFormats: ALLOWED_MIME_TYPES,
          maxSizeKB: MAX_FILE_SIZE,
        });
      }
      const uploadConfig =
        await this.generalService.readFromFile<UploadConfig>(
          UPLOAD_CONFIG_PATH,
        );
      const ratioMap: Record<string, { width: number; height: number }> =
        uploadConfig.ratio_image;
      const widthImage = ratioMap[ratio].width;
      const heightImage = ratioMap[ratio].height;
      const folderName =
        uploadConfig.cloud_folder_name_by_role[role?.toUpperCase()] || 'admin';
      const results = await Promise.allSettled(
        files.map(async (file) => {
          let buffer = file.buffer;
          buffer = await sharp(file.buffer)
            .resize({
              width: widthImage,
              height: heightImage,
              fit: 'cover',
            })
            .toBuffer();
          const base64Image = buffer.toString('base64');
          const publicId = uuidv4();
          const message = JSON.stringify({
            type: 'upload-image',
            transactionid,
            data: {
              image: `data:${file.mimetype};base64,${base64Image}`,
              publicId,
              resourceType: 'image',
              folderName,
            },
          });

          await this.rabbitMq.sendToQueue({
            queue: 'upload-queue',
            transactionid,
            message,
            exchangeName: 'upload_exchange',
            routeKey: 'upload_key',
          });
          return publicId;
        }),
      );

      const allRejected = results.every((res) => res.status === 'rejected');

      if (allRejected) {
        this.logger.error(['Upload Service', 'Upload Images', 'ERROR'], {
          messages: 'All process image rejected',
          transactionid,
        });
        return new CustomHttpException('Bad Request', 400);
      }

      const isPrimaryBool = isPrimary === 'true';
      const uploadedFiles = results
        .filter((result) => result.status === 'fulfilled')
        .map((result, index, array) => {
          const formatPublicId = folderName + '/' + result.value;
          return {
            image_text: formatPublicId,
            image_url: baseUrlImageUrl + formatPublicId,
            is_primary:
              array.length === 1 ? isPrimaryBool : index === 0 && isPrimaryBool,
          };
        });

      return uploadedFiles;
    } catch (error) {
      this.logger.error(['Upload Service', 'Upload Images', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });
      return Promise.reject(error);
    }
  }

  public async getPresignUrl(
    request: AuthRequest,
    headers: HeadersDto,
    query: UploadPresignUrlDto,
  ) {
    const { transactionid } = headers;
    try {
      const { role } = request.auth;
      const { locationKey } = query;
      const count = Number(query.count);
      if (count < 1 || count > 10)
        return new CustomHttpException('Bad Request', 400);

      const uploadConfig =
        await this.generalService.readFromFile<UploadConfig>(
          UPLOAD_CONFIG_PATH,
        );
      const folderRole =
        uploadConfig.cloud_folder_name_by_role?.[role?.toUpperCase()];
      const folderLocation = uploadConfig.cloud_folder_name?.[locationKey];

      if (!folderRole || !folderLocation) {
        return new CustomHttpException('Bad Request', 400);
      }
      const exactFolderLocation = `${folderRole}/${folderLocation}`;
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const cloudApiKey = process.env.CLOUDINARY_API_KEY;
      const cloudSecretKey = process.env.CLOUDINARY_API_SECRET;
      const cloudUploadUrl = process.env.CLOUDINARY_IMAGE_PREFIX;
      const timestamp = Moment().valueOf().toString();
      const uploadsToInsert = [];
      const responsePayloads = [];

      for (let i = 0; i < count; i++) {
        const publicId = uuidv4();
        const publicIdDb = `${exactFolderLocation}/${publicId}`;

        // Prepare Params for Signature
        const paramsToSign = `folder=${exactFolderLocation}&public_id=${publicId}&timestamp=${timestamp}`;

        const signature = createHash('sha1')
          .update(paramsToSign + cloudSecretKey)
          .digest('hex');
        responsePayloads.push({
          cloud_name: cloudName,
          api_key: cloudApiKey,
          timestamp,
          signature,
          public_id: publicIdDb,
          folder_name: exactFolderLocation,
          upload_url: cloudUploadUrl,
        });

        uploadsToInsert.push({
          publicId: publicIdDb,
          folder: exactFolderLocation,
          transactionId: transactionid,
          createdAt: new Date(),
        });
      }
      const insertPlaceHolder = uploadsToInsert
        .map(() => '(?, ?, ?, ?, ?)')
        .join(', ');
      const insertParams = uploadsToInsert.flatMap((upload) => [
        upload.publicId,
        upload.folder,
        upload.transactionId,
        false,
        upload.createdAt,
      ]);
      await this.pool.executeRawQuery({
        transactionid,
        query: `
        INSERT INTO temp_uploaded_images
		    	(public_id, folder, transaction_id, used, created_at)
		    VALUES  ${insertPlaceHolder};`,
        params: insertParams,
        logName: 'INSERT TEMPORARY IMAGES',
        isWriteOperation: true,
      });

      return responsePayloads;
    } catch (error) {
      this.logger.error(['Upload Service', 'Upload Pre Sign Url', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });
      return Promise.reject(error);
    }
  }
}
