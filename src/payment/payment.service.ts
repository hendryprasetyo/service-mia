/* eslint-disable @typescript-eslint/no-unused-vars */
import * as Path from 'path';
import * as Moment from 'moment';
import * as _ from 'lodash';
import * as Crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { AuthRequest, HeadersDto, TChannelId } from 'src/common/dtos/dto';
import { EncryptionService } from 'src/common/helpers/encryption/encryption.service';
import { GeneralService } from 'src/common/helpers/general/general.service';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import {
  PaymentConfigDto,
  PaymentMethodListDto,
} from 'src/common/dtos/paymentMethod.dto';
import {
  FulfillmentDto,
  TOrderDetailFulfillment,
  TResConstructPayloadFulfillment,
  TResponseConstructVouchers,
  TResponseQueryVoucher,
} from './payment.dto';
import { CustomHttpException } from 'src/common/helpers/lib/exception';
import libService from 'src/common/helpers/lib/lib.service';
import { DbService } from 'src/database/mysql/mysql.service';
import { PaymentRepository } from './payment.repository';
import ConfigStatis from 'src/common/constants/config';

const PAYMENT_METHOD_PATH = Path.join(
  __dirname,
  '../../assets/paymentMethod.json',
);
const PAYMENT_CONFIG_PATH = Path.join(
  __dirname,
  '../../assets/paymentConfig.json',
);

@Injectable()
export class PaymentService {
  constructor(
    private readonly logger: LoggerServiceImplementation,
    private readonly encryptionService: EncryptionService,
    private readonly generalService: GeneralService,
    private readonly pool: DbService,
    private readonly paymentRepository: PaymentRepository,
  ) {}

  private __validateOrder(reqBody: FulfillmentDto): {
    isValidOrder: boolean;
    firstItemId?: string;
    firstShopId?: string;
    orderQuantities?: number;
    decryptedReqBody: FulfillmentDto;
  } {
    const response = {
      isValidOrder: false,
      decryptedReqBody: reqBody,
    };
    const { selectedOrderIds, orderType, orderSubType } = reqBody.orderDetail;
    const decryptedSelectedOrderIds = selectedOrderIds.map((so) => {
      const decryptShopId = this.encryptionService.decryptEntityID(so.shopId);
      this.generalService.validateSqlInjection([{ value: decryptShopId }]);
      return {
        ...so,
        shopId: decryptShopId,
        itemBriefs: so.itemBriefs.map((item) => {
          const decryptedItemId = this.encryptionService.decryptEntityID(
            item.itemId,
          );
          this.generalService.validateSqlInjection([
            {
              value: decryptedItemId,
            },
          ]);
          return {
            ...item,
            itemId: decryptedItemId,
          };
        }),
      };
    });
    response.decryptedReqBody = {
      ...reqBody,
      orderDetail: {
        ...reqBody.orderDetail,
        selectedOrderIds: decryptedSelectedOrderIds,
      },
    };

    if (orderType === 'RESERVATION' && orderSubType === 'GN') {
      const firstItemId = decryptedSelectedOrderIds[0].itemBriefs[0].itemId;
      const allItemIdsMatch = decryptedSelectedOrderIds[0].itemBriefs.every(
        (item) => item.itemId === firstItemId,
      );
      if (!allItemIdsMatch) return response;
    }
    response.isValidOrder = true;
    return response;
  }

  private __validatePaymentMethod(
    paymentList: PaymentMethodListDto[],
    reqBody: FulfillmentDto,
  ): PaymentMethodListDto | undefined {
    const findingPaymentMethod = paymentList.find((item) => {
      const paymentTypeFinding =
        reqBody.paymentType.toLowerCase() === item.payment_type;
      const bankFinding =
        reqBody.paymentType === 'bank_transfer' &&
        !_.isEmpty(reqBody.bank) &&
        !_.isEmpty(item.bank) &&
        item.bank === reqBody.bank;

      return (
        paymentTypeFinding &&
        item.enable &&
        (reqBody.paymentType !== 'bank_transfer' || bankFinding)
      );
    });
    return findingPaymentMethod;
  }

  private generateOrderId(channelid: 'web' | 'mobile'): string {
    const typeOrder = 'GN';
    const channelOrder = channelid === 'web' ? 'C1' : 'C2';
    const timestamp = new Date().getTime();

    const randomBytes = Crypto.randomBytes(6);

    const randomString = Array.from(randomBytes)
      .map((byte) => (byte % 36).toString(36))
      .join('');
    const orderId = `${typeOrder}${channelOrder}${timestamp}${randomString}`;
    return orderId.toUpperCase();
  }

