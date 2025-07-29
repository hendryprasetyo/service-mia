import { Injectable } from '@nestjs/common';
import * as Cloudinary from 'cloudinary';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { TDeleteCloudinaryDTO, TUploadCloudinaryDTO } from './cloudinary.dto';

@Injectable()
export class CloudinaryService {
  private readonly cloudinary: typeof Cloudinary.v2;
  private readonly cloudinaryConfig: Cloudinary.ConfigOptions;

  constructor(private logger: LoggerServiceImplementation) {
    this.cloudinaryConfig = {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    };

    this.cloudinary = Cloudinary.v2;
    this.cloudinary.config(this.cloudinaryConfig);
  }

  async uploadToCloudinary(
    dataObj: TUploadCloudinaryDTO,
  ): Promise<Cloudinary.UploadApiResponse | Cloudinary.UploadApiErrorResponse> {
    const {
      data,
      resourceType,
      transactionid,
      publicId,
      folderName = 'customer',
    } = dataObj;
    const timeStart = process.hrtime();
    return new Promise((resolve, reject) => {
      let uploadStream: Cloudinary.UploadStream;

      if (data && (data as Express.Multer.File).buffer) {
        const multerFile = data as Express.Multer.File;

        if (!multerFile.mimetype.startsWith('image/')) {
          return reject(
            new Error('Invalid file type, only images are allowed.'),
          );
        }

        uploadStream = this.cloudinary.uploader.upload_stream(
          {
            resource_type: resourceType,
            folder: folderName,
            public_id: publicId,
          },
          (error, result) => {
            const timeDiff = process.hrtime(timeStart);
            const timeTaken = Math.round(
              (timeDiff[0] * 1e9 + timeDiff[1]) / 1e6,
            );

            this.logger.log(['Upload Cloudinary', 'Upload File', 'INFO'], {
              transactionid,
              timeTaken,
            });

            if (error) {
              this.logger.log(['Upload Cloudinary', 'Upload File', 'ERROR'], {
                transactionid,
                info: JSON.stringify(error),
              });
              reject(error);
            } else {
              resolve(result);
            }
          },
        );

        uploadStream.end(multerFile.buffer);
      } else if (typeof data === 'string') {
        this.cloudinary.uploader
          .upload(data, {
            resource_type: resourceType,
            folder: folderName,
            public_id: publicId,
            backup: true,
            notification_url: process.env.API_CALLBACK_CLOUDINARY,
          })
          .then((result) => {
            const timeDiff = process.hrtime(timeStart);
            const timeTaken = Math.round(
              (timeDiff[0] * 1e9 + timeDiff[1]) / 1e6,
            );

            this.logger.log(['Upload Cloudinary', 'Upload Base64', 'INFO'], {
              transactionid,
              timeTaken,
            });
            resolve(result);
          })
          .catch((error) => {
            this.logger.log(['Upload Cloudinary', 'Upload Base64', 'ERROR'], {
              transactionid,
              info: JSON.stringify(error),
            });
            reject(error);
          });
      } else {
        reject(new Error('Invalid data format'));
      }
    });
  }

  async cloudinaryDeleteImg(dataObj: TDeleteCloudinaryDTO): Promise<boolean> {
    const { publicId, resourceType, transactionid } = dataObj;
    try {
      const response = await this.cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });

      return response.result === 'ok';
    } catch (error) {
      this.logger.log(['Delete Cloudinary', 'cloudinaryDeleteImg', 'ERROR'], {
        transactionid,
        image_public_id: publicId,
        info: JSON.stringify(error),
      });
      return false;
    }
  }
}
