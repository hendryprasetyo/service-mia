import { Test, TestingModule } from '@nestjs/testing';
import { MidtransService } from './midtrans.service';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { GeneralService } from 'src/common/helpers/general/general.service';
import { MidtransGetStatusDTO, TPayloadMidtrans } from './midtrans.dto';
import {
  mockGeneralService,
  mockLoggerService,
} from 'src/config/__test__/mock';

describe('MidtransService', () => {
  let service: MidtransService;
  let payload: TPayloadMidtrans | MidtransGetStatusDTO;
  const transactionid = 'transaction-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MidtransService,
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
        { provide: GeneralService, useValue: mockGeneralService },
      ],
    }).compile();

    service = module.get<MidtransService>(MidtransService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Reset mocks after each test
  });

  describe('charge', () => {
    beforeEach(() => {
      payload = {
        payment_type: 'bank_transfer',
        transaction_details: {
          gross_amount: 1000000,
          order_id: 'order-id',
        },
        custom_expiry: {
          expiry_duration: 20,
          order_time: 'now',
          unit: 'menit',
        },
        item_details: [
          {
            id: 'unique',
            shopId: null,
            name: 'item name',
            price: 100000,
            quantity: 1,
          },
        ],
        customer_details: {
          email: 'jhon@gmail.com',
          first_name: 'jhon',
          phone: '08888882222',
          last_name: 'doe',
        },
      };
    });
    it('should successfully charge and log the response', async () => {
      const mockResponse = {
        status_code: '200',
        status_message: 'Success',
        transaction_id: transactionid,
      };

      mockGeneralService.callAPI.mockResolvedValue(mockResponse);
      const result = await service.charge(
        payload as TPayloadMidtrans,
        transactionid,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should error charge', async () => {
      mockGeneralService.callAPI.mockRejectedValue(
        new Error('Internal midtrans error'),
      );
      try {
        await service.charge(payload as TPayloadMidtrans, transactionid);
      } catch (error) {
        expect(error.message).toBe('Internal midtrans error');
      }
    });
  });

  describe('getStatusPayment', () => {
    beforeEach(() => {
      payload = {
        order_id: 'string',
      };
    });
    it('should successfully get status payment', async () => {
      const mockResponse = {
        status_code: '200',
        status_message: 'Success',
        transaction_status: 'pending',
        transaction_id: transactionid,
      };

      mockGeneralService.callAPI.mockResolvedValue(mockResponse);
      const result = await service.getStatusPayment(
        payload as MidtransGetStatusDTO,
        transactionid,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should error get status payment', async () => {
      mockGeneralService.callAPI.mockRejectedValue(
        new Error('Internal midtrans error'),
      );
      try {
        await service.getStatusPayment(
          payload as MidtransGetStatusDTO,
          transactionid,
        );
      } catch (error) {
        expect(error.message).toBe('Internal midtrans error');
      }
    });
  });

  describe('cancelPayment', () => {
    beforeEach(() => {
      payload = {
        order_id: 'string',
      };
    });
    it('should successfully cancel payment', async () => {
      const mockResponse = {
        status_code: '200',
        status_message: 'Success',
        transaction_status: 'cancel',
        transaction_id: transactionid,
      };

      mockGeneralService.callAPI.mockResolvedValue(mockResponse);
      const result = await service.cancelPayment(
        payload as MidtransGetStatusDTO,
        transactionid,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should error cancel payment', async () => {
      mockGeneralService.callAPI.mockRejectedValue(
        new Error('Internal midtrans error'),
      );
      try {
        await service.cancelPayment(
          payload as MidtransGetStatusDTO,
          transactionid,
        );
      } catch (error) {
        expect(error.message).toBe('Internal midtrans error');
      }
    });
  });
});