  private __findVoucherDetails(
    rawQueryVoucher: TResponseQueryVoucher[],
    code: string,
  ): Partial<Pick<TResponseConstructVouchers, 'value_type' | 'value'>> {
    const match = rawQueryVoucher.find((v) => v.code === code);
    return { value: match.value, value_type: match.value_type };
  }

  private __constructVouchers(
    orderDetail: TOrderDetailFulfillment,
    orderId: string,
    rawQueryVoucher?: TResponseQueryVoucher[],
  ): TResponseConstructVouchers[] {
    const voucherArray: TResponseConstructVouchers[] = [];

    // Process shop vouchers (merchant)
    orderDetail.selectedOrderIds.forEach((order) => {
      if (order.shopVouchers?.length) {
        order.shopVouchers.forEach((voucher) => {
          const code = voucher.voucherCode;
          const details =
            rawQueryVoucher && this.__findVoucherDetails(rawQueryVoucher, code);

          voucherArray.push({
            code,
            shopId: order.shopId,
            source: ConfigStatis.MERCHANT.toLowerCase(),
            voucher_identifier: null,
            ...details,
          });
        });
      }
    });

    // Process general vouchers (mia)
    if (orderDetail.vouchers?.length) {
      orderDetail.vouchers.forEach((voucher) => {
        const code = voucher.voucherCode;
        const details =
          rawQueryVoucher && this.__findVoucherDetails(rawQueryVoucher, code);

        voucherArray.push({
          code,
          source: ConfigStatis.APP_NAME.toLowerCase(),
          voucher_identifier: orderId,
          shopId: null,
          ...details,
        });
      });
    }

    return voucherArray;
  }

  private constructPayloadFulfillment(
    decryptedReqBody: FulfillmentDto,
    channelid: TChannelId,
  ): TResConstructPayloadFulfillment {
    const { orderDetail } = decryptedReqBody;
    const { selectedOrderIds } = orderDetail;
    const dayOfStartTime =
      orderDetail.orderType === 'RESERVATION' &&
      Moment(Number(orderDetail.startTime))
        .locale('en')
        .format('dddd')
        .toLowerCase();
    const unixCurrentTime = Moment().valueOf();
    const unixStartOfToday = Moment().startOf('day').valueOf();
    const unixEndOfToday = Moment().endOf('day').valueOf();
    const isGN = orderDetail.orderSubType === 'GN';
    const isReservation = orderDetail.orderType === 'RESERVATION';
    const orderId = this.generateOrderId(channelid);
    const result: TResConstructPayloadFulfillment = {
      dayOfStartTime,
      unixCurrentTime,
      unixStartOfToday,
      unixEndOfToday,
      totalQuantity: 0,
      firstItemId: selectedOrderIds[0].itemBriefs[0].itemId,
      firstBasecampId: selectedOrderIds[0].itemBriefs[0].basecampId,
      totalQuantityPerShop: {},
      paymentSelected: undefined,
      orderId,
      isGN,
      isReservation,
      vouchers: this.__constructVouchers(decryptedReqBody.orderDetail, orderId),
      decryptedReqBody,
    };
    const ordersGroupedByShop = _.groupBy(selectedOrderIds, 'shopId');

    _.forEach(ordersGroupedByShop, (orders, shopId) => {
      let shopQuantity = 0;
      orders.forEach((order) => {
        order.itemBriefs.forEach((item) => {
          const itemQty =
            _.isEmpty(item.members) || orderDetail.orderSubType !== 'GN'
              ? item.quantity
              : item.members.length;
          shopQuantity += itemQty;
        });
      });

      result.totalQuantityPerShop[shopId] = shopQuantity;
      result.totalQuantity += shopQuantity;
    });

    if (isReservation && isGN) {
      result.listNoIdentifier = orderDetail.selectedOrderIds.flatMap((so) =>
        so.itemBriefs.flatMap((ibs) =>
          ibs.members.map((mem) => mem.noIdentifier),
        ),
      );
    }
    return result;
  }

