import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;

  constructor(private readonly logger: LoggerServiceImplementation) {}

  // Method to initialize the Redis client lazily
  private initializeClient(transactionid: string) {
    if (!this.client || this.client.status === 'end') {
      const singleRedis = process.env.SINGLE_REDIS as string;
      if (singleRedis) {
        this.logger.log(['Redis Wild Book', 'Redis Service', 'INFO'], {
          info: 'SINGLE_REDIS',
          transactionid,
        });
        const [host, port, password] = singleRedis.split(':');

        // Set up the Redis client with retry strategy and event handling
        this.client = new Redis({
          port: Number(port),
          host,
          password,
          retryStrategy: (times: number) => {
            // Max retry time: 1 hour
            const maxRetryTime = 1000 * 60 * 60; // 1 hour
            const maxAttempts = 10; // Maximum retry attempts
            const delay = Math.min(times * 100, 4000); // Exponential backoff logic

            // Log retry attempts
            this.logger.log(
              ['Wild Book Redis', 'Retrying Connection', 'INFO'],
              {
                info: `Retry attempt #${times}, retrying in ${delay}ms`,
                transactionid,
              },
            );

            // Stop retrying if maximum retry time or attempts exceeded
            if (times > maxRetryTime || times > maxAttempts * 100)
              return undefined;

            return delay; // Return the calculated retry delay
          },
        });

        // Event handlers for Redis client
        this.client.on('connect', () => {
          this.logger.log(['Wild Book Redis', 'Connected', 'INFO'], {
            info: `Connected to Redis at ${host}:${port}`,
            transactionid,
          });
        });

        // Handle errors
        this.client.on('error', (err) => {
          this.logger.log(['Wild Book Redis', 'Client On Error', 'ERROR'], {
            info: `${err}`,
            transactionid,
          });
          // In case of error, disconnect and let retry strategy handle reconnection
          this.client.disconnect();
        });

        // Handle reconnecting event
        this.client.on('reconnecting', (attempt) => {
          this.logger.log(['Wild Book Redis', 'Reconnecting', 'INFO'], {
            info: `Attempting to reconnect to Redis, attempt #${attempt}`,
            transactionid,
          });
        });

        // Handle successful reconnection (redis is ready)
        this.client.on('ready', () => {
          this.logger.log(['Wild Book Redis', 'Ready', 'INFO'], {
            info: 'Redis connection ready and operational.',
            transactionid,
          });
        });

        // Handle connection close
        this.client.on('close', () => {
          this.logger.log(['Wild Book Redis', 'Connection Closed', 'INFO'], {
            info: 'Redis connection closed',
            transactionid,
          });
        });
      }
    }
  }

  // Disconnect Redis client when module is destroyed
  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
      this.logger.log(['Wild Book Redis', 'Client On Error', 'ERROR'], {
        info: 'Disconnected redis',
      });
    }
  }

  // Helper to get Redis client (only initializes it lazily)
  private getClient(transactionid: string): Redis {
    this.initializeClient(transactionid); // Only initialize when needed
    if (!this.client) {
      throw new Error('Redis client is not initialized.');
    }
    return this.client;
  }
  // Get data from Redis
  async getData<T>(dataObj: {
    transactionid: string;
    key: string;
    returnType?: 'string' | 'object';
    isErrorOptional?: boolean;
  }): Promise<T> {
    const {
      transactionid,
      key,
      isErrorOptional,
      returnType = 'string',
    } = dataObj;
    const timeStart = process.hrtime();
    try {
      const result = await this.getClient(transactionid).get(key);
      const timeDiff = process.hrtime(timeStart);
      const timeTaken = Math.round((timeDiff[0] * 1e9 + timeDiff[1]) / 1e6);

      this.logger.log(['Wild Book Redis', 'Get Data', 'INFO'], {
        response: result,
        transactionid,
        key,
        timeTaken,
      });
      if (returnType === 'object') {
        try {
          return JSON.parse(result) as T;
        } catch (error) {
          this.logger.error(['Wild Book Redis', 'JSON Parse Error', 'ERROR'], {
            transactionid,
            key,
            info: `Failed to parse JSON: ${error.message}`,
          });
          if (isErrorOptional) {
            return null;
          }
          throw error;
        }
      }
      return result as T;
    } catch (err) {
      this.logger.error(['Wild Book Redis', 'Get Data', 'ERROR'], {
        transactionid,
        key,
        info: `${err}`,
      });
      if (isErrorOptional) {
        return null;
      }
      throw err;
    }
  }

  async getTTL(dataObj: {
    transactionid: string;
    key: string;
    isErrorOptional?: boolean;
  }): Promise<number> {
    const { transactionid, key, isErrorOptional = false } = dataObj;
    const timeStart = process.hrtime();
    try {
      const result = await this.getClient(transactionid).ttl(key);
      const timeDiff = process.hrtime(timeStart);
      const timeTaken = Math.round((timeDiff[0] * 1e9 + timeDiff[1]) / 1e6);

      this.logger.log(['Wild Book Redis', 'Get TTL', 'INFO'], {
        response: result,
        transactionid,
        key,
        timeTaken,
      });

      return result;
    } catch (err) {
      this.logger.error(['Wild Book Redis', 'Get TTL', 'ERROR'], {
        transactionid,
        key,
        info: `${err}`,
      });
      if (isErrorOptional) {
        return -1;
      }
      throw err;
    }
  }

  async getSrandmember(dataObj: {
    transactionid: string;
    key: string;
    limit: number;
    isErrorOptional?: boolean;
  }) {
    const { transactionid, key, isErrorOptional, limit } = dataObj;
    const timeStart = process.hrtime();
    try {
      const result = await this.getClient(transactionid).srandmember(
        key,
        limit,
      );
      const timeDiff = process.hrtime(timeStart);
      const timeTaken = Math.round((timeDiff[0] * 1e9 + timeDiff[1]) / 1e6);

      this.logger.log(['Wild Book Redis', 'GET SRANDMEMBER', 'INFO'], {
        response: result,
        transactionid,
        key,
        timeTaken,
      });

      return result;
    } catch (err) {
      this.logger.error(['Wild Book Redis', 'GET SRANDMEMBER', 'ERROR'], {
        transactionid,
        key,
        info: `${err}`,
      });
      if (isErrorOptional) {
        return null;
      }
      throw err;
    }
  }

  // Delete data from Redis
  async deleteData(dataObj: {
    transactionid: string;
    key: string;
    isErrorOptional?: boolean;
  }): Promise<any> {
    const { transactionid, key, isErrorOptional } = dataObj;
    try {
      const result = await this.getClient(transactionid).del(key);
      this.logger.log(['Slaapdoss Redis', 'Delete Data', 'ERROR'], {
        transactionid,
        key,
      });
      return result;
    } catch (err) {
      this.logger.error(['Slaapdoss Redis', 'Delete Data', 'ERROR'], {
        transactionid,
        key,
        info: `${err}`,
      });
      if (isErrorOptional) {
        return null;
      }
      throw err;
    }
  }

  // Set data with TTL in Redis
  async setDataWithTTL(dataObj: {
    transactionid: string;
    key: string;
    value: string;
    ttl: number;
    isErrorOptional?: boolean;
  }): Promise<any> {
    const { transactionid, key, value, ttl, isErrorOptional } = dataObj;
    try {
      this.logger.log(
        ['Slaapdoss Redis', `REDIS SESSION SET took ${ttl * 1000}ms`, 'INFO'],
        {
          transactionid,
          key,
        },
      );
      const result = await this.getClient(transactionid).set(
        key,
        value,
        'EX',
        ttl,
      );
      return result;
    } catch (err) {
      this.logger.error(['Wild Boook Redis', 'Set Data with TTL', 'ERROR'], {
        transactionid,
        key,
        info: `${err}`,
      });
      if (isErrorOptional) return null;
      throw err;
    }
  }

  async setSadd(dataObj: {
    transactionid: string;
    key: string;
    value: string[];
    isErrorOptional?: boolean;
  }): Promise<any> {
    const { transactionid, key, value, isErrorOptional } = dataObj;
    try {
      const result = await this.getClient(transactionid).sadd(key, value);
      return result;
    } catch (err) {
      this.logger.error(['Wild Boook Redis', 'Set Sadd', 'ERROR'], {
        transactionid,
        key,
        info: `${err}`,
      });
      if (isErrorOptional) return null;
      throw err;
    }
  }
}
