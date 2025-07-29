import * as Path from 'path';
import * as Moment from 'moment';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { GeneralService } from 'src/common/helpers/general/general.service';
import { TestSetupModule } from 'src/config/test-setup.module';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import {
  mockDbService,
  mockHeaders,
  mockLoggerService,
  MockPaymentConfig,
  MockPaymentMethodConfig,
} from 'src/config/__test__/mock';
import { EncryptionService } from 'src/common/helpers/encryption/encryption.service';
import {
  PaymentConfigDto,
  PaymentMethodListDto,
} from 'src/common/dtos/paymentMethod.dto';
import { FulfillmentDto } from './payment.dto';
import { CustomHttpException } from 'src/common/helpers/lib/exception';
import { ResponseMidtrans } from 'src/config/__test__/response/response';
import { AuthRequest } from 'src/common/dtos/dto';
import { DbService } from 'src/database/mysql/mysql.service';
import { PaymentRepository } from './payment.repository';
const PAYMENT_METHOD_PATH = Path.join(
  __dirname,
  '../../assets/paymentMethod.json',
);
const PAYMENT_CONFIG_PATH = Path.join(
  __dirname,
  '../../assets/paymentConfig.json',
);
describe('PaymentService', () => {
  let service: PaymentService;
  let generalService: GeneralService;
  let encryptionService: EncryptionService;
  let payload: FulfillmentDto;
  let request: AuthRequest;

  const MockResponseVoucher = [
    {
      name: 'EIGE6KB18',
      code: 'EIGE6KB18',
      value: 50,
      type: 'percentage',
      using_type: 'disposable',
      source: 'mia',
    },
    {
      name: 'EIGE6KB12',
      code: 'EIGE6KB12',
      value: 2000,
      type: 'price',
      using_type: 'disposable',
      source: 'merchant',
    },
  ];
  let mockResponseVoucher = MockResponseVoucher;

  const mockPaymentRepository = {
    ProcessFulfillment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      providers: [
        PaymentService,
        GeneralService,
        EncryptionService,
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
        { provide: DbService, useValue: mockDbService },
        { provide: PaymentRepository, useValue: mockPaymentRepository },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    generalService = module.get<GeneralService>(GeneralService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
  });
  afterEach(() => {
    jest.restoreAllMocks(); // Reset semua spy/mocks
    jest.clearAllMocks(); // Bersihkan call history dll
  });

  describe('Payment List', () => {
    it('should return success with all filtering lang id', async () => {
      jest
        .spyOn(generalService, 'readFromFile')
        .mockImplementation((filePath) => {
          if (filePath === PAYMENT_METHOD_PATH) {
            return Promise.resolve(
              MockPaymentMethodConfig.map((el) => {
                if (el.payment_type === 'bank_transfer') {
                  el.enable = false;
                }
                if (el.payment_type === 'gopay') {
                  el.exlude_app_version = ['1.0.0'];
                }
                if (el.payment_type === 'echannel') {
                  el.platform = ['ANDROID'];
                }
                return el;
              }),
            );
          }
          if (filePath === PAYMENT_CONFIG_PATH) {
            return Promise.resolve(MockPaymentConfig);
          }
          return Promise.reject(new Error('File not found'));
        });
      const result = await service.paymentList({
        ...mockHeaders,
        channelid: 'mobile',
        'wildbook-version': '1.0.0',
      });
      expect(result).toBeDefined();
    });

    it('should return success with all filtering lang en', async () => {
      jest
        .spyOn(generalService, 'readFromFile')
        .mockImplementation((filePath) => {
          if (filePath === PAYMENT_METHOD_PATH) {
            return Promise.resolve(
              MockPaymentMethodConfig.map((el) => {
                if (el.payment_type === 'bank_transfer') {
                  el.enable = false;
                }
                if (el.payment_type === 'gopay') {
                  el.exlude_app_version = ['1.0.0'];
                }
                if (el.payment_type === 'echannel') {
                  el.platform = ['ANDROID'];
                }
                return el;
              }),
            );
          }
          if (filePath === PAYMENT_CONFIG_PATH) {
            return Promise.resolve(MockPaymentConfig);
          }
          return Promise.reject(new Error('File not found'));
        });
      const result = await service.paymentList({
        ...mockHeaders,
        language: 'en',
      });
      expect(result).toBeDefined();
    });

    it('should sort is_primary', async () => {
      const mockServiceFee = {
        value: '20000',
        type: 'IDR',
        discount: 20,
        discount_type: 'percentage',
      };
      jest
        .spyOn(generalService, 'readFromFile')
        .mockImplementation((filePath) => {
          if (filePath === PAYMENT_METHOD_PATH) {
            return Promise.resolve(
              MockPaymentMethodConfig.map((el) => {
                if (el.payment_type === 'gopay') {
                  el.is_primary = true;
                  el.category = 'e-wallet';
                  el.category_display = 'E-Wallet';
                } else if (el.payment_type === 'ovo') {
                  el.is_primary = true;
                  el.category = 'e-wallet';
                  el.category_display = 'E-Wallet';
                } else if (el.payment_type === 'bank_transfer') {
                  el.is_primary = true;
                }
                el.enable = true;
                el.platform = ['ANDROID'];
                return el;
              }),
            );
          }
          if (filePath === PAYMENT_CONFIG_PATH) {
            return Promise.resolve({
              ...MockPaymentConfig,
              admin_fee: mockServiceFee,
            });
          }
          return Promise.reject(new Error('File not found'));
        });

      await service.paymentList({
        ...mockHeaders,
        language: 'id',
        platform: 'ANDROID',
        channelid: 'web',
      });
    });

    it('should return Error', async () => {
      jest
        .spyOn(generalService, 'readFromFile')
        .mockRejectedValue(new Error('error reading file'));
      try {
        await service.paymentList(mockHeaders);
      } catch (error) {
        expect(error.message).toBe('error reading file');
      }
    });
  });

  describe('Payment Fulfillment', () => {
    beforeEach(async () => {
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
                  voucherCode: 'EIGE6KB12',
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
      await Promise.all([
        generalService.readFromFile<PaymentMethodListDto[]>(
          PAYMENT_METHOD_PATH,
        ),
        generalService.readFromFile<PaymentConfigDto>(PAYMENT_CONFIG_PATH),
      ]);
      mockDbService.executeRawQuery.mockImplementation((params) => {
        if (params.logName === 'GET USER BLACKLIST') return [];
        if (params.logName === 'GET VOUCHER') return mockResponseVoucher;
      });
    });

    it('should return success: payment type bank_transfer channel WEB', async () => {
      mockPaymentRepository.ProcessFulfillment.mockResolvedValue(
        ResponseMidtrans[payload.bank],
      );
      const result = await service.fulfillment(
        request,
        payload as FulfillmentDto,
        mockHeaders,
      );
      expect(result.order_id).toBeDefined();
      expect(result.payment_type).toBeDefined();
    });

    it('should return success: payment type qris channel WEB', async () => {
      payload = {
        ...payload,
        paymentType: 'qris',
        callbackUrl: 'asd',
      };
      mockPaymentRepository.ProcessFulfillment.mockResolvedValue(
        ResponseMidtrans[payload.bank],
      );
      const result = await service.fulfillment(
        request,
        payload as FulfillmentDto,
        mockHeaders,
      );
      expect(result.order_id).toBeDefined();
      expect(result.payment_type).toBeDefined();
    });

    it('should return success: payment type shopeepay channel WEB', async () => {
      payload = {
        ...payload,
        paymentType: 'shopeepay',
        callbackUrl: 'asd',
      };

      mockPaymentRepository.ProcessFulfillment.mockResolvedValue(
        ResponseMidtrans[payload.bank],
      );

      const result = await service.fulfillment(request, payload, mockHeaders);
      expect(result.order_id).toBeDefined();
      expect(result.payment_type).toBeDefined();
    });

    it('should return success: payment type echannel channel WEB', async () => {
      payload = {
        ...payload,
        paymentType: 'echannel',
        callbackUrl: 'asd',
      };
      mockPaymentRepository.ProcessFulfillment.mockResolvedValue(
        ResponseMidtrans[payload.bank],
      );

      const result = await service.fulfillment(
        request,
        payload as FulfillmentDto,
        mockHeaders,
      );
      expect(result.order_id).toBeDefined();
      expect(result.payment_type).toBeDefined();
    });

    it('should return success: payment type gopay channel Mobile', async () => {
      payload = {
        ...payload,
        paymentType: 'gopay',
        callbackUrl: 'asd',
      };
      mockResponseVoucher = MockResponseVoucher.map((item) => ({
        ...item,
        type: 'price',
        value: 5000,
      }));
      mockPaymentRepository.ProcessFulfillment.mockResolvedValue(
        ResponseMidtrans[payload.bank],
      );

      const result = await service.fulfillment(
        request,
        payload as FulfillmentDto,
        {
          ...mockHeaders,
          channelid: 'mobile',
        },
      );
      expect(result.order_id).toBeDefined();
      expect(result.payment_type).toBeDefined();
    });

    it('should return success: payment type ots ', async () => {
      payload = {
        ...payload,
        paymentType: 'ots',
      };
      mockPaymentRepository.ProcessFulfillment.mockResolvedValue(
        ResponseMidtrans[payload.bank],
      );

      const result = await service.fulfillment(request, payload, mockHeaders);
      expect(result.order_id).toBeDefined();
      expect(result.payment_type).toBeDefined();
    });

    it('should return Bad Request: payment type bank_transfer disable', async () => {
      const paymentMethod =
        await generalService.readFromFile<PaymentMethodListDto[]>(
          PAYMENT_METHOD_PATH,
        );
      jest.spyOn(generalService, 'readFromFile').mockResolvedValue(
        paymentMethod.map((el) => {
          if (el.payment_type === 'bank_transfer') {
            el.enable = false;
          }
          return el;
        }),
      );
      const result = (await service.fulfillment(
        request,
        payload as FulfillmentDto,
        mockHeaders,
      )) as CustomHttpException;
      expect(result.getStatus()).toBe(400);
    });

    it('should return Bad Request: Invalid Voucher', async () => {
      mockResponseVoucher = [];
      payload = {
        ...payload,
        orderDetail: {
          ...payload.orderDetail,
          orderSubType: 'CP',
        },
      };
      const result = (await service.fulfillment(
        request,
        payload as FulfillmentDto,
        mockHeaders,
      )) as CustomHttpException;
      expect(result.getStatus()).toBe(400);
      expect(result.message).toBe('Invalid Voucher');
      mockResponseVoucher = MockResponseVoucher;
    });

    it('should return Bad Request: Invalid Order Payload if orderType RESERVATION and orderSubtype GN : item id not match', async () => {
      payload = {
        ...payload,
        orderDetail: {
          ...payload.orderDetail,
          selectedOrderIds: [
            {
              shopId:
                'd1cd0cdebb8c1390fcd401c7303066f6a61ed40d92697956afda49c3a01e5c7445daf5b40bbdfe0c1f7a6ed04e6a8feb',
              itemBriefs: [
                {
                  itemId:
                    'd1cd0cdebb8c1390fcd401c7303066f6a61ed40d92697956afda49c3a01e5c7434cd6ae539192af3662900313790474e',
                  quantity: 1,
                  members: [
                    {
                      firstName: 'jhon',
                      email: 'hendtry95@gmail.com',
                      phoneNumber: '123123123',
                      noIdentifier: 'test_1',
                      gender: 'female',
                      typeIdentifier: 'ktp',
                      birthday: '10-01-2004',
                    },
                  ],
                },
                {
                  itemId: encryptionService.encryptEntityID('invalid'),
                  quantity: 1,
                  members: [
                    {
                      firstName: 'jhon',
                      email: 'hendtry95@gmail.com',
                      phoneNumber: '123123123',
                      noIdentifier: 'test_1',
                      gender: 'female',
                      birthday: '10-01-2004',
                      typeIdentifier: 'ktp',
                    },
                  ],
                },
              ],
              shopVouchers: [
                {
                  voucherCode: 'EIGE6KB18',
                },
              ],
            },
          ],
        },
      };
      const result = (await service.fulfillment(
        request,
        payload,
        mockHeaders,
      )) as CustomHttpException;
      expect(result.getStatus()).toBe(400);
    });

    it('should return Bad Request: User blacklist', async () => {
      mockDbService.executeRawQuery.mockImplementation((params) => {
        if (params.logName === 'GET USER BLACKLIST')
          return [
            {
              start_date: Moment().subtract(1, 'days').valueOf().toString(),
              end_date: Moment().add(2, 'days').valueOf().toString(),
            },
          ];
      });
      const result = (await service.fulfillment(
        request,
        payload,
        mockHeaders,
      )) as CustomHttpException;
      expect(result.getStatus()).toBe(400);
    });

    it('should return Internal server Error: seller not found', async () => {
      mockPaymentRepository.ProcessFulfillment.mockRejectedValue({
        code: 'ER_NO_REFERENCED_ROW_2',
        errno: 1452,
      });
      const result = (await service.fulfillment(
        request,
        payload,
        mockHeaders,
      )) as CustomHttpException;
      expect(result.getStatus()).toBe(400);
    });

    it('should return Internal server Error: Midtrans Issue', async () => {
      mockDbService.executeRawQuery.mockImplementation((params) => {
        if (params.logName === 'GET USER BLACKLIST')
          throw new Error('Internal midtrans error');
      });
      try {
        await service.fulfillment(
          request,
          payload as FulfillmentDto,
          mockHeaders,
        );
      } catch (error) {
        expect(error.message).toBe('Internal midtrans error');
      }
    });
  });
});
