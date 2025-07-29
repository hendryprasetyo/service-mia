import * as _ from 'lodash';
import * as Moment from 'moment';
import lib from 'src/common/helpers/lib/lib.service';
import { Injectable } from '@nestjs/common';
import { AuthRequest, HeadersDto, TLanguage } from 'src/common/dtos/dto';
import { EncryptionService } from 'src/common/helpers/encryption/encryption.service';
import { GeneralService } from 'src/common/helpers/general/general.service';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { DbService } from 'src/database/mysql/mysql.service';
import {
  CancelOrderDto,
  GetDetailOrderResponse,
  GetOrderDetailDto,
  GetOrderListDto,
  TPaymentDetail,
  TRawQueryDetailOrder,
  TResQueryOrderList,
} from './order.dto';
import { CustomHttpException } from 'src/common/helpers/lib/exception';
import { MidtransService } from 'src/common/providers/midtrans/midtrans.service';

@Injectable()
export class OrderService {
  constructor(
    private readonly logger: LoggerServiceImplementation,
    private readonly encryptionService: EncryptionService,
    private readonly generalService: GeneralService,
    private readonly pool: DbService,
    private readonly midtransService: MidtransService,
    private readonly generalHelper: GeneralService,
  ) {}

  // Format reservation date
  private __formatReservationDate(unix: string | null, language: TLanguage) {
    if (!unix) return null;
    const formatNumber = Number(unix);
    return Moment(formatNumber).locale(language).format('DD MMMM YYYY');
  }

  private __formatDisplayPriceBeforeDiscount(dataObj: {
    price: number;
    priceBeforeDisc: number | null;
  }) {
    const { price, priceBeforeDisc } = dataObj;
    if (
      !priceBeforeDisc ||
      !price ||
      price <= 0 ||
      priceBeforeDisc <= 0 ||
      priceBeforeDisc <= price
    )
      return null;

    return lib.formatCurrency(priceBeforeDisc);
  }

  private constructPaymentDetail(firstRow: TRawQueryDetailOrder) {
    let result: TPaymentDetail = {
      transaction_time: firstRow.payment_transaction_time,
      expiry_time: firstRow.payment_expiry_time,
    };
    if (firstRow.status === 'COMPLETED') {
      result = {
        ...result,
        settlement_time: firstRow.payment_settlement_time,
      };
    }
    if (firstRow.payment_method === 'bank_transfer') {
      result = {
        ...result,
        va_number: firstRow.payment_va_number,
        bank: firstRow.payment_bank,
      };
    }
    if (['shopeepay', 'gopay'].includes(firstRow.payment_method)) {
      result = {
        ...result,
        redirect_url: firstRow.payment_redirect_url,
      };
    }
    if (['qris', 'gopay'].includes(firstRow.payment_method)) {
      result = {
        ...result,
        qe_code: firstRow.payment_qr_code,
      };
    }
    return result;
  }

  private async __filterProcessOrderList(dataObj: {
    request: AuthRequest;
    query: GetOrderListDto;
  }) {
    const { query, request } = dataObj;
    const { search, status } = query;
    const userId = request?.auth?.id;
    let whereClause = 'o.is_deleted = 0';
    const params: string[] = [];
    whereClause += ' AND o.user_id = ?';
    params.push(userId);
    if (search || status) {
      if (search) {
        whereClause += ` AND (MATCH(od.name) AGAINST(? IN NATURAL LANGUAGE MODE) OR MATCH(o.no_order) AGAINST(? IN NATURAL LANGUAGE MODE))`;
        params.push(search, search);
      }
      if (status) {
        whereClause += ' AND o.status = ?';
        params.push(status);
      }
    }
    return { whereClause, params };
  }

  private __extractUniqueValues<T>(
    rows: Array<Record<string, any>>,
    uniqueKey: string,
    dataKey: string,
    processFunc: (item: string | number) => T,
  ): T[] {
    return _.uniqBy(
      _.flatMap(rows, (row) => {
        if (!row[dataKey]) return null;
        return row[dataKey].split(',').map(processFunc);
      }).filter((item) => item !== null),
      uniqueKey,
    );
  }

  private __formatedDisplayValue(dataObj: {
    value: number;
    valueType: string;
    category?: string;
    language?: TLanguage;
  }): string {
    const { value, valueType, category, language } = dataObj;
    if (category === 'fee' && value <= 0) {
      return language === 'id' ? 'Gratis' : 'Free';
    }
    return valueType?.toLowerCase() === 'percentage'
      ? `${value}%`
      : lib.formatCurrency(value);
  }

