import * as Joi from 'joi';
import { isNumberOfString } from 'src/common/dtos/dto';

export const UploadImagesDtoSchema = Joi.object({
  ratio: Joi.string().valid('1/1', '16/9').optional(),
  isPrimary: Joi.string().valid('true', 'false').optional(),
});

export const UploadPresignUrlDtoSchema = Joi.object({
  locationKey: Joi.string().required(),
  count: isNumberOfString('count').required(),
});

export type UploadImagesDto = {
  ratio?: string;
  isPrimary?: string;
};

export type UploadPresignUrlDto = {
  locationKey: string;
  count: string;
};

export type ImageRatioKey = '1/1' | '16/9';
export type ImageRatio = {
  [key in ImageRatioKey]: {
    width: number;
    height: number;
  };
};
export type UserRoleKey = 'USER' | 'ADMIN' | 'SELLER';
export type CloudFolderName = {
  [key in UserRoleKey]: string;
};
export type UploadConfig = {
  ratio_image: ImageRatio;
  cloud_folder_name_by_role: CloudFolderName;
  cloud_folder_name: CloudFolderName;
};
