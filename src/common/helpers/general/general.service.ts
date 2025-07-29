import * as _ from 'lodash';
import * as QS from 'qs';
import * as https from 'https';
import * as Fs from 'fs/promises';
import * as Moment from 'moment';
import { Injectable } from '@nestjs/common';
import Axios, { AxiosRequestConfig } from 'axios';
import { TParamsCallApi } from 'src/common/dtos/dto';
import { LoggerServiceImplementation } from '../logger/logger.service';
export type ValidationRule =
  | 'isEmail'
  | 'isNumOfString'
  | 'isUrl'
  | 'isNotSpace'
  | 'isAlphanumeric'
  | 'isAlpha'
  | 'isPassword'
  | `min:${number}` // untuk min dengan angka tertentu
  | `max:${number}`; // untuk max dengan angka tertentu

@Injectable()
export class GeneralService {
  constructor(private readonly logger: LoggerServiceImplementation) {}

  private __getHeaders(headers) {
    const res: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    if (headers?.Accept) {
      res.Accept = headers.Accept;
    }

    if (headers?.Authorization) {
      res.Authorization = headers.Authorization;
    }

    if (headers?.['Content-Type']) {
      res['Content-Type'] = headers['Content-Type'];
    }

    return headers;
  }

  public async readFromFile<T>(file: string, raw: boolean = false): Promise<T> {
    try {
      const content = await Fs.readFile(file, 'utf-8');

      if (!raw) {
        return JSON.parse(content.toString()) as T;
      }

      return content as unknown as T;
    } catch (error) {
      throw {
        isHelperFail: true,
        message: error.message,
        data: {
          status: 500,
          status_code: '01500',
          status_desc: 'Internal Server Error',
        },
      };
    }
  }

