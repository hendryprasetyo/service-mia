import * as Joi from 'joi';
import { isNumberOfString } from 'src/common/dtos/dto';
import { TQueryGetBanners } from 'src/guest/guest.dto';

export const CreateDestinationCategoryDtoSchema = Joi.object({
  name: Joi.string().max(191).required(),
  description: Joi.string().required(),
  code: Joi.string()
    .valid('GN', 'VL', 'CP', 'OA', 'PD', 'VC', 'GF', 'SBPT', 'AD', 'TC')
    .required()
    .messages({
      'any.only': 'Invalid code',
      'any.required': 'Code is required. Please select a valid code.',
    }),
  imageId: Joi.string().required(),
  isActive: Joi.boolean().required(),
});

export const CreateVoucherDtoSchema = Joi.object({
  code: Joi.string()
    .max(25)
    .regex(/^[A-Z0-9]+$/)
    .required()
    .messages({
      'string.pattern.base':
        'Code can only contain uppercase letters and numbers with no spaces.',
      'string.max': 'Code cannot exceed 25 characters.',
      'any.required': 'Code is required.',
    }),

  name: Joi.string().max(191).required(),
  description: Joi.string().optional().allow(''),
  imageId: Joi.string().required(),
  type: Joi.string().valid('shipping', 'discount').required(),
  valueType: Joi.string().valid('percentage', 'price').required(),
  usingType: Joi.string()
    .valid('disposable', 'reusable', 'threshold', 'cashback')
    .required(),
  minSpend: Joi.when('usingType', {
    is: 'threshold',
    then: Joi.number().min(1000).required().messages({
      'any.required': 'minSpend is required when usingType is threshold.',
      'number.min':
        'minSpend must be at least 1000 when usingType is threshold.',
    }),
    otherwise: Joi.number().min(1000).optional(),
  }),
  value: Joi.number()
    .required()
    .when('valueType', {
      is: 'percentage',
      then: Joi.number().min(0.5).max(99).messages({
        'number.min': 'Percentage value must be at least 0.5.',
        'number.max': 'Percentage value max in 99',
      }),
      otherwise: Joi.number().min(99).max(1000000).messages({
        'number.min': 'Price value must be at least 99.',
        'number.max': 'Price value max in 1000000',
      }),
    }),
  startDate: Joi.string().required(),
  endDate: Joi.string().required(),
  isActive: Joi.boolean().required(),
});

export const GetActiveVoucherDtoSchema = Joi.object({
  spendPrice: Joi.string()
    .trim()
    .pattern(/^\d+$/)
    .custom((value, helpers) => {
      const numberValue = Number(value);
      if (isNaN(numberValue) || numberValue < 99) {
        return helpers.error('any.price_min_validation');
      }
      return value;
    })
    .optional()
    .messages({
      'any.price_min_validation': 'spendPrice must be a numeric string ≥ 99',
    }),
});

export const GetDefaultImageDtoSchema = Joi.object({
  type: Joi.string().pattern(/^\S*$/, 'no spaces'),
});

export const CreateUpdateBannerDtoSchema = Joi.object({
  bannerId: Joi.string().uuid().optional().allow(''),
  title: Joi.string().max(191).optional().allow(''),
  redirectUrl: Joi.string().optional().allow(''),
  description: Joi.string().max(191).optional().allow(''),
  priority: Joi.number().greater(-1).optional(),
  imageText: Joi.string().required(),
  imageUrl: Joi.string().uri().required(),
  startActive: isNumberOfString('startActive').optional().allow(''),
  endActive: isNumberOfString('endActive').optional().allow(''),
  isActive: Joi.boolean().required(),
  isBlank: Joi.boolean().optional(),
  type: Joi.string().valid('PROMO', 'ANNOUNCEMENT', 'WARNING', 'INFO'),
  position: Joi.string().valid('TOP', 'BOTTOM', 'LEFT', 'RIGHT', 'CENTER'),
});

export const DetailBannerDtoSchema = Joi.object({
  bannerId: Joi.string().uuid().required(),
});

export type CreateVoucherDto = {
  name: string;
  code: string;
  imageId: string;
  description?: string;
  minSpend?: number;
  value: number;
  type: TVoucherType;
  valueType: TVoucherValueType;
  usingType: TVoucherUsingType;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export type CreateDestinationCategoryDto = {
  name: string;
  description: string;
  code: string;
  imageId?: string;
  isActive: boolean;
};

export type CreateUpdateBannerDto = {
  redirectUrl?: string;
  title?: string;
  description?: string;
  bannerId?: string;
  priority?: number;
  imageUrl?: string;
  imageText: string;
  type: TBannerType;
  position: TBannerPosition;
  startActive?: string;
  endActive?: string;
  isActive: boolean;
  isBlank?: boolean;
};

export type DetailBannerDto = {
  bannerId: string;
};

// types
export type TVoucherType = 'discount' | 'shipping';
export type TVoucherValueType = 'percentage' | 'price';

export type TBannerType = 'PROMO' | 'ANNOUNCEMENT' | 'WARNING' | 'INFO';

export type TBannerPosition = 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT' | 'CENTER';

export type TVoucherUsingType =
  | 'disposable'
  | 'reusable'
  | 'threshold'
  | 'cashback';

export type TResponseQueryGetDestinationCategories = {
  id: string;
  code: string;
  description: string;
  image_url: string;
  is_active: boolean;
  meta_title: string;
  meta_description: string;
  created_by: string;
  created_at: Date;
}[];

export type GetActiveVoucherDto = {
  spendPrice?: string;
};

export type GetDefaultImageDto = {
  type: string;
};

export type TResponseQueryGetActiveVoucher = {
  code: string;
  name: string;
  value: number;
  min_spend: number | null;
  type: TVoucherType;
  value_type: TVoucherValueType;
  using_type: TVoucherUsingType;
  source: string;
  start_date: string;
  end_date: string;
};
export type TQueryGetBannerDetail = TQueryGetBanners & {
  is_active: number;
  is_deleted: number;
  admin_position: string;
  admin_nip: string;
};
