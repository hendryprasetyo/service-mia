export type TImageDefault = {
  id: string;
  image_url: string;
  image_text: string;
  platform: string[];
  categories: string[];
  enable: boolean;
  is_new: boolean;
  is_default: boolean;
};

export type TContentConfig = {
  image_default_voucher: TImageDefault[];
  image_default_category: TImageDefault[];
};
