import * as Joi from 'joi';
import {
  isNumberOfString,
  isValidBirthDay,
  isValidEndTime,
  isValidStartTime,
  TGender,
  TOrderSubType,
  validateEmail,
} from 'src/common/dtos/dto';
import {
  PaymentConfigDto,
  PaymentMethodListDto,
} from 'src/common/dtos/paymentMethod.dto';
import { TVoucherUsingType, TVoucherValueType } from 'src/admin/admin.dto';

export const FulfillmentDtoSchema = Joi.object({
  paymentType: Joi.string()
    .valid(
      ...[
        'bank_transfer',
        'permata',
        'qris',
        'gopay',
        'shopeepay',
        'echannel',
        'ots',
      ].map((paymentType) => paymentType.toLowerCase()),
    )
    .required()
    .messages({
      'any.required': 'paymentType is required.',
      'string.base': 'paymentType must be a string.',
      'string.empty': 'paymentType cannot be empty.',
      'any.only': 'paymentType is not allowed',
    }),
  bank: Joi.string()
    .valid('bca', 'bri', 'bni')
    .when('paymentType', {
      is: 'bank_transfer',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    })
    .messages({
      'any.only': 'bank is not allowed',
      'string.base': 'bank must be a string.',
      'any.unknown':
        'bank attribute is not allowed when paymentType is not bank_transfer".',
    }),
  callbackUrl: Joi.string()
    .uri()
    .when('paymentType', {
      is: Joi.valid('gopay', 'shopeepay'),
      then: Joi.required().messages({
        'any.required':
          'callbackUrl is required when paymentType is gopay or shopeepay.',
        'string.base': 'callbackUrl must be a string.',
      }),
      otherwise: Joi.forbidden(),
    }),
  orderDetail: Joi.object({
    orderType: Joi.string()
      .valid(
        'RESERVATION',
        'PRODUCT',
        'SERVICE',
        'VOUCHER',
        'GIFT',
        'SUBSCRIPTION',
        'ADDON',
        'TICKET',
      )
      .required(),
    orderSubType: Joi.string().when('orderType', {
      is: 'RESERVATION',
      then: Joi.valid('GN', 'CP', 'VL', 'OA').required(),
      otherwise: Joi.when('orderType', {
        is: 'PRODUCT',
        then: Joi.valid('PD').required(),
        otherwise: Joi.when('orderType', {
          is: 'VOUCHER',
          then: Joi.valid('VC').required(),
          otherwise: Joi.when('orderType', {
            is: 'GIFT',
            then: Joi.valid('GF').required(),
            otherwise: Joi.when('orderType', {
              is: 'SUBSCRIPTION',
              then: Joi.valid('SBPT').required(),
              otherwise: Joi.when('orderType', {
                is: 'ADDON',
                then: Joi.valid('AD').required(),
                otherwise: Joi.when('orderType', {
                  is: 'TICKET',
                  then: Joi.valid('TC').required(),
                  otherwise: Joi.forbidden(),
                }),
              }),
            }),
          }),
        }),
      }),
    }),
    vouchers: Joi.array()
      .items(
        Joi.object({
          voucherCode: Joi.string().max(16).required(),
          voucherType: Joi.string().valid('shipping', 'discount').required(),
        }),
      )
      .custom((vouchers, helpers) => {
        const seenTypes = new Set();

        for (const voucher of vouchers) {
          if (seenTypes.has(voucher.voucherType)) {
            return helpers.error('any.duplicateVoucherType', {
              type: voucher.voucherType,
            });
          }
          seenTypes.add(voucher.voucherType);
        }

        return vouchers;
      })
      .messages({
        'any.duplicateVoucherType': 'Voucher not Valid',
      })
      .optional(),
    selectedOrderIds: Joi.array()
      .items(
        Joi.object({
          shopId: Joi.string().required(),
          itemBriefs: Joi.array()
            .items(
              Joi.object({
                members: Joi.array()
                  .items(
                    Joi.object({
                      typeIdentifier: Joi.string()
                        .required()
                        .valid('ktp', 'passport'),
                      noIdentifier: Joi.string()
                        .required()
                        .when('typeIdentifier', {
                          is: 'ktp',
                          then: isNumberOfString('noIdentifier').length(16),
                          otherwise: Joi.string().min(8).max(9),
                        }),
                      firstName: Joi.string().required().messages({
                        'any.required': 'firstName is required',
                        'string.base': 'firstName must be a string',
                      }),
                      lastName: Joi.string().optional().allow(''),
                      birthday: isNumberOfString('birthday')
                        .custom((value, helpers) => {
                          const parseValue = parseInt(value, 10);
                          if (!isValidBirthDay(parseValue))
                            return helpers.error('any.birthday');
                          return value;
                        })
                        .required()
                        .messages({
                          'any.birthday': 'Invalid birthday',
                        }),
                      gender: Joi.string()
                        .required()
                        .valid('male', 'female', 'other'),
                      phoneNumber: isNumberOfString('phoneNumber').required(),
                      email: validateEmail.required(),
                      secondaryEmail: validateEmail.optional().allow(''),
                      secondaryPhoneNumber: isNumberOfString(
                        'secondaryPhoneNumber',
                      )
                        .optional()
                        .allow(''),
                    }),
                  )
                  .when(Joi.ref('......orderSubType'), {
                    is: 'GN',
                    then: Joi.required(),
                    otherwise: Joi.optional(),
                  }),
                basecampId: Joi.string()
                  .uuid()
                  .when(Joi.ref('......orderSubType'), {
                    is: 'GN',
                    then: Joi.required(),
                    otherwise: Joi.forbidden(),
                  }),
                itemId: Joi.string().required(),
                quantity: Joi.number().required().greater(0),
              }),
            )
            .required(),
          shopVouchers: Joi.array()
            .items(
              Joi.object({
                voucherCode: Joi.string().max(16).required(),
              }),
            )
            .optional(),
        }),
      )
      .custom((value, helpers) => {
        const { orderSubType } = helpers.state.ancestors[0];
        if (orderSubType === 'GN' && value.length > 1)
          return helpers.error('any.custom');
      })
      .required()
      .messages({
        'any.custom': 'Invalid selectedOrderIds',
      }),
    startTime: isNumberOfString('startTime')
      .custom((value, helpers) => {
        const { orderSubType } = helpers.state.ancestors[0];
        const parseValue = parseInt(value, 10);
        if (!isValidStartTime(parseValue, orderSubType))
          return helpers.error('any.startTime');
        return value;
      })
      .messages({
        'any.startTime': 'Invalid startTime',
      })
      .when('orderType', {
        is: 'RESERVATION',
        then: Joi.required(),
        otherwise: Joi.forbidden(),
      }),
    endTime: isNumberOfString('endTime')
      .custom((value, helpers) => {
        const { orderSubType } = helpers.state.ancestors[0];
        const parseValue = parseInt(value, 10);
        if (!isValidEndTime(parseValue, orderSubType))
          return helpers.error('any.custom');
        return value;
      })
      .messages({
        'any.custom': 'Invalid endTime',
      })
      .when('orderSubType', {
        is: Joi.valid('VL', 'CP'),
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
  }).required(),
  customerInfo: Joi.object({
    firstName: Joi.string().required().messages({
      'any.required': 'firstName is required',
      'string.base': 'firstName must be a string',
    }),
    lastName: Joi.string().optional().allow(''),
    phoneNumber: isNumberOfString('phoneNumber').required(),
    email: validateEmail.required(),
  })
    .required()
    .messages({
      'any.required': 'customerInfo is required',
    }),
  useCoin: Joi.boolean().required(),
});

export type TPaymentType =
  | 'bank_transfer'
  | 'qris'
  | 'gopay'
  | 'shopeepay'
  | 'echannel'
  | 'permata'
  | 'ots';

export type TOrderType =
  | 'RESERVATION'
  | 'PRODUCT'
  | 'SERVICE'
  | 'VOUCHER'
  | 'GIFT'
  | 'SUBSCRIPTION'
  | 'ADDON'
  | 'TICKET';

type TCustomerInfo = {
  firstName: string;
  lastName?: string;
  phoneNumber: string;
  email: string;
};

type TMemberReservation = {
  firstName: string;
  noIdentifier: string;
  typeIdentifier: 'ktp' | 'passport';
  lastName?: string;
  phoneNumber: string;
  email: string;
  birthday: string;
  gender: TGender;
  secondaryEmail?: string;
  secondaryPhoneNumber?: string;
};

type TItemBrief = {
  itemId: string;
  basecampId?: string;
  members: TMemberReservation[];
  quantity: number;
};

type TVoucher = {
  voucherCode: string;
};

export type TSelectedOrderIds = {
  shopId: string;
  itemBriefs: TItemBrief[];
  shopVouchers?: TVoucher[];
};

export type TOrderDetailFulfillment = {
  orderType: TOrderType;
  orderSubType: TOrderSubType;
  startTime: string;
  endTime?: string;
  vouchers?: TVoucher[];
  selectedOrderIds: TSelectedOrderIds[];
};
export type FulfillmentDto = {
  paymentType: TPaymentType;
  bank?: 'bca' | 'bri' | 'bni';
  callbackUrl?: string;
  vouchers?: TVoucher[];
  orderDetail: TOrderDetailFulfillment;
  customerInfo: TCustomerInfo;
  useCoin: boolean;
};

export type TProcessFulfillment = {
  userId: string;
  transactionid: string;
  paymentConfig: PaymentConfigDto;
  dataSource: TResConstructPayloadFulfillment;
};

export type TResponseFulfillment = {
  order_id: string;
  no_order: string;
  transaction_time: string;
  expiry_time: string;
  payment_type: 'VA' | 'QRIS' | 'GOPAY' | 'SHOPEEPAY' | 'OTS' | null;
  bank?: string;
  va_number?: string;
  qr_url?: string;
  redirect_url?: string;
};

export type TResponseQueryVoucher = {
  name: string;
  code: string;
  source: string;
  value: number;
  value_type: TVoucherValueType;
  using_type: TVoucherUsingType;
  is_used: number;
};

export type TResponseQueryGetPlace = {
  id: string;
  name: string;
  category_code: string;
  thumbnail_url: string;
  thumbnail_text: string;
  basecamp_name?: string;
  reservation_id?: string;
  current_quota?: number;
  price: number;
  price_before_discount: number;
  quota_place: number;
  basecamp_id: string;
  basecamp_price: number;
  basecamp_price_before_discount: number | null;
  basecamp_discount: number | null;
  discount: number | null;
};

export type TResponseConstructVouchers = {
  code: string;
  source?: string;
  shopId?: string;
  itemId?: string;
  voucher_identifier?: string;
  value_type?: string;
  value?: number;
};

export type TResConstructPayloadFulfillment = {
  dayOfStartTime: string;
  unixCurrentTime: number;
  unixStartOfToday: number;
  unixEndOfToday: number;
  totalQuantity: number;
  totalQuantityPerShop: Record<string, number>;
  firstItemId: string;
  firstBasecampId?: string;
  listNoIdentifier?: string[];
  paymentSelected: PaymentMethodListDto;
  orderId: string;
  isGN: boolean;
  isReservation: boolean;
  vouchers: TResponseConstructVouchers[];
  decryptedReqBody: FulfillmentDto;
};
export type TParamsConstructAmount = {
  paymentConfig: PaymentConfigDto;
  dataSource: TResConstructPayloadFulfillment;
  orderDetails: {
    id: string;
    shopId: string;
    name: string;
    price: number;
    quantity: number;
  }[];
};
export type TConstructPayloadValues = {
  paymentConfig: PaymentConfigDto;
  dataSource: TResConstructPayloadFulfillment;
  startTime: string;
  endTime?: string;
  userId: string;
  placeDestination: TResponseQueryGetPlace[];
};
export type TResConstructValuesDataSource = {
  totalAmount: number;
  totalGrossPrice: number;
  totalVoucherDiscountMIA: number;
  feePayment: number;
  adminFee: number;
  totalVoucher: number;
  orderDetailValueQuery: Array<string | number | boolean>;
  orderDetailPlaceholders: string;
  userInfoValueQuery?: Array<string | number | boolean>;
  userInfoPlaceholders?: string;
  noOrder: string;
  orderDetails: {
    id: string;
    shopId: string;
    name: string;
    price: number;
    quantity: number;
  }[];
};