  private __feeProcessData = (fee: string, language: TLanguage) => {
    const parts = fee.split('|');
    const value = parseFloat(parts[0]);
    return {
      fee_order_id: Number(parts[3]),
      value: value,
      display_value: this.__formatedDisplayValue({
        value: Number(value),
        valueType: parts[1],
        category: 'fee',
        language,
      }),
      value_type: parts[1],
      fee_type: parts[2],
    };
  };

  private __voucerProcessData = (voucher: string, language: TLanguage) => {
    const parts = voucher.split('|');
    const [code, name, value, type, usingType] = parts;
    const formattedValue = value.replace(')', '').trim();
    return {
      code,
      name,
      display_value: this.__formatedDisplayValue({
        value: Number(value),
        valueType: type,
        language,
      }),
      value: parseFloat(formattedValue),
      type,
      using_type: usingType,
    };
  };

  public async getOrderList(
    request: AuthRequest,
    headers: HeadersDto,
    query: GetOrderListDto,
  ) {
    const { transactionid, language } = headers;
    try {
      const defaultLimit = +process.env.MAX_LIMIT_QUERY_ORDER_LIST || 20;
      const { limit = defaultLimit, page = 1 } = query;
      const limitNum = Number(limit);
      if (limitNum > defaultLimit) {
        return new CustomHttpException('Bad Request', 400);
      }

      this.generalHelper.validateSqlInjection([{ value: query.search }]);
      const offset = (Number(page) - 1) * limitNum;
      const { params, whereClause } = await this.__filterProcessOrderList({
        request,
        query,
      });

      const [rawOrders, countOrders] = await Promise.all([
        this.pool.executeRawQuery<TResQueryOrderList[]>({
          transactionid,
          query: `
        SELECT
          o.order_id,
          o.no_order,
          o.user_id,
          o.order_type,
          o.order_sub_type,
          o.total_price,
          o.total_quantity,
          o.total_price_before_discount,
          o.status,
          o.currency,
          o.discount,
          o.payment_method,
          o.created_at,
          od.start_reservation,
          od.end_reservation,
          od.id AS order_detail_id,
          od.order_identifier,
          od.name AS order_detail_name,
          od.quantity,
          od.price AS order_detail_price,
          od.price_before_discount AS order_detail_price_before_discount,
          od.discount AS order_detail_discount,
          od.thumbnail_url,
          od.thumbnail_text,
          si.user_id AS seller_id,
          si.name AS seller_name,
          GROUP_CONCAT(DISTINCT CONCAT(fo.value, '|', fo.value_type, '|', fo.fee_type, '|', fo.id) ORDER BY fo.id) AS fees
        FROM orders o
        JOIN order_detail od ON o.order_id = od.order_id
        JOIN seller_info si ON od.seller_id = si.user_id
        LEFT JOIN fee_order fo ON o.order_id = fo.order_id
        WHERE ${whereClause}
        GROUP BY o.order_id, od.id
        ORDER BY o.created_at DESC
        LIMIT ? OFFSET ?;`,
          params: [...params, limitNum, offset],
          logName: 'GET ORDER LIST',
          isWriteOperation: false,
        }),
        this.pool.executeRawQuery<{ total: number }[]>({
          transactionid,
          query: `
          SELECT COUNT(DISTINCT o.order_id) as total 
          FROM orders o
          JOIN order_detail od ON o.order_id = od.order_id
          WHERE ${whereClause};`,
          params,
          logName: 'GET TOTAL ORDER',
          isWriteOperation: false,
        }),
      ]);

      const groupedOrders = _.groupBy(rawOrders, 'order_id');

      const result = _.map(groupedOrders, (orderRows) => {
        const baseRow = orderRows[0];

        // Fee processing now mirrors order detail logic
        const fees = this.__extractUniqueValues(
          orderRows,
          'fee_order_id',
          'fees',
          (val: string) => this.__feeProcessData(val, language),
        );

        // Group by seller
        const groupedBySeller = _.groupBy(orderRows, 'seller_id');
        const details = _.map(groupedBySeller, (items, seller_id) => ({
          seller_id: this.encryptionService.encryptEntityID(seller_id),
          seller_name: items[0].seller_name,
          items: _.uniqBy(
            items.map((item) => ({
              id: item.order_detail_id,
              name: item.order_detail_name,
              thumbnail_url: item.thumbnail_url,
              thumbnail_text: item.thumbnail_text,
              item_identifier: item.order_identifier,
              quantity: item.quantity,
              start_reservation: this.__formatReservationDate(
                item.start_reservation,
                language,
              ),
              end_reservation: this.__formatReservationDate(
                item.end_reservation,
                language,
              ),
              discount: item.order_detail_discount,
              display_price: lib.formatCurrency(item.order_detail_price),
              price_before_discount: this.__formatDisplayPriceBeforeDiscount({
                price: item.order_detail_price,
                priceBeforeDisc: item.order_detail_price_before_discount,
              }),
            })),
            'id',
          ),
        }));

        return {
          order_id: this.encryptionService.encryptOrderID(baseRow.order_id),
          no_order: baseRow.no_order,
          user_id: this.encryptionService.encryptEntityID(baseRow.user_id),
          order_type: baseRow.order_type,
          order_sub_type: baseRow.order_sub_type,
          display_total_price: lib.formatCurrency(baseRow.total_price),
          display_total_price_before_discount:
            this.__formatDisplayPriceBeforeDiscount({
              price: baseRow.total_price,
              priceBeforeDisc: baseRow.total_price_before_discount,
            }),
          total_quantity: baseRow.total_quantity,
          status: baseRow.status,
          currency: baseRow.currency,
          discount: baseRow.discount,
          payment_method: baseRow.payment_method,
          created_at: this.__formatReservationDate(
            baseRow.created_at,
            language,
          ),
          details,
          fees,
        };
      });

      const totalData = countOrders[0].total;
      const totalPages = totalData > 0 ? Math.ceil(totalData / limitNum) : 0;
      return {
        list: result,
        pagination: {
          total_data: totalData,
          total_pages: totalPages,
          current_page: Number(page),
          limit: limitNum,
        },
      };
    } catch (error) {
      this.logger.error(['Order Service', 'Order List', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });

      return Promise.reject(error);
    }
  }

