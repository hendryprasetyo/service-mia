import { DbService } from './mysql.service';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import * as mysql from 'mysql2/promise';
import { Test, TestingModule } from '@nestjs/testing';
import { mockLoggerService } from 'src/config/__test__/mock';
import { TestSetupModule } from 'src/config/test-setup.module';

describe('DbService', () => {
  let dbService: DbService;
  let masterPoolMock: mysql.Pool;
  let replicaPoolMock: mysql.Pool;
  let connectionMock: mysql.PoolConnection;

  beforeEach(async () => {
    connectionMock = {
      execute: jest.fn(),
      release: jest.fn(),
      query: jest.fn(),
    } as unknown as mysql.PoolConnection;

    masterPoolMock = {
      getConnection: jest.fn().mockResolvedValue(connectionMock),
      end: jest.fn(),
    } as unknown as mysql.Pool;

    replicaPoolMock = {
      getConnection: jest.fn().mockResolvedValue(connectionMock),
      end: jest.fn(),
    } as unknown as mysql.Pool;

    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      providers: [
        DbService,
        { provide: LoggerServiceImplementation, useValue: mockLoggerService },
      ],
    }).compile();

    dbService = module.get<DbService>(DbService);

    // Inject mock master and replicas
    dbService['masterPool'] = masterPoolMock;
    dbService['replicaPools'] = [{ host: '127.0.0.1', pool: replicaPoolMock }];
    dbService['replicaConnectionCounts'] = [0];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize db pool successfully', async () => {
    const conn = await dbService['getConnection']('tx-id', true);
    expect(masterPoolMock.getConnection).toHaveBeenCalledTimes(1);
    expect(conn).toBe(connectionMock);
  });

  it('should throw error when getConnection fails', async () => {
    masterPoolMock.getConnection = jest
      .fn()
      .mockRejectedValue(new Error('Failed'));

    await expect(dbService['getConnection']('tx-id', true)).rejects.toThrow(
      'Failed',
    );
  });

  it('should execute raw query successfully without params (read)', async () => {
    const query = 'SELECT * FROM users';
    const transactionid = 'tx123';
    connectionMock.execute = jest.fn().mockResolvedValue([[{ id: 1 }], []]);

    const result = await dbService.executeRawQuery({
      query,
      transactionid,
    });

    expect(connectionMock.execute).toHaveBeenCalledWith(query);
    expect(result).toEqual([{ id: 1 }]);
  });

  it('should execute raw query successfully with params (read)', async () => {
    const query = 'SELECT * FROM users WHERE id = ?';
    const params = [1];
    const transactionid = 'tx123';
    connectionMock.execute = jest.fn().mockResolvedValue([[{ id: 1 }], []]);

    const result = await dbService.executeRawQuery({
      query,
      params,
      transactionid,
    });

    expect(connectionMock.execute).toHaveBeenCalledWith(
      mysql.format(query, params),
    );
    expect(result).toEqual([{ id: 1 }]);
  });

  it('should throw error when executeRawQuery fails', async () => {
    const query = 'SELECT * FROM users WHERE id = ?';
    const params = [1];
    const transactionid = 'tx123';

    connectionMock.execute = jest
      .fn()
      .mockRejectedValue(new Error('Query failed'));

    await expect(
      dbService.executeRawQuery({ query, params, transactionid }),
    ).rejects.toThrow('Query failed');
  });

  it('should execute transaction successfully', async () => {
    const transactionid = 'tx123';
    connectionMock.query = jest.fn().mockResolvedValue(undefined);
    const callback = jest.fn().mockResolvedValue('done');

    const result = await dbService.executeInTransaction(
      transactionid,
      callback,
    );

    expect(connectionMock.query).toHaveBeenCalledWith(
      'SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ',
    );
    expect(connectionMock.query).toHaveBeenCalledWith('START TRANSACTION');
    expect(connectionMock.query).toHaveBeenCalledWith('COMMIT');
    expect(callback).toHaveBeenCalledWith(connectionMock);
    expect(result).toBe('done');
  });

  it('should rollback transaction on error', async () => {
    const transactionid = 'tx123';
    const callback = jest.fn().mockRejectedValue(new Error('Rollback me'));
    connectionMock.query = jest.fn().mockResolvedValue(undefined);

    await expect(
      dbService.executeInTransaction(transactionid, callback),
    ).rejects.toThrow('Rollback me');

    expect(connectionMock.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('should support custom isolation level', async () => {
    const transactionid = 'tx123';
    const callback = jest.fn().mockResolvedValue('success');
    connectionMock.query = jest.fn().mockResolvedValue(undefined);

    const result = await dbService.executeInTransaction(
      transactionid,
      callback,
      'READ UNCOMMITTED',
    );

    expect(connectionMock.query).toHaveBeenCalledWith(
      'SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED',
    );
    expect(result).toBe('success');
  });

  it('should close all pools on destroy', async () => {
    await dbService.onModuleDestroy();
    expect(masterPoolMock.end).toHaveBeenCalled();
    expect(replicaPoolMock.end).toHaveBeenCalled();
  });
});
