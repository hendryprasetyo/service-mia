import * as _ from 'lodash';
import * as Path from 'path';
import * as Moment from 'moment';
import formatEmail from 'src/common/constants/format-email';
import lib from 'src/common/helpers/lib/lib.service';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import {
  TPaymentNotifCallback,
  TranscationNotifDto,
  TResDataSourceNotifCallback,
  TResponseQueryGetOrder,
} from './notification.dto';
import { RabbitmqService } from 'src/common/providers/rabbitmq/rabbitmq.service';
import { Injectable } from '@nestjs/common';
import { GeneralService } from 'src/common/helpers/general/general.service';
import { TLanguage, TParamRawQuery } from 'src/common/dtos/dto';
import { DbService } from 'src/database/mysql/mysql.service';
import { MidtransService } from 'src/common/providers/midtrans/midtrans.service';
import { CustomHttpException } from 'src/common/helpers/lib/exception';
import { RedisService } from 'src/database/redis/redis.service';
import {
  TAction,
  MidtransPaymentStatusResponseDTO,
} from 'src/common/providers/midtrans/midtrans.dto';

const PAYMENT_CONFIG_PATH = Path.join(
  __dirname,
  '../../assets/paymentConfig.json',
);

@Injectable()
export class NotificationService {
  constructor(
    private readonly rabbitmqService: RabbitmqService,
    private readonly logger: LoggerServiceImplementation,
    private readonly generalService: GeneralService,
    private readonly pool: DbService,
    private readonly midtransService: MidtransService,
    private readonly redisService: RedisService,
  ) {}

  private __constructAditionalValuePayment(
    payload: MidtransPaymentStatusResponseDTO,
    actions: TAction[],
    qr_string: string,
  ): (string | null)[] {
    const {
      payment_type,
      va_numbers,
      permata_va_number,
      bill_key,
      biller_code,
    } = payload;

    const result = [null, null, null, null, null];

    if (payment_type === 'bank_transfer') {
      if (va_numbers?.length) {
        const va_number = va_numbers[0]?.va_number;
        const bank = va_numbers[0]?.bank;

        result[0] = va_number;
        result[1] = bank;
      }
      if (permata_va_number) {
        result[0] = permata_va_number;
        result[1] = 'permata';
      }
    }

    if (payment_type === 'echannel') {
      const vaNumberMandiri = `${biller_code}${bill_key}`;
      result[0] = vaNumberMandiri;
      result[1] = 'mandiri';
    }

    if (
      ['shopeepay', 'gopay', 'qris'].includes(payment_type.toLowerCase()) &&
      actions?.length
    ) {
      const redirectAction = actions.find(
        (action) => action.name?.toLowerCase() === 'deeplink-redirect',
      );
      const qrCodeAction = actions.find(
        (action) => action.name?.toLowerCase() === 'generate-qr-code',
      );
      if (redirectAction) result[2] = redirectAction.url;
      if (qrCodeAction) result[3] = qrCodeAction.url;
    }
    if (qr_string) result[4] = qr_string.slice(1, 10);

    return result;
  }

