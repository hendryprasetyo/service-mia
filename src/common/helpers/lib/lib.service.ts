import * as Moment from 'moment';
import { Response } from 'express';
import { formatResBodyDto } from 'src/common/dtos/dto';
import { CustomHttpException } from './exception';

const responseHttpHandler = (dataObj: {
  response: Response;
  status: number;
  metaData: formatResBodyDto;
}) => {
  const { response, status, metaData } = dataObj;
  return response.status(status).send(metaData);
};

const handleStatusAndMessage = (
  exception: CustomHttpException,
): { statusCode: string; message: string; transactionid?: string } => {
  const statusToString = exception.getStatus().toString();
  let statusCode = '00000';
  const transactionid = exception?.additionalInfo?.transactionid;
  const message = exception.message || 'Internal Server Error';
  if (statusToString.startsWith('2')) statusCode = '00201';
  if (statusToString.startsWith('3')) statusCode = '00300';
  if (statusToString.startsWith('4') && !exception.cause) statusCode = '00400';
  if (statusToString.startsWith('5')) statusCode = '00500';
  statusCode = exception.cause ? (exception.cause as string) : statusCode;

  return { statusCode, message, transactionid };
};

const formatCurrency = (
  number = 0,
  currency = 'IDR',
  country = 'id-ID',
): string =>
  new Intl.NumberFormat(country, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(number);

const isValidNIK = (nik: string): boolean => {
  if (!/^\d{16}$/.test(nik)) return false;

  // Memecah NIK menjadi bagian-bagian yang relevan
  const tanggalLahir = nik.slice(6, 12); // 6 digit berikutnya (tanggal lahir DDMMYY)

  // Ekstrak bagian tanggal, bulan, dan tahun
  const day = tanggalLahir.slice(0, 2);
  const month = tanggalLahir.slice(2, 4);
  const year = tanggalLahir.slice(4, 6);

  // Tentukan tahun penuh (misalnya, 99 untuk 1999, 00 untuk 2000)
  const fullYear = parseInt(year, 10) + (parseInt(year, 10) < 22 ? 2000 : 1900);
  // Cek apakah tanggal lahir valid menggunakan moment.js
  const birthDate = Moment(`${fullYear}-${month}-${day}`, 'YYYY-MM-DD');
  if (!birthDate.isValid()) return false;

  // Jika semua cek lolos, maka NIK valid
  return true;
};

const markerData = (
  value: string | number,
  type: 'email' | 'nik' | 'username',
  maskLength: number = 4,
  maskChar: string = '*',
): string => {
  // Helper function untuk masking data
  const maskString = (
    str: string,
    type: 'email' | 'nik' | 'username',
    maskLength: number,
    maskChar: string,
  ): string => {
    const len = str.length;

    if (len <= maskLength) {
      return maskChar.repeat(len); // Jika panjang string lebih pendek dari maskLength, mask seluruhnya
    }

    // Untuk email
    if (type === 'email') {
      const [local, domain] = str.split('@');
      const localMasked = local.slice(0, 2) + maskChar.repeat(local.length - 2); // Menutupi nama pengguna, kecuali 2 karakter pertama
      return `${localMasked}@${domain}`;
    }

    // Untuk NIK (Nomor Induk Kependudukan)
    if (type === 'nik') {
      return str.slice(0, 3) + maskChar.repeat(len - 5) + str.slice(-2); // Menutupi angka di tengah, kecuali 3 digit pertama dan 2 digit terakhir
    }

    // Untuk Username
    if (type === 'username') {
      return str.slice(0, 3) + maskChar.repeat(len - 6) + str.slice(-3); // Menutupi sebagian besar karakter, kecuali 3 karakter pertama dan 3 karakter terakhir
    }

    return str;
  };

  // Pastikan nilai yang diberikan adalah string atau angka
  if (typeof value === 'string' || typeof value === 'number') {
    return maskString(String(value), type, maskLength, maskChar);
  }

  return value; // Jika tidak valid, kembalikan nilai asli
};

const formatNoOrder = (subKey: string) => {
  return `${Moment().utcOffset(7).format('YYMMDD')}${subKey.toUpperCase()}${Moment().utcOffset(7).format('HHmmssSSS')}`;
};

const generateTrxId = (): string => {
  const appId = 'ESWB';
  const identifierString = '00000';
  const timeStamp = Moment().format('YYMMDDHHmmssSSS');
  const changeableDigit = '0';

  return [appId, timeStamp, identifierString, changeableDigit].join('');
};

const sanitizeNulls = <T>(data: T): T => {
  const sanitized = {} as T;
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      sanitized[key] = data[key] === null ? ('' as any) : data[key];
    }
  }
  return sanitized;
};

const calculatePrice = (dataObj: {
  priceBeforeDiscVal: number;
  priceVal?: number;
  discountVal?: number;
  type: 'percentage' | 'non-percentage';
}) => {
  const { priceVal, type, discountVal, priceBeforeDiscVal } = dataObj;
  if (type === 'percentage' && discountVal >= 0) {
    return (priceBeforeDiscVal * discountVal) / 100;
  }
  if (type === 'non-percentage' && priceVal >= 0) {
    return ((priceBeforeDiscVal - priceVal) / priceBeforeDiscVal) * 100;
  }
  return priceBeforeDiscVal;
};

export default {
  responseHttpHandler,
  handleStatusAndMessage,
  formatCurrency,
  isValidNIK,
  markerData,
  formatNoOrder,
  generateTrxId,
  sanitizeNulls,
  calculatePrice,
};
