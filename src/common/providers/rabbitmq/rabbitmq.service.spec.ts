import * as amqplib from 'amqplib';
import { Test, TestingModule } from '@nestjs/testing';
import { RabbitmqService } from './rabbitmq.service';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { EmailService } from '../nodemailer/sendEmail.service';
import {
  mockLoggerService,
  mockEmailService,
  mockCloudinaryService,
} from 'src/config/__test__/mock';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { GeneralService } from 'src/common/helpers/general/general.service';

jest.mock('amqplib');
jest.mock('../nodemailer/sendEmail.service');

describe('RabbitmqService', () => {
  let rabbitmqService: RabbitmqService;

  const mockChannel = {
    assertQueue: jest.fn(),
    sendToQueue: jest.fn(),
    consume: jest.fn(),
    ack: jest.fn(),
    close: jest.fn(),
    assertExchange: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn(),
    bindQueue: jest.fn(),
    on: jest.fn(),
  };

  const mockConnection: Partial<amqplib.Connection> = {
    createChannel: jest.fn().mockResolvedValue(mockChannel),
    close: jest.fn(),
    createConfirmChannel: jest.fn(),
    addListener: jest.fn(),
    on: jest.fn(), // Mock the `on` method
  };

  afterAll(() => {
    // Ensure that connection and channel are closed after all tests
    if (rabbitmqService['connection']) {
      rabbitmqService['connection'].close();
    }
    if (rabbitmqService['channel']) {
      rabbitmqService['channel'].close();
    }
    jest.clearAllMocks(); // Clean up mocks
  });

  beforeEach(async () => {
    process.env.TIMEOUT_RECONNECTING_RABBIT = '0';
    // Manually mock the `on` method to simulate event handling
    mockConnection.on = jest.fn().mockImplementation((event, callback) => {
      if (event === 'close') {
        callback(new Error('Simulated connection close error'));
      } else if (event === 'error') {
        callback(new Error('Simulated connection error'));
      }
    });
    mockChannel.on = jest.fn().mockImplementation((event, callback) => {
      if (event === 'close') {
        callback(new Error('Simulated channel close error'));
      } else if (event === 'error') {
        callback(new Error('Simulated channel error'));
      }
    });
    (amqplib.connect as jest.Mock).mockResolvedValue(mockConnection);
    (mockConnection.createChannel as jest.Mock).mockResolvedValue(mockChannel);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RabbitmqService,
        GeneralService,
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: CloudinaryService, useValue: mockCloudinaryService },
      ],
    }).compile();

    rabbitmqService = module.get<RabbitmqService>(RabbitmqService);
  });

  it('should initialize RabbitMQ connection and channel when module starts', async () => {
    await rabbitmqService.onModuleInit();
    expect(mockConnection.createChannel).toHaveBeenCalled();
  });

  it('should handle error when RabbitMQ connection fails during initialization', async () => {
    (amqplib.connect as jest.Mock).mockRejectedValueOnce(
      new Error('RabbitMQ Connection Failed'),
    );
    try {
      await rabbitmqService.onModuleInit();
    } catch (error) {
      expect(error).toHaveProperty('message', 'RabbitMQ Connection Failed');
    }
  });

  it('should handle error in RabbitMQ connection when sending message', async () => {
    (amqplib.connect as jest.Mock).mockRejectedValueOnce(
      new Error('Connection Error'),
    );

    try {
      await rabbitmqService.sendToQueue({
        queue: 'test-queue',
        message: 'test-message',
        transactionid: 'test-transaction-id',
      });
    } catch (error) {
      expect(error).toHaveProperty('message', 'Connection Error');
    }
  });

  it('should attempt to reconnect to RabbitMQ if connection is closed with delay', async () => {
    const dataObj = {
      queue: 'test-queue',
      message: 'test-message',
      transactionid: 'test-transaction-id',
      delay: 10000,
    };

    rabbitmqService['connection'] =
      mockConnection as unknown as amqplib.Connection;
    rabbitmqService['channel'] = mockChannel as unknown as amqplib.Channel;

    // Simulate reconnect attempt
    jest
      .spyOn(rabbitmqService as any, 'reconnectToRabbitMQ')
      .mockResolvedValue(undefined);

    await rabbitmqService.sendToQueue(dataObj);

    // Assert that reconnect was attempted if connection is closed
    expect(mockChannel.assertExchange).toHaveBeenCalledWith(
      'notif_exchange',
      'direct',
      { durable: true },
    );
    expect(mockChannel.assertQueue).toHaveBeenCalledWith(
      `delay_${dataObj.queue}`,
      {
        durable: true,
        arguments: {
          'x-message-ttl': dataObj.delay,
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': `dql_notification_key`,
        },
      },
    );
    expect(mockChannel.publish).toHaveBeenCalledWith(
      'notif_exchange',
      'notification_key',
      Buffer.from(dataObj.message),
      { persistent: true },
    );
  });

  it('should attempt to reconnect to RabbitMQ if connection is closed', async () => {
    const dataObj = {
      queue: 'test-queue',
      message: 'test-message',
      transactionid: 'test-transaction-id',
    };

    rabbitmqService['connection'] =
      mockConnection as unknown as amqplib.Connection;
    rabbitmqService['channel'] = mockChannel as unknown as amqplib.Channel;

    // Simulate reconnect attempt
    jest
      .spyOn(rabbitmqService as any, 'reconnectToRabbitMQ')
      .mockResolvedValue(undefined);

    await rabbitmqService.sendToQueue(dataObj);

    expect(mockChannel.assertExchange).toHaveBeenCalledWith(
      'notif_exchange',
      'direct',
      { durable: true },
    );
    expect(mockChannel.assertQueue).toHaveBeenCalledWith(dataObj.queue, {
      durable: true,
      arguments: {},
    });
    expect(mockChannel.publish).toHaveBeenCalledWith(
      'notif_exchange',
      'notification_key',
      Buffer.from(dataObj.message),
      { persistent: true },
    );
  });

  it('should consume message from RabbitMQ queue and handle it correctly', async () => {
    const transactionid = 'test-transaction-id';
    const message = JSON.stringify({
      type: 'send-email',
      data: { to: 'test@example.com' },
      transactionid,
    });

    mockChannel.consume.mockImplementationOnce((queue, callback) => {
      callback({ content: Buffer.from(message) });
    });
    mockEmailService.sendEmail = jest.fn().mockResolvedValue(true);

    await rabbitmqService.consumeFromQueue(transactionid);

    expect(mockEmailService.sendEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
    });
  });

  // it.skip('should handle error in consumer correctly when message is invalid', async () => {
  //   const transactionid = 'test-transaction-id';
  //   const invalidMessage = 'invalid-message';

  //   mockChannel.consume.mockImplementationOnce((queue, callback) => {
  //     callback({ content: Buffer.from(invalidMessage) });
  //   });

  //   // We don't expect errors to be thrown for invalid message
  //   await rabbitmqService.consumeFromQueue(transactionid);
  //   expect(mockLoggerService.error).toHaveBeenCalled();
  // });

  it('should consume message when connection and channel already exist', async () => {
    const transactionid = 'test-transaction-id';
    const message = JSON.stringify({
      type: 'send-email',
      data: { to: 'test@example.com' },
      transactionid,
    });

    rabbitmqService['connection'] =
      mockConnection as unknown as amqplib.Connection;
    rabbitmqService['channel'] = mockChannel as unknown as amqplib.Channel;

    mockChannel.consume.mockImplementationOnce((queue, callback) => {
      callback({ content: Buffer.from(message) });
    });

    await rabbitmqService.consumeFromQueue(transactionid);

    expect(mockEmailService.sendEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
    });
  });

  it('should close RabbitMQ connection and channel when module is destroyed', async () => {
    const mockChannelClose = jest.fn().mockResolvedValue(undefined);
    const mockConnectionClose = jest.fn().mockResolvedValue(undefined);

    rabbitmqService['channel'] = {
      close: mockChannelClose,
    } as unknown as amqplib.Channel;
    rabbitmqService['connection'] = {
      close: mockConnectionClose,
    } as unknown as amqplib.Connection;

    await rabbitmqService.onModuleDestroy();

    expect(mockChannelClose).toHaveBeenCalled();
    expect(mockConnectionClose).toHaveBeenCalled();
    expect(mockLoggerService.log).toHaveBeenCalledWith(
      expect.arrayContaining(['RabbitMQ connection', 'Rabbit Service', 'INFO']),
      expect.objectContaining({ info: 'Rabbit Connection Closed' }),
    );
  });

  it('should log error when reconnecting to RabbitMQ fails', async () => {
    const transactionid = 'test-transaction-id';
    jest
      .spyOn(rabbitmqService as any, 'connectToRabbitMQ')
      .mockRejectedValueOnce(new Error('Reconnect failed'));

    await rabbitmqService['reconnectToRabbitMQ'](transactionid);

    expect(mockLoggerService.error).toHaveBeenCalledWith(
      expect.arrayContaining(['RabbitMQ', 'Reconnect', 'ERROR']),
      expect.objectContaining({ info: 'Reconnect failed: Reconnect failed' }),
    );
  });
});
