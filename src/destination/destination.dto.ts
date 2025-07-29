import * as Joi from 'joi';
import {
  isNumberOfString,
  isUnixTimestamp,
  longitudeString,
  TDays,
  validateEmail,
} from 'src/common/dtos/dto';
import { TOrderType } from 'src/payment/payment.dto';

export const CreatePlaceDestinationDtoSchema = Joi.object({
  name: Joi.string()
    .max(191)
    .regex(/^[a-zA-Z0-9\s-]+$/)
    .required(),
  description: Joi.string().required(),
  address: longitudeString.required(),
  altitude: Joi.number().integer().greater(0).optional(),
  type: Joi.string()
    .valid(
      'RESERVATION',
      'PRODUCT',
      'SERVICE',
      'VOUCHER',
      'GIFT',
      'SUBSCRIPTION',
      'ADDON',
      'TICKET',
    )
    .required(),
  price: Joi.number().integer().greater(0).optional(),
  priceBeforeDiscount: Joi.number().integer().greater(0).optional(),
  isActive: Joi.boolean().required(),
  latitude: Joi.string().max(191).required(),
  longitude: Joi.string().max(191).required(),
  city: Joi.string().max(40).required(),
  province: Joi.string().max(35).required(),
  country: Joi.string().max(40).required(),
  basecamp: Joi.array()
    .items(
      Joi.object({
        name: Joi.string()
          .max(191)
          .regex(/^[a-zA-Z0-9\s-]+$/)
          .required(),
        description: Joi.string().optional().allow(''),
        phoneNumber: isNumberOfString('phoneNumber').optional().allow(''),
        email: validateEmail.required(),
        price: Joi.number().integer().greater(0).required(),
        priceBeforeDiscount: Joi.number().integer().greater(0).optional(),
        address: longitudeString.required(),
        isActive: Joi.boolean().required(),
        latitude: Joi.string().max(191).required(),
        longitude: Joi.string().max(191).required(),
        city: Joi.string().max(40).required(),
        province: Joi.string().max(35).required(),
        country: Joi.string().max(40).required(),
        images: Joi.array()
          .items(
            Joi.object({
              imageText: Joi.string().max(191).required(),
              imageUrl: Joi.string().uri().optional().allow(''),
              primary: Joi.boolean().required(),
            }).required(),
          )
          .custom((value, helper) => {
            const primaryCount = value.filter(
              (image) => image.primary === true,
            ).length;
            if (primaryCount > 1) return helper.error('any.custom');

            if (primaryCount === 0) return helper.error('any.custom');
            return value;
          })
          .required()
          .messages({
            'any.custom': 'Invalid Image',
          }),
        facilities: Joi.array()
          .items(
            Joi.object({
              name: Joi.string().max(191).required(),
              description: Joi.string().optional().allow(''),
              isAvailable: Joi.boolean().default(true).required(),
            }).required(),
          )
          .required(),
        quota: Joi.array()
          .items(
            Joi.object({
              day: Joi.string()
                .valid(
                  'sunday',
                  'monday',
                  'tuesday',
                  'wednesday',
                  'thursday',
                  'friday',
                  'saturday',
                )
                .required(),
              value: Joi.number().required().greater(0),
            }).required(),
          )
          .required(),
      }).custom((value, helper) => {
        if (
          typeof value.price !== 'undefined' &&
          typeof value.priceBeforeDiscount !== 'undefined'
        ) {
          if (value.priceBeforeDiscount <= value.price) {
            return helper.error('any.priceBeforeDiscount');
          }
        }
        return value;
      }),
    )
    .messages({
      'any.priceBeforeDiscount': 'priceBeforeDiscount must more then price',
    })
    .optional(),
  images: Joi.array()
    .items(
      Joi.object({
        imageText: Joi.string().max(191).required(),
        imageUrl: Joi.string().uri().optional().allow(''),
        primary: Joi.boolean().required(),
      }).required(),
    )
    .custom((value, helper) => {
      const primaryCount = value.filter(
        (image) => image.primary === true,
      ).length;
      if (primaryCount > 1) return helper.error('any.custom');

      if (primaryCount === 0) return helper.error('any.custom');
      return value;
    })
    .required()
    .messages({
      'any.custom': 'Invalid Image',
    }),
  facilities: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().max(191).required(),
        description: Joi.string().optional().allow(''),
        isAvailable: Joi.boolean().default(true).required(),
      }).required(),
    )
    .required(),
  activities: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().max(191).required(),
        description: Joi.string().optional().allow(''),
        duration: Joi.number().greater(0).required(),
        isActive: Joi.boolean().default(true).required(),
      }).required(),
    )
    .required(),
  quota: Joi.array()
    .items(
      Joi.object({
        day: Joi.string()
          .valid(
            'sunday',
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
          )
          .required(),
        value: Joi.number().required().greater(0),
      }).required(),
    )
    .optional(),
  phoneNumber: isNumberOfString('phoneNumber').optional(),
  website: Joi.string().uri().optional().allow(''),
  categoryId: Joi.string().required(),
}).custom((value, helper) => {
  if (
    typeof value.price !== 'undefined' &&
    typeof value.priceBeforeDiscount !== 'undefined'
  ) {
    if (value.priceBeforeDiscount <= value.price) {
      return helper.error('"priceBeforeDiscount" must more then "price"');
    }
  }
  return value;
});

export const CreateQuotaPlaceDtoSchema = Joi.object({
  placeId: Joi.string().required(),
  items: Joi.array()
    .items(
      Joi.object({
        day: Joi.string()
          .valid(
            'sunday',
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
          )
          .required(),
        quota: Joi.number().required().greater(0),
      }).required(),
    )
    .required(),
});

