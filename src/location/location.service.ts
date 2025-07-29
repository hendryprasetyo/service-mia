import * as _ from 'lodash';
import * as Path from 'path';
import { Injectable } from '@nestjs/common';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { GeneralService } from 'src/common/helpers/general/general.service';
import { HeadersDto } from 'src/common/dtos/dto';
import {
  AreaDataType,
  CountryDataType,
  GetCityDto,
  GetLocationDto,
  GetRecommendedAcomodationDto,
  GetRoutingDto,
  NominatimResponse,
  TAcomodation,
  TGenericAcomodationData,
} from './location.dto';
import CONSTANT from 'src/common/constants/config';

const AREA_PATH = Path.join(__dirname, '../../assets/area.json');
const TRAIN_STATION_PATH = Path.join(
  __dirname,
  '../../assets/trainStation.json',
);
const BUS_STATION_PATH = Path.join(__dirname, '../../assets/busStation.json');
const HARBOR_STATION_PATH = Path.join(__dirname, '../../assets/harbor.json');
const AIRPORT_STATION_PATH = Path.join(__dirname, '../../assets/airport.json');
const COUNTRIES_PATH = Path.join(__dirname, '../../assets/countryList.json');

@Injectable()
export class LocationService {
  constructor(
    private readonly logger: LoggerServiceImplementation,
    private readonly generalService: GeneralService,
  ) {}

  // private __normalizeText(
  //   text: string,
  //   textCase: 'toLowerCase' | 'toUpperCase' = 'toLowerCase',
  // ): string {
  //   return text[textCase]()
  //     .replace(/[^a-z0-9\s]/g, '') // hilangkan titik, koma, dll
  //     .replace(/\b(kab|kota|kabupaten)\b/g, '') // hapus awalan tidak penting
  //     .replace(/\s+/g, ' ') // hapus spasi berlebih
  //     .trim();
  // }

  // private __containsWord(source: string, keyword: string): boolean {
  //   const src = this.__normalizeText(source);
  //   const key = this.__normalizeText(keyword);
  //   return src.includes(key);
  // }

  // private __getNearestStation(
  //   stations: TAcomodation[],
  //   from: { latitude: string; longitude: string },
  // ): TAcomodation | null {
  //   const nearest = stations.reduce<{
  //     station: TAcomodation;
  //     distance: number;
  //   } | null>((nearest, station) => {
  //     const stationLat = parseFloat(station.latitude);
  //     const stationLon = parseFloat(station.longitude);
  //     const distance = this.__calculateDistanceKm(
  //       parseFloat(from.latitude),
  //       parseFloat(from.longitude),
  //       stationLat,
  //       stationLon,
  //     );

  //     if (!nearest || distance < nearest.distance) {
  //       return { station, distance };
  //     }

  //     return nearest;
  //   }, null);

  //   return nearest?.station ?? null;
  // }

  private async __loadAcomodationData(
    type: string,
    country: string,
  ): Promise<TAcomodation[]> {
    const ACOMODATION_PATHS: Record<string, string> = {
      [CONSTANT.TRAIN.toLowerCase()]: TRAIN_STATION_PATH,
      [CONSTANT.BUS.toLowerCase()]: BUS_STATION_PATH,
      [CONSTANT.HARBOR.toLowerCase()]: HARBOR_STATION_PATH,
      [CONSTANT.AIRPORT.toLowerCase()]: AIRPORT_STATION_PATH,
    };

    const typesToLoad =
      type === CONSTANT.ALL.toLowerCase()
        ? Object.keys(ACOMODATION_PATHS)
        : [type.toLowerCase()];

    const results: TAcomodation[][] = await Promise.all(
      typesToLoad.map(async (key) => {
        const path = ACOMODATION_PATHS[key];
        // `as TAcomodation[]` digunakan karena kita tahu bahwa path-nya akan sesuai
        const data =
          await this.generalService.readFromFile<
            TGenericAcomodationData<TAcomodation>
          >(path);
        return data[country?.toUpperCase()] ?? [];
      }),
    );

    return results.flat();
  }

