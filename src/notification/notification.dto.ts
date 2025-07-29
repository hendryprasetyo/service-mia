import { TLanguage, TParamRawQuery, TTranslations } from 'src/common/dtos/dto';
import {
  TPaymentTypeMidtrans,
  TTransactionStatusMidtrans,
} from 'src/common/providers/midtrans/midtrans.dto';
import { TPaymentType } from 'src/payment/payment.dto';

type VaNumber = {
  va_number: string;
  bank: string;
};

type Actions = {
  name: string;
  method: string;
  url: string;
};

export type TranscationNotifDto = {
  va_numbers?: VaNumber[];
  actions?: Actions[];
  payment_amounts?: unknown[];
  settlement_time?: string;
  expiry_time?: string;
  reference_id?: string;
  transaction_time: string;
  transaction_status: TTransactionStatusMidtrans | string;
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key?: string;
  payment_type: TPaymentTypeMidtrans | string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  fraud_status: string;
  currency: string;
};

// type definition non validation
export type TPaymentNotifCallback = {
  payment_notif_callback: {
    subject_email: {
      pending: TTranslations;
      settlement: TTranslations;
      cancel: TTranslations;
      expire: TTranslations;
      failure: TTranslations;
    };
    mapping_order_status: {
      settlement: string;
      expire: string;
      cancel: string;
      failure: string;
    };
  };
};

export type TInitOrder = {
  order_status: 'PENDING';
  order_id: string;
  paymentMethod: TPaymentType;
  customerInfo: {
    firstName: string;
    lastName?: string;
    phoneNumber: string;
    email: string;
  };
  sellerInfo: string;
  language: TLanguage;
};

export type TResponseQueryGetOrder = {
  payment_id: string;
  order_detail_id: string;
  customer_id: string;
  customer_name: string;
  total_price: number;
  order_id: string;
  seller_name: string;
  order_type: string;
  order_sub_type: string;
  seller_email: string;
  customer_email: string;
  start_reservation: string;
  end_reservation: string;
  order_identifier: string;
  basecamp_id?: string;
  voucher_order_id?: number;
  quantity: number;
};

export type TResDataSourceNotifCallback = {
  isGN: boolean;
  isReservation: boolean;
  detailOrder: {
    customer_id: string;
    order_id: string;
    total_price: number;
    order_type: string;
    order_sub_type: string;
    customer_name: string;
    customer_email: string;
    seller_name: string;
    seller_email: string;
    payment_id: string;
  };
  paramsReservationSchedule: TParamRawQuery[];
  caseStatementReservationSchedule: string[];
  whereStatementReservationSchedule: string[];
};