export const GetPlacesDtoSchema = Joi.object({
  limit: isNumberOfString('limit', 1).optional(),
  page: isNumberOfString('page', 1).optional(),
  search: Joi.string().optional().allow(''),
  category: Joi.string()
    .valid('GN', 'VL', 'CP', 'OA', 'PD', 'VC', 'GF', 'SBPT', 'AD', 'TC')
    .optional(),
  type: Joi.string()
    .valid(
      'RESERVATION',
      'PRODUCT',
      'SERVICE',
      'VOUCHER',
      'GIFT',
      'SUBSCRIPTION',
      'ADDON',
      'TICKET',
    )
    .optional(),
});

export const GetDetailPlaceDtoSchema = Joi.object({
  destinationId: Joi.string().required(),
  mcId: Joi.string().required(),
});

export const GetScheduleDestinationDtoSchema = Joi.object({
  categoryCode: Joi.string().required(),
  identifier: Joi.string().required(),
  startTime: isNumberOfString('startTime')
    .custom((value, helpers) => {
      const parseValue = parseInt(value, 10);
      if (!isUnixTimestamp(parseValue)) return helpers.error('any.custom');
      return value;
    })
    .messages({
      'any.custom': 'Invalid startTime',
    }),
  endTime: isNumberOfString('endTime')
    .custom((value, helpers) => {
      const parseValue = parseInt(value, 10);
      if (!isUnixTimestamp(parseValue)) return helpers.error('any.custom');
      return value;
    })
    .messages({
      'any.custom': 'Invalid endTime',
    }),
});

export type GetPlacesDto = {
  limit?: string;
  page?: string;
  search?: string;
  category?: string;
  type?: string;
};

export type GetDetailPlaceDto = {
  destinationId: string;
  mcId: string;
};

export type TCreateImagePlaceDest = {
  imageText: string;
  imageUrl?: string;
  primary: boolean;
  basecampId?: string;
};

export type TCreateFacilityPlaceDest = {
  name: string;
  description?: string;
  isAvailable: boolean;
  basecampId?: string;
};

export type TCreateActivityPlaceDest = {
  name: string;
  description?: string;
  isActive: boolean;
  duration: number;
};

export type TCreateQuotaPlaceDest = {
  day: TDays;
  value: number;
  basecampId?: string;
};

type TBaseCreatePlaceDestination = {
  name: string;
  address: string;
  isActive: boolean;
  latitude: string;
  longitude: string;
  city: string;
  province: string;
  country: string;
  images: TCreateImagePlaceDest[];
  facilities: TCreateFacilityPlaceDest[];
  quota: TCreateQuotaPlaceDest[];
};

export type TCreateBasecampPlaceDest = TBaseCreatePlaceDestination & {
  description?: string;
  phoneNumber?: string;
  price: number;
  priceBeforeDiscount: number;
  email: string;
};

export type CreatePlaceDestinationDto = TBaseCreatePlaceDestination & {
  description: string;
  price?: number;
  priceBeforeDiscount?: number;
  altitude: number;
  phoneNumber?: string;
  type: TOrderType;
  website?: string;
  categoryId: string;
  activities: TCreateActivityPlaceDest[];
  basecamp?: TCreateBasecampPlaceDest[];
};

type TItemQuotaPlace = {
  day: TDays;
  quota: number;
};
export type CreateQuotaPlaceDto = {
  placeId: string;
  items: TItemQuotaPlace[];
};

type TImagesPlace = {
  image_url: string | null;
  image_text: string;
  is_primary: number;
};

type TFacilitiesPlace = {
  description: string | null;
  name: string;
};

type TQuotaPlace = {
  day: string;
  value: number;
};

type TResponsePlaceBase = {
  name: string;
  description: string;
  latitude: string;
  longitude: string;
  address: string;
  city: string;
  province: string;
  country: string;
};
type TBasecampPlace = TResponsePlaceBase & {
  id: string;
  facilities: TFacilitiesPlace[];
  price_bc: number;
  price_before_discount_bc?: number;
  discount_bc?: number;
  quota_place: TQuotaPlace[];
  images: TImagesPlace[];
};
export type TResponseQueryGetDetailPlace = TResponsePlaceBase & {
  type: string;
  price: number;
  price_before_discount?: number;
  discount?: number;
  altitude?: number;
  website?: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  seo_url: string;
  category: string;
  category_code: string;
  basecamp: TBasecampPlace[];
  facilities: TFacilitiesPlace[];
  quota_place: TQuotaPlace[];
  images: TImagesPlace[];
  activities: {
    description: string | null;
    name: string;
    duration: number;
  }[];
};

export type TResponseQueryGetPlaces = TResponsePlaceBase & {
  id: string;
  seller_id: string;
  type: string;
  slug: string;
  price: number;
  price_before_discount?: number;
  discount?: number;
  altitude?: number;
  category: string;
  category_code: string;
  thumbnail_url: string;
  thumbnail_text: string;
  is_active: number;
};

export type TRawQueryQuotaPlace = {
  day: string;
}[];

export type TDestinationTypeConfig = {
  id: number;
  value: string;
};

export type TDestinationConfig = { destination_type: TDestinationTypeConfig[] };

export type TRawQueryGetSchedule = {
  full_date: string;
};

export type GetScheduleDestinationDto = {
  identifier: string;
  categoryCode: string;
  startTime: string;
  endTime: string;
};
