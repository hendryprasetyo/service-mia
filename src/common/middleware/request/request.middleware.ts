import * as _ from 'lodash';
import * as Moment from 'moment';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerServiceImplementation } from '../../helpers/logger/logger.service';
import { HeadersDto } from 'src/common/dtos/dto';
import { CustomHttpException } from 'src/common/helpers/lib/exception';
import lib from 'src/common/helpers/lib/lib.service';

@Injectable()
export class RequestMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerServiceImplementation) {}

  private isValidMomentTimestamp(timestamp: string): boolean {
    // Format timestamp dari client adalah: YYMMDDHHmmssSSS
    const parsedDate = Moment(timestamp, 'YYMMDDHHmmssSSS', true);

    if (!parsedDate.isValid()) return false;

    const now = Moment.utc(); // gunakan UTC untuk netralisasi zona waktu
    return parsedDate.isSame(now, 'day');
  }

  use(request: Request, response: Response, next: NextFunction) {
    const { method, originalUrl } = request;
    const pathOnly = new URL(originalUrl, `http://${request.headers.host}`)
      .pathname;
    const now = Date.now();
    const apiAllowLogingReqBody = JSON.parse(
      process.env.ALLOW_LOG_REQUEST_ENDPOINT || '[]',
    );
    const skipedApiHeaders = JSON.parse(
      process.env.SKIPED_ENDPOINT_REQUEST_HEADERS || '[]',
    );
    const { transactionid, deviceid, language, platform, channelid } =
      request.headers as unknown as HeadersDto;
    const defaultTrxId = lib.generateTrxId();
    const isSkipedApi = _.includes(skipedApiHeaders, pathOnly);
    if (isSkipedApi) request.headers.transactionid = defaultTrxId;

    response.on('finish', () => {
      const { statusCode } = response;
      const logData = {
        _id: request.headers.transactionid,
        method,
        url: originalUrl,
        status: statusCode,
        timeTaken: `${Date.now() - now}`,
        channelid,
        language: request.headers.language,
        ip: request.ip,
        deviceId: deviceid,
      };
      if (
        _.includes(apiAllowLogingReqBody, originalUrl) &&
        !_.isEmpty(request.body)
      ) {
        Object.assign(logData, { reqBody: request.body });
      }
      this.logger.log(['API Request', 'info'], logData);
    });

    if (isSkipedApi) {
      return next();
    }

    const appVersion = request.headers['wildbook-version'];
    const getLogValue = (value?: string): string => value || 'N/A';
    const isValidRequiredVersion =
      (channelid?.toLowerCase() === 'mobile' && !!appVersion) ||
      channelid?.toLowerCase() === 'web';
    const detailValue = {
      transactionid: getLogValue(transactionid),
      deviceid: getLogValue(deviceid),
      language: getLogValue(language),
      platform: getLogValue(platform),
      channelid: getLogValue(channelid),
      'wildbook-version': appVersion,
      'content-type': request.headers['content-type'],
    };

    const transactionIdPattern = /^AWB32(\d{15})(\d{5})0$/;
    const deviceIdPattern =
      /^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/i;
    const isValidTransactionId =
      !!transactionid &&
      transactionid.length === +process.env.LENGTH_TRXID &&
      transactionIdPattern.test(transactionid) &&
      this.isValidMomentTimestamp(transactionid.match(transactionIdPattern)[1]);
    const isValidPlatform =
      !!platform && ['WEB', 'ANDROID', 'IOS'].includes(platform.toUpperCase());
    const isValidLanguage =
      language && ['id', 'en'].includes(language.toLowerCase());
    const isValidChannelId =
      !!channelid && ['web', 'mobile'].includes(channelid.toLowerCase());

    if (
      !transactionid ||
      !deviceid ||
      !language ||
      !platform ||
      !channelid ||
      !isValidRequiredVersion ||
      (method.toUpperCase() !== 'GET' && !request.headers['content-type'])
    ) {
      this.logger.log(['API Request', 'REQUEST INTERCEPTOR', 'ERROR'], {
        info: 'Missing Parameter in headers',
        detailValue,
        transactionid: transactionid || defaultTrxId,
      });
      throw new CustomHttpException(
        'Missing Mandatory Parameter',
        400,
        {
          cause: '40000',
        },
        { transactionid: transactionid || defaultTrxId },
      );
    }

    const invalidParams = [];

    if (!isValidTransactionId) {
      invalidParams.push('transactionid');
    }
    if (!deviceIdPattern.test(deviceid)) {
      invalidParams.push('deviceid');
    }
    if (!isValidPlatform) {
      invalidParams.push('platform');
    }
    if (!isValidLanguage) {
      invalidParams.push('language');
    }
    if (!isValidChannelId) {
      invalidParams.push('channelid');
    }

    if (invalidParams.length) {
      this.logger.log(['API Request', 'REQUEST INTERCEPTOR', 'ERROR'], {
        info: 'Invalid Parameter in headers',
        detailValue,
        error: invalidParams,
        transactionid,
      });
      throw new CustomHttpException(
        'Invalid Mandatory Parameter',
        400,
        {
          cause: '40000',
        },
        { transactionid: transactionid || defaultTrxId },
      );
    }

    if (process.env.NODE_ENV !== 'test' && typeof language === 'string') {
      request.headers.language = language;
    } else {
      request.headers.language = 'id';
    }

    next();
  }
}
