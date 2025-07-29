import * as fs from 'fs/promises';
import * as Path from 'path';
import { Injectable } from '@nestjs/common';
import { HeadersDto } from 'src/common/dtos/dto';
import { GeneralService } from 'src/common/helpers/general/general.service';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { TPolicyConfig, updateTranslationDto } from './asset.dto';
import { CustomHttpException } from 'src/common/helpers/lib/exception';

const TRANSLATION_PATH = Path.join(__dirname, '../../assets/languages.json');
const COUNTRY_LIST_PATH = Path.join(__dirname, '../../assets/countryList.json');
const POLICY_CONFIG_PATH = Path.join(
  __dirname,
  '../../assets/policyConfig.json',
);

@Injectable()
export class AssetService {
  constructor(
    private readonly logger: LoggerServiceImplementation,
    private readonly generalService: GeneralService,
  ) {}

  public async getTranslation(headers: HeadersDto, param: { pageId: string }) {
    const { transactionid } = headers;
    try {
      const result = await this.generalService.readFromFile(TRANSLATION_PATH);
      return { result, param };
    } catch (error) {
      this.logger.error(['Asset Service', 'GET Translation', 'ERROR'], {
        info: `${error.message}`,
        transactionid,
      });
      return Promise.reject(error);
    }
  }

  public async updateTranslation(
    headers: HeadersDto,
    reqBody: updateTranslationDto,
  ) {
    const { transactionid } = headers;

    try {
      const { items } = reqBody;
      const translations =
        await this.generalService.readFromFile(TRANSLATION_PATH);

      if (items?.length > 20)
        return new CustomHttpException('Bad Request', 400);

      items.forEach((item) => {
        if (!translations[item.langCode][item.key]) {
          throw { isValidate: true, message: `key ${item.key} notfound` };
        }
        translations[item.langCode][item.key] = item.value;
      });

      await fs.writeFile(
        TRANSLATION_PATH,
        JSON.stringify(translations, null, 2),
      );

      return;
    } catch (error) {
      this.logger.error(['Asset Service', 'UPDATE Translation', 'ERROR'], {
        info: `${error.message}`,
        transactionid,
      });
      if (error.isValidate) {
        return Promise.resolve(new CustomHttpException(error.message, 400));
      }
      return Promise.reject(error);
    }
  }

  public async getCountries(headers: HeadersDto) {
    const { transactionid } = headers;
    try {
      const result = await this.generalService.readFromFile(COUNTRY_LIST_PATH);
      return result;
    } catch (error) {
      this.logger.error(['Asset Service', 'GET Countries', 'ERROR'], {
        info: `${error.message}`,
        transactionid,
      });
      return Promise.reject(error);
    }
  }

  public async getPolicy(headers: HeadersDto) {
    const { transactionid, language } = headers;

    try {
      const result =
        await this.generalService.readFromFile<TPolicyConfig>(
          POLICY_CONFIG_PATH,
        );
      return result.default[language];
    } catch (error) {
      this.logger.error(['Asset Service', 'GET Policy', 'ERROR'], {
        info: `${error.message}`,
        transactionid,
      });
      return Promise.reject(error);
    }
  }
}
