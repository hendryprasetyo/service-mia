type Platform = 'ANDROID' | 'IOS' | 'WEB';

type PaymentCategory = 'virtual_account' | 'e-wallet' | 'echannel';

export type InstructionStep = {
  [key: string]: string;
};

export type Instruction = {
  type: string;
  text_display: string;
  enable: boolean;
  step: InstructionStep;
};

export type Icon = {
  android: string;
  ios: string;
  web: string;
};

export type ExpiryDuration = {
  duration: number;
  unit: string;
};

export type TFee = {
  value: string;
  type: 'IDR' | 'percentage';
};

export type PaymentMethodListDto = {
  id: number;
  is_primary: boolean;
  payment_type: string;
  bank: string;
  exlude_app_version: string[];
  label: string;
  sub_label: string;
  category: PaymentCategory;
  category_display: string;
  text_display: string;
  icon: Icon;
  enable: boolean;
  platform: Platform[];
  expiry_duration: ExpiryDuration;
  instruction: Instruction[];
  fee: TFee;
};

export type PaymentConfigDto = {
  payment_provider: {
    midtrans: string[];
    ots: string[];
  };
  admin_fee: {
    value: string;
    type: 'IDR';
    discount: number;
    discount_type: 'percentage';
  };
};
