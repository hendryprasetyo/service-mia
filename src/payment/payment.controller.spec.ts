import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { TestSetupModule } from 'src/config/test-setup.module';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { mockHeaders, mockLoggerService } from 'src/config/__test__/mock';
import { AuthGuard } from 'src/authentication/authentication.guard';
import { RolesGuard } from 'src/authentication/role.guard';
import { FulfillmentDto } from './payment.dto';
import { AuthRequest } from 'src/common/dtos/dto';

describe('PaymentController', () => {
  let controller: PaymentController;
  let payload: FulfillmentDto;
  let request: AuthRequest;
  const mockPaymentService = {
    paymentList: jest.fn(),
    fulfillment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      controllers: [PaymentController],
      providers: [
        { provide: PaymentService, useValue: mockPaymentService },
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<PaymentController>(PaymentController);
  });

  describe('GET Payment List', () => {
    it('should successfully get payment list', async () => {
      mockPaymentService.paymentList.mockResolvedValue([]);

      const response = await controller.paymentList(mockHeaders);

      expect(response).toEqual([]);
      expect(mockPaymentService.paymentList).toHaveBeenCalledWith(mockHeaders);
    });

    it('should return error get payment list', async () => {
      const expectedResponse = 'Payment Service Error';
      mockPaymentService.paymentList.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.paymentList(mockHeaders);
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
        expect(mockPaymentService.paymentList).toHaveBeenCalledWith(
          mockHeaders,
        );
      }
    });
  });

  describe('Payment Fulfillment', () => {
    beforeEach(() => {
      request = {
        auth: { id: 'unique-user-id', exp: 123, iat: 123, role: 'USER' },
      } as AuthRequest;
      payload = {
        paymentType: 'bank_transfer',
        bank: 'bca',
        useCoin: false,
        customerInfo: {
          firstName: 'jhon',
          email: 'hendtry95@gmail.com',
          phoneNumber: '123123123',
        },
        orderDetail: {
          orderType: 'RESERVATION',
          orderSubType: 'GN',
          startTime: '1737640256000',
          endTime: '1737726656000',
          selectedOrderIds: [
            {
              shopId:
                'd1cd0cdebb8c1390fcd401c7303066f6a61ed40d92697956afda49c3a01e5c7445daf5b40bbdfe0c1f7a6ed04e6a8feb',
              itemBriefs: [
                {
                  itemId:
                    'd1cd0cdebb8c1390fcd401c7303066f6a61ed40d92697956afda49c3a01e5c7434cd6ae539192af3662900313790474e',
                  quantity: 2,
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
                      gender: 'female',
                      birthday: '10-01-2004',
                      typeIdentifier: 'ktp',
                    },
                  ],
                  basecampId: 'unique-id',
                },
              ],
              shopVouchers: [
                {
                  voucherCode: 'EIGE6KB18',
                },
              ],
            },
          ],
          vouchers: [
            {
              voucherCode: 'EIGE6KB18',
            },
          ],
        },
      };
    });

    it('should successfully fulfillment', async () => {
      mockPaymentService.fulfillment.mockResolvedValue({});

      const response = await controller.fulfillment(
        request,
        payload,
        mockHeaders,
      );

      expect(response).toEqual({});
    });

    it('should return error fulfillment', async () => {
      const expectedResponse = 'Payment Service Error';
      mockPaymentService.fulfillment.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.fulfillment(request, payload, mockHeaders);
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });
});
