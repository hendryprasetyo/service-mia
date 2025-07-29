import { Injectable, OnModuleDestroy } from '@nestjs/common';
import * as mysql from 'mysql2/promise';
import { TExecuteRawQuery } from 'src/common/dtos/dto';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';

@Injectable()
export class DbService implements OnModuleDestroy {
  private masterPool: mysql.Pool;
  private replicaPools: { host: string; pool: mysql.Pool }[] = [];
  private replicaConnectionCounts: number[] = [];

  constructor(private readonly logger: LoggerServiceImplementation) {
    this.initializePool();
  }

  private initializePool() {
    // Inisialisasi koneksi ke master
    this.masterPool = mysql.createPool({
      host: process.env.DB_MASTER_HOST,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      port: +process.env.DB_MASTER_PORT,
      waitForConnections:
        process.env.DB_WAIT_CONNECTION.toLowerCase() === 'true',
      connectionLimit: +process.env.DB_CONNECTION_LIMIT,
      queueLimit: +process.env.DB_QUEUE_LIMIT,
      connectTimeout: +process.env.DB_TIMEOUT,
    });
    // Inisialisasi koneksi ke replica-replica
    const replicaHosts = process.env.DB_REPLICATE_HOSTS.split(',');
    this.replicaPools = replicaHosts.map((host) => ({
      host: host.trim(),
      pool: mysql.createPool({
        host: host.trim(),
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        port: +process.env.DB_REPLICATE_PORT,
        waitForConnections:
          process.env.DB_WAIT_CONNECTION.toLowerCase() === 'true',
        connectionLimit: +process.env.DB_CONNECTION_LIMIT,
        queueLimit: +process.env.DB_QUEUE_LIMIT,
        connectTimeout: +process.env.DB_TIMEOUT,
      }),
    }));
    this.replicaConnectionCounts = new Array(this.replicaPools.length).fill(0);
  }

  private calculateDuration(timeStart: [number, number]): number {
    const timeDiff = process.hrtime(timeStart);
    return Math.round((timeDiff[0] * 1e9 + timeDiff[1]) / 1e6);
  }

  private async getConnection(
    transactionid: string,
    isWriteOperation: boolean,
  ): Promise<mysql.PoolConnection> {
    try {
      let connection: mysql.PoolConnection;
      if (isWriteOperation) {
        // Jika operasi adalah WRITE, ambil koneksi dari MASTER
        connection = await this.masterPool.getConnection();
        this.logger.log(['POOL CONNECTION', 'GET CONNECTION', 'INFO'], {
          messages: 'Connected to Master!',
          transactionid,
        });
      } else {
        // Jika operasi adalah READ, pilih replica dengan koneksi paling sedikit
        const minConnections = Math.min(...this.replicaConnectionCounts);
        const index = this.replicaConnectionCounts.findIndex(
          (count) => count === minConnections,
        );
        const { host, pool } = this.replicaPools[index];
        connection = await pool.getConnection();
        (connection as any).__replicaIndex = index;
        this.replicaConnectionCounts[index] += 1;
        this.logger.log(['POOL CONNECTION', 'GET CONNECTION', 'INFO'], {
          messages: `Connected to Replica ${host}`,
          currReplicaCount: this.replicaConnectionCounts[index].toString(),
          transactionid,
        });
      }
      return connection;
    } catch (error) {
      this.logger.error(['POOL CONNECTION', 'GET CONNECTION', 'ERROR'], {
        error: JSON.stringify(error),
        transactionid,
      });
      throw error;
    }
  }

