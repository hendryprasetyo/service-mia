export type TextLinkDto = {
  text: string;
  url: string;
  is_enable: boolean;
};

export type SimpleSectionDto = {
  image?: string;
  text?: string;
  url?: string;
};

export type QrDto = {
  qr_image: string;
  qr_url: string;
  extra_images: string[];
};
export type LogoImageDto = {
  image: string;
  url: string;
  is_enable: boolean;
};

export type ImagesDto = {
  image: string;
  is_enable: boolean;
};

export type SectionDto = {
  type: number;
  title: {
    id: string;
    en: string;
  };
  simple_section?: SimpleSectionDto;
  text_link: TextLinkDto[];
  logo?: LogoImageDto[];
  images?: ImagesDto[];
  social_media?: LogoImageDto[];
  qr?: QrDto;
};

export type TSubMenuList = {
  id: number;
  key: string;
  transify_key: string;
  is_new: boolean;
  is_enable: boolean;
  cta: string;
  icon_url: string;
};

export type TMenuList = {
  id: number;
  key: string;
  transify_key: string;
  icon_url: string;
  is_enable: boolean;
  is_new: boolean;
  sub_menu_list: TSubMenuList[];
};

export type LayoutWebDto = {
  sections: SectionDto[];
};
export type FooterLayoutDto = {
  'footer-layout': {
    WEB: LayoutWebDto[];
  };
};

export type PagesDto = {
  'footer-layout': {
    WEB: LayoutWebDto[];
  };
  'dashboard-menu': TMenuList[];
  'seller-menu': TMenuList[];
};
