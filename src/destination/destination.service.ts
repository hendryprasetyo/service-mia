/* eslint-disable @typescript-eslint/no-unused-vars */
import * as Path from 'path';
import * as Moment from 'moment';
import lib from 'src/common/helpers/lib/lib.service';
import { v6 as uuidv6 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { AuthRequest, HeadersDto, TOrderSubType } from 'src/common/dtos/dto';
import { EncryptionService } from 'src/common/helpers/encryption/encryption.service';
import { GeneralService } from 'src/common/helpers/general/general.service';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { DbService } from 'src/database/mysql/mysql.service';
import {
  CreatePlaceDestinationDto,
  GetDetailPlaceDto,
  GetPlacesDto,
  GetScheduleDestinationDto,
  TCreateActivityPlaceDest,
  TCreateBasecampPlaceDest,
  TCreateFacilityPlaceDest,
  TCreateImagePlaceDest,
  TCreateQuotaPlaceDest,
  TDestinationConfig,
  TResponseQueryGetDetailPlace,
  TResponseQueryGetPlaces,
} from './destination.dto';
import { CustomHttpException } from 'src/common/helpers/lib/exception';
import { RedisService } from 'src/database/redis/redis.service';

const DESTINATION_CONFIG_PATH = Path.join(
  __dirname,
  '../../assets/destinationConfig.json',
);
@Injectable()
export class DestinationService {
  constructor(
    private readonly logger: LoggerServiceImplementation,
    private readonly encryptionService: EncryptionService,
    private readonly pool: DbService,
    private readonly generalHelper: GeneralService,
    private readonly redisService: RedisService,
  ) {}

  private __generateMetaTitle(dataObj: {
    name: string;
    category: string;
    altitude?: number;
    city: string;
    country: string;
  }): string {
    const { name, category, altitude, city, country } = dataObj;
    const baseTitle = `${category} - ${city} - ${country} | WildBook`;
    return altitude
      ? `${name} ${altitude}mdpl - ${baseTitle}`
      : `${name} - ${baseTitle}`;
  }

  private __generateMetaDescription(description: string): string {
    const shortDescription = description.slice(0, 160); // limit to 160 characters
    return `${shortDescription}...`;
  }

  private __generateMetaKeywords(name: string, category: string): string {
    return `${name}, ${category}, vacation, travel, tropical island`;
  }

  private __generateSeoUrl(slug: string): string {
    return `${process.env.BASE_URL_CLIENT}/place/${slug}`;
  }

  private __constructParamImages(
    images: TCreateImagePlaceDest[],
    identifier?: string,
  ) {
    const valueImages = images.map((item) => [
      !!identifier ? identifier : item.basecampId,
      item.imageText,
      item.imageUrl,
      item.primary,
      false,
    ]);
    const placeholderImages = valueImages
      .map(() => '(?, ?, ?, ?, ?)')
      .join(', ');

    return { valueImages, placeholderImages };
  }

  private __constructParamFacilities(
    facilities: TCreateFacilityPlaceDest[],
    identifier?: string,
  ) {
    const valueFacilities = facilities.map((item) => [
      uuidv6(),
      !!identifier ? identifier : item.basecampId,
      item.name,
      item.description,
      item.isAvailable,
      new Date(),
      new Date(),
    ]);
    const placeholderFacilities = valueFacilities
      .map(() => '(?, ?, ?, ?, ?, ?, ?)')
      .join(', ');
    return { valueFacilities, placeholderFacilities };
  }

  private __constructParamActivities(
    activities: TCreateActivityPlaceDest[],
    identifier: string,
  ) {
    const valueActivities = activities.map((item) => [
      uuidv6(),
      identifier,
      item.name,
      item.description,
      item.isActive,
      item.duration,
      new Date(),
      new Date(),
    ]);
    const placeholderActivities = valueActivities
      .map(() => '(?, ?, ?, ?, ?, ?, ?, ?)')
      .join(', ');
    return { valueActivities, placeholderActivities };
  }

  private __constructParamQuota(
    quota: TCreateQuotaPlaceDest[],
    identifier?: string,
  ) {
    const valueQuota = quota.map((item) => [
      uuidv6(),
      !!identifier ? identifier : item.basecampId,
      item.day,
      item.value,
      new Date(),
    ]);
    const placeholderQuota = valueQuota.map(() => '(?, ?, ?, ?, ?)').join(', ');
    return { valueQuota, placeholderQuota };
  }

  private __constructParamBasecamp(
    basecamp: TCreateBasecampPlaceDest[],
    placeId: string,
  ) {
    const basecampImages = [];
    const basecampFacilities = [];
    const basecampQuota = [];
    const valueBasecamp = basecamp.map((item) => {
      const basecampId = uuidv6();
      const primaryImage = item.images[0];
      item.images.forEach((bi) => {
        basecampImages.push({
          basecampId,
          imageText: bi.imageText,
          imageUrl: bi.imageUrl,
          primary: bi.primary,
        });
      });
      item.facilities.forEach((bf) => {
        basecampFacilities.push({
          basecampId,
          name: bf.name,
          description: bf.description,
          isAvailable: bf.isAvailable,
        });
      });
      item.quota.forEach((bq) => {
        basecampQuota.push({
          basecampId,
          day: bq.day,
          value: bq.value,
        });
      });
      return [
        basecampId,
        item.name,
        item.description,
        primaryImage.imageUrl,
        primaryImage.imageText,
        item.price,
        item.priceBeforeDiscount,
        item.priceBeforeDiscount > 0
          ? Math.round(
              lib.calculatePrice({
                type: 'non-percentage',
                priceBeforeDiscVal: item.priceBeforeDiscount,
                priceVal: item.price,
              }),
            )
          : null,
        item.latitude,
        item.longitude,
        item.email,
        item.phoneNumber,
        item.address,
        item.city,
        item.province,
        item.country,
        placeId,
        item.isActive,
      ];
    });

    const placeholderBasecamp = valueBasecamp
      .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .join(', ');
    const { valueImages, placeholderImages } =
      this.__constructParamImages(basecampImages);
    const { placeholderFacilities, valueFacilities } =
      this.__constructParamFacilities(basecampFacilities);
    const { placeholderQuota, valueQuota } =
      this.__constructParamQuota(basecampQuota);
    return {
      valueBasecamp,
      placeholderBasecamp,
      valueBasecampImages: valueImages,
      placeholderBasecampImages: placeholderImages,
      valueBasecampFacilities: valueFacilities,
      placeholderBasecampFacilities: placeholderFacilities,
      valueBasecampQuota: valueQuota,
      placeholderBasecampQuota: placeholderQuota,
    };
  }

  private __constructPayloadCreatePlaceDestination(dataObj: {
    reqBody: CreatePlaceDestinationDto;
    placeId: string;
  }) {
    const { reqBody, placeId } = dataObj;
    const { images, activities, facilities, basecamp, quota } = reqBody;

    const { valueImages, placeholderImages } = this.__constructParamImages(
      images,
      placeId,
    );
    const { placeholderFacilities, valueFacilities } =
      this.__constructParamFacilities(facilities, placeId);
    const { placeholderActivities, valueActivities } =
      this.__constructParamActivities(activities, placeId);

    let valuePlaceQuota = undefined;
    let placeholderQuotaPlace = undefined;
    if (quota?.length) {
      const { placeholderQuota, valueQuota } = this.__constructParamQuota(
        quota,
        placeId,
      );
      valuePlaceQuota = valueQuota;
      placeholderQuotaPlace = placeholderQuota;
    }

    const result = {
      valuePlaceImages: valueImages,
      placeholderImagesPlace: placeholderImages,
      valuePlaceFacilities: valueFacilities,
      placeholderFacilitiesPlace: placeholderFacilities,
      valuePlaceActivities: valueActivities,
      placeholderActivitiesPlace: placeholderActivities,
      valuePlaceQuota,
      placeholderQuotaPlace,
      valueBasecamp: undefined,
      placeholderBasecamp: undefined,
      placeholderBasecampFacilities: undefined,
      valueBasecampFacilities: undefined,
      placeholderBasecampImages: undefined,
      valueBasecampImages: undefined,
      placeholderBasecampQuota: undefined,
      valueBasecampQuota: undefined,
    };

    if (basecamp?.length) {
      const {
        placeholderBasecamp,
        valueBasecamp,
        placeholderBasecampFacilities,
        valueBasecampFacilities,
        placeholderBasecampImages,
        valueBasecampImages,
        placeholderBasecampQuota,
        valueBasecampQuota,
      } = this.__constructParamBasecamp(basecamp, placeId);
      result.valueBasecamp = valueBasecamp;
      result.placeholderBasecamp = placeholderBasecamp;
      result.placeholderBasecampFacilities = placeholderBasecampFacilities;
      result.valueBasecampFacilities = valueBasecampFacilities;
      result.placeholderBasecampImages = placeholderBasecampImages;
      result.valueBasecampImages = valueBasecampImages;
      result.placeholderBasecampQuota = placeholderBasecampQuota;
      result.valueBasecampQuota = valueBasecampQuota;
    }

    return result;
  }

  private async __filterProcessPlaces(dataObj: {
    request: AuthRequest;
    query: GetPlacesDto;
    limit: number;
    transactionid: string;
  }) {
    const { query, request, limit, transactionid } = dataObj;
    const { search, category, type } = query;
    const roleUser = request?.auth?.role;
    let whereClause =
      !roleUser || roleUser === 'USER' ? 'pd.is_deleted = 0' : 'true';
    const params: string[] = [];

    if (search || category || type) {
      if (search) {
        // whereClause += ` AND (
        //   pd.name LIKE CONCAT('%', ?, '%') OR
        //   dc.name LIKE CONCAT('%', ?, '%') OR
        //   dc.code LIKE CONCAT('%', ?, '%') OR
        //   pd.city LIKE CONCAT('%', ?, '%') OR
        //   pd.province LIKE CONCAT('%', ?, '%') OR
        //   pd.country LIKE CONCAT('%', ?, '%')
        // )
        // `;
        whereClause += ` AND MATCH(pd.name, pd.description, pd.city, pd.province, pd.country) AGAINST(? IN NATURAL LANGUAGE MODE)`;
        params.push(search);
      }
      if (category) {
        whereClause += ' AND dc.code = ?';
        params.push(category);
      }
      if (type) {
        whereClause += ' AND pd.type = ?';
        params.push(type);
      }
    } else {
      const randomPlaceIds = await this.redisService.getSrandmember({
        transactionid,
        key: 'place-destination:id',
        limit,
      });
      if (randomPlaceIds?.length) {
        whereClause += ` AND pd.id IN (${randomPlaceIds.map(() => '?').join(', ')})`;
        params.push(...randomPlaceIds);
      }
    }
    return { whereClause, params };
  }

  private __constructDetailPlace(dataObj: {
    place: TResponseQueryGetDetailPlace;
    query: GetDetailPlaceDto;
  }) {
    const { place, query } = dataObj;
    const { price, price_before_discount, ...rest } = place;
    const displayPricePlace = lib.formatCurrency(price);
    const displayPriceBeforeDiscountPlace =
      price_before_discount > 0
        ? lib.formatCurrency(price_before_discount)
        : null;
    return {
      ...rest,
      display_price: displayPricePlace,
      seo_url: `${place.seo_url}.${query.destinationId}.${query.mcId}`,
      display_price_before_discount: displayPriceBeforeDiscountPlace,
      altitude: place.altitude ? `${place.altitude} MDPL` : null,
      ...(place.price !== place.price_before_discount && {
        display_price: lib.formatCurrency(place.price),
      }),
      price,
      price_before_discount,
      images: place.images.map((pm) => {
        return {
          ...pm,
          is_primary: pm.is_primary === 1,
        };
      }),
      activities: place.activities.map((pa) => {
        return {
          ...pa,
          duration: `${pa.duration} hour(s)`,
        };
      }),
      basecamp: place?.basecamp?.map((bc) => {
        const { price_bc, price_before_discount_bc, discount_bc, ...restbc } =
          bc;
        const displayPriceBc = lib.formatCurrency(price_bc);
        const displayPriceBeforeDiscountBc =
          price_before_discount_bc > 0
            ? lib.formatCurrency(price_before_discount_bc)
            : null;
        return {
          ...restbc,
          discount: discount_bc,
          price: price_bc,
          price_before_discount: price_before_discount_bc,
          display_price: displayPriceBc,
          display_price_before_discount: displayPriceBeforeDiscountBc,
          images: bc.images.map((bi) => {
            return {
              ...bi,
              is_primary: bi.is_primary === 1,
            };
          }),
        };
      }),
    };
  }

  public async createPlaceDestination(
    request: AuthRequest,
    reqBody: CreatePlaceDestinationDto,
    headers: HeadersDto,
  ) {
    const { transactionid } = headers;

    try {
      const userId = request.auth.id;
      const {
        address,
        description,
        isActive,
        latitude,
        longitude,
        name,
        phoneNumber,
        price,
        priceBeforeDiscount,
        website,
        categoryId,
        quota,
        altitude,
        city,
        country,
        province,
        type,
        images,
        basecamp,
      } = reqBody;
      const decryptedCategoryId =
        this.encryptionService.decryptEntityID(categoryId);
      let destinationPrice = price;
      let destinationPriceBeforeDiscount = priceBeforeDiscount;

      this.generalHelper.validateSqlInjection([
        { value: phoneNumber, rules: ['isNotSpace', 'isNumOfString'] },
        { value: website, rules: ['isNotSpace', 'isUrl'] },
        { value: decryptedCategoryId, rules: ['isNotSpace'] },
        { value: name },
        { value: address },
        { value: latitude },
        { value: longitude },
        { value: city },
        { value: country },
        { value: province },
      ]);

      const slugFormat =
        name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-') + '.i';

      const [getCategory, getUser] = await Promise.all([
        this.pool.executeRawQuery<
          { id: string; name: string; code: TOrderSubType }[]
        >({
          transactionid,
          query: `
        SELECT id, name, code
        FROM destination_categories
        WHERE id = ?;
        `,
          params: [decryptedCategoryId],
          logName: 'GET DESTINATION CATEGORY',
          isWriteOperation: false,
        }),
        this.pool.executeRawQuery<{ email: string }[]>({
          transactionid,
          query: `
        SELECT email
        FROM users
        WHERE id = ?;
        `,
          params: [userId],
          logName: 'GET USER',
          isWriteOperation: false,
        }),
      ]);

      if (!getCategory?.length || !getUser?.length) {
        return new CustomHttpException('Bad Request', 400);
      }

      if (getCategory[0].code !== 'GN' && !price) {
        return new CustomHttpException('price is required', 400);
      }

      if (type === 'RESERVATION') {
        if (getCategory[0].code === 'GN') {
          if (!basecamp?.length) {
            return new CustomHttpException('bascamp is required', 400);
          }
          const cheapestBasecamp = basecamp.reduce(
            (min, curr) => {
              if (
                typeof curr.price === 'number' &&
                (min === null || curr.price < min.price)
              ) {
                return curr;
              }
              return min;
            },
            null as TCreateBasecampPlaceDest | null,
          );
          if (cheapestBasecamp) {
            destinationPrice = cheapestBasecamp.price;
            destinationPriceBeforeDiscount =
              cheapestBasecamp.priceBeforeDiscount;
          }
        }

        if (getCategory[0].code === 'CP' && !quota?.length) {
          return new CustomHttpException('quota is required', 400);
        }
      }

      const placeId = uuidv6();
      const {
        placeholderImagesPlace,
        valuePlaceImages,
        placeholderFacilitiesPlace,
        valuePlaceFacilities,
        placeholderActivitiesPlace,
        valuePlaceActivities,
        placeholderBasecamp,
        valueBasecamp,
        placeholderBasecampFacilities,
        valueBasecampFacilities,
        placeholderBasecampImages,
        valueBasecampImages,
        placeholderBasecampQuota,
        valueBasecampQuota,
        placeholderQuotaPlace,
        valuePlaceQuota,
      } = this.__constructPayloadCreatePlaceDestination({
        reqBody,
        placeId,
      });
      const altitudeValue = getCategory[0].code === 'GN' ? altitude : null;
      const imagePrimary = images.find((img) => img.primary);

      await this.pool.executeInTransaction(
        transactionid,
        async (connection) => {
          await this.pool.executeRawQuery({
            transactionid,
            query: `
               INSERT INTO place_destination (
                id,
                seller_id,
                name,
                description,
                slug,
                type,
                price,
                price_before_discount,
                discount,
                latitude,
                longitude,
                email,
                phone_number,
                address,
                city,
                province,
                country,
                altitude,
                website,
                thumbnail_url,
                thumbnail_text,
                meta_title,
                meta_description,
                meta_keywords,
                seo_url,
                category_id,
                is_active,
                is_deleted,
                created_at,
                updated_at
               ) 
               VALUES (
                 ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
               );
              `,
            logName: 'INSERT PLACE DESTINATION',
            params: [
              placeId,
              userId,
              name,
              description,
              slugFormat,
              type,
              destinationPrice,
              destinationPriceBeforeDiscount,
              destinationPriceBeforeDiscount > 0
                ? Math.round(
                    lib.calculatePrice({
                      type: 'non-percentage',
                      priceBeforeDiscVal: destinationPriceBeforeDiscount,
                      priceVal: destinationPrice,
                    }),
                  )
                : null,
              latitude,
              longitude,
              getUser[0].email,
              phoneNumber,
              address,
              city,
              province,
              country,
              altitudeValue,
              website,
              imagePrimary.imageUrl,
              imagePrimary.imageText,
              this.__generateMetaTitle({
                name: name.toLowerCase(),
                category: getCategory[0].name.toLowerCase(),
                altitude: altitudeValue,
                city: city.toLowerCase(),
                country: country.toLowerCase(),
              }),
              this.__generateMetaDescription(description.toLowerCase()),
              this.__generateMetaKeywords(
                name.toLowerCase(),
                getCategory[0].name.toLowerCase(),
              ),
              this.__generateSeoUrl(slugFormat),
              getCategory[0].id,
              isActive,
              false,
              new Date(),
              new Date(),
            ],
            pool: connection,
          });
          await this.pool.executeRawQuery({
            transactionid,
            query: `
          INSERT INTO place_images(
            place_id,
            image_text,
            image_url,
            is_primary,
            is_delete
          ) VALUES ${placeholderImagesPlace};`,
            params: valuePlaceImages.flat(),
            logName: 'INSERT PLACE DESTINATION IMAGES',
            pool: connection,
          });
          await this.pool.executeRawQuery({
            transactionid,
            query: `
          INSERT INTO place_facilities(
            id,
            place_id,
            name,
            description,
            is_available,
            created_at,
            updated_at
          ) VALUES ${placeholderFacilitiesPlace};`,
            params: valuePlaceFacilities.flat(),
            logName: 'INSERT PLACE FACILITIES',
            pool: connection,
          });
          await this.pool.executeRawQuery({
            transactionid,
            query: `
          INSERT INTO place_activities(
            id,
            place_id,
            name,
            description,
            is_active,
            duration,
            created_at,
            updated_at
          ) VALUES ${placeholderActivitiesPlace};`,
            params: valuePlaceActivities.flat(),
            logName: 'INSERT PLACE ACTIVITIES',
            pool: connection,
          });
          let queryQuotaPlace = '';
          let paramsQuotaPlace = [];
          if (type === 'RESERVATION' && getCategory[0].code === 'CP') {
            queryQuotaPlace = `
              INSERT INTO quota_place(
                id,
                place_id,
                day,
                quota,
                updated_at
                ) VALUES ${placeholderQuotaPlace};`;
            paramsQuotaPlace = valuePlaceQuota.flat();
          }

          if (type === 'RESERVATION' && getCategory[0].code === 'GN') {
            await this.pool.executeRawQuery({
              transactionid,
              query: `
                 INSERT INTO tracking_basecamp (
                   id,
                   name,
                   description,
                   thumbnail_url,
                   thumbnail_text,
                   price,
                   price_before_discount,
                   discount,
                   latitude,
                   longitude,
                   email,
                   phone_number,
                   address,
                   city,
                   province,
                   country,
                   place_id,
                   is_active
                 ) 
                 VALUES ${placeholderBasecamp};
                `,
              logName: 'INSERT TRACKING BASECAMP',
              params: valueBasecamp.flat(),
              pool: connection,
            });
            queryQuotaPlace = `
              INSERT INTO quota_place(
                id,
                basecamp_id,
                day,
                quota,
                updated_at
                ) VALUES ${placeholderBasecampQuota};`;
            paramsQuotaPlace = valueBasecampQuota.flat();
            await this.pool.executeRawQuery({
              transactionid,
              query: `
            INSERT INTO place_images(
              basecamp_id,
              image_text,
              image_url,
              is_primary,
              is_delete
            ) VALUES ${placeholderBasecampImages};`,
              params: valueBasecampImages.flat(),
              logName: 'INSERT TRACKING BASECAMP IMAGES',
              pool: connection,
            });
            await this.pool.executeRawQuery({
              transactionid,
              query: `
            INSERT INTO place_facilities(
              id,
              basecamp_id,
              name,
              description,
              is_available,
              created_at,
              updated_at
            ) VALUES ${placeholderBasecampFacilities};`,
              params: valueBasecampFacilities.flat(),
              logName: 'INSERT TRACKING BASECAMP FACILITIES',
              pool: connection,
            });
          }

          await this.pool.executeRawQuery({
            transactionid,
            query: queryQuotaPlace,
            logName: 'INSERT QUOTA PLACE',
            params: paramsQuotaPlace,
            pool: connection,
          });
          await this.redisService.setSadd({
            transactionid,
            key: 'place-destination:id',
            value: [placeId],
          });
        },
        'READ UNCOMMITTED',
      );

      return;
    } catch (error) {
      this.logger.error(
        ['Destination Service', 'Create Place Destination', 'ERROR'],
        {
          messages: `${error.message}`,
          transactionid,
        },
      );
      if (error.code === 'ER_DUP_ENTRY' && error.errno === 1062) {
        return new CustomHttpException('Place Already exist', 400, {
          cause: '01400',
        });
      }

      return Promise.reject(error);
    }
  }

  public async getPlaces(
    request: AuthRequest,
    headers: HeadersDto,
    query: GetPlacesDto,
  ) {
    const { transactionid } = headers;

    try {
      const defaultLimit = +process.env.MAX_LIMIT_QUERY_DESTINATIONS || 20;
      const { limit = defaultLimit, page = 1 } = query;
      const limitNum = Number(limit);
      if (limitNum > defaultLimit) {
        return new CustomHttpException('Bad Request', 400);
      }
      this.generalHelper.validateSqlInjection([{ value: query.search }]);
      const offset = (Number(page) - 1) * limitNum;

      const { params, whereClause } = await this.__filterProcessPlaces({
        request,
        query,
        limit: limitNum,
        transactionid,
      });
      const [resultPlaceDestinations, countPlaceDestination] =
        await Promise.all([
          this.pool.executeRawQuery<TResponseQueryGetPlaces[]>({
            transactionid,
            query: `
             SELECT
               pd.id,
               pd.seller_id,
               pd.name,
               pd.slug,
               pd.type,
               pd.description,
               pd.price,
               pd.price_before_discount,
               pd.discount,
               pd.city,
               pd.thumbnail_url,
               pd.thumbnail_text,
               pd.province,
               pd.country,
               pd.altitude,
               pd.is_active,
               dc.name AS category,
               dc.code AS category_code
             FROM place_destination pd
             JOIN destination_categories dc ON pd.category_id = dc.id
             WHERE ${whereClause}
             GROUP BY pd.id
             LIMIT ? OFFSET ?;`,
            params: [...params, limitNum, Number(offset)],
            logName: 'GET PLACES DESTINATION',
            isWriteOperation: false,
          }),
          this.pool.executeRawQuery<{ total: number }[]>({
            transactionid,
            query: `
              SELECT COUNT(*) as total 
              FROM place_destination pd
              JOIN destination_categories dc ON pd.category_id = dc.id
              WHERE ${whereClause};`,
            params: params,
            logName: 'GET TOTAL PLACES',
            isWriteOperation: false,
          }),
        ]);
      const totalData = countPlaceDestination[0].total;
      const totalPages = totalData > 0 ? Math.ceil(totalData / limitNum) : 0;
      const constructResult = resultPlaceDestinations?.map((items) => {
        const {
          price,
          is_active,
          price_before_discount,
          id,
          seller_id,
          ...rest
        } = items;
        const displayPrice = lib.formatCurrency(items.price);
        const displayPriceBeforeDiscount =
          price_before_discount > 0
            ? lib.formatCurrency(items.price_before_discount)
            : null;
        const encryptedId = this.encryptionService.encryptEntityID(id);
        const encryptedSellerId =
          this.encryptionService.encryptEntityID(seller_id);
        const ctaDetails = `/${items.slug}.${encryptedId}.${encryptedSellerId}`;
        return {
          ...rest,
          display_price: displayPrice,
          altitude: items.altitude ? `${items.altitude} MDPL` : null,
          display_price_before_discount: displayPriceBeforeDiscount,
          cta_details: ctaDetails,
        };
      });
      return {
        list: constructResult,
        pagination: {
          total_data: totalData,
          total_pages: totalPages,
          current_page: Number(page),
          limit: limitNum,
        },
      };
    } catch (error) {
      this.logger.error(
        ['Destination Service', 'Get Places Destination', 'ERROR'],
        {
          messages: `${error.message}`,
          transactionid,
        },
      );
      return Promise.reject(error);
    }
  }

  public async getDetailPlace(headers: HeadersDto, query: GetDetailPlaceDto) {
    const { transactionid } = headers;

    try {
      const { destinationId, mcId } = query;
      const decryptedDestinationId =
        this.encryptionService.decryptEntityID(destinationId);
      const decryptedMcId = this.encryptionService.decryptEntityID(mcId);
      this.generalHelper.validateSqlInjection([
        { value: decryptedDestinationId },
        { value: decryptedMcId },
      ]);
      const response = await this.pool.executeRawQuery<
        TResponseQueryGetDetailPlace[]
      >({
        transactionid,
        query: `
             SELECT
                  pd.name,
                  pd.description,
                  pd.price,
                  pd.price_before_discount,
                  pd.city,
                  pd.province,
                  pd.country,
                  pd.altitude,
                  pd.address,
                  pd.type,
                  pd.latitude,
                  pd.longitude,
                  pd.website,
                  pd.meta_title,
                  pd.meta_description,
                  pd.meta_keywords,
                  pd.seo_url,
                  dc.name AS category,
                  dc.code AS category_code,
                  COALESCE(
                    (
                      SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                          'image_text', pi.image_text,
                          'image_url', pi.image_url,
                          'is_primary', pi.is_primary
                        )
                      )
                      FROM place_images pi
                      WHERE pi.place_id = pd.id AND pi.is_delete = false
                    ),
                    JSON_ARRAY()
                  ) AS images,
                  COALESCE(
                    (
                      SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                          'name', pf.name,
                          'description', pf.description
                        )
                      )
                      FROM place_facilities pf
                      WHERE pf.place_id = pd.id AND pf.is_available = true
                    ),
                    JSON_ARRAY()
                  ) AS facilities,
                  COALESCE(
                    (
                      SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                          'name', pa.name,
                          'description', pa.description,
                          'duration', pa.duration
                        )
                      )
                      FROM place_activities pa
                      WHERE pa.place_id = pd.id AND pa.is_active = true
                    ),
                    JSON_ARRAY()
                  ) AS activities,
                  COALESCE(
                    (
                      SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                          'day', qp.day,
                          'value', qp.quota
                        )
                      )
                      FROM quota_place qp
                      WHERE qp.place_id = pd.id
                    ),
                    JSON_ARRAY()
                  ) AS quota_place,
                  COALESCE(
                    (
                      SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                          'id', tb.id,
                          'name', tb.name,
                          'description', tb.description,
                          'thumbnail_url', tb.thumbnail_url,
                          'thumbnail_text', tb.thumbnail_text,
                          'price_bc', tb.price,
                          'price_before_discount_bc', tb.price_before_discount,
                          'discount_bc', tb.discount,
                          'address', tb.address,
                          'city', tb.city,
                          'province', tb.province,
                          'country', tb.country,
                          'latitude', tb.latitude,
                          'longitude', tb.longitude,
                          'images', (
                            SELECT JSON_ARRAYAGG(
                              JSON_OBJECT(
                                'image_text', bpi.image_text,
                                'image_url', bpi.image_url,
                                'is_primary', bpi.is_primary
                              )
                            )
                            FROM place_images bpi
                            WHERE bpi.basecamp_id = tb.id
                          ),
                          'facilities', (
                            SELECT JSON_ARRAYAGG(
                              JSON_OBJECT(
                                'name', bpf.name,
                                'description', bpf.description
                              )
                            )
                            FROM place_facilities bpf
                            WHERE bpf.basecamp_id = tb.id AND bpf.is_available = true
                          ),
                          'quota', (
                            SELECT JSON_ARRAYAGG(
                              JSON_OBJECT(
                                'day', bqp.day,
                                'value', bqp.quota
                              )
                            )
                            FROM quota_place bqp
                            WHERE bqp.basecamp_id = tb.id
                          )
                        )
                      )
                      FROM tracking_basecamp tb
                      WHERE tb.place_id = pd.id
                    ),
                    JSON_ARRAY()
                  ) AS basecamp
              FROM place_destination pd
              JOIN destination_categories dc ON pd.category_id = dc.id
              WHERE pd.id = ? AND pd.seller_id = ?;
              `,
        params: [decryptedDestinationId, decryptedMcId],
        logName: 'GET DETAIL PLACE DESTINATION',
        isWriteOperation: false,
      });

      if (!response?.length) return new CustomHttpException('Not Found', 404);

      return this.__constructDetailPlace({
        place: response[0],
        query,
      });
    } catch (error) {
      this.logger.error(
        ['Destination Service', 'Get Detail Place Destination', 'ERROR'],
        {
          messages: `${error.message}`,
          transactionid,
        },
      );
      return Promise.reject(error);
    }
  }

  public async getDestinationType(headers: HeadersDto) {
    const { transactionid } = headers;
    try {
      const response =
        await this.generalHelper.readFromFile<TDestinationConfig>(
          DESTINATION_CONFIG_PATH,
        );
      return response.destination_type;
    } catch (error) {
      this.logger.error(
        ['Destination Service', 'Get Destination Type', 'ERROR'],
        {
          messages: `${error.message}`,
          transactionid,
        },
      );
      return Promise.reject(error);
    }
  }

  public async getScheduleDestination(
    headers: HeadersDto,
    query: GetScheduleDestinationDto,
  ) {
    const { transactionid } = headers;

    try {
      const { identifier, startTime, endTime, categoryCode } = query;
      let startTimeValid = startTime;
      const currentDate = Moment(); // Tanggal sekarang
      const queryStartDate = Moment(Number(startTimeValid)); // Start time dari query
      const queryEndDate = Moment(Number(endTime)); // Start time dari query

      if (
        queryStartDate.isBefore(currentDate, 'day') &&
        queryEndDate.isBefore(currentDate, 'day')
      ) {
        return { available_date: [] };
      }

      // Jika start_time lebih kecil dari tanggal sekarang, ubah menjadi tanggal sekarang
      if (queryStartDate.isBefore(currentDate, 'day')) {
        startTimeValid = currentDate.valueOf().toString();
      }
      const startDate = Moment(Number(startTimeValid));
      const endDate = Moment(Number(endTime));
      const allDates: Array<{ date: string; day: string; timestamp: number }> =
        [];

      // Menambahkan semua tanggal dalam rentang waktu yang diberikan
      while (startDate.isSameOrBefore(endDate, 'day')) {
        allDates.push({
          date: startDate.format('DD-MM-YYYY'),
          day: startDate.format('dddd').toLowerCase(),
          timestamp: startDate.valueOf(),
        });
        startDate.add(1, 'day');
      }
      const idField =
        categoryCode.toUpperCase() === 'GN' ? 'basecamp_id' : 'place_id';
      // Menjalankan kedua query secara paralel menggunakan Promise.all
      const [reservedRows, quotaRows] = await Promise.all([
        this.pool.executeRawQuery<
          Array<{ date: string; current_quota: number }>
        >({
          transactionid,
          query: `
          SELECT 
            FROM_UNIXTIME(CAST(start_time AS UNSIGNED) / 1000, '%d-%m-%Y') AS date,
            current_quota
          FROM reservation_schedule
          WHERE 
            ${idField} = ?
            AND CAST(start_time AS UNSIGNED) BETWEEN ? AND ?;
        `,
          params: [identifier, startTimeValid, endTime],
          logName: 'GET RESERVED SCHEDULE',
          isWriteOperation: false,
        }),
        this.pool.executeRawQuery<Array<{ day: string; quota: number }>>({
          transactionid,
          query: `
          SELECT day, quota
          FROM quota_place
          WHERE ${idField} = ?;
        `,
          params: [identifier],
          logName: 'GET QUOTA PLACE',
          isWriteOperation: false,
        }),
      ]);

      // Proses data yang sudah didapatkan
      const reservedMap = new Map(
        reservedRows.map((row) => [row.date, row.current_quota]),
      );
      const quotaMap = new Map(quotaRows.map((q) => [q.day, q.quota]));

      // Mengolah data untuk mendapatkan available_date
      const available_date = allDates
        .map(({ date, day }) => {
          if (reservedMap.has(date)) {
            const quota = reservedMap.get(date)!;
            return quota > 0 ? { date, quota } : null;
          } else {
            const quota = quotaMap.get(day);
            return quota ? { date, quota } : null;
          }
        })
        .filter(Boolean);

      return { available_date };
    } catch (error) {
      this.logger.error(
        ['Destination Service', 'Get Schedule Destination', 'ERROR'],
        {
          messages: `${error.message}`,
          transactionid,
        },
      );
      return Promise.reject(error);
    }
  }
}
