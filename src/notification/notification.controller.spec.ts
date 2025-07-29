import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { TestSetupModule } from 'src/config/test-setup.module';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { mockLoggerService } from 'src/config/__test__/mock';
import { TranscationNotifDto } from './notification.dto';

describe('NotificationController', () => {
  let controller: NotificationController;
  let payload: TranscationNotifDto;

  const mockNotificationService = {
    orderCallback: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      controllers: [NotificationController],
      providers: [
        { provide: NotificationService, useValue: mockNotificationService },
        {
          provide: LoggerServiceImplementation,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
  });

  describe('Notification payment callback', () => {
    beforeEach(() => {
      payload = {
        transaction_time: '2024-12-20 16:33:33',
        transaction_status: 'pending',
        transaction_id: 'afc310d6-28e8-48ff-92a0-c4f37cac5556',
        status_message: 'midtrans payment notification',
        status_code: '201',
        signature_key:
          '81dbc6b3df22211f4332d48a627fa5fc186406f6edb76177c75913aa32a2cca2af1bae2bd907a91b46cf94c1444221b5e83398cc1285d5c13d0e7b5086bbaa20',
        reference_id: 'A120241220093333F2S3LFWvSYID-1',
        payment_type: 'shopeepay',
        order_id: 'GNC11734687213799ZHILAL',
        merchant_id: 'G583217098',
        gross_amount: '275000.00',
        fraud_status: 'accept',
        expiry_time: '2024-12-20 17:03:33',
        currency: 'IDR',
      };
    });
    it('should successfully send notif', async () => {
      mockNotificationService.orderCallback.mockResolvedValue({});
      const response = await controller.orderCallback(payload, {
        transactionid: 'test-transaction-id',
      });
      expect(response).toEqual({});
    });

    it('should return error get payment list', async () => {
      const expectedResponse = 'Payment Service Error';
      mockNotificationService.orderCallback.mockRejectedValue(
        new Error(expectedResponse),
      );
      try {
        await controller.orderCallback(payload, {
          transactionid: 'test-transaction-id',
        });
      } catch (error) {
        expect(error.message).toEqual(expectedResponse);
      }
    });
  });
});