  public async getDetailOrder(
    request: AuthRequest,
    headers: HeadersDto,
    params: GetOrderDetailDto,
  ): Promise<GetDetailOrderResponse | CustomHttpException> {
    const { transactionid, language } = headers;
    try {
      const userId = request.auth.id;
      const decryptOrderId = this.encryptionService.decryptOrderID(
        params.orderId,
      );
      this.generalService.validateSqlInjection([
        {
          value: decryptOrderId,
          rules: ['isAlphanumeric', 'isNotSpace', 'min:23', 'max:25'],
        },
      ]);
      const getRawOrder = await this.pool.executeRawQuery<
        TRawQueryDetailOrder[]
      >({
        transactionid,
        query: `
          SELECT
            o.order_id,
            o.no_order,
            o.user_id,
            o.order_type,
            o.order_sub_type,
            o.total_price,
            o.total_price_before_discount,
            o.status,
            o.currency,
            o.discount,
            o.payment_method,
            o.created_at,
            od.start_reservation,
            od.end_reservation,
            od.id AS order_detail_id,
            od.order_identifier,
            od.name AS order_detail_name,
            od.quantity,
            od.price AS order_detail_price,
            od.price_before_discount AS order_detail_price_before_discount,
            od.discount AS order_detail_discount,
            oui.id AS order_user_info_id,
            oui.first_name,
            oui.last_name,
            oui.primary_email,
            oui.salutation,
            oui.secondary_email,
            oui.primary_phone_number,
            oui.secondary_phone_number,
            oui.country,
            oui.no_identifier,
            GROUP_CONCAT(DISTINCT CONCAT(voi.code, '|', v.name, '|', v.value, '|', v.type, '|', v.using_type) ORDER BY voi.code) AS vouchers,
            GROUP_CONCAT(DISTINCT CONCAT(fo.value, '|', fo.value_type, '|', fo.fee_type, '|', fo.id) ORDER BY fo.id) AS fees,
            si.seller_email,
            si.id AS seller_id,
            si.name AS seller_name,
            pt.transaction_id,
            pt.transaction_time AS payment_transaction_time,
            pt.expiry_time AS payment_expiry_time,
            pt.va_number AS payment_va_number,
            pt.bank AS payment_bank,
            pt.redirect_url AS payment_redirect_url,
            pt.qr_code AS payment_qr_code,
            pt.qr_string AS payment_qr_string,
            pt.settlement_time AS payment_settlement_time
          FROM orders o
          JOIN order_detail od ON o.order_id = od.order_id
          JOIN seller_info si ON od.seller_id = si.user_id
          LEFT JOIN fee_order fo ON o.order_id = fo.order_id
          LEFT JOIN order_user_info oui ON od.id = oui.order_detail_id
          LEFT JOIN voucher_order_info voi ON od.id = voi.order_detail_id
          LEFT JOIN voucher v ON voi.code = v.code
          LEFT JOIN payment_transaction pt ON o.order_id = pt.order_id
          WHERE o.order_id = ? AND o.user_id = ?
          GROUP BY o.order_id, od.id, oui.id, si.user_id, pt.transaction_id;
          `,
        params: [decryptOrderId, userId],
        logName: 'GET ORDER DETAIL',
        isWriteOperation: false,
      });

      if (_.isEmpty(getRawOrder))
        return new CustomHttpException('Bad Request', 400);

      const groupedData = _.groupBy(getRawOrder, 'order_id');

      const constructResponse = _.map(groupedData, (rows) => {
        const baseRow = rows[0];

        // Fungsi untuk memproses fee

        // Construct order details
        const orderDetails = _(rows)
          .groupBy('order_detail_id') // Kelompokkan per detail
          .map((detailRows) => {
            const row = detailRows[0];
            return {
              start_reservation: this.__formatReservationDate(
                row.start_reservation,
                language,
              ),
              end_reservation: this.__formatReservationDate(
                row.end_reservation,
                language,
              ),
              order_identifier: this.encryptionService.encryptEntityID(
                row.order_identifier,
              ),
              name: row.order_detail_name,
              quantity: row.quantity,
              price: row.order_detail_price,
              price_before_discount: row.order_detail_price_before_discount,
              format_price: lib.formatCurrency(
                row.order_detail_price,
                row.currency,
              ),
              format_price_before_discount: lib.formatCurrency(
                row.order_detail_price_before_discount,
                row.currency,
              ),
              discount: row.order_detail_discount,
              order_userinfo: detailRows.map((d) => ({
                id: d.order_user_info_id,
                first_name: d.first_name,
                last_name: d.last_name,
                primary_email: lib.markerData(d.primary_email, 'email'),
                salutation: d.salutation,
                secondary_email: d.secondary_email,
                primary_phone_number: d.primary_phone_number,
                secondary_phone_number: d.secondary_phone_number,
                country: d.country,
                no_identifier: lib.markerData(d.no_identifier, 'nik', 3),
              })),
              vouchers: this.__extractUniqueValues(
                detailRows,
                'code',
                'vouchers',
                (val: string) => this.__voucerProcessData(val, language),
              ),
            };
          })
          .value();

        return {
          no_order: baseRow.no_order,
          order_id: this.encryptionService.encryptOrderID(baseRow.order_id),
          order_type: baseRow.order_type,
          order_sub_type: baseRow.order_sub_type,
          total_price: baseRow.total_price,
          total_price_before_discount: baseRow.total_price_before_discount,
          format_total_price: lib.formatCurrency(
            baseRow.total_price,
            baseRow.currency,
          ),
          format_total_price_before: lib.formatCurrency(
            baseRow.total_price_before_discount,
            baseRow.currency,
          ),
          status: baseRow.status,
          currency: baseRow.currency,
          discount: baseRow.discount,
          payment_method: baseRow.payment_method,
          order_details: orderDetails,
          payment_detail: this.constructPaymentDetail(baseRow),
          created_at: this.__formatReservationDate(
            baseRow.created_at,
            language,
          ),
          seller: {
            id: this.encryptionService.encryptEntityID(baseRow.seller_id),
            name: baseRow.seller_name,
            email: lib.markerData(baseRow.seller_email, 'email'),
          },
          fees: this.__extractUniqueValues(
            rows,
            'fee_order_id',
            'fees',
            (val: string) => this.__feeProcessData(val, language),
          ),
        };
      });

      return constructResponse[0];
    } catch (error) {
      this.logger.error(['Order Service', 'Detail Order', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });

      return Promise.reject(error);
    }
  }

