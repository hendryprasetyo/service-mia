import * as _ from 'lodash';
import * as Path from 'path';
import { v6 as uuidv6 } from 'uuid';
import lib from 'src/common/helpers/lib/lib.service';
import { Injectable } from '@nestjs/common';
import { AuthRequest, HeadersDto } from 'src/common/dtos/dto';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { CustomHttpException } from 'src/common/helpers/lib/exception';
import { EncryptionService } from 'src/common/helpers/encryption/encryption.service';
import {
  TResponseQueryUserProfile,
  UpdateToSellerDto,
  UploadIdentityDto,
} from './user.dto';
import { DbService } from 'src/database/mysql/mysql.service';
import { GeneralService } from 'src/common/helpers/general/general.service';
import { PagesDto, TMenuList, TSubMenuList } from 'src/common/dtos/pages.dto';

const PAGES_PATH = Path.join(__dirname, '../../assets/pages.json');
@Injectable()
export class UserService {
  constructor(
    private pool: DbService,
    private generalService: GeneralService,
    private readonly logger: LoggerServiceImplementation,
    private readonly encryptionService: EncryptionService,
  ) {}

  private filterPageEnabledItems(items: (TMenuList | TSubMenuList)[]) {
    return items
      .filter((item) => item.is_enable === true)
      .map((item: TMenuList) => {
        delete item.is_enable;
        return {
          ...item,
          sub_menu_list: item.sub_menu_list
            ? this.filterPageEnabledItems(item.sub_menu_list)
            : [],
        };
      });
  }

  public async uploadIdentity(
    request: AuthRequest,
    reqBody: UploadIdentityDto,
    headers: HeadersDto,
  ) {
    const MAX_SIZE_KTP_IN_MB = process.env.MAX_SIZE_KTP_IN_MB || 5;
    const { transactionid } = headers;
    try {
      const auth = request.auth;
      const { identityType, image, nik } = reqBody;
      const userId = auth.id;

      const base64Pattern = /^data:image\/(png|jpeg|jpg);base64,/;
      const matches = image.match(base64Pattern);

      if (!matches)
        return new CustomHttpException('Invalid image format', 400, {
          cause: '01401',
        });

      const maxSizeInBytes = +MAX_SIZE_KTP_IN_MB * 1024 * 1024;
      const base64ImageSize = Buffer.byteLength(image, 'base64');
      if (base64ImageSize > maxSizeInBytes)
        return new CustomHttpException('Bad Request', 400, { cause: '01400' });

      if (!lib.isValidNIK(nik))
        return new CustomHttpException('Invalid NIK', 400, {
          cause: '01401',
        });

      const imageFormat = matches[0];
      const cleanedBase64Image = image.replace(base64Pattern, '');

      const buffer = Buffer.from(cleanedBase64Image, 'base64');
      const encryptedBuffer = this.encryptionService.encryptFileBytes(
        buffer,
        userId,
      );

      return await this.pool.executeInTransaction(
        transactionid,
        async (connection) => {
          await this.pool.executeRawQuery({
            transactionid,
            query: `
            INSERT INTO user_identity (
            id,
            image,
            user_id,
            format_base64,
            identity_type,
            no_identifier,
            created_at,
            updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            `,
            params: [
              uuidv6(),
              encryptedBuffer,
              userId,
              imageFormat,
              identityType,
              nik,
              new Date(),
              new Date(),
            ],
            logName: 'INSERT USER IDENTITY',
            pool: connection,
          });
          await this.pool.executeRawQuery({
            transactionid,
            query: `
            UPDATE users 
            SET verified = ?
            WHERE id = ?;
            `,
            params: [true, userId],
            logName: 'UPDATE USER VERIFIED',
            pool: connection,
          });
          return {};
        },
        'READ COMMITTED',
      );
    } catch (error) {
      this.logger.error(['User Service', 'Upload KTP', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });
      if (error?.code === 'ER_DUP_ENTRY' && error?.errno === 1062) {
        return Promise.resolve(
          new CustomHttpException('This identifier already used', 400, {
            cause: '01400',
          }),
        );
      }

      return Promise.reject(error);
    }
  }