  private __toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private __calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radius Bumi dalam km
    const dLat = this.__toRadians(lat2 - lat1);
    const dLon = this.__toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.__toRadians(lat1)) *
        Math.cos(this.__toRadians(lat2)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private __constructResponseAcomodation(dataObj: {
    acomodations: (TAcomodation & {
      latitude: string;
      longitude: string;
      type: string;
    })[];
    points: {
      from: { latitude: number; longitude: number }[];
      to: { latitude: number; longitude: number }[];
    };
    limit: number;
    filterFn?: (station: TAcomodation) => boolean;
  }): {
    from: Record<string, ReturnType<typeof this.__formatAcomodation>[]>;
    to: Record<string, ReturnType<typeof this.__formatAcomodation>[]>;
  } {
    const { limit, points, acomodations, filterFn } = dataObj;

    const distanceMap = this.__groupAcomodationsByTypeAndCategory(
      acomodations,
      points,
      filterFn,
    );

    const result: {
      from: Record<string, ReturnType<typeof this.__formatAcomodation>[]>;
      to: Record<string, ReturnType<typeof this.__formatAcomodation>[]>;
    } = { from: {}, to: {} };

    for (const category of ['from', 'to'] as const) {
      for (const type in distanceMap[category]) {
        result[category][type] = this.__sortAndLimit(
          distanceMap[category][type],
          limit,
        );
      }
    }

    return result;
  }

  // Helper 1: Hitung jarak minimum dan kelompokkan berdasarkan type dan kategori (from/to)
  private __groupAcomodationsByTypeAndCategory(
    acomodations: (TAcomodation & {
      latitude: string;
      longitude: string;
      type: string;
    })[],
    points: {
      from: { latitude: number; longitude: number }[];
      to: { latitude: number; longitude: number }[];
    },
    filterFn?: (station: TAcomodation) => boolean,
  ): Record<
    'from' | 'to',
    Record<string, { acomodation: TAcomodation; distance: number }[]>
  > {
    const distanceMap = {
      from: {} as Record<
        string,
        { acomodation: TAcomodation; distance: number }[]
      >,
      to: {} as Record<
        string,
        { acomodation: TAcomodation; distance: number }[]
      >,
    };

    for (const acomodation of acomodations) {
      if (filterFn && !filterFn(acomodation)) continue;

      const lat = parseFloat(acomodation.latitude);
      const lon = parseFloat(acomodation.longitude);
      const type = acomodation.type.toLowerCase();

      const minDistances = {
        from: Infinity,
        to: Infinity,
      };

      for (const category of ['from', 'to'] as const) {
        for (const point of points[category]) {
          const distance = this.__calculateDistanceKm(
            point.latitude,
            point.longitude,
            lat,
            lon,
          );
          if (distance < minDistances[category]) {
            minDistances[category] = distance;
          }
        }

        if (minDistances[category] < Infinity) {
          if (!distanceMap[category][type]) {
            distanceMap[category][type] = [];
          }

          distanceMap[category][type].push({
            acomodation,
            distance: minDistances[category],
          });
        }
      }
    }

    return distanceMap;
  }

  // Helper 2: Urutkan berdasarkan jarak dan batasi jumlah
  private __sortAndLimit(
    entries: { acomodation: TAcomodation; distance: number }[],
    limit: number,
  ): ReturnType<typeof this.__formatAcomodation>[] {
    return entries
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
      .map((entry) =>
        this.__formatAcomodation(entry.acomodation, entry.distance),
      );
  }

  // Helper 3: Format field-field yang dibutuhkan
  private __formatAcomodation(
    acomodation: TAcomodation & { latitude: string; longitude: string },
    distance: number,
  ): {
    name: string;
    city: string;
    province: string;
    address?: string | null;
    class: string;
    latitude: number;
    longitude: number;
    distance: string;
  } {
    const {
      namobj,
      city,
      province,
      address,
      class: typeClass,
      latitude,
      longitude,
      type,
    } = acomodation;
    const formatName = type === 'train' ? `ST. ${namobj}` : namobj;
    const formatDistance = `${Number(distance.toFixed(2))} Km`;
    return {
      name: formatName.trim(),
      city: city.trim(),
      province: province.trim(),
      address: address?.trim() ?? null,
      class: typeClass,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      distance: formatDistance, // optional: round to 2 decimals
    };
  }

  public async getCity(query: GetCityDto, headers: HeadersDto) {
    const { transactionid } = headers;
    try {
      const { province } = query;
      const response =
        await this.generalService.readFromFile<AreaDataType>(AREA_PATH);

      if (province) {
        return _.map(_.filter(response.cities, { province }), 'name');
      }
      return response.laccimaCities;
    } catch (error) {
      this.logger.error(['Location Service', 'Get City', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });
      return Promise.reject(error);
    }
  }

  public async getProvince(headers: HeadersDto) {
    const { transactionid } = headers;
    try {
      const response =
        await this.generalService.readFromFile<AreaDataType>(AREA_PATH);

      return response.provinces;
    } catch (error) {
      this.logger.error(['Location Service', 'Get Province', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });
      return Promise.reject(error);
    }
  }

  public async getProvinceCoordinates(headers: HeadersDto) {
    const { transactionid } = headers;
    try {
      const response =
        await this.generalService.readFromFile<AreaDataType>(AREA_PATH);

      return response.provincesWithCoordinate;
    } catch (error) {
      this.logger.error(
        ['Location Service', 'Get Province Coordinates', 'ERROR'],
        {
          messages: `${error.message}`,
          transactionid,
        },
      );
      return Promise.reject(error);
    }
  }

  public async getLocationDetail(query: GetLocationDto, headers: HeadersDto) {
    const { transactionid } = headers;
    try {
      const { latitude, longitude, zoom } = query;
      const responseLocation: NominatimResponse =
        await this.generalService.callAPI({
          baseURL: process.env.BASE_URL_NOMINATIM_OPEN_STREET_MAP,
          method: 'get',
          transactionid,
          url: '/reverse',
          payload: {
            lat: latitude,
            lon: longitude,
            zoom: zoom || '18',
            format: 'jsonv2',
          },
        });

      const { address, display_name } = responseLocation;
      return {
        display_name: display_name || '',
        province: address?.state || address?.city || '',
        country: address?.country || '',
        city:
          address?.county ||
          address?.city_district ||
          address?.regency ||
          address?.city ||
          '',
      };
    } catch (error) {
      this.logger.error(['Location Service', 'Get Location', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });
      return Promise.reject(error);
    }
  }

  public async getCountry(headers: HeadersDto) {
    const { transactionid } = headers;
    try {
      const response =
        await this.generalService.readFromFile<CountryDataType>(COUNTRIES_PATH);

      return response;
    } catch (error) {
      this.logger.error(['Location Service', 'Get Province', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });
      return Promise.reject(error);
    }
  }

  public async getRouting(headers: HeadersDto, reqBody: GetRoutingDto) {
    const { transactionid } = headers;
    try {
      const { from, to, profile, returnType } = reqBody;
      const payload = {
        coordinates: [
          [parseFloat(from.longitude), parseFloat(from.latitude)],
          [parseFloat(to.longitude), parseFloat(to.latitude)],
        ],
      };
      let endpoint = `/v2/directions/${profile}`;
      if (returnType) {
        endpoint = `${endpoint}/${returnType}`;
      }
      const response = await this.generalService.callAPI({
        baseURL: process.env.OPENROUTE_SERVICE_BASE_URL,
        url: endpoint,
        method: 'post',
        transactionid,
        payload,
        provider: 'openrouteservice',
        headers: { Authorization: process.env.OPENROUTE_SERVICE_BASIC_KEY },
      });

      return response;
    } catch (error) {
      this.logger.error(['Location Service', 'Get Routing', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });
      return Promise.reject(error);
    }
  }

  public async getRecommendedAcomodation(
    headers: HeadersDto,
    reqBody: GetRecommendedAcomodationDto,
  ) {
    const { transactionid, language } = headers;
    const { typeAcomodation, from, to } = reqBody;

    try {
      const rawData = await this.__loadAcomodationData(
        typeAcomodation,
        from.country,
      );
      const getNearestAcomodation = this.__constructResponseAcomodation({
        acomodations: rawData,
        points: {
          from: [
            {
              latitude: Number(from.latitude),
              longitude: Number(from.longitude),
            },
          ],
          to: [
            {
              latitude: Number(to.latitude),
              longitude: Number(to.longitude),
            },
          ],
        },
        limit: 5,
        filterFn: (station: TAcomodation) =>
          station.status?.toLowerCase() === CONSTANT.ACTIVE,
      });

      return {
        ...getNearestAcomodation,
        disclaimer: CONSTANT.DISCLAIMER_RECOMMENDED_ACOMODATION[language],
      };
    } catch (error) {
      this.logger.error(
        ['Location Service', 'Get Recommended Acomodation', 'ERROR'],
        {
          messages: `${error.message}`,
          transactionid,
        },
      );
      return Promise.reject(error);
    }
  }
}
