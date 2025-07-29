import { Injectable, LoggerService } from '@nestjs/common';
import { ObjectDto } from 'src/common/dtos/dto';
import * as winston from 'winston';

@Injectable()
export class LoggerServiceImplementation implements LoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: () =>
            new Date().toLocaleString('id-ID', {
              timeZone: 'Asia/Jakarta',
            }),
        }),
        winston.format.printf(({ timestamp, level, message, ...info }) => {
          if (typeof message === 'string' && message.includes('Mapped')) {
            return JSON.stringify({
              level,
              time: timestamp,
              tags: 'Mapped API',
              data: {
                info: message,
              },
            });
          }
          const logs = { level, time: timestamp, tags: message };
          if (typeof info === 'object' && Object.keys(info).length !== 0) {
            Object.assign(logs, { data: info });
          }
          return JSON.stringify(logs);
        }),
      ),
      transports: [new winston.transports.Console()],
    });
  }
  private formatMessagaTags(message: string[] | string): string {
    return Array.isArray(message)
      ? `[${message.join(', ').toUpperCase()}]`
      : message;
  }

  log(message: string[] | string, data: ObjectDto) {
    this.logger.info(this.formatMessagaTags(message), data);
  }

  error(message: string[] | string, data: ObjectDto) {
    this.logger.error(this.formatMessagaTags(message), data);
  }

  warn(message: string[]) {
    this.logger.warn(this.formatMessagaTags(message));
  }

  debug(message: string[]) {
    this.logger.debug(this.formatMessagaTags(message));
  }

  verbose(message: string) {
    this.logger.verbose(this.formatMessagaTags(message));
  }
}
