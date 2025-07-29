import * as mysql from 'mysql2/promise';
import * as _ from 'lodash';
import * as Moment from 'moment';
import * as QS from 'qs';
import lib from 'src/common/helpers/lib/lib.service';
import { v6 as uuidv6 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { DbService } from 'src/database/mysql/mysql.service';
import { CustomHttpException } from 'src/common/helpers/lib/exception';
import {
  TConstructPayloadValues,
  TOrderDetailFulfillment,
  TParamsConstructAmount,
  TProcessFulfillment,
  TResConstructPayloadFulfillment,
  TResConstructValuesDataSource,
  TResponseConstructVouchers,
  TResponseFulfillment,
  TResponseQueryGetPlace,
} from './payment.dto';
import { TGender } from 'src/common/dtos/dto';
import { MidtransService } from 'src/common/providers/midtrans/midtrans.service';
import {
  MidtransChargeResponseDTO,
  TPayloadMidtrans,
} from 'src/common/providers/midtrans/midtrans.dto';
import { EncryptionService } from 'src/common/helpers/encryption/encryption.service';
import { RedisService } from 'src/database/redis/redis.service';
import ConfigStatis from 'src/common/constants/config';

const ORDER_STATUS_IN_PROGRESS = 'INPROGRESS';
const VOUCHER_STATUS_USED = 'used';
const FEE_TYPE_PAYMENT = 'payment';
const FEE_TYPE_ADMIN = 'admin';
const CURRENCY_IDR = 'IDR';
const PAYMENT_PROVIDER_MIDTRANS = 'midtrans';
@Injectable()
export class PaymentRepository {
  constructor(
    private readonly logger: LoggerServiceImplementation,
    private readonly pool: DbService,
    private readonly midtransService: MidtransService,
    private readonly encryptionService: EncryptionService,
    private readonly redis: RedisService,
  ) {}

  private __calculateTotalAmount(dataObj: TParamsConstructAmount) {
    const { paymentConfig, dataSource, orderDetails } = dataObj;
    const { paymentSelected } = dataSource;
    const hasVouchers = !_.isEmpty(dataSource.vouchers);
    const percentageLower = ConfigStatis.CONSTANT_PERCENTAGE.toLowerCase();
    const priceLower = ConfigStatis.CONSTANT_PRICE.toLowerCase();
    // Hitung admin fee
    const adminFeeConfiguration = paymentConfig.admin_fee;
    const adminFeeValue = Number(adminFeeConfiguration.value);
    const adminFeeDiscountAmount = lib.calculatePrice({
      priceBeforeDiscVal: adminFeeValue,
      discountVal: adminFeeConfiguration.discount,
      type: percentageLower as 'percentage',
    });
    const adminFee = adminFeeValue - adminFeeDiscountAmount;

    let feePayment = 0;
    let totalGrossPrice = 0;
    let totalNetPrice = 0;
    let totalVoucherDiscount = 0;
    let totalVoucherDiscountMIA = 0;

    for (const item of orderDetails) {
      const itemBasePrice = item.price;
      const quantity = item.quantity;
      totalGrossPrice += itemBasePrice * quantity;

      let unitDiscount = 0;

      if (hasVouchers) {
        // Ambil semua voucher untuk shopId ini
        const applicableVouchers = dataSource.vouchers.filter(
          (v) => v.shopId === item.shopId,
        );

        for (const voucher of applicableVouchers) {
          let discount = 0;

          if (voucher.value_type.toLowerCase() === priceLower) {
            discount = voucher.value;
          } else if (voucher.value_type.toLowerCase() === percentageLower) {
            discount = lib.calculatePrice({
              priceBeforeDiscVal: itemBasePrice,
              discountVal: voucher.value,
              type: percentageLower as 'percentage',
            });
          }
          unitDiscount += Math.round(discount);
        }
      }

      const unitNetPrice = itemBasePrice - unitDiscount;
      const itemTotalNet = unitNetPrice * quantity;
      const itemTotalDiscount = unitDiscount * quantity;

      totalVoucherDiscount += itemTotalDiscount;
      totalNetPrice += itemTotalNet;

      // Update harga per item agar sinkron dengan midtrans
      item.price = unitNetPrice;
    }

    // Global voucher tanpa shopId (e.g., dari source: "mia")
    if (hasVouchers) {
      totalVoucherDiscountMIA = dataSource.vouchers
        .filter((v) => !v.shopId)
        .reduce((sum, voucher) => {
          if (voucher.value_type === priceLower) {
            return sum + Math.round(voucher.value);
          }
          const discount = lib.calculatePrice({
            priceBeforeDiscVal: totalNetPrice,
            discountVal: voucher.value,
            type: percentageLower as 'percentage',
          });
          return sum + Math.round(discount);
        }, 0);

      totalVoucherDiscount += totalVoucherDiscountMIA;
      totalNetPrice -= totalVoucherDiscountMIA;
    }

    // Hitung payment fee
    if (
      paymentConfig.payment_provider.midtrans.includes(
        paymentSelected.payment_type.toLowerCase(),
      )
    ) {
      const paymentFeeValue = parseFloat(paymentSelected.fee.value);
      feePayment =
        paymentSelected.fee.type === 'IDR'
          ? paymentFeeValue
          : Math.round(
              lib.calculatePrice({
                priceBeforeDiscVal: totalNetPrice,
                discountVal: paymentFeeValue,
                type: percentageLower as 'percentage',
              }),
            );
    }

    const totalAmount = totalNetPrice + feePayment + adminFee;

    return {
      totalAmount,
      feePayment,
      adminFee,
      totalVoucher: totalVoucherDiscount,
      totalGrossPrice,
      totalNetPrice,
      totalVoucherDiscountMIA,
    };
  }

  private __mapingSalutation(gender: TGender) {
    if (gender === 'male') return 'Mr';
    if (gender === 'female') return 'Mrs';
    return 'Mr/Mrs';
  }

  private __constructPayloadMidtrans(dataObj: {
    dataSource: TResConstructPayloadFulfillment;
    transactionid: string;
    valuesDataSource: TResConstructValuesDataSource;
  }) {
    const { valuesDataSource, transactionid, dataSource } = dataObj;
    const {
      noOrder,
      totalAmount,
      orderDetails,
      feePayment,
      totalVoucherDiscountMIA,
    } = valuesDataSource;
    const { bank, customerInfo, paymentType } = dataSource.decryptedReqBody;
    const callbackUrl = `${process.env.BASE_URL_CLIENT}/${process.env.CTA_PAYMENT_RECEIPT}?trxid=${transactionid}&no_order=${noOrder}`;
    const payload: TPayloadMidtrans = {
      payment_type: paymentType,
      transaction_details: {
        order_id: dataSource.orderId,
        gross_amount: totalAmount,
      },
      custom_expiry: {
        order_time: `${Moment().format('YYYY-MM-DD HH:mm:ss')} +0700`,
        expiry_duration: dataSource.paymentSelected.expiry_duration.duration,
        unit: dataSource.paymentSelected.expiry_duration.unit,
      },
      item_details: [
        ...orderDetails,
        {
          id: 'voucher_mia',
          shopId: null,
          price: -totalVoucherDiscountMIA,
          quantity: 1,
          name: 'Vouchers',
        },
        {
          id: 'fee',
          shopId: null,
          price: feePayment,
          quantity: 1,
          name: 'Fee Payment',
        },
      ],
      customer_details: {
        first_name: customerInfo.firstName,
        last_name: customerInfo?.lastName || '',
        email: customerInfo.email,
        phone: customerInfo.phoneNumber,
      },
    };

    if (paymentType === 'bank_transfer' && bank) {
      payload.bank_transfer = {
        bank,
      };
    }

    if (paymentType === 'qris') {
      payload.qris = {
        acquirer: 'gopay',
      };
    }

    if (paymentType === 'gopay') {
      payload.gopay = {
        enable_callback: true,
        callback_url: callbackUrl,
      };
    }

    if (paymentType.toLowerCase() === 'shopeepay') {
      payload.shopeepay = {
        callback_url: callbackUrl,
      };
    }

    if (paymentType.toLowerCase() === 'echannel') {
      payload.echannel = {
        bill_info1: 'Payment For:',
        bill_info2: 'debt',
      };
    }

    return payload;
  }

  private __constructResponseFulfillment(dataObj: {
    paymentResponse?: MidtransChargeResponseDTO;
    provider: string;
    orderId: string;
    noOrder: string;
  }): TResponseFulfillment {
    const { paymentResponse, provider, orderId, noOrder } = dataObj;
    let response: TResponseFulfillment = {
      no_order: noOrder,
      order_id: this.encryptionService.encryptOrderID(orderId),
      payment_type: null,
      ...(provider === 'midtrans' && {
        transaction_time: paymentResponse.transaction_time,
        expiry_time: paymentResponse.expiry_time,
      }),
    };

    if (provider === 'midtrans') {
      const redirectUrl = `${process.env.PAYMENT_REDIRECT_URL}/${this.encryptionService.encryptOrderID(orderId)}`;
      const queryUrl = {
        expiry: paymentResponse.expiry_time,
      };
      if (
        paymentResponse.payment_type === 'bank_transfer' &&
        !_.isEmpty(paymentResponse.va_numbers)
      ) {
        _.extend(queryUrl, {
          va_number: paymentResponse.va_numbers[0].va_number,
        });
        response = {
          ...response,
          bank: paymentResponse.va_numbers[0].bank.toUpperCase(),
          va_number: paymentResponse.va_numbers[0].va_number,
          payment_type: 'VA',
          redirect_url: `${redirectUrl}?${QS.stringify(queryUrl)}`,
        };
      }
      if (
        paymentResponse.payment_type === 'bank_transfer' &&
        !_.isEmpty(paymentResponse.permata_va_number)
      ) {
        _.extend(queryUrl, {
          va_number: paymentResponse.permata_va_number,
        });
        response = {
          ...response,
          bank: 'Permata',
          va_number: paymentResponse.permata_va_number,
          payment_type: 'VA',
          redirect_url: `${redirectUrl}?${QS.stringify(queryUrl)}`,
        };
      }
      if (paymentResponse.payment_type === 'echannel') {
        response = {
          ...response,
          bank: 'Mandiri',
          va_number: `${paymentResponse.biller_code} ${paymentResponse.bill_key}`,
          payment_type: 'VA',
          redirect_url: redirectUrl,
        };
      }
      if (paymentResponse.payment_type === 'qris') {
        response = {
          ...response,
          redirect_url: redirectUrl,
          payment_type: 'QRIS',
        };
      }
      if (paymentResponse.payment_type === 'gopay') {
        const findQr = paymentResponse.actions.find(
          (qris) => qris.name.toLowerCase() === 'generate-qr-code',
        );
        const findDirectUrl = paymentResponse.actions.find(
          (durl) => durl.name.toLowerCase() === 'deeplink-redirect',
        );
        response = {
          ...response,
          qr_url: findQr.url,
          redirect_url: findDirectUrl.url,
          payment_type: 'GOPAY',
        };
      }
      if (paymentResponse.payment_type === 'shopeepay') {
        const findDirectUrl = paymentResponse.actions.find(
          (durl) => durl.name.toLowerCase() === 'deeplink-redirect',
        );
        response = {
          ...response,
          redirect_url: findDirectUrl.url,
          payment_type: 'SHOPEEPAY',
        };
      }
    }
    if (provider.toUpperCase() === 'OTS') {
      response = {
        ...response,
        payment_type: 'OTS',
      };
    }
    return response;
  }

  private __constructValuesDataSource(
    dataObj: TConstructPayloadValues,
  ): TResConstructValuesDataSource {
    const {
      dataSource,
      paymentConfig,
      startTime,
      userId,
      endTime,
      placeDestination,
    } = dataObj;
    const { decryptedReqBody } = dataSource;

    const noOrder = lib.formatNoOrder(
      `${userId.slice(0, 2)}${placeDestination[0].name[0]}${decryptedReqBody.orderDetail.orderType[0] + decryptedReqBody.orderDetail.orderType[decryptedReqBody.orderDetail.orderType.length - 1]}${decryptedReqBody.orderDetail.orderSubType}`,
    );

    const shopVoucherIdMap = new Map<string, string>();
    const orderDetails = [];
    const userInfoValueQuery = [];
    decryptedReqBody.orderDetail.selectedOrderIds.flatMap((order) => {
      order.itemBriefs.forEach((brief) => {
        const orderDetailId = uuidv6();
        const isMemberReservation =
          !_.isEmpty(brief.members) && dataSource.isGN;
        const matchedPlace = placeDestination.find((place) => {
          const matchPlaceId = place.id === brief.itemId;

          if (dataSource.isGN) {
            const matchBaseCampId = place.basecamp_id === brief.basecampId;
            return matchPlaceId && matchBaseCampId;
          }

          return matchPlaceId;
        });

        const itemPrice = dataSource.isGN
          ? matchedPlace.basecamp_price
          : matchedPlace.price;

        const priceBeforeDiscount = dataSource.isGN
          ? matchedPlace.basecamp_price_before_discount
          : matchedPlace.price_before_discount;
        const itemDiscount = dataSource.isGN
          ? matchedPlace.basecamp_discount
          : matchedPlace.discount;

        const itemQuantity = isMemberReservation
          ? brief.members.length
          : brief.quantity;
        orderDetails.push({
          id: orderDetailId,
          order_id: dataSource.orderId,
          shopId: order.shopId,
          user_id: userId,
          name: matchedPlace.name,
          price: itemPrice,
          price_before_discount: priceBeforeDiscount,
          discount: itemDiscount,
          quantity: itemQuantity,
          order_identifier: brief.itemId,
          start_reservation: startTime,
          end_reservation: endTime,
          basecampId: brief?.basecampId,
          thumbnail_url: matchedPlace.thumbnail_url,
          thumbnail_text: matchedPlace.thumbnail_text,
        });
        if (isMemberReservation) {
          brief.members.forEach((mem) => {
            userInfoValueQuery.push([
              orderDetailId,
              mem.firstName,
              mem.noIdentifier,
              mem.email,
              mem.phoneNumber,
              mem.birthday,
              mem.secondaryPhoneNumber ?? null,
              mem.secondaryEmail ?? null,
              this.__mapingSalutation(mem.gender),
              'Indonesia',
            ]);
          });
        }
      });
    });

    dataSource.vouchers.forEach((voucher) => {
      const matchedOrderDetail = orderDetails.find(
        (detail) => detail.shopId === voucher.shopId,
      );

      if (matchedOrderDetail) {
        shopVoucherIdMap.set(voucher.shopId, matchedOrderDetail.id);
      }
    });

    // Step 2: Update voucher_identifier jika source = 'merchant' dan voucher_identifier null
    dataSource.vouchers = dataSource.vouchers?.map((voucher) => {
      if (
        voucher.source === ConfigStatis.MERCHANT.toLowerCase() &&
        !voucher.voucher_identifier &&
        voucher.shopId &&
        shopVoucherIdMap.has(voucher.shopId)
      ) {
        return {
          ...voucher,
          voucher_identifier: shopVoucherIdMap.get(voucher.shopId),
        };
      }

      return voucher;
    });

    const { ...restConstructAmount } = this.__calculateTotalAmount({
      orderDetails,
      paymentConfig,
      dataSource,
    });

    const orderDetailValueQuery = orderDetails.map((item) => [
      item.id,
      item.order_id,
      item.shopId,
      item.user_id,
      item.name,
      item.price,
      item.price_before_discount,
      item.discount,
      item.quantity,
      item.order_identifier,
      item.start_reservation,
      item.end_reservation,
      item.basecampId,
      item.thumbnail_url,
      item.thumbnail_text,
    ]);
    const orderDetailPlaceholders = orderDetailValueQuery
      .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .join(', ');
    const userInfoPlaceholders = userInfoValueQuery
      .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .join(', ');

    const result: TResConstructValuesDataSource = {
      ...restConstructAmount,
      orderDetailValueQuery: orderDetailValueQuery.flat(),
      orderDetailPlaceholders,
      userInfoValueQuery: userInfoValueQuery.flat(),
      userInfoPlaceholders,
      noOrder,
      orderDetails,
    };
    return result;
  }

  private async getPlaceDestination(dataObj: {
    transactionid: string;
    connection: mysql.PoolConnection;
    dataSource: TResConstructPayloadFulfillment;
    orderDetail: TOrderDetailFulfillment;
  }) {
    const { connection, dataSource, orderDetail, transactionid } = dataObj;
    const joinBasecamp = dataSource.isGN
      ? `LEFT JOIN tracking_basecamp tb ON tb.id = '${dataSource.firstBasecampId.toString()}'`
      : '';
    const conditionJoinQuotaPlace = dataSource.isGN
      ? `qp.basecamp_id = '${dataSource.firstBasecampId.toString()}'`
      : 'pd.id = qp.place_id';
    const conditionJoinReservationSchedule = dataSource.isGN
      ? `rs.basecamp_id = '${dataSource.firstBasecampId.toString()}'`
      : 'rs.place_id = pd.id';
    const endTimeCondition = dataSource.isGN
      ? ''
      : `AND CAST(rs.end_time AS UNSIGNED) = ${orderDetail.endTime}`;

    // jika ingin menambahkan logic order inprogress, hit db disini
    const placeDestination = await this.pool.executeRawQuery<
      TResponseQueryGetPlace[]
    >({
      transactionid,
      query: `
                SELECT 
                  pd.id,
                  pd.name,
                  dc.code AS category_code,
                  ${dataSource.isGN && 'tb.id AS basecamp_id, tb.name AS basecamp_name, tb.price AS basecamp_price, tb.price_before_discount AS basecamp_price_before_discount, tb.discount AS basecamp_discount'},
                  pd.price, 
                  pd.price_before_discount, 
                  pd.discount,
                  pd.thumbnail_url, 
                  pd.thumbnail_text, 
                  qp.quota AS quota_place, 
                  rs.id AS reservation_id, 
                  rs.current_quota AS current_quota
                FROM place_destination pd
                JOIN destination_categories dc ON pd.category_id = dc.id
                ${joinBasecamp}
                LEFT JOIN quota_place qp 
                  ON ${conditionJoinQuotaPlace}
                  AND qp.day = ?
                LEFT JOIN reservation_schedule rs 
                  ON ${conditionJoinReservationSchedule}
                  AND CAST(rs.start_time AS UNSIGNED) = ?
                  ${endTimeCondition}
                WHERE pd.id = ? 
                FOR UPDATE;
                `,
      params: [
        dataSource.dayOfStartTime,
        orderDetail.startTime,
        dataSource.firstItemId,
      ],
      pool: connection,
      logName: 'GET PLACE DESTINATION',
    });
    return placeDestination;
  }

  private async insertOrder(
    transactionid: string,
    connection: mysql.PoolConnection,
    dataObj: {
      dataSource: TResConstructPayloadFulfillment;
      userId: string;
      valuesDataSource: TResConstructValuesDataSource;
    },
  ) {
    const { dataSource, userId, valuesDataSource } = dataObj;
    await this.pool.executeRawQuery({
      transactionid,
      query: `
        INSERT INTO orders (
          order_id, no_order, user_id, order_type, order_sub_type, total_price, total_price_before_discount, status, currency, payment_method, total_quantity
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      params: [
        dataSource.orderId,
        valuesDataSource.noOrder,
        userId,
        dataSource.decryptedReqBody.orderDetail.orderType,
        dataSource.decryptedReqBody.orderDetail.orderSubType,
        valuesDataSource.totalAmount,
        valuesDataSource.totalGrossPrice,
        ORDER_STATUS_IN_PROGRESS,
        CURRENCY_IDR,
        dataSource.decryptedReqBody.paymentType,
        dataSource.totalQuantity,
      ],
      pool: connection,
      logName: 'INSERT ORDER',
    });
  }

  private async insertOrderDetail(
    transactionid: string,
    connection: mysql.PoolConnection,
    valuesDataSource: TResConstructValuesDataSource,
  ) {
    await this.pool.executeRawQuery({
      transactionid,
      query: `
        INSERT INTO order_detail (
        id, order_id, seller_id, user_id, name, price, price_before_discount, discount, quantity, order_identifier, start_reservation, end_reservation, basecamp_id, thumbnail_url, thumbnail_text
        ) 
        VALUES ${valuesDataSource.orderDetailPlaceholders};`,
      params: valuesDataSource.orderDetailValueQuery,
      pool: connection,
      logName: 'INSERT ORDER DETAIL',
    });
  }

  private async insertFeeOrder(
    transactionid: string,
    connection: mysql.PoolConnection,
    {
      orderId,
      paymentFeeType,
      paymentValue,
      paymentValueType,
      adminFeeType,
      adminValue,
      adminValueType,
    },
  ) {
    await this.pool.executeRawQuery({
      transactionid,
      query: `
        INSERT INTO fee_order (order_id, fee_type, value, value_type) 
        VALUES
            (?, ?, ?, ?),
            (?, ?, ?, ?);
      `,
      params: [
        orderId,
        paymentFeeType,
        paymentValue,
        paymentValueType,
        orderId,
        adminFeeType,
        adminValue,
        adminValueType,
      ],
      pool: connection,
      logName: 'INSERT FEE ORDER',
    });
  }

  private async insertVoucherOrderInfo(
    transactionid: string,
    connection: mysql.PoolConnection,
    dataObj: {
      userId: string;
      vouchers: TResponseConstructVouchers[];
    },
  ) {
    const { userId, vouchers } = dataObj;
    const mappingValues = vouchers.map((item) => {
      const isMerchant = item.source === ConfigStatis.MERCHANT.toLowerCase();

      return [
        isMerchant ? item.voucher_identifier : null, // order_detail_id
        !isMerchant ? item.voucher_identifier : null, // order_id
        VOUCHER_STATUS_USED,
        userId,
        item.code,
        new Date(),
      ];
    });

    const placeholders = mappingValues
      .map(() => '(?, ?, ?, ?, ?, ?)')
      .join(', ');

    await this.pool.executeRawQuery({
      transactionid,
      query: `
        INSERT INTO voucher_order_info (order_detail_id, order_id, status, used_id, code, use_time) 
        VALUES ${placeholders};
      `,
      params: mappingValues.flat(),
      pool: connection,
      logName: 'INSERT VOUCHER ORDER INFO',
    });
  }

  private async insertUserInfo(
    transactionid: string,
    connection: mysql.PoolConnection,
    valuesDataSource: TResConstructValuesDataSource,
  ) {
    await this.pool.executeRawQuery({
      transactionid,
      query: `
        INSERT INTO order_user_info (
          order_detail_id, first_name, no_identifier, primary_email, primary_phone_number, 
          birthday, secondary_phone_number, secondary_email, salutation, country
        ) 
        VALUES ${valuesDataSource.userInfoPlaceholders};
      `,
      params: valuesDataSource.userInfoValueQuery,
      pool: connection,
      logName: 'INSERT ORDER USER INFO',
    });
  }

  private async insertOrUpdateReservationSchedule(
    transactionid: string,
    connection: mysql.PoolConnection,
    { itemIdentifier, orderQuantities, placeDestination, orderDetail },
  ) {
    const { quota_place, reservation_id, current_quota } = placeDestination[0];
    if (!reservation_id) {
      await this.pool.executeRawQuery({
        transactionid,
        query: `
          INSERT INTO reservation_schedule (
            id,
            start_time,
            end_time,
            quota,
            current_quota,
            ${orderDetail.orderSubType === 'GN' ? 'basecamp_id' : 'place_id'},
            created_at,
            updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `,
        params: [
          uuidv6(),
          orderDetail.startTime,
          orderDetail.endTime,
          quota_place,
          quota_place - orderQuantities,
          itemIdentifier,
          Moment().format('YYYY-MM-DD HH:mm:ss'),
          Moment().format('YYYY-MM-DD HH:mm:ss'),
        ],
        pool: connection,
        logName: 'INSERT RESERVATION SCHEDULE',
      });
    } else {
      await this.pool.executeRawQuery({
        transactionid,
        query: `
          UPDATE reservation_schedule
          SET current_quota = ?, updated_at = ?
          WHERE id = ?;
        `,
        params: [
          current_quota - orderQuantities,
          Moment().format('YYYY-MM-DD HH:mm:ss'),
          reservation_id,
        ],
        pool: connection,
        logName: 'UPDATE RESERVATION SCHEDULE',
      });
    }
  }

  public async ProcessFulfillment(dataObj: TProcessFulfillment) {
    const { transactionid, userId, paymentConfig, dataSource } = dataObj;
    const { orderDetail, paymentType } = dataSource.decryptedReqBody;
    try {
      const { orderSubType } = orderDetail;
      return await this.pool.executeInTransaction(
        transactionid,
        async (connection) => {
          const placeDestination = await this.getPlaceDestination({
            connection,
            dataSource,
            orderDetail,
            transactionid,
          });

          const quotaPlace = placeDestination[0]?.quota_place;

          if (
            placeDestination[0]?.category_code !== orderSubType ||
            (dataSource.isGN && !placeDestination[0]?.id)
          ) {
            this.logger.error(
              ['Payment Repository', 'validate category and basecamp', 'ERROR'],
              {
                messages: 'Invalid category code or basecamp not found',
                transactionid,
              },
            );
            return new CustomHttpException('Bad Request', 400);
          }

          if (
            (typeof placeDestination[0]?.current_quota === 'number' &&
              placeDestination[0]?.current_quota > 0 &&
              placeDestination[0]?.current_quota < dataSource.totalQuantity) ||
            !quotaPlace
          ) {
            this.logger.error(
              ['Payment Repository', 'Reservation Checking', 'ERROR'],
              {
                messages: 'Unvailable date',
                transactionid,
              },
            );
            return new CustomHttpException('Tanggal tidak tersedia', 400);
          }

          const valuesDataSource = this.__constructValuesDataSource({
            dataSource,
            paymentConfig,
            startTime: orderDetail.startTime,
            endTime: orderDetail.endTime,
            userId,
            placeDestination,
          });

          await this.insertOrder(transactionid, connection, {
            dataSource,
            userId,
            valuesDataSource,
          });
          await this.insertOrderDetail(
            transactionid,
            connection,
            valuesDataSource,
          );
          await this.insertFeeOrder(transactionid, connection, {
            orderId: dataSource.orderId,
            paymentFeeType: FEE_TYPE_PAYMENT,
            paymentValue: parseInt(dataSource.paymentSelected.fee.value, 10),
            paymentValueType: dataSource.paymentSelected.fee.type,
            adminFeeType: FEE_TYPE_ADMIN,
            adminValue: valuesDataSource.adminFee,
            adminValueType: paymentConfig.admin_fee.type,
          });
          if (!_.isEmpty(dataSource.vouchers)) {
            await this.insertVoucherOrderInfo(transactionid, connection, {
              userId,
              vouchers: dataSource.vouchers,
            });
          }
          if (dataSource.isGN) {
            await this.insertUserInfo(
              transactionid,
              connection,
              valuesDataSource,
            );
          }
          await this.insertOrUpdateReservationSchedule(
            transactionid,
            connection,
            {
              itemIdentifier: dataSource.isGN
                ? dataSource.firstBasecampId
                : dataSource.firstItemId,
              orderDetail,
              orderQuantities: dataSource.totalQuantity,
              placeDestination,
            },
          );

          if (
            paymentConfig.payment_provider.midtrans.includes(
              paymentType.toLowerCase(),
            )
          ) {
            const payloadMidtrans = this.__constructPayloadMidtrans({
              dataSource,
              transactionid,
              valuesDataSource,
            });
            const responseMidtrans = await this.midtransService.charge(
              payloadMidtrans,
              transactionid,
            );

            if (
              ['shopeepay', 'gopay', 'qris'].includes(
                responseMidtrans.payment_type.toLowerCase(),
              )
            ) {
              const payloadInitPayment = { actions: responseMidtrans.actions };
              if (responseMidtrans?.qr_string) {
                Object.assign(payloadInitPayment, {
                  qr_string: responseMidtrans?.qr_string,
                });
              }
              await this.redis.setDataWithTTL({
                transactionid,
                key: `init-payment-transaction-${dataSource.orderId}`,
                isErrorOptional: true,
                ttl: payloadMidtrans.custom_expiry.expiry_duration * 60,
                value: JSON.stringify(payloadInitPayment),
              });
            }
            return this.__constructResponseFulfillment({
              paymentResponse: responseMidtrans,
              orderId: dataSource.orderId,
              provider: PAYMENT_PROVIDER_MIDTRANS,
              noOrder: valuesDataSource.noOrder,
            });
          }
          if (paymentType.toLowerCase() === 'ots') {
            return this.__constructResponseFulfillment({
              orderId: dataSource.orderId,
              provider: 'OTS',
              noOrder: valuesDataSource.noOrder,
            });
          }
        },
      );
    } catch (error) {
      this.logger.error(['Payment Repository', 'Fulfillment', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });
      return Promise.reject(error);
    }
  }
}
