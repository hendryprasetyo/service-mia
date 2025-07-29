import { TPaymentType } from 'src/payment/payment.dto';

export type TPaymentTypeMidtrans =
  | 'bank_transfer'
  | 'qris'
  | 'gopay'
  | 'shopeepay'
  | 'echannel'
  | 'ots';

export type TTransactionStatusMidtrans =
  | 'settlement'
  | 'deny'
  | 'pending'
  | 'cancel'
  | 'refund'
  | 'partial_refund'
  | 'partial_chargeback'
  | 'expire'
  | 'failure'
  | 'anonymous';

export type TPayloadMidtrans = {
  payment_type: TPaymentType;
  bank_transfer?: {
    bank: string;
  };
  qris?: {
    acquirer: 'gopay';
  };
  gopay?: {
    enable_callback: boolean;
    callback_url: string;
  };
  shopeepay?: {
    callback_url: string;
  };
  echannel?: {
    bill_info1: string;
    bill_info2: string;
  };
  transaction_details: {
    order_id: string;
    gross_amount: number;
  };
  custom_expiry: {
    order_time: string;
    expiry_duration: number;
    unit: string;
  };
  item_details: {
    id: string;
    shopId: string;
    price: number;
    quantity: number;
    name: string;
  }[];
  customer_details: {
    first_name: string;
    last_name?: string;
    email: string;
    phone: string;
  };
};

export type TAction = {
  name: string;
  method: string;
  url: string;
};
type VANumber = {
  bank: string;
  va_number: string;
};
export type MidtransTransactionCommon = {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  currency: string;
  payment_type: TPaymentTypeMidtrans;
  transaction_time: string;
  transaction_status: TTransactionStatusMidtrans;
  fraud_status: 'accept' | 'deny';
  expiry_time: string;
  actions?: TAction[];
  va_numbers?: VANumber[];
  acquirer?: string;
  qr_string?: string;
  permata_va_number?: string;
  bill_key?: string;
  biller_code?: string;
};

export type MidtransChargeResponseDTO = MidtransTransactionCommon & {
  channel_response_code?: string;
  channel_response_message?: string;
};

export type MidtransPaymentStatusResponseDTO = MidtransTransactionCommon & {
  id?: string;
  settlement_time?: string;
};

export type MidtransGetStatusDTO = {
  order_id: string;
};
