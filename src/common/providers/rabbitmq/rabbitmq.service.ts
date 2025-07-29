import * as amqplib from 'amqplib';
import * as Path from 'path';
import lib from 'src/common/helpers/lib/lib.service';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { EmailService } from '../nodemailer/sendEmail.service';
import { GeneralService } from 'src/common/helpers/general/general.service';
import {
  TExchangeConfig,
  TQueueConfigWrapper,
  TRequestMessageRabbit,
} from './rabbitmq.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
const RABBIT_CONFIG_PATH = Path.join(
  __dirname,
  '../../../../assets/rabbitConfig.json',
);

@Injectable()
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
  private connection: amqplib.Connection;
  private channel: amqplib.Channel;
  private isConnectionClosed: boolean = true;
  private reconnectTimes: boolean = false;
  private isChannelClosed: boolean = true;
  private readonly rabbitMqUrl = process.env.RABBIT_MQ;
  private readonly exchangeName = 'notif_exchange';
  private readonly exchangeType = 'direct';
  private readonly notificationRouteKey = 'notification_key';

  constructor(
    private readonly logger: LoggerServiceImplementation,
    private readonly generalService: GeneralService,
    private readonly emailService: EmailService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private async connectToRabbitMQ(transactionid: string) {
    try {
      if (this.isConnectionClosed) {
        this.connection = await amqplib.connect(this.rabbitMqUrl);
        this.connection.on('close', (err) => {
          this.isConnectionClosed = true;
          this.reconnectTimes = true;
          this.logger.error(
            ['RabbitMQ Connection', 'Rabbit Service', 'ERROR'],
            {
              info: JSON.stringify(err),
              messagaes: 'RabbitMQ connection closed unexpectedly',
              transactionid,
            },
          );
        });
        this.connection.on('error', (err) => {
          this.logger.error(
            ['RabbitMQ Connection', 'Rabbit Service', 'ERROR'],
            {
              info: JSON.stringify(err),
              messages: err.message,
              transactionid,
            },
          );
        });
        this.isConnectionClosed = false;
      }

      if (this.isChannelClosed) {
        this.channel = await this.connection.createChannel();
        this.channel.on('close', () => {
          this.isChannelClosed = true;
          this.reconnectTimes = true;
          this.logger.error(['RabbitMQ Channel', 'Rabbit Service', 'ERROR'], {
            info: 'RabbitMQ channel closed unexpectedly',
            transactionid,
          });
        });
        this.channel.on('error', (err) => {
          this.logger.error(['RabbitMQ Channel', 'Rabbit Service', 'ERROR'], {
            info: JSON.stringify(err),
            messages: err.message,
            transactionid,
          });
        });
        this.isChannelClosed = false;
      }
      if (this.reconnectTimes) {
        setTimeout(async () => {
          await this.reconnectToRabbitMQ(transactionid);
          this.reconnectTimes = false;
        }, +process.env.TIMEOUT_RECONNECTING_RABBIT);
      }
      this.logger.log(['RabbitMQ Init', 'Rabbit Service', 'INFO'], {
        info: 'Init Rabbit Successfully',
        reconnectTimes: this.reconnectTimes,
        transactionid,
      });
    } catch (error) {
      this.logger.error(['RabbitMQ Connection', 'Rabbit Service', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        transactionid,
      });
      throw {
        isHelperFail: true,
        message: error.message,
        data: {
          status: 500,
          status_code: '00500',
          status_desc: 'Internal Server Error',
        },
      };
    }
  }

  private async setupExchangesAndBindings(
    queue: string,
    exchanges: TExchangeConfig[],
    transactionid: string,
    timeStart: [number, number],
  ): Promise<void> {
    for (const exchange of exchanges) {
      try {
        // Ensure the exchange exists
        await this.channel.assertExchange(exchange.name, 'direct', {
          durable: true,
        });

        // Bind the queue to the exchange with routing key
        await this.channel.bindQueue(queue, exchange.name, exchange.routeKey);
        const timeDiff = process.hrtime(timeStart);
        const timeTaken = Math.round((timeDiff[0] * 1e9 + timeDiff[1]) / 1e6);
        this.logger.log(
          ['Consumer RabbitMQ - SETUP EXC & BND', 'Rabbit Service', 'INFO'],
          {
            info: `Queue ${queue} bound to exchange ${exchange.name} with routing key ${exchange.routeKey}`,
            timeTaken,
            transactionid,
          },
        );
      } catch (err) {
        if (err?.code === 404 && err?.message?.includes('no exchange')) {
          this.logger.error(['Consumer RabbitMQ', 'Rabbit Service', 'ERROR'], {
            info: `Exchange ${exchange.name} not found. Skipping binding.`,
            transactionid,
          });
        } else {
          throw err;
        }
      }
    }
  }

  private async reconnectToRabbitMQ(transactionid: string) {
    try {
      this.logger.log(['RabbitMQ', 'Reconnect', 'INFO'], {
        info: 'Reconnecting to RabbitMQ...',
        transactionid,
      });

      await this.connectToRabbitMQ(transactionid);
      await this.consumeFromQueue(transactionid);
    } catch (error) {
      this.logger.error(['RabbitMQ', 'Reconnect', 'ERROR'], {
        info: `Reconnect failed: ${error.message}`,
        transactionid,
      });
    }
  }

  private async handlingConsumerNotification(
    message: string,
    transactionid: string,
  ): Promise<void> {
    try {
      const formatMessage = JSON.parse(message);
      if (formatMessage.type === 'send-email') {
        await this.emailService.sendEmail(formatMessage.data);
      }
    } catch (error) {
      this.logger.error(['Handling notif service', 'Rabbit Service', 'ERROR'], {
        info: JSON.stringify(error),
        transactionid,
      });
    }
  }

  private async handlingConsumerUpload(
    message: string,
    transactionid: string,
  ): Promise<void> {
    try {
      const { type, data } = JSON.parse(message) as TRequestMessageRabbit;
      if (type === 'upload-image') {
        await this.cloudinaryService.uploadToCloudinary({
          publicId: data.publicId,
          data: data.image,
          resourceType: data.resourceType,
          folderName: data.folderName,
          transactionid,
        });
      }
    } catch (error) {
      this.logger.error(['Handling Cloud Service', 'Rabbit Service', 'ERROR'], {
        info: JSON.stringify(error),
        transactionid,
      });
    }
  }

  private async consumeMessagesFromQueue(
    queue: string,
    transactionid: string,
    timeStart: [number, number],
  ): Promise<string> {
    this.channel.consume(queue, async (msg) => {
      if (msg) {
        const messageContent = msg.content.toString();
        const formatMessage = JSON.parse(messageContent);
        transactionid = formatMessage.transactionid;

        if (['notification-queue'].includes(queue)) {
          await this.handlingConsumerNotification(
            messageContent,
            transactionid,
          );
        }
        if (['upload-queue'].includes(queue)) {
          await this.handlingConsumerUpload(messageContent, transactionid);
        }
        this.channel.ack(msg); // Acknowledge the message after processing
        const timeDiff = process.hrtime(timeStart);
        const timeTaken = Math.round((timeDiff[0] * 1e9 + timeDiff[1]) / 1e6);
        this.logger.log(
          ['Consumer RabbitMQ - COMMIT', 'Rabbit Service', 'INFO'],
          {
            queue,
            transactionid,
            timeTaken,
          },
        );
      }
    });
    return transactionid;
  }

  public async sendToQueue(dataObj: {
    queue: string;
    message: string;
    transactionid: string;
    routeKey?: string;
    exchangeName?: string;
    exchangeType?: string;
    delay?: number; // in miliseconds
    isErrorOptional?: boolean;
  }) {
    const {
      transactionid,
      queue,
      message,
      delay,
      isErrorOptional,
      routeKey = this.notificationRouteKey,
      exchangeName = this.exchangeName,
      exchangeType = this.exchangeType,
    } = dataObj;
    const timeStart = process.hrtime();
    try {
      if (this.isConnectionClosed || this.isChannelClosed) {
        await this.connectToRabbitMQ(transactionid);
      }

      await this.channel.assertExchange(exchangeName, exchangeType, {
        durable: true,
      });
      const isDelayedQueue = !isNaN(delay) && delay > 0;
      const queueName = isDelayedQueue ? `delay_${queue}` : queue;

      await this.channel.assertQueue(queueName, {
        durable: true,
        arguments: isDelayedQueue
          ? {
              'x-message-ttl': delay,
              'x-dead-letter-exchange': '',
              'x-dead-letter-routing-key': `dql_${routeKey}`,
            }
          : {},
      });
      await this.channel.bindQueue(queueName, exchangeName, routeKey);
      this.channel.publish(exchangeName, routeKey, Buffer.from(message), {
        persistent: true,
      });
      const timeDiff = process.hrtime(timeStart);
      const timeTaken = Math.round((timeDiff[0] * 1e9 + timeDiff[1]) / 1e6);
      this.logger.log(['Producer RabbitMQ', 'Rabbit Service', 'INFO'], {
        timeTaken,
        transactionid,
        queue,
      });
    } catch (error) {
      this.logger.error(['Producer RabbitMQ', 'Rabbit Service', 'ERROR'], {
        info: JSON.stringify(error),
        transactionid,
      });
      if (isErrorOptional) return Promise.resolve();
      throw {
        isHelperFail: true,
        message: error.message,
        data: {
          status: 500,
          status_code: '00500',
          status_desc: 'Internal Server Error',
        },
      };
    }
  }

  public async consumeFromQueue(transaction_id: string): Promise<void> {
    let transactionid = transaction_id;
    const timeStart = process.hrtime();
    try {
      if (this.isConnectionClosed || this.isChannelClosed) {
        await this.connectToRabbitMQ(transactionid);
      }
      const { queue_config } =
        await this.generalService.readFromFile<TQueueConfigWrapper>(
          RABBIT_CONFIG_PATH,
        );

      for (const queueConfig of queue_config) {
        const { queue, exchanges } = queueConfig;

        // Assert the queue (create if it doesn't exist)
        await this.channel.assertQueue(queue, { durable: true });

        await this.setupExchangesAndBindings(
          queue,
          exchanges,
          transactionid,
          timeStart,
        );
        // Consume messages from the queue
        transactionid = await this.consumeMessagesFromQueue(
          queue,
          transactionid,
          timeStart,
        );
        const timeDiff = process.hrtime(timeStart);
        const timeTaken = Math.round((timeDiff[0] * 1e9 + timeDiff[1]) / 1e6);
        this.logger.log(['Consumer RabbitMQ', 'Rabbit Service', 'INFO'], {
          info: `Consumer started, listening on queue ${queue}`,
          timeTaken,
          transactionid,
        });
      }
    } catch (error) {
      this.logger.error(['Consumer RabbitMQ', 'Rabbit Service', 'ERROR'], {
        info: JSON.stringify(error),
        transactionid,
      });
      throw {
        isHelperFail: true,
        message: error.message,
        data: {
          status: 500,
          status_code: '00500',
          status_desc: 'Internal Server Error',
        },
      };
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
    this.logger.log(['RabbitMQ connection', 'Rabbit Service', 'INFO'], {
      info: 'Rabbit Connection Closed',
    });
  }

  async onModuleInit(): Promise<void> {
    const transactionid = lib.generateTrxId();
    try {
      await this.consumeFromQueue(transactionid);
    } catch (error) {
      this.logger.error(['RabbitMQ Init', 'Rabbit Service', 'ERROR'], {
        info: `Error during RabbitMQ initialization: ${error.message}`,
        transactionid,
      });
    }
  }
}
