import * as Path from 'path';
import * as Moment from 'moment';
import { Test, TestingModule } from '@nestjs/testing';
import { GeneralService } from 'src/common/helpers/general/general.service';
import { TestSetupModule } from 'src/config/test-setup.module';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import {
  mockDbService,
  mockHeaders,
  mockLoggerService,
  mockMidtransService,
  mockRedisService,
} from 'src/config/__test__/mock';
import { EncryptionService } from 'src/common/helpers/encryption/encryption.service';
import { TProcessFulfillment, TResponseFulfillment } from './payment.dto';
import { DbService } from 'src/database/mysql/mysql.service';
import { PaymentRepository } from './payment.repository';
import {
  PaymentConfigDto,
  PaymentMethodListDto,
} from 'src/common/dtos/paymentMethod.dto';
import { MidtransService } from 'src/common/providers/midtrans/midtrans.service';
import {
  ResponseMidtrans,
  ResponseQueryGetPlaceFulfillment,
} from 'src/config/__test__/response/response';
import { CustomHttpException } from 'src/common/helpers/lib/exception';
import { RedisService } from 'src/database/redis/redis.service';

const PAYMENT_METHOD_PATH = Path.join(
  __dirname,
  '../../assets/paymentMethod.json',
);
const PAYMENT_CONFIG_PATH = Path.join(
  __dirname,
  '../../assets/paymentConfig.json',
);

