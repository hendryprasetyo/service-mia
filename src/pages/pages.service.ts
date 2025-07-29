import { Injectable } from '@nestjs/common';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import * as Path from 'path';
import { GeneralService } from 'src/common/helpers/general/general.service';
import { HeadersDto } from 'src/common/dtos/dto';
import {
  FooterLayoutDto,
  LayoutWebDto,
  SectionDto,
  LogoImageDto,
  TextLinkDto,
  ImagesDto,
} from 'src/common/dtos/pages.dto';

const PAGES_PATH = Path.join(__dirname, '../../assets/pages.json');

@Injectable()
export class PagesService {
  constructor(
    private readonly logger: LoggerServiceImplementation,
    private readonly generalService: GeneralService,
  ) {}

  private __filteringSectionElement<T extends { is_enable?: boolean }>(
    elements: T[],
    language: string,
    textField: string = 'text',
  ): T[] {
    return elements
      .filter((element) => element.is_enable)
      .map((element) => {
        delete element.is_enable;
        if (element[textField] && typeof element[textField] === 'object') {
          element[textField] = element[textField][language.toLowerCase()];
        }
        return element;
      });
  }

  public async getFooterLayout(headers: HeadersDto) {
    const { transactionid, channelid, language } = headers;
    try {
      const pcLayout = [];
      const response =
        await this.generalService.readFromFile<FooterLayoutDto>(PAGES_PATH);

      const layoutData = response['footer-layout'][channelid.toUpperCase()];
      layoutData.forEach((element: LayoutWebDto) => {
        element.sections.forEach((sec: SectionDto) => {
          sec.title = sec.title[language.toLowerCase()];

          sec.text_link = this.__filteringSectionElement<TextLinkDto>(
            sec.text_link,
            language,
          );
          sec.social_media = this.__filteringSectionElement<LogoImageDto>(
            sec.social_media,
            language,
          );
          sec.logo = this.__filteringSectionElement<LogoImageDto>(
            sec.logo,
            language,
          );
          sec.images = this.__filteringSectionElement<ImagesDto>(
            sec.images,
            language,
          );
        });
        pcLayout.push(element);
      });

      return { pc: pcLayout };
    } catch (error) {
      this.logger.error(['Page Service', 'GET Footer layout', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });

      return Promise.reject(error);
    }
  }

  public async getFormMerchantRegister(headers: HeadersDto) {
    const { transactionid } = headers;
    try {
      const response =
        await this.generalService.readFromFile<FooterLayoutDto>(PAGES_PATH);

      return response['form-merchant-register'];
    } catch (error) {
      this.logger.error(
        ['Page Service', 'GET Form Merchant Register', 'ERROR'],
        {
          messages: `${error.message}`,
          transactionid,
        },
      );

      return Promise.reject(error);
    }
  }
}