  public async getUserIdentity(request: AuthRequest, headers: HeadersDto) {
    const { transactionid } = headers;
    try {
      const auth = request.auth;
      const userId = auth.id;

      const response = await this.pool.executeRawQuery<
        { image: Buffer; format_base64: string; no_identifier: string }[]
      >({
        transactionid,
        query: `SELECT image, format_base64, no_identifier FROM user_identity WHERE user_id = ?;`,
        logName: 'GET USER IDENTIFIER',
        params: [userId],
        isWriteOperation: false,
      });

      if (_.isEmpty(response))
        return new CustomHttpException('Bad Request', 400);

      const decryptImage = this.encryptionService.decryptFileBytes(
        response[0].image,
        userId,
      );
      const image = `${response[0].format_base64} ${decryptImage.toString('base64')}`;

      return { image_identiy: image, no_identifier: response[0].no_identifier };
    } catch (error) {
      this.logger.error(['User Service', 'Get User Identity', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });
      return Promise.reject(error);
    }
  }

  public async getUserProfile(request: AuthRequest, headers: HeadersDto) {
    const { transactionid } = headers;
    try {
      const auth = request.auth;
      const userId = auth.id;

      const response = await this.pool.executeRawQuery<
        TResponseQueryUserProfile[]
      >({
        transactionid,
        query: `SELECT 
                  u.username,
                  u.verified,
                  u.phone_number,
                  u.email,
                  up.first_name,
                  up.last_name,
                  up.customer_name,
                  up.other_person_name,
                  up.salutation,
                  up.avatar_text,
                  up.avatar,
                  up.nationality,
                  up.gender,
                  up.country,
                  up.city,
                  up.province,
                  up.district,
                  up.main_phone_number,
                  up.date_of_birth,
                  up.secondary_email,
                  up.other_person_phone_number,
                  up.emergency_phone_number,
                  up.emergency_email
                FROM users u
                JOIN user_profiles up ON u.id = up.user_id
                WHERE u.id = ? AND u.is_deleted = ?;`,
        logName: 'GET USER PROFILE',
        params: [userId, 0],
        isWriteOperation: false,
      });

      if (_.isEmpty(response))
        return new CustomHttpException('Bad Request', 400);

      const sanitized = lib.sanitizeNulls<TResponseQueryUserProfile>(
        response[0],
      );
      const constructResponse = {
        ...sanitized,
        verified: response[0].verified === 1,
        display_email: lib.markerData(sanitized.email, 'email'),
        display_phone_number: sanitized.phone_number
          ? lib.markerData(sanitized.phone_number, 'username')
          : sanitized.phone_number,
      };
      return constructResponse;
    } catch (error) {
      this.logger.error(['User Service', 'User Profile', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });
      return Promise.reject(error);
    }
  }

  public async updateToSeller(
    request: AuthRequest,
    headers: HeadersDto,
    reqBody: UpdateToSellerDto,
  ) {
    const { transactionid } = headers;
    try {
      const { name, bio } = reqBody;
      const userId = request.auth.id;
      this.generalService.validateSqlInjection([{ value: name }]);
      return await this.pool.executeInTransaction(
        transactionid,
        async (connection) => {
          const getUser = await this.pool.executeRawQuery<{ email: string }[]>({
            transactionid,
            query: `
            SELECT email
            FROM users
            WHERE id = ?
            FOR UPDATE;
            `,
            params: [userId],
            pool: connection,
            logName: 'GET USER UPDATE TO SELLER',
          });

          if (!getUser || !getUser?.length)
            return new CustomHttpException('Bad Request', 400);

          await this.pool.executeRawQuery({
            transactionid,
            query: `
          UPDATE users
          SET role = ?
          WHERE id = ?; 
          `,
            logName: 'UPDATE USER ROLE',
            params: ['SELLER', userId],
            pool: connection,
          });
          await this.pool.executeRawQuery({
            transactionid,
            query: `
            INSERT INTO seller_info (
              id,
              user_id,
              seller_email,
              name,
              bio,
              created_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            params: [uuidv6(), userId, getUser[0].email, name, bio, new Date()],
            logName: 'INSERT SELLER INFO',
            pool: connection,
          });
          return;
        },
        'READ COMMITTED',
      );
    } catch (error) {
      this.logger.error(['User Service', 'Update to Seller', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });
      return Promise.reject(error);
    }
  }

  public async getMenuList(request: AuthRequest, headers: HeadersDto) {
    const { transactionid } = headers;
    try {
      const role = request.auth.role;
      const pageConfig =
        await this.generalService.readFromFile<PagesDto>(PAGES_PATH);

      let menu = [];
      if (role === 'ADMIN') {
        menu = pageConfig['dashboard-menu'];
      } else if (role === 'SELLER') {
        menu = pageConfig['seller-menu'];
      }

      return this.filterPageEnabledItems(menu);
    } catch (error) {
      this.logger.error(['User Service', 'Get Menu List', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });
      return Promise.reject(error);
    }
  }
}