  public async executeRawQuery<T>(dataObj: TExecuteRawQuery): Promise<T> {
    const timeStart = process.hrtime();
    const {
      query,
      transactionid,
      params,
      pool,
      logName = 'EXECUTE',
      isWriteOperation = false,
    } = dataObj;
    let connection: mysql.PoolConnection;
    let timeTaken: number;
    try {
      const formattedQuery =
        params && params?.length ? mysql.format(query, params) : query;
      connection =
        pool || (await this.getConnection(transactionid, isWriteOperation));
      if (!pool) {
        timeTaken = this.calculateDuration(timeStart);
        this.logger.log(['EXECUTE RAW QUERY', 'POOL CONNECTED', 'INFO'], {
          transactionid,
          timeTaken,
        });
      }
      const [results] = await connection.execute(formattedQuery);
      timeTaken = this.calculateDuration(timeStart);
      this.logger.log(['EXECUTE RAW QUERY', logName, 'INFO'], {
        transactionid,
        timeTaken,
      });
      return results as T;
    } catch (error) {
      this.logger.error(['EXECUTE RAW QUERY', logName, 'ERROR'], {
        error: JSON.stringify(error),
        query,
        params: JSON.stringify(params),
      });
      return Promise.reject(error);
    } finally {
      if (connection && !pool) {
        let currReplicaCount = '0';
        connection.release();
        if (
          !isWriteOperation &&
          (connection as any).__replicaIndex !== undefined
        ) {
          const index = (connection as any).__replicaIndex!;
          this.replicaConnectionCounts[index] -= 1;
          currReplicaCount = this.replicaConnectionCounts[index].toString();
        }
        timeTaken = this.calculateDuration(timeStart);
        this.logger.error(['EXECUTE RAW QUERY', 'END', 'INFO'], {
          transactionid,
          currReplicaCount,
          timeTaken,
        });
      }
    }
  }

  public async executeInTransaction(
    transactionid: string,
    callback: (connection: mysql.PoolConnection) => Promise<any>,
    isolation:
      | 'READ UNCOMMITTED'
      | 'READ COMMITTED'
      | 'REPEATABLE READ'
      | 'SERIALIZABLE' = 'REPEATABLE READ',
  ): Promise<any> {
    const timeStart = process.hrtime();
    let connection: mysql.PoolConnection;
    let timeTaken: number;
    try {
      connection = await this.getConnection(transactionid, true); // Always use master for transactions (WRITE)
      timeTaken = this.calculateDuration(timeStart);
      this.logger.log(['EXECUTE TRANSACTION', 'POOL CONNECTED', 'INFO'], {
        transactionid,
        timeTaken,
      });

      const queryIsolation = `SET SESSION TRANSACTION ISOLATION LEVEL ${isolation}`;
      await connection.query(queryIsolation);

      this.logger.log(['EXECUTE TRANSACTION', queryIsolation, 'INFO'], {
        transactionid,
        timeTaken,
      });
      await connection.query('START TRANSACTION');
      timeTaken = this.calculateDuration(timeStart);
      this.logger.log(['EXECUTE TRANSACTION', 'BEGIN', 'INFO'], {
        transactionid,
        timeTaken,
      });

      const result = await callback(connection);

      await connection.query('COMMIT');
      timeTaken = this.calculateDuration(timeStart);
      this.logger.log(['EXECUTE TRANSACTION', 'COMMIT', 'INFO'], {
        transactionid,
        timeTaken,
      });

      return result;
    } catch (error) {
      if (connection) {
        await connection.query('ROLLBACK');
        timeTaken = this.calculateDuration(timeStart);
        this.logger.error(['EXECUTE TRANSACTION', 'ROLLBACK', 'ERROR'], {
          transactionid,
          error: JSON.stringify(error),
          timeTaken,
        });
      }
      return Promise.reject(error);
    } finally {
      if (connection) {
        connection.release();
        timeTaken = this.calculateDuration(timeStart);
        this.logger.error(['EXECUTE TRANSACTION', 'END', 'INFO'], {
          transactionid,
          timeTaken,
        });
      }
    }
  }

  async onModuleDestroy() {
    if (this.masterPool) {
      await this.masterPool.end();
      this.logger.log(['mysql-connection', 'info'], {
        info: 'master db pool closed',
      });
    }
    for (const { host, pool } of this.replicaPools) {
      await pool.end();
      this.logger.log(['mysql-connection', 'info'], {
        info: `replica db pool at ${host} closed`,
      });
    }
  }
}