describe('PaymentRepository', () => {
  let repository: PaymentRepository;
  let generalService: GeneralService;
  let payload: TProcessFulfillment;
  let paymentList: PaymentMethodListDto[];
  let mockFindDestination = ResponseQueryGetPlaceFulfillment;
  const unixStartOfToday = Moment().startOf('day').valueOf();
  const unixStartOfTomorrow = Moment().startOf('day').add(1, 'days').valueOf();
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      providers: [
        PaymentRepository,
        GeneralService,
        EncryptionService,
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
        { provide: DbService, useValue: mockDbService },
        { provide: MidtransService, useValue: mockMidtransService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    repository = module.get<PaymentRepository>(PaymentRepository);
    generalService = module.get<GeneralService>(GeneralService);
  });
  describe('Process Fulfillment', () => {
    beforeEach(async () => {
      const [paymentConfig, getPaymentList] = await Promise.all([
        generalService.readFromFile<PaymentConfigDto>(PAYMENT_CONFIG_PATH),
        generalService.readFromFile<PaymentMethodListDto[]>(
          PAYMENT_METHOD_PATH,
        ),
      ]);
      paymentList = getPaymentList;
      payload = {
        paymentConfig,
        transactionid: mockHeaders.transactionid,
        userId: 'user_id',
        dataSource: {
          dayOfStartTime: 'thursday',
          unixCurrentTime: 1748081041256,
          unixStartOfToday: 1748019600000,
          unixEndOfToday: 1748105999999,
          totalQuantity: 2,
          firstItemId: mockFindDestination[0].id,
          firstBasecampId: 'unique-id',
          totalQuantityPerShop: {
            '0E24197B-4139-462F-8359-5CB39B6DC23': 2,
          },
          vouchers: [
            {
              code: 'EIGE6KB18',
              shopId: '0E24197B-4139-462F-8359-5CB39B6DC23',
              source: 'merchant',
              voucher_identifier: null,
              value_type: 'price',
              value: 2000,
            },
            {
              code: 'EIGE6KB17',
              shopId: '0E24197B-4139-462F-8359-5CB39B6DC22',
              source: 'merchant',
              voucher_identifier: null,
              value_type: 'percentage',
              value: 0.75,
            },
            {
              code: 'EIGE6KB17',
              shopId: '0E24197B-4139-462F-8359-5CB39B6DC22',
              source: 'merchant',
              voucher_identifier: null,
              value_type: 'price',
              value: 1000,
            },
            {
              code: 'EIGE6KB12',
              source: 'mia',
              value_type: 'price',
              value: 2000,
              voucher_identifier: 'GNC11748081041256VO8G7N',
            },
            {
              code: 'EIGE6KB13',
              source: 'mia',
              value_type: 'percentage',
              value: 0.2,
              voucher_identifier: 'GNC11748081041256VO8G7N',
            },
          ],
          paymentSelected: paymentList.find(
            (item) => item.payment_type === 'bank_transfer',
          ),
          orderId: 'GNC11748081041256VO8G7N',
          listNoIdentifier: ['test_1', 'test_12'],
          isGN: true,
          isReservation: true,
          decryptedReqBody: {
            paymentType: 'bank_transfer',
            bank: 'bca',
            customerInfo: {
              firstName: 'jhon',
              email: 'hendtry95@gmail.com',
              phoneNumber: '123123123',
            },
            useCoin: false,
            orderDetail: {
              orderType: 'RESERVATION',
              orderSubType: 'GN',
              startTime: unixStartOfToday.toString(),
              selectedOrderIds: [
                {
                  shopId: '0E24197B-4139-462F-8359-5CB39B6DC23',
                  itemBriefs: [
                    {
                      itemId: mockFindDestination[0].id,
                      quantity: 3,
                      members: [
                        {
                          firstName: 'jhon',
                          email: 'jhon@gmail.com',
                          phoneNumber: '123123123',
                          noIdentifier: 'test_1',
                          gender: 'female',
                          birthday: '10-01-2004',
                          typeIdentifier: 'ktp',
                        },
                        {
                          firstName: 'doe',
                          email: 'doe@gmail.com',
                          phoneNumber: '123123123',
                          noIdentifier: 'test_12',
                          gender: 'other',
                          birthday: '10-01-2004',
                          typeIdentifier: 'ktp',
                        },
                        {
                          firstName: 'dose',
                          email: 'dose@gmail.com',
                          phoneNumber: '123123123',
                          noIdentifier: 'test_12',
                          gender: 'male',
                          birthday: '10-01-2004',
                          typeIdentifier: 'ktp',
                        },
                      ],
                      basecampId: mockFindDestination[0].basecamp_id,
                    },
                  ],
                  shopVouchers: [
                    {
                      voucherCode: 'EIGE6KB18',
                    },
                  ],
                },
                {
                  shopId: '0E24197B-4139-462F-8359-5CB39B6DC22',
                  itemBriefs: [
                    {
                      itemId: mockFindDestination[0].id,
                      quantity: 1,
                      members: [
                        {
                          firstName: 'jhon',
                          email: 'jhon@gmail.com',
                          phoneNumber: '123123123',
                          noIdentifier: 'test_1',
                          gender: 'female',
                          birthday: '10-01-2004',
                          typeIdentifier: 'ktp',
                        },
                      ],
                      basecampId: mockFindDestination[0].basecamp_id,
                    },
                  ],
                  shopVouchers: [
                    {
                      voucherCode: 'EIGE6KB17',
                    },
                  ],
                },
              ],
              vouchers: [
                {
                  voucherCode: 'EIGE6KB12',
                },
                {
                  voucherCode: 'EIGE6KB13',
                },
              ],
            },
          },
        },
      };
      mockDbService.executeInTransaction.mockImplementation((trxid, cb) => {
        return cb(
          mockDbService.executeRawQuery.mockImplementation(({ logName }) => {
            if (logName === 'GET PLACE DESTINATION') return mockFindDestination;
            if (logName === 'INSERT ORDER') return [];
            if (logName === 'INSERT FEE ORDER') return [];
            if (logName === 'INSERT ORDER DETAIL') return [];
            if (logName === 'INSERT ORDER USER INFO') return [];
            if (logName === 'INSERT RESERVATION SCHEDULE') return [];
            if (logName === 'INSERT VOUCHER ORDER INFO') return [];
            if (logName === 'UPDATE RESERVATION SCHEDULE') return [];
          }),
        );
      });
    });

    it('should return success : with payment type bank_transfer bca', async () => {
      mockMidtransService.charge.mockResolvedValue(ResponseMidtrans['bca']);
      const result = (await repository.ProcessFulfillment(
        payload as TProcessFulfillment,
      )) as TResponseFulfillment;
      expect(result.bank).toBe(
        payload.dataSource.decryptedReqBody.bank.toUpperCase(),
      );
      expect(result.order_id).toBeDefined();
    });

    it('should return success : with payment type permata', async () => {
      payload = {
        ...payload,
        dataSource: {
          ...payload.dataSource,
          decryptedReqBody: {
            ...payload.dataSource.decryptedReqBody,
            paymentType: 'permata',
          },
        },
      };
      mockMidtransService.charge.mockResolvedValue(ResponseMidtrans['permata']);
      const result = (await repository.ProcessFulfillment(
        payload as TProcessFulfillment,
      )) as TResponseFulfillment;
      expect(result.bank).toBe('Permata');
      expect(result.order_id).toBeDefined();
    });

    it('should return success : with payment type qris', async () => {
      mockMidtransService.charge.mockResolvedValue(ResponseMidtrans['qris']);
      mockRedisService.setDataWithTTL.mockResolvedValue('success');
      payload = {
        ...payload,
        dataSource: {
          ...payload.dataSource,
          paymentSelected: paymentList.find(
            (item) => item.payment_type === 'qris',
          ),
          decryptedReqBody: {
            ...payload.dataSource.decryptedReqBody,
            paymentType: 'qris',
          },
        },
      };
      const result = (await repository.ProcessFulfillment(
        payload as TProcessFulfillment,
      )) as TResponseFulfillment;
      expect(result.order_id).toBeDefined();
    });

    it('should return success : with payment type gopay', async () => {
      mockMidtransService.charge.mockResolvedValue(ResponseMidtrans['gopay']);
      mockRedisService.setDataWithTTL.mockResolvedValue('success');
      payload = {
        ...payload,
        dataSource: {
          ...payload.dataSource,
          paymentSelected: paymentList.find(
            (item) => item.payment_type === 'gopay',
          ),
          decryptedReqBody: {
            ...payload.dataSource.decryptedReqBody,
            paymentType: 'gopay',
          },
        },
      };
      const result = (await repository.ProcessFulfillment(
        payload as TProcessFulfillment,
      )) as TResponseFulfillment;
      expect(result.order_id).toBeDefined();
    });

    it('should return success : with payment type shopeepay category CP', async () => {
      mockMidtransService.charge.mockResolvedValue(
        ResponseMidtrans['shopeepay'],
      );
      mockRedisService.setDataWithTTL.mockResolvedValue('success');
      payload = {
        ...payload,
        dataSource: {
          ...payload.dataSource,
          isGN: false,
          decryptedReqBody: {
            ...payload.dataSource.decryptedReqBody,
            paymentType: 'shopeepay',
            orderDetail: {
              ...payload.dataSource.decryptedReqBody.orderDetail,
              endTime: unixStartOfTomorrow.toString(),
              orderSubType: 'CP',
            },
          },
        },
      };
      mockFindDestination = ResponseQueryGetPlaceFulfillment.map((item) => ({
        ...item,
        basecamp_name: null,
        basecamp_id: null,
        category_code: 'CP',
        reservation_id: null,
      }));
      const result = (await repository.ProcessFulfillment(
        payload as TProcessFulfillment,
      )) as TResponseFulfillment;
      expect(result.order_id).toBeDefined();
      mockFindDestination = ResponseQueryGetPlaceFulfillment;
    });

    it('should return success : with payment type echannel', async () => {
      mockMidtransService.charge.mockResolvedValue(
        ResponseMidtrans['echannel'],
      );
      payload = {
        ...payload,
        dataSource: {
          ...payload.dataSource,
          decryptedReqBody: {
            ...payload.dataSource.decryptedReqBody,
            paymentType: 'echannel',
          },
        },
      };
      const result = (await repository.ProcessFulfillment(
        payload as TProcessFulfillment,
      )) as TResponseFulfillment;
      expect(result.order_id).toBeDefined();
    });

    it('should return success : with payment type ots', async () => {
      payload = {
        ...payload,
        dataSource: {
          ...payload.dataSource,
          decryptedReqBody: {
            ...payload.dataSource.decryptedReqBody,
            paymentType: 'ots',
          },
        },
      };
      const result = (await repository.ProcessFulfillment(
        payload as TProcessFulfillment,
      )) as TResponseFulfillment;
      expect(result.order_id).toBeDefined();
    });

    it('should return success : with payment type ots new order place', async () => {
      payload = {
        ...payload,
        dataSource: {
          ...payload.dataSource,
          decryptedReqBody: {
            ...payload.dataSource.decryptedReqBody,
            paymentType: 'ots',
          },
        },
      };
      mockFindDestination = ResponseQueryGetPlaceFulfillment.map((item) => ({
        ...item,
        reservation_id: null,
      }));
      const result = (await repository.ProcessFulfillment(
        payload as TProcessFulfillment,
      )) as TResponseFulfillment;
      expect(result.order_id).toBeDefined();
    });

    it('should return error 400 : not ready date', async () => {
      payload = {
        ...payload,
        dataSource: {
          ...payload.dataSource,
          decryptedReqBody: {
            ...payload.dataSource.decryptedReqBody,
            paymentType: 'ots',
          },
        },
      };
      mockFindDestination = ResponseQueryGetPlaceFulfillment.map((item) => ({
        ...item,
        quota_place: null,
      }));
      const result = (await repository.ProcessFulfillment(
        payload as TProcessFulfillment,
      )) as CustomHttpException;
      expect(result.getStatus()).toBe(400);
      expect(result.message).toBe('Tanggal tidak tersedia');
      mockFindDestination = ResponseQueryGetPlaceFulfillment;
    });

    it('should return error 400 : miss match category', async () => {
      payload = {
        ...payload,
        dataSource: {
          ...payload.dataSource,
          isGN: false,
          decryptedReqBody: {
            ...payload.dataSource.decryptedReqBody,
            paymentType: 'ots',
            orderDetail: {
              ...payload.dataSource.decryptedReqBody.orderDetail,
              orderSubType: 'CP',
            },
          },
        },
      };
      const result = (await repository.ProcessFulfillment(
        payload as TProcessFulfillment,
      )) as CustomHttpException;
      expect(result.getStatus()).toBe(400);
      expect(result.message).toBe('Bad Request');
    });

    it('should return error : unexpected error', async () => {
      mockDbService.executeInTransaction.mockRejectedValue(
        new Error('Internal server error'),
      );
      try {
        await repository.ProcessFulfillment(payload as TProcessFulfillment);
      } catch (error) {
        expect(error.message).toBe('Internal server error');
      }
    });
  });
});
