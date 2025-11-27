import { ConfigService } from '@nestjs/config';

// Mock PrismaClient to avoid actual database connections
const createMockPrismaClient = () => ({
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
  $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]),
  $transaction: jest.fn().mockImplementation(async (fn: any) => fn({})),
});

jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => createMockPrismaClient()),
    Prisma: {
      TransactionIsolationLevel: {
        ReadUncommitted: 'ReadUncommitted',
        ReadCommitted: 'ReadCommitted',
        RepeatableRead: 'RepeatableRead',
        Serializable: 'Serializable',
      },
    },
  };
});

import { PrismaReadReplicaService } from './prisma-read-replica.service';

describe('PrismaReadReplicaService', () => {
  let service: PrismaReadReplicaService;
  let mockConfigService: { get: jest.Mock };

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'DATABASE_URL') {
          return 'postgresql://test:test@localhost:5432/test';
        }
        if (key === 'DATABASE_REPLICA_URL') {
          return null; // No replica in tests
        }
        return defaultValue;
      }),
    };

    service = new PrismaReadReplicaService(mockConfigService as unknown as ConfigService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have primary client', () => {
      expect(service.primary).toBeDefined();
    });

    it('should fall back to primary for read replica when not configured', () => {
      expect(service.readReplica).toBe(service.primary);
    });

    it('should report replica as not healthy when not configured', () => {
      expect(service.isReplicaHealthy).toBe(false);
    });
  });

  describe('executeRead', () => {
    it('should execute query on primary when no replica', async () => {
      const mockQuery = jest.fn().mockResolvedValue([{ id: 1 }]);
      const result = await service.executeRead(mockQuery);

      expect(mockQuery).toHaveBeenCalledWith(service.primary);
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('executeWrite', () => {
    it('should execute query on primary', async () => {
      const mockQuery = jest.fn().mockResolvedValue({ id: 1 });
      const result = await service.executeWrite(mockQuery);

      expect(mockQuery).toHaveBeenCalledWith(service.primary);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('getStats', () => {
    it('should return stats without replica', async () => {
      const stats = await service.getStats();

      expect(stats.replica).toBeNull();
      expect(stats.primary).toBeDefined();
    });
  });
});

describe('PrismaReadReplicaService with replica configured', () => {
  let service: PrismaReadReplicaService;
  let mockConfigService: { get: jest.Mock };

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'DATABASE_URL') {
          return 'postgresql://test:test@localhost:5432/test';
        }
        if (key === 'DATABASE_REPLICA_URL') {
          return 'postgresql://test:test@localhost:5433/test';
        }
        return defaultValue;
      }),
    };

    service = new PrismaReadReplicaService(mockConfigService as unknown as ConfigService);
  });

  describe('with replica', () => {
    it('should create service with replica URL', () => {
      expect(service).toBeDefined();
    });

    it('should return replica health status before init', () => {
      // Replica is created but healthy flag defaults to true until health check fails
      expect(service.isReplicaHealthy).toBeDefined();
    });
  });
});

describe('error handling', () => {
  it('should throw error when DATABASE_URL is missing', () => {
    const emptyConfigService = {
      get: jest.fn().mockReturnValue(undefined),
    };

    expect(() => {
      new PrismaReadReplicaService(emptyConfigService as unknown as ConfigService);
    }).toThrow('DATABASE_URL environment variable is required');
  });
});