  public async callAPI<T>(dataObj: TParamsCallApi): Promise<T> {
    const timeStart = process.hrtime();
    const {
      headers,
      method,
      baseURL,
      timeout,
      payload,
      serverKey,
      logName = 'Call API',
      transactionid,
      provider,
    } = dataObj;
    let { url } = dataObj;

    let configTimeout = timeout;
    if (!timeout) {
      configTimeout = Number(process.env.DEFAULT_TIMEOUT_SUROUNDING);
    }
    const configHeaders = this.__getHeaders(headers);
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
      requestCert: true,
    });
    const requestConfig: AxiosRequestConfig = {
      headers: configHeaders,
      baseURL,
      timeout: configTimeout,
      proxy: false,
      ...(serverKey && { auth: { username: serverKey, password: '' } }),
    };

    if (process.env.NODE_ENV !== 'production') {
      Object.assign(requestConfig, { httpsAgent });
    }

    try {
      let requestPayload = null;
      if (
        payload &&
        (method === 'post' || method === 'put' || method === 'patch')
      ) {
        requestPayload = payload;
      }

      if (!_.isEmpty(payload) && (method === 'get' || method === 'delete')) {
        url = `${url}?${QS.stringify(payload)}`;
      }

      this.logger.log([logName, 'Request', 'INFO'], {
        request: Object.assign(requestConfig, { method, url }),
        payload: requestPayload,
      });
      const instance = Axios.create(requestConfig);
      const response = await instance[method](url, requestPayload);
      const timeDiff = process.hrtime(timeStart);
      const timeTaken = Math.round((timeDiff[0] * 1e9 + timeDiff[1]) / 1e6);
      const logData = {
        transactionid: transactionid,
        timeTaken,
        status: response?.status,
        uri: `${requestConfig.baseURL}${url}`,
        response: response.data,
      };
      this.logger.log([logName, 'Response', 'INFO'], logData);
      return response.data as T;
    } catch (error) {
      const timeDiff = process.hrtime(timeStart);
      const timeTaken = Math.round((timeDiff[0] * 1e9 + timeDiff[1]) / 1e6);

      if (error.response) {
        const httpStatus =
          error.response.status === 401 && provider === 'midtrans'
            ? 500
            : error.response.status;
        const logData = {
          transactionid: transactionid,
          timeTaken,
          uri: `${requestConfig.baseURL}${url}`,
          status: error.response.status,
          error: error.response.data,
        };
        this.logger.error([logName, 'Response', 'ERROR'], logData);
        throw {
          isHelperFail: true,
          message: error.message,
          data: {
            status: httpStatus,
            status_code: `01${error.response.status}`,
            status_desc:
              httpStatus === 500 ? 'Internal Server Error' : 'Bad Request',
          },
        };
      }

      this.logger.error([logName, 'Response', 'ERROR'], {
        transactionid: transactionid,
        timeTaken,
        uri: `${requestConfig.baseURL}${url}`,
        error,
      });
      return Promise.reject(error);
    }
  }

  public isBlacklist(
    dataObj: { start_date: string; end_date: string }[],
  ): boolean {
    // Mendapatkan waktu saat ini
    const currentTime = Moment();

    // Loop untuk memeriksa setiap range tanggal
    const isBlacklisted = dataObj.some(({ start_date, end_date }) => {
      // Parsing start_date dan end_date menjadi integer (Unix timestamp)
      const parseStartDate = parseInt(start_date, 10);
      const parseEndDate = parseInt(end_date, 10);

      // Log untuk melihat nilai yang diproses
      this.logger.log(['Blacklist Check', 'Date Range', 'INFO'], {
        unixStartDate: start_date,
        unixEndDate: end_date,
        formatStartDate: Moment(parseStartDate),
        formatEndDate: Moment(parseEndDate),
      });

      // Validasi untuk memastikan nilai date adalah angka yang valid
      if (isNaN(parseStartDate) || isNaN(parseEndDate)) return false;

      // Mengonversi ke moment object
      const formatStartDate = Moment(parseStartDate);
      const formatEndDate = Moment(parseEndDate);

      // Memeriksa apakah currentTime berada di dalam range start dan end date
      return currentTime.isBetween(formatStartDate, formatEndDate, null, '[]');
    });

    return isBlacklisted;
  }

  public validateSqlInjection(
    inputs: {
      value: string;
      rules?: (ValidationRule | `min:${number}` | `max:${number}`)[];
    }[],
  ): void {
    // Regex untuk format email
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    // Regex untuk format URL (simple)
    const urlPattern = /^(https?:\/\/)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/\S*)?$/;

    // Regex untuk alphanumeric (huruf dan angka)
    const alphanumericPattern = /^[a-zA-Z0-9]+$/;

    // Regex untuk hanya huruf
    const alphaPattern = /^[a-zA-Z ]+$/;

    // Regex untuk hanya angka
    const numericPattern = /^[0-9]+$/;

    // SQL injection patterns
    const sqlInjectionPatterns = [
      /union.*select/i, // "UNION SELECT"
      /select.*from/i, // "SELECT FROM"
      /drop\s+table/i, // "DROP TABLE"
      /insert\s+into/i, // "INSERT INTO"
      /delete\s+from/i, // "DELETE FROM"
      /update\s+set/i, // "UPDATE SET"
      /--/i, // SQL comment "--"
      /\*/i, // Wildcard "*"
      /;|--|\/\*/i, // Semicolon or comments
      /@|\bexec\b/i, // EXEC command or dangerous symbols
      /like\s+\(/i, // LIKE statement with open parenthesis
      /;\s*--/i, // Semicolon followed by comment
      /--\s*\r?\n/i, // Comment sequence with line break
      /\b(or|and)\b\s+\d{1,}/i, // AND/OR with number after
    ];

    // Helper function untuk validasi email
    const validateEmail = (value: string) => emailPattern.test(value);

    // Helper function untuk validasi URL
    const validateUrl = (value: string) => urlPattern.test(value);

    // Helper function untuk validasi hanya angka
    const validateNumeric = (value: string) => numericPattern.test(value);

    // Helper function untuk validasi hanya alphanumeric
    const validateAlphanumeric = (value: string) =>
      alphanumericPattern.test(value);

    // Helper function untuk validasi hanya huruf
    const validateAlpha = (value: string) => alphaPattern.test(value);

    // Helper function untuk validasi tidak mengandung spasi
    const validateNotSpace = (value: string) => !/\s/.test(value);

    // Helper function untuk validasi panjang minimum
    const validateMinLength = (value: string, minLength: number) =>
      value.length >= minLength;

    // Helper function untuk validasi panjang maksimum
    const validateMaxLength = (value: string, maxLength: number) =>
      value.length <= maxLength;

    try {
      for (const input of inputs) {
        const { value, rules } = input;
        // Check for SQL injection
        if (!validateEmail(value) && !rules?.includes('isPassword')) {
          // Check for SQL injection
          const isInjectionRisk = sqlInjectionPatterns.some((pattern) =>
            pattern.test(value),
          );
          if (isInjectionRisk) {
            throw {
              message: `SQL injection detected in input: ${value}`,
              uniqueMessage: 'Bad Request',
            };
          }
        }

        // Check each validation rule in 'rules' array
        if (rules !== undefined && rules.length) {
          for (const rule of rules) {
            const [ruleName, ...params] = rule.split(':'); // e.g., 'min:5' -> ['min', '5']
            switch (ruleName) {
              case 'isEmail':
                if (value && !validateEmail(value)) {
                  throw { message: 'Invalid email format' };
                }
                break;
              case 'isUrl':
                if (value && !validateUrl(value)) {
                  throw { message: `Invalid URL format: ${value}` };
                }
                break;
              case 'isNumOfString':
                if (value && !validateNumeric(value)) {
                  throw {
                    message: `Value must only contain numbers: ${value}`,
                  };
                }
                break;
              case 'isAlphanumeric':
                if (value && !validateAlphanumeric(value)) {
                  throw {
                    message: `Value must only contain letters and numbers: ${value}`,
                  };
                }
                break;
              case 'isAlpha':
                if (value && !validateAlpha(value)) {
                  throw {
                    message: `Value must only contain letters: ${value}`,
                  };
                }
                break;
              case 'isNotSpace':
                if (value && !validateNotSpace(value)) {
                  throw { message: `Value must not contain spaces: ${value}` };
                }
                break;
              case 'min':
                const minLength = parseInt(params[0], 10);
                if (value && !validateMinLength(value, minLength)) {
                  throw {
                    message: `Value must be at least ${minLength} characters long: ${value}`,
                  };
                }
                break;
              case 'max':
                const maxLength = parseInt(params[0], 10);
                if (!validateMaxLength(value, maxLength)) {
                  throw {
                    message: `Value must be at most ${maxLength} characters long: ${value}`,
                  };
                }
                break;
            }
          }
        }
      }
    } catch (error) {
      throw {
        isHelperFail: true,
        message: error.message,
        data: {
          status: 400,
          status_code: '44400',
          status_desc: error.uniqueMessage || error.message,
        },
      };
    }
  }

  public async validateImageBase64(dataObj: {
    maxSizeKB: number;
    base64: string;
    allowedFormats?: string[];
  }) {
    try {
      const { base64, allowedFormats = ['jpeg', 'png'], maxSizeKB } = dataObj;
      const matches = base64.match(/^data:image\/(png|jpeg|jpg);base64,/);
      if (!matches) {
        throw {
          message:
            'Format Base64 tidak valid atau tidak ada prefix data:image.',
        };
      }

      const format = matches[1].toLowerCase();
      if (!allowedFormats.includes(format)) {
        throw {
          message: `Format gambar tidak diizinkan. Hanya ${allowedFormats.join(', ')}`,
        };
      }

      const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
      const sizeKB = Buffer.byteLength(base64Data, 'base64') / 1024;
      if (sizeKB > maxSizeKB) {
        throw {
          message: `Ukuran gambar melebihi batas ${maxSizeKB} KB`,
        };
      }
    } catch (error) {
      throw {
        isHelperFail: true,
        message: error.message,
        data: {
          status: 400,
          status_code: '00400',
          status_desc: 'Bad Request',
        },
      };
    }
  }

  public validateFile(dataObj: {
    maxSizeKB: number;
    file: Express.Multer.File;
    allowedFormats: string[];
  }) {
    try {
      const { file, allowedFormats, maxSizeKB } = dataObj;
      const actualFileSize = file.size / 1024;
      if (actualFileSize > maxSizeKB) {
        throw {
          message: `File ${file.originalname} is too large. Max size is ${maxSizeKB}KB.`,
        };
      }
      if (!allowedFormats.includes(file.mimetype)) {
        throw {
          message: `File ${file.originalname} has an invalid format. Allowed formats: ${allowedFormats}`,
        };
      }
    } catch (error) {
      throw {
        isHelperFail: true,
        message: error.message,
        data: {
          status: 400,
          status_code: '00400',
          status_desc: 'Bad Request',
        },
      };
    }
  }
}