  public async paymentList(headers: HeadersDto) {
    const { transactionid, platform, language, channelid } = headers;
    try {
      const [paymentMethodConfig, paymentConfig] = await Promise.all([
        this.generalService.readFromFile<PaymentMethodListDto[]>(
          PAYMENT_METHOD_PATH,
        ),
        this.generalService.readFromFile<PaymentConfigDto>(PAYMENT_CONFIG_PATH),
      ]);

      const filterPaymentList = _.filter(
        paymentMethodConfig,
        (paymentMethod) => {
          if (!paymentMethod.enable) return false;

          if (
            channelid === 'mobile' &&
            headers['wildbook-version'] &&
            _.includes(
              paymentMethod.exlude_app_version,
              headers['wildbook-version'],
            )
          )
            return false;

          if (!_.includes(paymentMethod.platform, platform.toUpperCase()))
            return false;
          return true;
        },
      );
      const groupting = _.groupBy(filterPaymentList, 'category');
      _.forEach(groupting, (methods) => {
        const primaryIndexes = methods.reduce<number[]>(
          (acc, method, index) => {
            if (method.is_primary) acc.push(index);
            return acc;
          },
          [],
        );
        if (primaryIndexes.length > 1) {
          primaryIndexes.slice(1).forEach((idx) => {
            methods[idx].is_primary = false;
          });
        }
      });
      const sortedGrouping = _.fromPairs(
        _.sortBy(Object.entries(groupting), ([, paymentMethods]) =>
          _.some(paymentMethods, (pm) => pm.is_primary) ? 0 : 1,
        ),
      );

      const paymentList = _.map(
        sortedGrouping,
        (paymentFiltered: PaymentMethodListDto[], category) => {
          const sortedPaymentList = _.sortBy(paymentFiltered, (el) =>
            el.is_primary ? 0 : 1,
          );

          const payment_list = _.map(
            sortedPaymentList,
            (el: PaymentMethodListDto) => {
              const {
                category_display,
                id,
                enable,
                platform: platformSource,
                category,
                exlude_app_version,
                ...rest
              } = el;

              const filterInstruction = _.filter(
                rest.instruction,
                (inst) => inst.enable,
              ).map((inst) => {
                const filteredSteps = Object.keys(inst.step).reduce(
                  (acc, stepKey) => {
                    acc[stepKey] = inst.step[stepKey][language];
                    return acc;
                  },
                  {},
                );
                delete inst.enable;
                return { ...inst, step: filteredSteps };
              });

              let formatFee = language === 'id' ? 'Gratis' : 'Free';
              const parseFeeValue = parseFloat(rest.fee.value);
              if (
                rest.fee.type === 'IDR' &&
                !isNaN(parseFeeValue) &&
                parseFeeValue > 0
              ) {
                formatFee = libService.formatCurrency(parseFeeValue);
              }
              if (
                rest.fee.type === 'percentage' &&
                !isNaN(parseFeeValue) &&
                parseFeeValue > 0
              ) {
                formatFee = `${parseFeeValue}%`;
              }

              const signaturePayment = this.encryptionService.encryptEntityID(
                `${rest.payment_type}|${rest.bank || 'null'}|`,
              );
              const fee = {
                value: parseFloat(rest.fee.value),
                type: rest.fee.type,
              };

              return {
                ...rest,
                fee,
                display_fee: formatFee,
                icon: rest.icon[platform.toLowerCase()],
                instruction: filterInstruction,
                signature: signaturePayment,
              };
            },
          );

          return {
            category,
            category_display: paymentFiltered[0].category_display,
            payment_list,
          };
        },
      );
      const adminFeeCalculateDisc =
        (Number(paymentConfig.admin_fee.value) *
          paymentConfig.admin_fee.discount) /
        100;
      const resultFeeValue =
        Number(paymentConfig.admin_fee.value) - adminFeeCalculateDisc;
      const constructAdminFee = {
        value: resultFeeValue,
        display_value:
          resultFeeValue === 0
            ? 'Free'
            : libService.formatCurrency(resultFeeValue),
      };
      return {
        payment_method: paymentList,
        admin_fee: constructAdminFee,
      };
    } catch (error) {
      this.logger.error(['Payment Service', 'Payment List', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });

      return Promise.reject(error);
    }
  }

