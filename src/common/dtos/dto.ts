import * as Joi from 'joi';
import { Request } from 'express';
import * as Moment from 'moment';
import * as mysql from 'mysql2/promise';

export const validateEmail = Joi.string()
  .email({
    tlds: { allow: false },
  })
  .messages({
    'string.base': 'email must be a string.',
    'string.empty': 'email is required.',
    'string.email': 'email must be a valid email address.',
    'any.required': 'email is required.',
  });

export const isNumberOfString = (param: string, min?: number) =>
  Joi.string()
    .pattern(/^[0-9]+$/, `${param} must be a numeric string`)
    .custom((value, helpers) => {
      const number = parseInt(value, 10);
      if (min !== undefined && number < min) return helpers.error('any.custom');
      return value;
    })
    .messages({
      'any.required': `${param}  is required.`,
      'any.custom': `Invalid value ${param}`,
      'string.pattern.base': `${param} must be a numeric string.`,
    });

export type TChannelId = 'web' | 'mobile';
export class HeadersDto {
  transactionid: string;
  language: 'id' | 'en';
  platform: 'WEB' | 'ANDROID' | 'IOS';
  channelid: TChannelId;
  deviceid: string;
  'wildbook-version'?: string;
  authorization?: string;
}

export class ErrorEncryptionDto {
  isHelperFail: boolean;
  message: string;
  data: {
    status: number;
    status_code: string;
    status_desc: string;
  };
}

export class ObjectDto {
  [key: string]: unknown;
}

export class formatResBodyDto {
  statusCode: string;
  message: string;
  data: ObjectDto;
  transactionid: string;
}

export interface AuthRequest extends Request {
  auth: { id: string; role: string; iat: number; exp: number };
}

export type TTranslations = {
  id: string;
  en: string;
};

export type TLanguage = 'id' | 'en';
export type TGender = 'male' | 'female' | 'other';
export type TParamsCallApi = {
  transactionid: string;
  headers?: ObjectDto;
  payload?: ObjectDto;
  method: 'get' | 'delete' | 'post' | 'put' | 'patch';
  baseURL: string;
  url: string;
  timeout?: number;
  serverKey?: string;
  logName?: string;
  provider?: string;
};

export type TDays =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

export type TOrderSubType =
  | 'GN'
  | 'VL'
  | 'CP'
  | 'OA'
  | 'PD'
  | 'VC'
  | 'GF'
  | 'SBPT'
  | 'AD'
  | 'TC';

export type TOrderType =
  | 'RESERVATION'
  | 'PRODUCT'
  | 'SERVICE'
  | 'VOUCHER'
  | 'GIFT'
  | 'SUBSCRIPTION'
  | 'ADDON'
  | 'TICKET';

export const isUnixTimestamp = (
  value: number,
  orderSubType?: string,
): boolean => {
  const timestampMoment = Moment(value).format('HH:mm:ss');
  if (value <= 0) return false;

  if (orderSubType && ['GN', 'CP', 'OA'].includes(orderSubType)) {
    return timestampMoment === '00:00:00';
  }

  return true;
};
export const isValidStartTime = (
  value: number,
  orderSubType?: string,
): boolean => {
  if (orderSubType && !isUnixTimestamp(value, orderSubType)) return false;

  if (orderSubType && ['VL'].includes(orderSubType)) {
    return Moment(value).format('HH:mm:ss') === '14:00:00';
  }
  const startDate = Moment(value).startOf('day');
  const today = Moment().startOf('day');
  return startDate.isSameOrAfter(today);
};

export const isValidBirthDay = (value: number): boolean => {
  const birthDate = Moment(value).startOf('day');
  const today = Moment().startOf('day');
  const ageInYears = today.diff(birthDate, 'years');
  return ageInYears >= 1;
};

export const isValidEndTime = (
  value: number,
  orderSubType?: string,
): boolean => {
  if (orderSubType && !isUnixTimestamp(value, orderSubType)) return false;

  if (orderSubType && ['VL'].includes(orderSubType)) {
    return Moment(value).format('HH:mm:ss') === '12:00:00';
  }

  const endDate = Moment(value).startOf('day');
  const todayPlusOneDay = Moment().startOf('day');
  return endDate.isAfter(todayPlusOneDay);
};

export type TParamRawQuery = string | number | Date | boolean | Buffer;

export type TExecuteRawQuery = {
  query: string;
  params?: TParamRawQuery[];
  transactionid: string;
  pool?: mysql.PoolConnection;
  logName?: string;
  isWriteOperation?: boolean;
};
export const latitudeString = Joi.string()
  .pattern(/^[-+]?[0-9]*\.?[0-9]+$/)
  .custom((value, helpers) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < -90 || num > 90) {
      return helpers.error('latitude.invalid');
    }
    return value;
  }, 'Latitude Validation')
  .messages({
    'latitude.invalid': 'invalid latitude',
    'string.pattern.base': 'invalid latitude',
    'any.required': 'latitude is required',
  });

export const longitudeString = Joi.string()
  .pattern(/^[-+]?[0-9]*\.?[0-9]+$/)
  .custom((value, helpers) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < -180 || num > 180) {
      return helpers.error('longitude.invalid');
    }
    return value;
  }, 'Longitude Validation')
  .messages({
    'longitude.invalid': 'invalid longitude',
    'string.pattern.base': 'invalid longitude',
    'any.required': 'longitude is required',
  });