  public async cancelOrder(
    request: AuthRequest,
    headers: HeadersDto,
    reqBody: CancelOrderDto,
  ) {
    const { transactionid } = headers;
    try {
      const userId = request.auth.id;
      const decryptOrderId = this.encryptionService.decryptOrderID(
        reqBody.orderId,
      );
      this.generalService.validateSqlInjection([
        {
          value: decryptOrderId,
          rules: ['isAlphanumeric', 'isNotSpace', 'min:23', 'max:25'],
        },
      ]);
      const getOrder = await this.pool.executeRawQuery<
        { order_id: string; quantity: number; reservation_id: string }[]
      >({
        transactionid,
        query: `
        SELECT order_id
        FROM orders
        WHERE order_id = ? AND user_id = ? AND status = ?;
        `,
        params: [decryptOrderId, userId, 'INPROGRESS'],
        logName: 'GET ORDER FOR CANCEL',
        isWriteOperation: false,
      });

      if (_.isEmpty(getOrder))
        return new CustomHttpException('Bad Request', 400);

      await this.midtransService.cancelPayment(
        { order_id: decryptOrderId },
        transactionid,
      );
      return;
    } catch (error) {
      this.logger.error(['Order Service', 'Cancel Order', 'ERROR'], {
        messages: `${error.message}`,
        transactionid,
      });

      return Promise.reject(error);
    }
  }
}
