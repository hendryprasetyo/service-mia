import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import {
  mockLoggerService,
  mockRabbitMQService,
  mockRedisService,
  mockDbService,
  mockMidtransService,
} from 'src/config/__test__/mock';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { RedisService } from 'src/database/redis/redis.service';
import { RabbitmqService } from 'src/common/providers/rabbitmq/rabbitmq.service';
import { TranscationNotifDto } from './notification.dto';
import { GeneralService } from 'src/common/helpers/general/general.service';
import { DbService } from 'src/database/mysql/mysql.service';
import { MidtransService } from 'src/common/providers/midtrans/midtrans.service';
import { CustomHttpException } from 'src/common/helpers/lib/exception';
import { TestSetupModule } from 'src/config/test-setup.module';
import { EncryptionService } from 'src/common/helpers/encryption/encryption.service';
import {
  ResponseMidtrans,
  ResponseQueryGetOrderCallback,
} from 'src/config/__test__/response/response';
describe('NotificationService', () => {
  let service: NotificationService;
  let payload: TranscationNotifDto;

  let mockGetOrderQuery = ResponseQueryGetOrderCallback;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      providers: [
        NotificationService,
        GeneralService,
        EncryptionService,
        { provide: DbService, useValue: mockDbService },
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: RabbitmqService, useValue: mockRabbitMQService },
        { provide: MidtransService, useValue: mockMidtransService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.restoreAllMocks(); // Reset semua spy/mocks
    jest.clearAllMocks(); // Bersihkan call history dll
  });

  describe('payment notif callback', () => {
    beforeEach(() => {
      payload = ResponseMidtrans.bca;
      mockGetOrderQuery = mockGetOrderQuery.map((item) => {
        return {
          ...item,
          order_id: payload.order_id,
        };
      });
      mockRedisService.getData.mockImplementation((params) => {
        if (params.key === `order-${payload.order_id}`) return null;
        if (params.key === `init-payment-transaction-${payload.order_id}`)
          return { actions: payload.actions, qr_string: payload.currency };
      });
      mockRedisService.setDataWithTTL.mockImplementation((params) => {
        if (params.key === `order-${payload.order_id}`) return null;
      });
      mockRedisService.deleteData.mockImplementation((params) => {
        if (params.key === `init-payment-transaction-${payload.order_id}`)
          return null;
      });
      mockMidtransService.getStatusPayment.mockResolvedValue(payload);
      mockDbService.executeInTransaction.mockImplementation((trxid, cb) => {
        return cb(
          mockDbService.executeRawQuery.mockImplementation((params) => {
            if (params.logName === 'GET ORDER CALLBACK')
              return mockGetOrderQuery;
            if (params.logName === 'UPDATE ORDER STATUS') return 'success';
            if (params.logName === 'UPDATE PAYMENT TRANSACTION')
              return 'success';
            if (params.logName === 'INSERT PAYMENT TRANSACTION')
              return 'success';
            if (params.logName === 'UPDATE RESERVATION SCHEDULE')
              return 'success';
            if (params.logName === 'UPDATE VOUCHER ORDER') return 'success';
          }),
          mockRabbitMQService.sendToQueue.mockResolvedValue('success'),
          mockRedisService.setDataWithTTL.mockImplementation((params) => {
            if (params.key === `order-${payload.order_id}`) return null;
          }),
        );
      });
    });

    it('should return success with status pending: Insert payment status bank_transafer', async () => {
      await service.orderCallback(payload as TranscationNotifDto, {
        transactionid: 'test-transaction-id',
      });
    });

    it('should return success with status pending: Insert payment status shopeepay', async () => {
      payload = ResponseMidtrans.shopeepay;

      mockMidtransService.getStatusPayment.mockResolvedValue(payload);
      await service.orderCallback(payload as TranscationNotifDto, {
        transactionid: 'test-transaction-id',
      });
    });

    it('should return success with status pending: Insert payment status gopay', async () => {
      payload = ResponseMidtrans.gopay;
      mockMidtransService.getStatusPayment.mockResolvedValue(payload);
      await service.orderCallback(payload as TranscationNotifDto, {
        transactionid: 'test-transaction-id',
      });
    });

    it('should return success with status pending: Insert payment status qris', async () => {
      payload = ResponseMidtrans.qris;
      mockMidtransService.getStatusPayment.mockResolvedValue(payload);
      await service.orderCallback(payload as TranscationNotifDto, {
        transactionid: 'test-transaction-id',
      });
    });

    it('should return success with status pending: Insert payment status echannel', async () => {
      payload = ResponseMidtrans.echannel;
      mockMidtransService.getStatusPayment.mockResolvedValue(payload);
      await service.orderCallback(payload as TranscationNotifDto, {
        transactionid: 'test-transaction-id',
      });
    });

    it('should return success with status pending: Insert payment status permata', async () => {
      payload = ResponseMidtrans.permata;
      mockMidtransService.getStatusPayment.mockResolvedValue(payload);
      await service.orderCallback(payload as TranscationNotifDto, {
        transactionid: 'test-transaction-id',
      });
    });

    it('should return success with status settlement: update payment and order status', async () => {
      payload = {
        ...payload,
        settlement_time: payload.expiry_time,
        transaction_status: 'settlement',
      };
      mockMidtransService.getStatusPayment.mockResolvedValue(payload);
      mockGetOrderQuery = mockGetOrderQuery.map((item) => {
        return {
          ...item,
          order_id: payload.order_id,
          payment_id: payload.order_id,
        };
      });
      await service.orderCallback(payload as TranscationNotifDto, {
        transactionid: 'test-transaction-id',
      });
      mockGetOrderQuery = ResponseQueryGetOrderCallback;
    });

    it('should return success with status expire: update payment and order status', async () => {
      payload = {
        ...payload,
        transaction_status: 'expire',
      };
      mockMidtransService.getStatusPayment.mockResolvedValue(payload);
      mockGetOrderQuery = mockGetOrderQuery.map((item) => {
        return {
          ...item,
          order_id: payload.order_id,
          payment_id: payload.order_id,
        };
      });
      await service.orderCallback(payload as TranscationNotifDto, {
        transactionid: 'test-transaction-id',
      });
      mockGetOrderQuery = ResponseQueryGetOrderCallback;
    });

    it('should return success with status cancel: update payment and order status', async () => {
      payload = {
        ...payload,
        transaction_status: 'cancel',
      };
      mockMidtransService.getStatusPayment.mockResolvedValue(payload);
      mockGetOrderQuery = mockGetOrderQuery.map((item) => {
        return {
          ...item,
          order_id: payload.order_id,
          payment_id: payload.order_id,
          order_sub_type: 'CP',
        };
      });
      await service.orderCallback(payload as TranscationNotifDto, {
        transactionid: 'test-transaction-id',
      });
      mockGetOrderQuery = ResponseQueryGetOrderCallback;
    });

    it('should return success with status failure: update payment and order status', async () => {
      payload = {
        ...payload,
        transaction_status: 'failure',
      };
      mockMidtransService.getStatusPayment.mockResolvedValue(payload);
      mockGetOrderQuery = mockGetOrderQuery.map((item) => {
        return {
          ...item,
          order_id: payload.order_id,
          payment_id: payload.order_id,
        };
      });
      await service.orderCallback(payload as TranscationNotifDto, {
        transactionid: 'test-transaction-id',
      });
      mockGetOrderQuery = ResponseQueryGetOrderCallback;
    });

    it('should return success with status not acceptable', async () => {
      payload = {
        ...payload,
        transaction_status: 'anonymous',
      };
      mockMidtransService.getStatusPayment.mockResolvedValue(payload);
      mockGetOrderQuery = mockGetOrderQuery.map((item) => {
        return {
          ...item,
          order_id: payload.order_id,
          payment_id: payload.order_id,
        };
      });
      await service.orderCallback(payload as TranscationNotifDto, {
        transactionid: 'test-transaction-id',
      });
      mockGetOrderQuery = ResponseQueryGetOrderCallback;
    });

    it('should return error bad request: different status transaction', async () => {
      payload = {
        ...payload,
        transaction_status: 'anonymous',
      };
      mockMidtransService.getStatusPayment.mockResolvedValue({
        ...payload,
        transaction_status: 'pending',
      });
      const result = (await service.orderCallback(
        payload as TranscationNotifDto,
        {
          transactionid: 'test-transaction-id',
        },
      )) as CustomHttpException;
      expect(result.getStatus()).toBe(400);
    });

    it('should return error bad request: same request payment_status pending at the same order id', async () => {
      payload = {
        ...payload,
        transaction_status: 'pending',
      };
      mockRedisService.getData.mockImplementation((params) => {
        if (params.key === `order-${payload.order_id}`) return 'pending';
      });
      mockMidtransService.getStatusPayment.mockResolvedValue(payload);
      const result = (await service.orderCallback(
        payload as TranscationNotifDto,
        {
          transactionid: 'test-transaction-id',
        },
      )) as CustomHttpException;
      expect(result.getStatus()).toBe(400);
    });

    it('should return error bad request: same request payment_status settlement at the same order id', async () => {
      payload = {
        ...payload,
        transaction_status: 'settlement',
      };
      mockRedisService.getData.mockImplementation((params) => {
        if (params.key === `order-${payload.order_id}`) return 'settlement';
      });
      mockMidtransService.getStatusPayment.mockResolvedValue(payload);
      const result = (await service.orderCallback(
        payload as TranscationNotifDto,
        {
          transactionid: 'test-transaction-id',
        },
      )) as CustomHttpException;
      expect(result.getStatus()).toBe(400);
    });

    it('should return error bad request: order not found in db', async () => {
      payload = {
        ...payload,
        transaction_status: 'pending',
      };
      mockMidtransService.getStatusPayment.mockResolvedValue(payload);
      mockGetOrderQuery = [];
      const result = (await service.orderCallback(
        payload as TranscationNotifDto,
        {
          transactionid: 'test-transaction-id',
        },
      )) as CustomHttpException;
      expect(result.getStatus()).toBe(400);
      mockGetOrderQuery = ResponseQueryGetOrderCallback;
    });

    it('should return error', async () => {
      mockMidtransService.getStatusPayment.mockRejectedValue(
        new Error('Internal midtrans error'),
      );
      try {
        await service.orderCallback(payload as TranscationNotifDto, {
          transactionid: 'test-transaction-id',
        });
      } catch (error) {
        expect(error.message).toBe('Internal midtrans error');
      }
    });
  });
});
