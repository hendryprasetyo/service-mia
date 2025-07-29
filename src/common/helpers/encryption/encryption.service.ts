import * as _ from 'lodash';
// import * as Path from 'path';
// import * as FS from 'fs';
import * as Crypto from 'crypto';
import * as JWT from 'jsonwebtoken';
import { Injectable } from '@nestjs/common';

type TValueJWT = {
  [key: string]: unknown;
};
// const PrivateFile = Path.join(__dirname, '../../../../assets/private.pem');
@Injectable()
export class EncryptionService {
  private generateKeyFromIdentifier(identifier: string): Buffer {
    const salt = Buffer.from(identifier);
    return Crypto.pbkdf2Sync(identifier, salt, 100000, 32, 'sha256');
  }
  public encryptPayload(value: string | number | object): string {
    try {
      if (!value) {
        throw {
          message: 'VALUE IS REQUIRED',
          status: 400,
          status_code: '01400',
        };
      }
      let formatValue: string;
      const key = Buffer.from(process.env.SECRET_KEY_ENCRYPT_PAYLOAD, 'hex');
      const iv = Buffer.from(process.env.IV_KEY_ENCRYPT_PAYLOAD, 'hex');

      if (typeof value === 'object') {
        formatValue = JSON.stringify(value);
      }

      if (typeof value === 'string' || typeof value === 'number') {
        formatValue = value.toString();
      }

      const cipher = Crypto.createCipheriv('aes-256-cbc', key, iv);

      let encrypted = cipher.update(formatValue, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return encrypted;
    } catch (error) {
      throw {
        isHelperFail: true,
        message: error.message,
        data: {
          status: error?.status || 422,
          status_code: error?.status_code || '01422',
          status_desc: 'Unprocessable Entity',
        },
      };
    }
  }

  /**
   * Decrypt payload with the ability to return different types of data based on the generic type.
   * @param value - The encrypted string.
   * @param returnType - The type of the result, can be 'string' or 'object'.
   * @returns Decrypted data, either a string or an object based on the returnType.
   */
  public decryptPayload<T>(
    value: string,
    returnType: 'string' | 'object' = 'string',
  ): T {
    try {
      if (_.isEmpty(value)) {
        throw {
          message: 'VALUE IS REQUIRED',
          status: 400,
          status_code: '01400',
        };
      }

      const key = Buffer.from(process.env.SECRET_KEY_ENCRYPT_PAYLOAD, 'hex');
      const iv = Buffer.from(process.env.IV_KEY_ENCRYPT_PAYLOAD, 'hex');

      const decipher = Crypto.createDecipheriv('aes-256-cbc', key, iv);

      let decrypted = decipher.update(value, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      if (!decrypted) throw new Error('VALUE DECRYPT EMPTY');

      if (returnType === 'object') {
        try {
          return JSON.parse(decrypted) as T;
        } catch (error) {
          throw {
            status_code: '01411',
            message: 'FAILED PARSE DATA',
          };
        }
      }

      return decrypted as T;
    } catch (error) {
      throw {
        isHelperFail: true,
        message: error.message,
        data: {
          status: error?.status || 422,
          status_code: error?.status_code || '01422',
          status_desc: 'Unprocessable Entity',
        },
      };
    }
  }

  public encryptEntityID(value: string): string {
    try {
      if (_.isEmpty(value)) {
        throw {
          message: 'VALUE IS REQUIRED',
          status: 400,
          status_code: '01400',
        };
      }

      const cipherAlgorithm = process.env.ENTITY_ID_CIPHER_ALGORITHM;
      const cipherPassword = process.env.ENTITY_ID_CIPHER_PASSWORD;
      const cipherIV = process.env.ENTITY_ID_CIPHERIV;
      const cipher = Crypto.createCipheriv(
        cipherAlgorithm,
        Buffer.from(cipherPassword),
        cipherIV,
      );
      let encrypted = cipher.update(value);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      return encrypted.toString('hex');
    } catch (error) {
      throw {
        isHelperFail: true,
        message: error.message,
        data: {
          status: error?.status || 422,
          status_code: error?.status_code || '01422',
          status_desc: 'Unprocessable Entity',
        },
      };
    }
  }

  public decryptEntityID(value: string): string {
    try {
      if (_.isEmpty(value)) {
        throw {
          message: 'VALUE IS REQUIRED',
          status: 400,
          status_code: '01400',
        };
      }

      const cipherAlgorithm = process.env.ENTITY_ID_CIPHER_ALGORITHM;
      const cipherPassword = process.env.ENTITY_ID_CIPHER_PASSWORD;
      const cipherIV = process.env.ENTITY_ID_CIPHERIV;
      const decipher = Crypto.createDecipheriv(
        cipherAlgorithm,
        Buffer.from(cipherPassword),
        cipherIV,
      );
      let decrypted = decipher.update(Buffer.from(value, 'hex'));
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    } catch (error) {
      throw {
        isHelperFail: true,
        message: error.message,
        data: {
          status: error?.status || 422,
          status_code: error?.status_code || '01422',
          status_desc: 'Unprocessable Entity',
        },
      };
    }
  }

  public encryptOrderID(value: string): string {
    try {
      if (_.isEmpty(value)) {
        throw {
          message: 'VALUE IS REQUIRED',
          status: 400,
          status_code: '01400',
        };
      }

      const iv = Crypto.randomBytes(16);
      const key = Buffer.from(process.env.ORDER_ID_ENCRYPTION_KEY, 'hex');
      const cipher = Crypto.createCipheriv('aes-256-gcm', key, iv);

      let encrypted = cipher.update(value, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();
      const result = iv.toString('hex') + encrypted + authTag.toString('hex');
      return result;
    } catch (error) {
      throw {
        isHelperFail: true,
        message: error.message,
        data: {
          status: error?.status || 422,
          status_code: error?.status_code || '01422',
          status_desc: 'Unprocessable Entity',
        },
      };
    }
  }

  public decryptOrderID(value: string): string {
    try {
      if (_.isEmpty(value)) {
        throw {
          message: 'VALUE IS REQUIRED',
          status: 400,
          status_code: '01400',
        };
      }

      const iv = Buffer.from(value.slice(0, 32), 'hex');
      const cipherText = value.slice(32, -32);
      const authTag = Buffer.from(value.slice(-32), 'hex');

      const key = Buffer.from(process.env.ORDER_ID_ENCRYPTION_KEY, 'hex');

      const decipher = Crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(cipherText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw {
        isHelperFail: true,
        message: error.message,
        data: {
          status: error?.status || 422,
          status_code: error?.status_code || '01422',
          status_desc: 'Unprocessable Entity',
        },
      };
    }
  }

  public generateTokenJWT(dataObj: {
    value: TValueJWT;
    tokenSecret: string;
    exp: string;
  }): string {
    const { value, tokenSecret, exp } = dataObj;

    return JWT.sign(value, tokenSecret, {
      expiresIn: exp,
    });
  }

  public async verifyTokenJwt<T>(token: string, secret: string): Promise<T> {
    try {
      const decoded = await JWT.verify(token, secret);
      return decoded;
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        err.message = 'Token has expired';
        err.status = 400;
        err.status_code = '11403';
      } else if (err.name === 'JsonWebTokenError') {
        err.message = 'Invalid token payload';
        err.status = 400;
        err.status_code = '01400';
      }
      throw {
        isHelperFail: true,
        message: err.message,
        data: {
          status: err?.status || 422,
          status_code: err?.status_code || '01422',
          status_desc: 'Unprocessable Entity',
        },
      };
    }
  }

  public encryptIdentifier(identifier: string): string {
    try {
      if (_.isEmpty(identifier)) {
        throw {
          message: 'VALUE IS REQUIRED',
          status: 400,
          status_code: '01400',
        };
      }
      const cipherAlgorithm = process.env.IDENTIFIER_CIPHER_ALGORITHM;
      const cipherPassword = process.env.IDENTIFIER_CIPHER_PASSWORD;
      const cipherIdentityIV = process.env.IDENTIFIER_AUTH_IDENTITYIV;

      const iv = Buffer.from(cipherIdentityIV, 'hex');
      const cipher = Crypto.createCipheriv(
        cipherAlgorithm,
        Buffer.from(cipherPassword),
        iv,
      );
      let encrypted = cipher.update(identifier);
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      return `${iv.toString('hex')}-${encrypted.toString('hex')}`;
    } catch (error) {
      throw {
        isHelperFail: true,
        message: error.message,
        data: {
          status: error?.status || 422,
          status_code: error?.status_code || '01422',
          status_desc: 'Unprocessable Entity',
        },
      };
    }
  }

  public decryptIdentifier(identifier: string): string {
    try {
      const cipherAlgorithm = process.env.IDENTIFIER_CIPHER_ALGORITHM;
      const cipherPassword = process.env.IDENTIFIER_CIPHER_PASSWORD;

      const textParts = identifier.split('-');
      const iv = Buffer.from(textParts.shift(), 'hex');
      const encryptedText = Buffer.from(textParts.join(':'), 'hex');
      const decipher = Crypto.createDecipheriv(
        cipherAlgorithm,
        Buffer.from(cipherPassword),
        iv,
      );
      let decrypted = decipher.update(encryptedText);

      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString();
    } catch (error) {
      throw {
        isHelperFail: true,
        message: error.message,
        data: {
          status: error?.status || 422,
          status_code: error?.status_code || '01422',
          status_desc: 'Unprocessable Entity',
        },
      };
    }
  }

  public encryptFileBytes(value: Buffer, identifier: string): Buffer {
    try {
      if (_.isEmpty(value)) {
        throw {
          message: 'VALUE IS REQUIRED',
          status: 400,
          status_code: '01400',
        };
      }
      const algorithm = 'aes-256-cbc';

      const key = this.generateKeyFromIdentifier(identifier);
      const iv = Crypto.randomBytes(16);

      const cipher = Crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(value);
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      return Buffer.concat([iv, encrypted]);
    } catch (error) {
      throw {
        isHelperFail: true,
        message: error.message,
        data: {
          status: error?.status || 422,
          status_code: error?.status_code || '01422',
          status_desc: 'Unprocessable Entity',
        },
      };
    }
  }

  public decryptFileBytes(encryptData: Buffer, identifier: string): Buffer {
    try {
      if (_.isEmpty(encryptData)) {
        throw {
          message: 'VALUE IS REQUIRED',
          status: 400,
          status_code: '01400',
        };
      }
      const algorithm = 'aes-256-cbc';

      const key = this.generateKeyFromIdentifier(identifier);

      const iv = encryptData.slice(0, 16);
      const encryptedText = encryptData.slice(16);

      const decipher = Crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted;
    } catch (error) {
      throw {
        isHelperFail: true,
        message: error.message,
        data: {
          status: error?.status || 422,
          status_code: error?.status_code || '01422',
          status_desc: 'Unprocessable Entity',
        },
      };
    }
  }

  // public encryptWithPrivateKey(value: string) {
  //   try {
  //     const privateKey = FS.readFileSync(PrivateFile, 'utf8');
  //     const buffer = Buffer.from(value);
  //     const encrypted = Crypto.publicEncrypt(privateKey, buffer);
  //     return encrypted.toString('base64');
  //   } catch (error) {
  //     throw {
  //       isHelperFail: true,
  //       message: error.message,
  //       data: {
  //         status: error?.status || 422,
  //         status_code: error?.status_code || '01422',
  //         status_desc: 'Unprocessable Entity',
  //       },
  //     };
  //   }
  // }

  // public decryptWithPrivateKey<T>(value: string): T | string {
  //   try {
  //     const privateKey = FS.readFileSync(PrivateFile, 'utf8');
  //     const buffer = Buffer.from(value, 'base64');
  //     const decrypted = Crypto.privateDecrypt(privateKey, buffer);
  //     return decrypted.toString('utf8') as T;
  //   } catch (error) {
  //     throw {
  //       isHelperFail: true,
  //       message: error.message,
  //       data: {
  //         status: error?.status || 422,
  //         status_code: error?.status_code || '01422',
  //         status_desc: 'Unprocessable Entity',
  //       },
  //     };
  //   }
  // }
}