  private __constructDataSource(dataObj: {
    rawOrder: TResponseQueryGetOrder[];
  }): TResDataSourceNotifCallback {
    const { rawOrder } = dataObj;
    const isGN = rawOrder[0]?.order_sub_type?.toUpperCase() === 'GN';
    const isReservation =
      rawOrder[0]?.order_type?.toUpperCase() === 'RESERVATION';
    const identifierColSchedule = isGN ? 'basecamp_id' : 'place_id';
    const caseStatementReservationSchedule: string[] = [];
    const whereStatementReservationSchedule: string[] = [];
    const caseParamsReservationSchedule: TParamRawQuery[] = [];
    const whereParamsReservationSchedule: TParamRawQuery[] = [];

    const groupedData = _.groupBy(rawOrder, 'order_id');
    const constructOrderData = _.map(groupedData, (rows) => {
      const baseRow = rows[0];
      _(rows)
        .groupBy('order_detail_id') // Kelompokkan per detail
        .forEach((detailRows) => {
          const row = detailRows[0];
          const placeId = isGN ? row.basecamp_id : row.order_identifier;
          const startTime = row.start_reservation;

          caseStatementReservationSchedule.push(
            `WHEN ${identifierColSchedule} = ? AND CAST(start_time AS UNSIGNED) = ? THEN ?`,
          );
          caseParamsReservationSchedule.push(placeId, startTime, row.quantity);

          whereStatementReservationSchedule.push(
            `(${identifierColSchedule} = ? AND CAST(start_time AS UNSIGNED) = ?)`,
          );
          whereParamsReservationSchedule.push(placeId, startTime);
        });
      return {
        customer_id: baseRow.customer_id,
        order_id: baseRow.order_id,
        total_price: baseRow.total_price,
        order_type: baseRow.order_type,
        order_sub_type: baseRow.order_sub_type,
        customer_name: baseRow.customer_name,
        customer_email: baseRow.customer_email,
        seller_name: baseRow.seller_name,
        seller_email: baseRow.seller_email,
        payment_id: baseRow.payment_id,
      };
    });
    return {
      isGN,
      isReservation,
      detailOrder: constructOrderData[0],
      caseStatementReservationSchedule,
      whereStatementReservationSchedule,
      paramsReservationSchedule: [
        ...caseParamsReservationSchedule,
        ...whereParamsReservationSchedule,
      ],
    };
  }

