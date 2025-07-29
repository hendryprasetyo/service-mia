import * as Moment from 'moment';
import { Injectable } from '@nestjs/common';
import { HeadersDto } from 'src/common/dtos/dto';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { DbService } from 'src/database/mysql/mysql.service';
import { RedisService } from 'src/database/redis/redis.service';
import { TQueryGetBanners } from './guest.dto';

@Injectable()
export class GuestService {
  constructor(
    private readonly logger: LoggerServiceImplementation,
    private readonly redisService: RedisService,
    private readonly pool: DbService,
  ) {}

  public async getBanners(headers: HeadersDto): Promise<TQueryGetBanners[]> {
    const { transactionid } = headers;
    try {
      const unixCurrentTime = Moment().valueOf();
      let result = [];
      result = await this.redisService.getData({
        transactionid,
        key: 'guest-banners',
        returnType: 'object',
      });
      if (!result?.length) {
        result = await this.pool.executeRawQuery<TQueryGetBanners[]>({
          transactionid,
          query: `
          SELECT
          id,
          title,
          redirect_url,
          description,
          priority,
          image_url,
          image_text,
          type,
          position,
          IF(is_blank = 1, TRUE, FALSE) AS is_blank,
          updated_at
          FROM banners
          WHERE 
            (
              (start_active IS NOT NULL AND end_active IS NOT NULL AND 
                CAST(start_active AS UNSIGNED) <= ? AND CAST(end_active AS UNSIGNED) >= ?)
              OR (start_active IS NULL AND end_active IS NULL AND is_active = true)
            )
            AND is_deleted = false
          ORDER BY 
          CASE WHEN priority = 0 THEN 1 ELSE 0 END,
          priority ASC,
          updated_at DESC;
            `,
          params: [unixCurrentTime, unixCurrentTime],
          logName: 'GET BANNERS',
          isWriteOperation: false,
        });
        if (result?.length) {
          await this.redisService.setDataWithTTL({
            transactionid,
            key: 'guest-banners',
            value: JSON.stringify(result),
            ttl: 86400,
          });
        }
      }
      if (result?.length) {
        result = result.map((item) => {
          delete item.updated_at;
          return item;
        });
      }
      return result;
    } catch (error) {
      this.logger.error(['Guest Service', 'GET Banners', 'ERROR'], {
        info: `${error.message}`,
        transactionid,
      });
      return Promise.reject(error);
    }
  }
}
