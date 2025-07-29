import * as Joi from 'joi';
import { isNumberOfString } from 'src/common/dtos/dto';
import { TPaymentType } from 'src/payment/payment.dto';
const validateOrderId = Joi.object({
  orderId: Joi.string().required().messages({
    'any.required': 'orderId is required.',
    'string.base': 'orderId must be a string.',
    'string.empty': 'orderId cannot be empty.',
  }),
});

export const GetOrderListDtoSchema = Joi.object({
  limit: isNumberOfString('limit', 1).optional(),
  page: isNumberOfString('page', 1).optional(),
  search: Joi.string().optional().allow(''),
  status: Joi.string().optional(),
});

export const CancelOrderDtoSchema = validateOrderId;
export const GetOrderDetailDtoSchema = validateOrderId;

type TValidateOrderId = {
  orderId: string;
};
export type CancelOrderDto = TValidateOrderId;
export type GetOrderDetailDto = TValidateOrderId;
export type TOrderStatus =
  | 'INPROGRESS'
  | 'DELIVERY'
  | 'CANCELED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'FAILURE';

export type TRawQueryDetailOrder = {
  // Kolom dari tabel `orders`
  order_id: string;
  no_order: string;
  user_id: string;
  seller_id: string;
  order_type: string;
  order_sub_type: string;
  total_price: number;
  total_price_before_discount: number;
  status: TOrderStatus;
  currency: string;
  discount: number | null;
  start_reservation: string | null;
  end_reservation: string | null;
  voucher_id: string | null;
  payment_method: TPaymentType;

  // Kolom dari tabel `order_detail`
  order_detail_id: number;
  order_identifier: string;
  order_detail_name: string;
  quantity: number;
  order_detail_price: number;
  order_detail_price_before_discount: number;
  order_detail_discount: number | null;

  // Kolom dari tabel `order_user_info`
  order_user_info_id: number;
  first_name: string;
  last_name: string | null;
  primary_email: string;
  salutation: string;
  secondary_email: string | null;
  primary_phone_number: string;
  secondary_phone_number: string | null;
  country: string;
  no_identifier: string;

  // Kolom dari tabel `fee_order`
  fees: string;

  // kolom voucher
  vouchers: string;

  //kolom seller
  seller_email: string;
  seller_name: string;

  //kolom transaction
  payment_transaction_id: string;
  payment_transaction_time: Date | string;
  payment_expiry_time: Date | string;
  payment_settlement_time?: Date | string;
  payment_va_number?: string;
  payment_bank?: string;
  payment_redirect_url?: string;
  payment_qr_code?: string;
  payment_qr_string?: string;
  created_at: string;
};

export type TResQueryOrderList = {
  order_id: string;
  no_order: string;
  user_id: string;
  created_at: string;
  order_type: string;
  order_sub_type: string;
  total_price: number;
  total_price_before_discount: number;
  total_quantity: number;
  status: string;
  currency: string;
  discount: number;
  payment_method: string;
  start_reservation: string;
  end_reservation: string;
  order_identifier: string;
  order_detail_id: string;
  quantity: number;
  order_detail_price: number;
  order_detail_price_before_discount: number;
  order_detail_discount: number;
  order_detail_name: string;
  seller_id: string;
  seller_name: string;
  thumbnail_url: string;
  thumbnail_text: string;
  fee_value: number;
  fee_value_type: string;
  fee_type: string;
};

// Definisi untuk order detail
interface OrderDetail {
  start_reservation: string | null;
  end_reservation: string | null;
  order_identifier: string;
  name: string;
  quantity: number;
  price: number;
  price_before_discount: number;
  format_price: string;
  format_price_before_discount: string;
  discount: number | null;
  order_userinfo: OrderUserInfo[];
  vouchers: TVouchers[];
}

// Definisi untuk informasi pengguna di order
interface OrderUserInfo {
  id: number;
  first_name: string;
  last_name: string;
  primary_email: string;
  salutation: string;
  secondary_email: string | null;
  primary_phone_number: string;
  secondary_phone_number: string | null;
  country: string;
  no_identifier: string;
}

// Definisi untuk voucher
export type TVouchers = {
  code: string;
  name: string;
  display_value: string;
  value: number;
  type: string;
  using_type: string;
};

// Definisi untuk fee
export type TFees = {
  fee_order_id: number;
  value: number;
  display_value: string;
  value_type: string;
  fee_type: string;
};

// Definisi untuk payment details
export type TPaymentDetail = {
  transaction_time: string | Date;
  expiry_time: string | Date;
  settlement_time?: string | Date;
  va_number?: string;
  bank?: string;
  redirect_url?: string;
  qe_code?: string;
};

// Definisi untuk seller
interface Seller {
  id: string;
  name: string;
  email: string;
}

// Definisi untuk response utama

// Response final untuk endpoint getDetailOrder
export type GetDetailOrderResponse = {
  order_id: string;
  no_order: string;
  order_type: string;
  order_sub_type: string;
  total_price: number;
  total_price_before_discount: number;
  format_total_price: string;
  format_total_price_before: string;
  status: string;
  currency: string;
  discount: number | null;
  payment_method: string;
  order_details: OrderDetail[];
  payment_detail: TPaymentDetail;
  seller: Seller;
  fees: TFees[];
};
export type GetOrderListDto = {
  limit?: string;
  page?: string;
  search?: string;
  status?: TOrderStatus;
};