  public async orderCallback(
    reqBody: TranscationNotifDto,
    headers: { transactionid: string },
  ) {
    const { transactionid } = headers;
    let actions: TAction[] = [];
    let qr_string: string | undefined = undefined;
    try {
      const language: TLanguage = 'id';
      const currentTime = Moment();
      const [getPaymentConfig, getPaymentStatus, getStatusRedis] =
        await Promise.all([
          this.generalService.readFromFile<TPaymentNotifCallback>(
            PAYMENT_CONFIG_PATH,
          ),
          this.midtransService.getStatusPayment(
            { order_id: reqBody.order_id },
            transactionid,
          ),
          this.redisService.getData({
            transactionid,
            key: `order-${reqBody.order_id}`,
            returnType: 'string',
          }),
        ]);

      const {
        transaction_status,
        status_code,
        order_id,
        expiry_time,
        settlement_time,
        payment_type,
        transaction_time,
        transaction_id,
        gross_amount,
        currency,
      } = getPaymentStatus;
      const expiryMoment = Moment(expiry_time, 'YYYY-MM-DD HH:mm:ss');

      if (
        status_code === '404' ||
        !order_id ||
        transaction_status !== reqBody.transaction_status
      ) {
        this.logger.error(['Notification Service', 'Order Callback', 'ERROR'], {
          messages: 'transaction status not macth',
          transactionid,
        });
        return new CustomHttpException('Bad Request', 400);
      }

      const formatTransactionStatus = transaction_status.toLowerCase();

      if (getStatusRedis === transaction_status) {
        await this.redisService.setDataWithTTL({
          transactionid,
          key: `order-${order_id}`,
          value: transaction_status,
          ttl:
            transaction_status === 'pending'
              ? expiryMoment.diff(currentTime, 'seconds')
              : 300,
        });
        this.logger.error(['Notification Service', 'Order Callback', 'ERROR'], {
          messages: 'transaction status same in order id',
          transactionid,
        });
        return new CustomHttpException('Bad Request', 400);
      }

      if (
        ['shopeepay', 'gopay', 'qris'].includes(payment_type.toLowerCase()) &&
        transaction_status === 'pending'
      ) {
        const getInitPaymentTransaction = await this.redisService.getData<{
          actions: TAction[];
          qr_string?: string;
        }>({
          transactionid,
          key: `init-payment-transaction-${order_id}`,
          returnType: 'object',
        });
        actions = getInitPaymentTransaction.actions;
        qr_string = getInitPaymentTransaction?.qr_string;
      }
      return await this.pool.executeInTransaction(
        transactionid,
        async (connection) => {
          const getRawOrder = await this.pool.executeRawQuery<
            TResponseQueryGetOrder[]
          >({
            transactionid,
            query: `
            SELECT 
            o.user_id AS customer_id,
            o.order_id,
            o.total_price,
            o.order_type,
            o.order_sub_type,
            od.id AS order_detail_id,
            od.end_reservation,
            od.start_reservation,
            od.order_identifier,
            od.basecamp_id,
            od.quantity,
            cu.username AS customer_name,
            cu.email AS customer_email,
            si.name AS seller_name,
            si.seller_email,
            voi.id AS voucher_order_id,
            pt.transaction_id AS payment_id
            FROM orders o
            JOIN order_detail od
            ON o.order_id = od.order_id
            LEFT JOIN users cu
            ON o.user_id = cu.id
            LEFT JOIN seller_info si
            ON od.seller_id = si.user_id
            LEFT JOIN payment_transaction pt
            ON o.order_id = pt.order_id
            LEFT JOIN voucher_order_info voi
            ON od.order_id = voi.order_detail_id
            WHERE o.order_id = ?
            FOR UPDATE;
            `,
            params: [order_id],
            pool: connection,
            logName: 'GET ORDER CALLBACK',
          });
          if (!getRawOrder?.length) {
            this.logger.error(
              ['Notification Service', 'Order Callback', 'ERROR'],
              {
                messages: 'Order not found',
                transactionid,
              },
            );
            return new CustomHttpException('Bad Request', 400, {
              cause: '00404',
            });
          }
          const dataSource = this.__constructDataSource({
            rawOrder: getRawOrder,
          });

          const tamplateDataEmail = {
            recipientName: dataSource.detailOrder.customer_name,
            paymentAmount: lib.formatCurrency(
              dataSource.detailOrder.total_price,
            ),
            paymentMethod: payment_type,
            orderId: dataSource.detailOrder.order_id,
            sellerName: dataSource.detailOrder.seller_name,
            sellerEmail: dataSource.detailOrder.seller_email,
            customerEmail: dataSource.detailOrder.customer_email,
            baseUrl: process.env.BASE_URL_CLIENT,
          };

          const transactionStatusMap = {
            pending: {
              subject:
                getPaymentConfig.payment_notif_callback.subject_email.pending[
                  language
                ],
              html: formatEmail.pendingPayment({
                ...tamplateDataEmail,
                expirationTime: expiry_time,
              }),
            },
            settlement: {
              subject:
                getPaymentConfig.payment_notif_callback.subject_email
                  .settlement[language],
              html: formatEmail.successPayment({
                ...tamplateDataEmail,
                paymentTime: settlement_time,
              }),
              htmlSeller: formatEmail.successPaymentForSeller({
                ...tamplateDataEmail,
                recipientName: tamplateDataEmail.sellerName,
                paymentTime: settlement_time,
              }),
            },
            cancel: {
              subject:
                getPaymentConfig.payment_notif_callback.subject_email.cancel[
                  language
                ],
              html: formatEmail.cancelPayment({
                ...tamplateDataEmail,
                orderTime: transaction_time,
              }),
            },
            expire: {
              subject:
                getPaymentConfig.payment_notif_callback.subject_email.expire[
                  language
                ],
              html: formatEmail.expirePayment({
                ...tamplateDataEmail,
                orderTime: transaction_time,
              }),
            },
            failure: {
              subject:
                getPaymentConfig.payment_notif_callback.subject_email.failure[
                  language
                ],
              html: formatEmail.failurePayment({
                ...tamplateDataEmail,
                orderTime: transaction_time,
              }),
            },
          };

          const statusDetails = transactionStatusMap[formatTransactionStatus];
          const mappedStatus =
            getPaymentConfig.payment_notif_callback.mapping_order_status[
              formatTransactionStatus
            ];

          if (!statusDetails && !mappedStatus) return Promise.resolve();

          if (formatTransactionStatus !== 'pending') {
            await this.pool.executeRawQuery({
              transactionid,
              query: `
              UPDATE orders SET status = ?
              WHERE order_id = ?;
              `,
              pool: connection,
              logName: 'UPDATE ORDER STATUS',
              params: [mappedStatus, order_id],
            });
          }

          if (
            ['cancel', 'expire', 'failure'].includes(
              formatTransactionStatus?.toLowerCase(),
            ) &&
            dataSource.isReservation
          ) {
            await this.pool.executeRawQuery({
              transactionid,
              query: `
              UPDATE reservation_schedule
              SET current_quota = current_quota + CASE
              ${dataSource.caseStatementReservationSchedule.join('\n')}
              ELSE 0
              END
              WHERE ${dataSource.whereStatementReservationSchedule.join('\n OR ')};
              `,
              pool: connection,
              logName: 'UPDATE RESERVATION SCHEDULE',
              params: dataSource.paramsReservationSchedule,
            });

            // if (dataSource.detailOrder?.voucher_order_id) {
            //   await this.pool.executeRawQuery({
            //     transactionid,
            //     query: `
            //     UPDATE voucher_order_info
            //     SET status = ?, revoke_time = ?
            //     WHERE id = ?;
            //     `,
            //     params: [
            //       'revoke',
            //       new Date(),
            //       dataSource.detailOrder.voucher_order_id,
            //     ],
            //     pool: connection,
            //     logName: 'UPDATE VOUCHER ORDER',
            //   });
            // }
          }

          if (dataSource.detailOrder?.payment_id) {
            await this.pool.executeRawQuery({
              transactionid,
              query: `
              UPDATE payment_transaction
              SET status = ?, settlement_time = ?
              WHERE transaction_id = ?;
              `,
              logName: 'UPDATE PAYMENT TRANSACTION',
              pool: connection,
              params: [
                formatTransactionStatus.toUpperCase(),
                settlement_time,
                dataSource.detailOrder.payment_id,
              ],
            });
          } else {
            const aditionalValuePayment = this.__constructAditionalValuePayment(
              getPaymentStatus,
              actions,
              qr_string,
            );
            await this.pool.executeRawQuery({
              transactionid,
              query: `
              INSERT INTO payment_transaction (
                order_id,
                transaction_id,
                transaction_time,
                status,
                amount,
                payment_method,
                expiry_time,
                settlement_time,
                currency,
                va_number,
                bank,
                redirect_url,
                qr_code,
                qr_string
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
              `,
              logName: 'INSERT PAYMENT TRANSACTION',
              pool: connection,
              params: [
                order_id,
                transaction_id,
                transaction_time,
                formatTransactionStatus.toUpperCase(),
                parseInt(gross_amount, 10),
                payment_type,
                expiry_time,
                settlement_time,
                currency,
                ...aditionalValuePayment,
              ],
            });
          }

          const messages = [
            {
              email: tamplateDataEmail.customerEmail,
              name: tamplateDataEmail.recipientName,
              subject: statusDetails.subject,
              html: statusDetails.html,
            },
            {
              email: tamplateDataEmail.sellerEmail,
              name: tamplateDataEmail.sellerName,
              subject: statusDetails.subject,
              html: statusDetails.htmlSeller,
            },
          ];

          await Promise.all([
            ...messages.map((message) =>
              this.rabbitmqService.sendToQueue({
                queue: 'notification-queue',
                message: JSON.stringify({
                  type: 'send-email',
                  data: {
                    to: message.email,
                    text: `Hi ${message.name}`,
                    subject: message.subject,
                    html: message.html,
                  },
                  transactionid,
                }),
                transactionid,
              }),
            ),
            this.redisService.setDataWithTTL({
              transactionid,
              key: `order-${order_id}`,
              value: transaction_status,
              ttl:
                transaction_status === 'pending'
                  ? expiryMoment.diff(currentTime, 'seconds')
                  : 300,
            }),
            this.redisService.deleteData({
              transactionid,
              key: `init-payment-transaction-${order_id}`,
              isErrorOptional: true,
            }),
          ]);
          return;
        },
      );
    } catch (error) {
      this.logger.error(['Notification Service', 'Order Callback', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });
      return Promise.reject(error);
    }
  }
}