  public async fulfillment(
    request: AuthRequest,
    reqBody: FulfillmentDto,
    headers: HeadersDto,
  ) {
    const { transactionid, channelid } = headers;
    try {
      const userId = request.auth.id;
      const { isValidOrder, decryptedReqBody } = this.__validateOrder(reqBody);
      if (!isValidOrder) {
        this.logger.error(['Payment Service', '__validateOrder', 'ERROR'], {
          messages: 'Invalid Order Payload',
          transactionid,
        });
        return new CustomHttpException('Bad Request', 400);
      }

      const dataSource = this.constructPayloadFulfillment(
        decryptedReqBody,
        channelid,
      );

      if (dataSource.isReservation && dataSource.isGN) {
        const getBlacklistUser = await this.pool.executeRawQuery<
          { start_date: string; end_date: string }[]
        >({
          transactionid,
          query:
            'SELECT start_date, end_date FROM blacklist_entries WHERE place_id = ? AND no_identifier IN (?);',
          params: [dataSource.firstItemId, ...dataSource.listNoIdentifier],
          logName: 'GET USER BLACKLIST',
          isWriteOperation: false,
        });

        if (!_.isEmpty(getBlacklistUser)) {
          const isBlacklist = this.generalService.isBlacklist(getBlacklistUser);
          if (isBlacklist) {
            this.logger.error(
              ['Payment Service', 'getBlacklistUser', 'ERROR'],
              {
                messages: 'User Blacklisted',
                transactionid,
              },
            );
            return new CustomHttpException('Bad Request', 400, {
              cause: '99400',
            });
          }
        }
      }
      if (!_.isEmpty(dataSource.vouchers)) {
        const voucherCodeString = dataSource.vouchers
          .map((item) => `'${item.code}'`)
          .join(', ');
        const getVoucher = await this.pool.executeRawQuery<
          TResponseQueryVoucher[]
        >({
          transactionid,
          query: `
                SELECT
                    v.name,
                    v.code,
                    v.value,
                    v.type,
                    v.value_type,
                    v.using_type,
                    v.source,
                    CASE 
                        WHEN v.using_type = 'disposable' AND GROUP_CONCAT(DISTINCT voi.code ORDER BY voi.code) IS NOT NULL THEN true
                        ELSE false
                    END AS is_used
                FROM voucher AS v
                LEFT JOIN voucher_order_info AS voi
                    ON v.code = voi.code AND voi.used_id = ? AND voi.status = ?
                WHERE v.code IN (${voucherCodeString})
                    AND CAST(v.start_date AS UNSIGNED) <= ?
                    AND CAST(v.end_date AS UNSIGNED) >= ?
                    AND v.is_deleted = false
                    AND v.is_active = true
                GROUP BY v.code
                ORDER BY v.code;
                `,
          params: [
            userId,
            'used',
            dataSource.unixCurrentTime,
            dataSource.unixEndOfToday,
          ],
          logName: 'GET VOUCHER',
          isWriteOperation: false,
        });
        const findingUsedVoucher = getVoucher?.find((vo) => vo.is_used);
        if (_.isEmpty(getVoucher) || findingUsedVoucher) {
          this.logger.error(
            ['Payment Service', 'findingUsedVoucher', 'ERROR'],
            {
              messages: 'Invalid Voucher',
              transactionid,
            },
          );
          return new CustomHttpException('Invalid Voucher', 400, {
            cause: '01400',
          });
        }
        dataSource.vouchers = this.__constructVouchers(
          dataSource.decryptedReqBody.orderDetail,
          dataSource.orderId,
          getVoucher,
        );
      }

      const [getPaymentMethodConfig, getPaymentConfig] = await Promise.all([
        this.generalService.readFromFile<PaymentMethodListDto[]>(
          PAYMENT_METHOD_PATH,
        ),
        this.generalService.readFromFile<PaymentConfigDto>(PAYMENT_CONFIG_PATH),
      ]);

      // finding selected payment method
      dataSource.paymentSelected = this.__validatePaymentMethod(
        getPaymentMethodConfig,
        dataSource.decryptedReqBody,
      );
      if (!dataSource.paymentSelected) {
        this.logger.error(
          ['Payment Service', '__validatePaymentMethod', 'ERROR'],
          {
            messages: 'Invalid Payment Selected',
            transactionid,
          },
        );
        return new CustomHttpException('Bad Request', 400);
      }

      const response = await this.paymentRepository.ProcessFulfillment({
        userId,
        transactionid,
        paymentConfig: getPaymentConfig,
        dataSource,
      });
      return response;
    } catch (error) {
      this.logger.error(['Payment Service', 'Fulfillment', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });
      if (
        error?.code?.toUpperCase() === 'ER_NO_REFERENCED_ROW_2' &&
        error?.errno === 1452
      ) {
        return Promise.resolve(new CustomHttpException('Bad Request', 400));
      }

      return Promise.reject(error);
    }
  }
}
