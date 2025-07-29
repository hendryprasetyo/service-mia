import * as Moment from 'moment';
import * as _ from 'lodash';
import * as Path from 'path';
import { v6 as uuidv6 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { AuthRequest, HeadersDto, TLanguage } from 'src/common/dtos/dto';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { EncryptionService } from 'src/common/helpers/encryption/encryption.service';
import {
  CreateUpdateBannerDto,
  CreateDestinationCategoryDto,
  CreateVoucherDto,
  TResponseQueryGetDestinationCategories,
  TResponseQueryGetActiveVoucher,
  DetailBannerDto,
  TQueryGetBannerDetail,
  GetActiveVoucherDto,
  GetDefaultImageDto,
} from './admin.dto';
import { DbService } from 'src/database/mysql/mysql.service';
import { GeneralService } from 'src/common/helpers/general/general.service';
import { RedisService } from 'src/database/redis/redis.service';
import { TQueryGetBanners } from 'src/guest/guest.dto';
import { CustomHttpException } from 'src/common/helpers/lib/exception';
import {
  TContentConfig,
  TImageDefault,
} from 'src/common/dtos/contentConfig.dto';
import ConfigStatis from 'src/common/constants/config';
import libService from 'src/common/helpers/lib/lib.service';

const CONTENT_CONFIG_PATH = Path.join(
  __dirname,
  '../../assets/contentConfig.json',
);

@Injectable()
export class AdminService {
  constructor(
    private readonly logger: LoggerServiceImplementation,
    private readonly encryptionService: EncryptionService,
    private readonly pool: DbService,
    private readonly generalHelper: GeneralService,
    private readonly redisService: RedisService,
  ) {}

  private __constructRecommendedVoucher(
    responseQuery: TResponseQueryGetActiveVoucher[],
    language: TLanguage,
  ) {
    if (_.isEmpty(responseQuery)) {
      return [];
    }

    const usingTypeCount = responseQuery.reduce(
      (acc, item) => {
        acc[item.using_type] = (acc[item.using_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    let dominantUsingType = '';
    let maxCount = 0;
    for (const [type, count] of Object.entries(usingTypeCount)) {
      if (count > maxCount) {
        dominantUsingType = type;
        maxCount = count;
      }
    }

    const dominantVouchers = responseQuery.filter(
      (v) => v.using_type === dominantUsingType,
    );

    let recommendedVoucher: TResponseQueryGetActiveVoucher | null = null;
    let maxValue = -Infinity;

    for (const voucher of dominantVouchers) {
      if (voucher.value_type === 'price' && Number(voucher.value) > maxValue) {
        recommendedVoucher = voucher;
        maxValue = Number(voucher.value);
      }
    }

    if (!recommendedVoucher && dominantVouchers.length > 0) {
      recommendedVoucher = dominantVouchers[0];
    }

    return responseQuery.map((v) => {
      const textMinSpendDisplay = 'Min. Blj ';
      const minSpendDisplay =
        textMinSpendDisplay + libService.formatCurrency(v.min_spend || 0);
      v.min_spend > 0 ? textMinSpendDisplay : textMinSpendDisplay;
      const parseNumEndDate = Number(v.end_date);
      const formatDisplayEndDate = Moment(parseNumEndDate)
        .locale(language)
        .format('DD-MM-YYYY');
      return {
        ...v,
        start_date: Number(v.start_date),
        end_date: parseNumEndDate,
        value: parseFloat(String(v.value)),
        end_date_display: 'Aktif Hingga ' + formatDisplayEndDate,
        min_spend_display: minSpendDisplay,
        is_recommended:
          recommendedVoucher &&
          v.code === recommendedVoucher.code &&
          v.value === recommendedVoucher.value &&
          v.type === recommendedVoucher.type &&
          v.using_type === recommendedVoucher.using_type,
      };
    });
  }

  private __foundImageDefault(dataObj: {
    contentConfig: TImageDefault[];
    imageId: string;
  }) {
    const { contentConfig, imageId } = dataObj;
    return contentConfig.find(
      (imgd) => (imgd.id === imageId || imgd.is_default) && imgd.enable,
    );
  }

  public async createDestinationCaegory(
    request: AuthRequest,
    reqBody: CreateDestinationCategoryDto,
    headers: HeadersDto,
  ) {
    const { transactionid } = headers;

    try {
      const { code, description, imageId, isActive, name } = reqBody;
      this.generalHelper.validateSqlInjection([
        { value: code, rules: ['isNotSpace'] },
        { value: description },
        { value: name },
      ]);

      const contentConfig =
        await this.generalHelper.readFromFile<TContentConfig>(
          CONTENT_CONFIG_PATH,
        );
      const foundImage = this.__foundImageDefault({
        contentConfig: contentConfig.image_default_category,
        imageId,
      });

      const userId = request.auth.id;
      return await this.pool.executeInTransaction(
        transactionid,
        async (connection) => {
          const query = `
          INSERT INTO destination_categories (
            id,
            name,
            code,
            description,
            image_url,
            image_text,
            is_active,
            created_by_id,
            updated_by_id,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
          `;

          await this.pool.executeRawQuery({
            transactionid,
            query,
            logName: 'CREATE DESTINATION CATEGORY',
            pool: connection,
            params: [
              uuidv6(),
              name,
              code,
              description,
              foundImage.image_url,
              foundImage.image_text,
              isActive,
              userId,
              userId,
              new Date(),
              new Date(),
            ],
          });
          return;
        },
        'READ UNCOMMITTED',
      );
    } catch (error) {
      this.logger.error(
        ['Amin Service', 'Create Destination Category', 'ERROR'],
        {
          messages: `${error.message}`,
          transactionid,
        },
      );
      if (error?.code === 'ER_DUP_ENTRY' && error?.errno === 1062) {
        return new CustomHttpException('Category already exist', 400, {
          cause: '01400',
        });
      }
      return Promise.reject(error);
    }
  }

  public async createVoucher(
    request: AuthRequest,
    reqBody: CreateVoucherDto,
    headers: HeadersDto,
  ) {
    const { transactionid } = headers;

    try {
      const {
        code,
        description,
        isActive,
        name,
        endDate,
        startDate,
        type,
        valueType,
        usingType,
        value,
        imageId,
        minSpend,
      } = reqBody;
      const { id: userId, role: userRole } = request.auth;
      this.generalHelper.validateSqlInjection([
        { value: code, rules: ['isNotSpace'] },
        { value: startDate, rules: ['isNotSpace', 'isNumOfString'] },
        { value: endDate, rules: ['isNotSpace', 'isNumOfString'] },
        { value: type },
        { value: usingType },
        { value: description },
        { value: value.toString() },
        { value: name },
      ]);

      const sourceVoucher =
        userRole === process.env.ROLE_ADMIN
          ? ConfigStatis.APP_NAME.toLowerCase()
          : ConfigStatis.MERCHANT.toLowerCase();
      const contentConfig =
        await this.generalHelper.readFromFile<TContentConfig>(
          CONTENT_CONFIG_PATH,
        );
      const foundImage = this.__foundImageDefault({
        contentConfig: contentConfig.image_default_voucher,
        imageId,
      });

      return await this.pool.executeInTransaction(
        transactionid,
        async (connection) => {
          const getVoucherRaw = await this.pool.executeRawQuery({
            transactionid,
            query: `
            SELECT code
            FROM voucher
            WHERE code = ?
            FOR UPDATE;
            `,
            logName: 'GET VOUCHER',
            params: [code],
            pool: connection,
          });
          if (!!getVoucherRaw[0]?.code) {
            this.logger.error(['Amin Service', 'Create Voucher', 'ERROR'], {
              messages: 'Voucher Already exist!!',
              transactionid,
            });
            return new CustomHttpException('Bad Request', 400);
          }
          const query = `
                  INSERT INTO voucher (
                    code,
                    name,
                    description,
                    value,
                    min_spend,
                    image_url,
                    image_text,
                    type,
                    value_type,
                    using_type,
                    source,
                    created_by_id,
                    is_active,
                    start_date,
                    end_date,
                    created_at,
                    updated_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                  `;

          await this.pool.executeRawQuery({
            transactionid,
            query,
            logName: 'CREATE VOUCHER',
            params: [
              code,
              name,
              description,
              value,
              minSpend,
              foundImage.image_url,
              foundImage.image_text,
              type,
              valueType,
              usingType,
              sourceVoucher,
              userId,
              isActive,
              startDate,
              endDate,
              new Date(),
              new Date(),
            ],
            pool: connection,
          });
          return;
        },
        'READ UNCOMMITTED',
      );
    } catch (error) {
      this.logger.error(['Amin Service', 'Create Voucher', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });
      return Promise.reject(error);
    }
  }

  public async getDestinationCaegories(headers: HeadersDto) {
    const { transactionid } = headers;

    try {
      const response =
        await this.pool.executeRawQuery<TResponseQueryGetDestinationCategories>(
          {
            transactionid,
            query: `
                SELECT 
                  id,
                  code,
                  description,
                  image_url,
                  is_active,
                  created_by_id,
                  created_at
                FROM destination_categories;`,
            logName: 'GET DESTINATION CATEGORIES',
            isWriteOperation: false,
          },
        );
      return response.map((item) => {
        return {
          ...item,
          created_at: Moment(item.created_at).format('DDD MMMM YYYY'),
          id: this.encryptionService.encryptEntityID(item.id),
        };
      });
    } catch (error) {
      this.logger.error(
        ['Amin Service', 'GET Destination Categories', 'ERROR'],
        {
          messages: `${error.message}`,
          transactionid,
        },
      );
      return Promise.reject(error);
    }
  }

  public async getVoucher(
    request: AuthRequest,
    headers: HeadersDto,
    query: GetActiveVoucherDto,
  ) {
    const { transactionid, language } = headers;

    try {
      const userId = request.auth.id;
      const { spendPrice } = query;
      const minPrice = spendPrice ? spendPrice : 0;
      const unixCurrentTime = Moment().valueOf();
      const response = await this.pool.executeRawQuery<
        TResponseQueryGetActiveVoucher[]
      >({
        transactionid,
        query: `
          SELECT
            v.code,
            v.name,
            v.image_url,
            v.image_text,
            v.type,
            v.value_type,
            v.using_type,
            v.source,
            v.start_date,
            v.end_date,
            v.min_spend,
            v.value
          FROM voucher v
          LEFT JOIN voucher_order_info voi
            ON v.code = voi.code AND voi.used_id = ? AND voi.status = 'used'
          WHERE
            CAST(v.start_date AS UNSIGNED) <= ?
            AND CAST(v.end_date AS UNSIGNED) >= ?
            AND v.is_deleted = false
            AND (
              v.using_type != 'treshold'
              OR (v.using_type = 'treshold' AND v.min_spend IS NOT NULL AND v.min_spend <= ?)
            )
            AND (
              v.using_type = 'reusable'
              OR voi.id IS NULL -- berarti belum pernah digunakan oleh user
            )
          ORDER BY v.start_date DESC
          LIMIT 20;
        `,
        logName: 'GET ACTIVE VOUCHER',
        params: [userId, unixCurrentTime, unixCurrentTime, Number(minPrice)],
        isWriteOperation: false,
      });

      return this.__constructRecommendedVoucher(response, language);
    } catch (error) {
      this.logger.error(['Amin Service', 'GET Active Vouchers', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });
      return Promise.reject(error);
    }
  }

  public async createUpdateBanner(
    request: AuthRequest,
    reqBody: CreateUpdateBannerDto,
    headers: HeadersDto,
  ) {
    const { transactionid } = headers;

    try {
      const { auth, url, method } = request;
      const adminId = auth.id;
      const {
        imageText,
        title,
        description,
        startActive,
        endActive,
        priority,
        position,
        type,
        imageUrl,
        isActive,
        bannerId,
        isBlank,
        redirectUrl,
      } = reqBody;
      const isCreated =
        url.includes('create') && method.toLowerCase() === 'post';
      const isUpdated =
        url.includes('update') && method.toLowerCase() === 'put';
      const updatedAt = new Date();
      if (isUpdated && !bannerId)
        return new CustomHttpException('bannerId is Required', 400);

      this.generalHelper.validateSqlInjection([
        {
          value: imageText,
          rules: ['isNotSpace'],
        },
        {
          value: title,
        },
        {
          value: description,
        },
        {
          value: startActive,
        },
        {
          value: endActive,
        },
      ]);
      const newBannerId = uuidv6();
      const queryInsert = `
        INSERT INTO banners(
        id,
        title,
        redirect_url,
        description,
        priority,
        image_url,
        image_text,
        type,
        position,
        start_active,
        end_active,
        is_active,
        is_deleted,
        is_blank,
        created_at,
        updated_at,
        updated_by
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;
      const queryUpdate = `
        UPDATE banners
        SET
          title = ?,
          redirect_url = ?,
          description = ?,
          priority = ?,
          image_url = ?,
          image_text = ?,
          type = ?,
          position = ?,
          start_active = ?,
          end_active = ?,
          is_active = ?,
          is_delete = ?,
          is_blank = ?,
          updated_at = ?,
          updated_by = ?
        WHERE id = ?;
        `;

      const paramsInsert = [
        newBannerId,
        title,
        redirectUrl,
        description,
        priority,
        imageUrl,
        imageText,
        type,
        position,
        startActive,
        endActive,
        isActive,
        false,
        isBlank,
        updatedAt,
        updatedAt,
        adminId,
      ];
      const paramsUpdate = [
        title,
        description,
        priority,
        imageUrl,
        imageText,
        type,
        position,
        startActive,
        endActive,
        isActive,
        false,
        isBlank,
        updatedAt,
        adminId,
        bannerId,
      ];
      const logName = isCreated ? 'INSERT BANNER' : 'UPDATE BANNER';
      return await this.pool.executeInTransaction(
        transactionid,
        async (connection) => {
          const [bannerRedis, currentTTL] = await Promise.all([
            this.redisService.getData<TQueryGetBanners[]>({
              transactionid,
              key: 'guest-banners',
              returnType: 'object',
            }),
            this.redisService.getTTL({
              transactionid,
              key: 'guest-banners',
            }),
          ]);

          await this.pool.executeRawQuery({
            transactionid,
            query: isCreated ? queryInsert : queryUpdate,
            params: isCreated ? paramsInsert : paramsUpdate,
            logName,
            pool: connection,
          });

          if (bannerRedis?.length) {
            const banners = bannerRedis;
            const currentUnix = Moment().valueOf();
            const isActiveDate =
              !startActive || !endActive
                ? true
                : currentUnix >= Number(startActive) &&
                  currentUnix <= Number(endActive);

            if (isCreated && isActive && isActiveDate) {
              banners.push({
                id: newBannerId,
                title,
                redirect_url: redirectUrl,
                description,
                image_text: imageText,
                image_url: imageUrl,
                position,
                priority,
                is_blank: isBlank,
                type,
                updated_at: updatedAt,
              });
            }
            if (isUpdated && isActive && isActiveDate) {
              banners.forEach((item) => {
                if (item.id === bannerId) {
                  item.title = title;
                  item.description = description;
                  item.image_text = imageText;
                  item.image_url = imageUrl;
                  item.type = type;
                  item.position = position;
                  item.priority = priority;
                  item.updated_at = updatedAt;
                }
              });
            }
            banners.sort((a, b) => {
              if (a.priority === 0 && b.priority !== 0) return 1;
              if (b.priority === 0 && a.priority !== 0) return -1;

              if (a.priority === b.priority) {
                const currentUnix = Moment().valueOf();

                const aTimeDiff = Math.abs(
                  currentUnix - Moment(a.updated_at).valueOf(),
                );
                const bTimeDiff = Math.abs(
                  currentUnix - Moment(b.updated_at).valueOf(),
                );

                if (aTimeDiff < bTimeDiff) return -1;
                if (aTimeDiff > bTimeDiff) return 1;
              }

              return a.priority - b.priority;
            });

            await this.redisService.setDataWithTTL({
              transactionid,
              key: 'guest-banners',
              value: JSON.stringify(banners),
              ttl: currentTTL > 0 ? currentTTL : 86400,
            });
          }
          return;
        },
        'READ UNCOMMITTED',
      );
    } catch (error) {
      this.logger.error(
        ['Amin Service', 'Create Destination Category', 'ERROR'],
        {
          messages: `${error.message}`,
          transactionid,
        },
      );
      return Promise.reject(error);
    }
  }

  public async getDetailBanner(headers: HeadersDto, param: DetailBannerDto) {
    const { transactionid } = headers;

    try {
      const { bannerId } = param;
      this.generalHelper.validateSqlInjection([{ value: bannerId }]);
      const response = await this.pool.executeRawQuery<TQueryGetBannerDetail[]>(
        {
          transactionid,
          query: `
          SELECT
            b.title,
            b.description,
            b.priority,
            b.image_url,
            b.image_text,
            b.type,
            b.position,
            b.is_active,
            b.is_deleted,
            ai.position AS admin_position,
            ai.nip AS admin_nip
          FROM banners b
          LEFT JOIN admin_info ai
            ON b.updated_by = ai.user_id
          WHERE b.id = ?;
          `,
          params: [bannerId],
          logName: 'GET DETAIL BANNER',
          isWriteOperation: false,
        },
      );
      if (!response?.length) return new CustomHttpException('Not Found', 404);

      return response.map((item) => ({
        ...item,
        is_active: item.is_active === 1,
        is_deleted: item.is_deleted === 1,
      }))[0];
    } catch (error) {
      this.logger.error(['Amin Service', 'GET Detail Banner', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });
      return Promise.reject(error);
    }
  }

  public async getDefaultImage(headers: HeadersDto, query: GetDefaultImageDto) {
    const { transactionid, platform } = headers;

    try {
      const { type } = query;
      const contentConfig =
        await this.generalHelper.readFromFile<TContentConfig>(
          CONTENT_CONFIG_PATH,
        );

      const platformKey = platform.toUpperCase();

      // Filter all in one pass
      const filteredImages = contentConfig[type].filter(
        (img) =>
          (img.enable === true &&
            img.platform.includes(platformKey) &&
            img.categories.includes(platformKey)) ||
          img.is_default === true,
      );

      // Return only necessary fields
      const result = filteredImages.map(
        ({ image_url, image_text, id, is_new, is_default }) => ({
          id,
          image_url,
          image_text,
          is_new,
          is_default,
        }),
      );

      return result;
    } catch (error) {
      this.logger.error(['Amin Service', 'GET Asset Images', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });
      return Promise.reject(error);
    }
  }
}
