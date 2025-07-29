import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { TestSetupModule } from 'src/config/test-setup.module';
import { mockHeaders, mockLoggerService } from 'src/config/__test__/mock';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { AuthGuard } from 'src/authentication/authentication.guard';
import { RolesGuard } from 'src/authentication/role.guard';
import { AuthRequest } from 'src/common/dtos/dto';
import {
  CancelOrderDto,
  GetOrderDetailDto,
  GetOrderListDto,
} from './order.dto';

describe('OrderController', () => {
  let controller: OrderController;
  let request: AuthRequest;
  let payload: CancelOrderDto | GetOrderDetailDto | GetOrderListDto;

  const mockOrderService = {
    getDetailOrder: jest.fn(),
    cancelOrder: jest.fn(),
    getOrderList: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      controllers: [OrderController],
      providers: [
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
        { provide: OrderService, useValue: mockOrderService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<OrderController>(OrderController);
  });

  describe('Get Order List', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'SELLER' },
      } as AuthRequest;
      payload = {
        page: '1',
        limit: '1',
      } as GetOrderListDto;
    });

    it('should successfully get detail order', async () => {
      mockOrderService.getOrderList.mockResolvedValue({});
      const response = await controller.getOrderList(
        request,
        mockHeaders,
        payload as GetOrderListDto,
      );

      expect(response).toEqual({});
    });

    it('should return error get Detail order', async () => {
      const expectedResponse = 'Order Service Error';
      mockOrderService.getOrderList.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.getOrderList(
          request,
          mockHeaders,
          payload as GetOrderListDto,
        );
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });

  describe('Get Detail Order', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'USER' },
      } as AuthRequest;
      payload = {
        orderId:
          '7138dc22e0b76c74bbb77dde32ca6add3f7776d0a12d102404b3cc4c0b7645d2bc8941b192f3aaf832272adcdf5a58baf9e28712044e82',
      };
    });

    it('should successfully get detail order', async () => {
      mockOrderService.getDetailOrder.mockResolvedValue({});
      const response = await controller.getDetailOrder(
        request,
        mockHeaders,
        payload as GetOrderDetailDto,
      );

      expect(response).toEqual({});
    });

    it('should return error get Detail order', async () => {
      const expectedResponse = 'Order Service Error';
      mockOrderService.getDetailOrder.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.getDetailOrder(
          request,
          mockHeaders,
          payload as GetOrderDetailDto,
        );
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });

  describe('Cancel Order', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'USER' },
      } as AuthRequest;
      payload = {
        orderId:
          '7138dc22e0b76c74bbb77dde32ca6add3f7776d0a12d102404b3cc4c0b7645d2bc8941b192f3aaf832272adcdf5a58baf9e28712044e82',
      };
    });

    it('should successfully cancel order', async () => {
      mockOrderService.cancelOrder.mockResolvedValue({});
      const response = await controller.cancelOrder(
        request,
        mockHeaders,
        payload as CancelOrderDto,
      );

      expect(response).toEqual({});
    });

    it('should return error cancel order', async () => {
      const expectedResponse = 'Order Service Error';
      mockOrderService.cancelOrder.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.cancelOrder(
          request,
          mockHeaders,
          payload as CancelOrderDto,
        );
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });
});
