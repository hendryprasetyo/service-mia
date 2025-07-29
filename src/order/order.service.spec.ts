import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { GeneralService } from 'src/common/helpers/general/general.service';
import { DbService } from 'src/database/mysql/mysql.service';
import {
  mockDbService,
  mockHeaders,
  mockLoggerService,
  mockMidtransService,
  mockRabbitMQService,
  mockRedisService,
} from 'src/config/__test__/mock';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { RedisService } from 'src/database/redis/redis.service';
import { RabbitmqService } from 'src/common/providers/rabbitmq/rabbitmq.service';
import { MidtransService } from 'src/common/providers/midtrans/midtrans.service';
import { TestSetupModule } from 'src/config/test-setup.module';
import { EncryptionService } from 'src/common/helpers/encryption/encryption.service';
import { AuthRequest } from 'src/common/dtos/dto';
import {
  CancelOrderDto,
  GetDetailOrderResponse,
  GetOrderDetailDto,
  GetOrderListDto,
} from './order.dto';
import {
  ResponseQueryDetailOrder,
  ResponseQueryOrderList,
} from 'src/config/__test__/response/response';
import { CustomHttpException } from 'src/common/helpers/lib/exception';

describe('OrderService', () => {
  let service: OrderService;
  let request: AuthRequest;
  let payload: CancelOrderDto | GetOrderDetailDto | GetOrderListDto;
  let mockResponseQueryOrderList = ResponseQueryOrderList;
  let mockCountPlaces = [{ total: 2 }];
  let mockResponseQueryDetailOrder = ResponseQueryDetailOrder;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      providers: [
        OrderService,
        GeneralService,
        EncryptionService,
        { provide: DbService, useValue: mockDbService },
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: RabbitmqService, useValue: mockRabbitMQService },
        { provide: MidtransService, useValue: mockMidtransService },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  describe('getOrderList', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'SELLER' },
      } as AuthRequest;
      payload = {
        search: 'Bromo',
        page: '1',
        limit: '20',
        status: 'INPROGRESS',
      } as GetOrderListDto;
      mockRedisService.getSrandmember.mockResolvedValue(['unique-id']);
      mockDbService.executeRawQuery.mockImplementation(({ logName }) => {
        if (logName === 'GET ORDER LIST') return mockResponseQueryOrderList;
        if (logName === 'GET TOTAL ORDER') return mockCountPlaces;
      });
    });

    it('Should return success', async () => {
      const response = await service.getOrderList(
        request,
        mockHeaders,
        payload as GetOrderListDto,
      );

      expect(response).toBeDefined();
    });

    it('Should return success: with different price_before_discount', async () => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'USER' },
      } as AuthRequest;
      payload = {
        page: '1',
      } as GetOrderListDto;
      mockResponseQueryOrderList = ResponseQueryOrderList.map((item) => {
        return {
          ...item,
          altitude: null,
          price_before_discount: 600000,
        };
      });
      mockCountPlaces = [{ total: 0 }];
      const response = await service.getOrderList(
        request,
        mockHeaders,
        payload as GetOrderListDto,
      );

      expect(response).toBeDefined();
    });

    it('Should return 400 : max limit', async () => {
      process.env.MAX_LIMIT_QUERY_ORDER_LIST = '';
      payload = {
        limit: '30',
      } as GetOrderListDto;
      const response = (await service.getOrderList(
        request,
        mockHeaders,
        payload as GetOrderListDto,
      )) as CustomHttpException;

      expect(response.getStatus()).toBe(400);
      process.env.MAX_LIMIT_QUERY_ORDER_LIST = '20';
    });

    it('Should return error DB', async () => {
      mockDbService.executeRawQuery.mockRejectedValue(
        new Error('Error syntax'),
      );
      try {
        await service.getOrderList(
          request,
          mockHeaders,
          payload as GetOrderListDto,
        );
      } catch (error) {
        expect(error.message).toBe('Error syntax');
      }
    });
  });

  describe('getDetailOrder', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'USER' },
      } as AuthRequest;
      payload = {
        orderId:
          '7138dc22e0b76c74bbb77dde32ca6add3f7776d0a12d102404b3cc4c0b7645d2bc8941b192f3aaf832272adcdf5a58baf9e28712044e82',
      };
      mockDbService.executeRawQuery.mockImplementation((params) => {
        if (params.logName === 'GET ORDER DETAIL')
          return mockResponseQueryDetailOrder;
      });
    });

    it('Should return success', async () => {
      const result = (await service.getDetailOrder(
        request,
        mockHeaders,
        payload as CancelOrderDto,
      )) as GetDetailOrderResponse;
      expect(result.no_order).toBeDefined();
    });

    it('Should return success : reservation date and vouchers null', async () => {
      mockResponseQueryDetailOrder = ResponseQueryDetailOrder.map((item) => {
        delete item.vouchers;
        return {
          ...item,
          start_reservation: null,
          payment_method: 'shopeepay',
        };
      });
      const result = (await service.getDetailOrder(
        request,
        { ...mockHeaders, language: 'en' },
        payload as CancelOrderDto,
      )) as GetDetailOrderResponse;
      expect(result.no_order).toBeDefined();
      mockResponseQueryDetailOrder = ResponseQueryDetailOrder;
    });

    it('Should return success : COMPLETED', async () => {
      mockResponseQueryDetailOrder = ResponseQueryDetailOrder.map((item) => {
        delete item.vouchers;
        return {
          ...item,
          payment_method: 'gopay',
          status: 'COMPLETED',
        };
      });
      const result = (await service.getDetailOrder(
        request,
        mockHeaders,
        payload as CancelOrderDto,
      )) as GetDetailOrderResponse;
      expect(result.no_order).toBeDefined();
      mockResponseQueryDetailOrder = ResponseQueryDetailOrder;
    });

    it('Should return Bad Request : order not found', async () => {
      mockResponseQueryDetailOrder = [];
      const result = (await service.getDetailOrder(
        request,
        mockHeaders,
        payload as CancelOrderDto,
      )) as CustomHttpException;
      expect(result.getStatus()).toBe(400);
      mockResponseQueryDetailOrder = ResponseQueryDetailOrder;
    });

    it('Should return error DB', async () => {
      mockDbService.executeRawQuery.mockRejectedValue(
        new Error('Error syntax'),
      );
      try {
        await service.getDetailOrder(
          request,
          mockHeaders,
          payload as CancelOrderDto,
        );
      } catch (error) {
        expect(error.message).toBe('Error syntax');
      }
    });
  });

  describe('cancel order', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'USER' },
      } as AuthRequest;
      payload = {
        orderId:
          '7138dc22e0b76c74bbb77dde32ca6add3f7776d0a12d102404b3cc4c0b7645d2bc8941b192f3aaf832272adcdf5a58baf9e28712044e82',
      };
      mockDbService.executeRawQuery.mockImplementation((params) => {
        if (params.logName === 'GET ORDER FOR CANCEL')
          return [{ order_id: 'order id' }];
      });
      mockMidtransService.cancelPayment.mockResolvedValue('success');
    });

    it('Should return success', async () => {
      await service.cancelOrder(
        request,
        mockHeaders,
        payload as CancelOrderDto,
      );
    });

    it('Should return bad request: order notfound', async () => {
      mockDbService.executeRawQuery.mockImplementation((params) => {
        if (params.logName === 'GET ORDER FOR CANCEL') return [];
      });
      const result = (await service.cancelOrder(
        request,
        mockHeaders,
        payload as CancelOrderDto,
      )) as CustomHttpException;
      expect(result.getStatus()).toBe(400);
    });

    it('Should return error DB', async () => {
      mockDbService.executeRawQuery.mockRejectedValue(
        new Error('Error syntax'),
      );
      try {
        await service.cancelOrder(
          request,
          mockHeaders,
          payload as CancelOrderDto,
        );
      } catch (error) {
        expect(error.message).toBe('Error syntax');
      }
    });
  });
});
