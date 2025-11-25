import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { MissionStatus, UserRole, TransactionStatus, DisputeStatus } from '@prisma/client';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prismaService: PrismaService;
  let redisService: RedisService;

  const mockPrismaService = {
    payment: {
      aggregate: jest.fn(),
    },
    mission: {
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    transaction: {
      count: jest.fn(),
    },
    dispute: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    noShowEvent: {
      count: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBusinessMetrics', () => {
    it('should return cached metrics if available', async () => {
      const cachedMetrics = {
        revenue: { total: 10000, today: 500, thisWeek: 2000, thisMonth: 5000, growth: 15 },
        missions: { total: 100, pending: 10, inProgress: 20, completed: 70, completionRate: 77.78, averageValue: 150 },
        users: { total: 500, clients: 400, artisans: 100, newToday: 5, newThisWeek: 20, activeUsers: 200 },
        payments: { successRate: 98.5, totalTransactions: 200, averageTransaction: 50, failedTransactions: 3 },
        disputes: { total: 10, pending: 2, resolved: 8, resolutionRate: 80, averageResolutionTime: 24 },
        noShows: { total: 5, validated: 3, rejected: 1, pending: 1, validationRate: 60 },
      };

      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedMetrics));

      const result = await service.getBusinessMetrics();

      expect(result).toEqual(cachedMetrics);
      expect(mockPrismaService.mission.count).not.toHaveBeenCalled();
    });

    it('should calculate metrics when cache miss', async () => {
      mockRedisService.get.mockResolvedValue(null);

      // Mock all the queries
      mockPrismaService.payment.aggregate.mockResolvedValue({ _sum: { amount: 10000 } });
      mockPrismaService.mission.count.mockResolvedValue(100);
      mockPrismaService.mission.aggregate.mockResolvedValue({ _avg: { agreedPrice: 150 } });
      mockPrismaService.user.count.mockResolvedValue(500);
      mockPrismaService.transaction.count.mockResolvedValue(200);
      mockPrismaService.dispute.count.mockResolvedValue(10);
      mockPrismaService.dispute.findMany.mockResolvedValue([]);
      mockPrismaService.noShowEvent.count.mockResolvedValue(5);

      const result = await service.getBusinessMetrics();

      expect(result).toHaveProperty('revenue');
      expect(result).toHaveProperty('missions');
      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('payments');
      expect(result).toHaveProperty('disputes');
      expect(result).toHaveProperty('noShows');
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should calculate revenue growth correctly', async () => {
      mockRedisService.get.mockResolvedValue(null);

      mockPrismaService.payment.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 10000 } }) // total
        .mockResolvedValueOnce({ _sum: { amount: 500 } }) // today
        .mockResolvedValueOnce({ _sum: { amount: 2000 } }) // week
        .mockResolvedValueOnce({ _sum: { amount: 5000 } }) // month
        .mockResolvedValueOnce({ _sum: { amount: 4000 } }); // lastMonth

      mockPrismaService.mission.count.mockResolvedValue(0);
      mockPrismaService.mission.aggregate.mockResolvedValue({ _avg: { agreedPrice: 0 } });
      mockPrismaService.user.count.mockResolvedValue(0);
      mockPrismaService.transaction.count.mockResolvedValue(0);
      mockPrismaService.dispute.count.mockResolvedValue(0);
      mockPrismaService.dispute.findMany.mockResolvedValue([]);
      mockPrismaService.noShowEvent.count.mockResolvedValue(0);

      const result = await service.getBusinessMetrics();

      // Growth should be ((5000 - 4000) / 4000) * 100 = 25%
      expect(result.revenue.growth).toBe(25);
    });

    it('should handle zero last month revenue', async () => {
      mockRedisService.get.mockResolvedValue(null);

      mockPrismaService.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      mockPrismaService.mission.count.mockResolvedValue(0);
      mockPrismaService.mission.aggregate.mockResolvedValue({ _avg: { agreedPrice: null } });
      mockPrismaService.user.count.mockResolvedValue(0);
      mockPrismaService.transaction.count.mockResolvedValue(0);
      mockPrismaService.dispute.count.mockResolvedValue(0);
      mockPrismaService.dispute.findMany.mockResolvedValue([]);
      mockPrismaService.noShowEvent.count.mockResolvedValue(0);

      const result = await service.getBusinessMetrics();

      expect(result.revenue.growth).toBe(100);
    });

    it('should calculate completion rate correctly', async () => {
      mockRedisService.get.mockResolvedValue(null);

      mockPrismaService.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      mockPrismaService.mission.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(20) // pending
        .mockResolvedValueOnce(30) // inProgress
        .mockResolvedValueOnce(50); // completed
      mockPrismaService.mission.aggregate.mockResolvedValue({ _avg: { agreedPrice: 150 } });
      mockPrismaService.user.count.mockResolvedValue(0);
      mockPrismaService.transaction.count.mockResolvedValue(0);
      mockPrismaService.dispute.count.mockResolvedValue(0);
      mockPrismaService.dispute.findMany.mockResolvedValue([]);
      mockPrismaService.noShowEvent.count.mockResolvedValue(0);

      const result = await service.getBusinessMetrics();

      // Completion rate: 50 / (30 + 50) = 62.5%
      expect(result.missions.completionRate).toBe(62.5);
    });

    it('should calculate dispute resolution time', async () => {
      mockRedisService.get.mockResolvedValue(null);

      mockPrismaService.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      mockPrismaService.mission.count.mockResolvedValue(0);
      mockPrismaService.mission.aggregate.mockResolvedValue({ _avg: { agreedPrice: null } });
      mockPrismaService.user.count.mockResolvedValue(0);
      mockPrismaService.transaction.count.mockResolvedValue(0);
      mockPrismaService.dispute.count.mockResolvedValue(2);
      mockPrismaService.dispute.findMany.mockResolvedValue([
        {
          createdAt: new Date('2025-01-01T00:00:00Z'),
          resolvedAt: new Date('2025-01-02T00:00:00Z'), // 24 hours
        },
        {
          createdAt: new Date('2025-01-01T00:00:00Z'),
          resolvedAt: new Date('2025-01-03T00:00:00Z'), // 48 hours
        },
      ]);
      mockPrismaService.noShowEvent.count.mockResolvedValue(0);

      const result = await service.getBusinessMetrics();

      // Average: (24 + 48) / 2 = 36 hours
      expect(result.disputes.averageResolutionTime).toBe(36);
    });
  });

  describe('getTimeSeriesData', () => {
    it('should return cached time series data', async () => {
      const cachedData = [
        { date: '2025-01-01', revenue: 100, missions: 5, newUsers: 2 },
      ];
      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.getTimeSeriesData(7);

      expect(result).toEqual(cachedData);
    });

    it('should calculate time series data when cache miss', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.payment.aggregate.mockResolvedValue({ _sum: { amount: 100 } });
      mockPrismaService.mission.count.mockResolvedValue(5);
      mockPrismaService.user.count.mockResolvedValue(2);

      const result = await service.getTimeSeriesData(7);

      expect(result).toHaveLength(7);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('revenue');
      expect(result[0]).toHaveProperty('missions');
      expect(result[0]).toHaveProperty('newUsers');
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should use default 30 days when not specified', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      mockPrismaService.mission.count.mockResolvedValue(0);
      mockPrismaService.user.count.mockResolvedValue(0);

      const result = await service.getTimeSeriesData();

      expect(result).toHaveLength(30);
    });
  });

  describe('getTopArtisans', () => {
    it('should return cached top artisans', async () => {
      const cachedArtisans = [
        { id: 'a1', name: 'Top Artisan', completedMissions: 50, rating: 4.9 },
      ];
      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedArtisans));

      const result = await service.getTopArtisans(10);

      expect(result).toEqual(cachedArtisans);
    });

    it('should calculate top artisans when cache miss', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: 'artisan-1',
          firstName: 'Pierre',
          lastName: 'Artisan',
          artisanProfile: {
            companyName: 'Pierre Plomberie',
            rating: 4.8,
          },
          _count: {
            artisanMissions: 30,
          },
        },
        {
          id: 'artisan-2',
          firstName: 'Jean',
          lastName: 'Menuisier',
          artisanProfile: {
            companyName: null,
            rating: 4.9,
          },
          _count: {
            artisanMissions: 25,
          },
        },
      ]);

      const result = await service.getTopArtisans(10);

      expect(result).toHaveLength(2);
      // Should be sorted by rating (4.9 > 4.8)
      expect(result[0].id).toBe('artisan-2');
      expect(result[0].rating).toBe(4.9);
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should use company name when available', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: 'artisan-1',
          firstName: 'Pierre',
          lastName: 'Artisan',
          artisanProfile: {
            companyName: 'Pierre Plomberie',
            rating: 4.8,
          },
          _count: {
            artisanMissions: 30,
          },
        },
      ]);

      const result = await service.getTopArtisans(10);

      expect(result[0].name).toBe('Pierre Plomberie');
    });

    it('should use full name when company name not available', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: 'artisan-1',
          firstName: 'Pierre',
          lastName: 'Artisan',
          artisanProfile: null,
          _count: {
            artisanMissions: 30,
          },
        },
      ]);

      const result = await service.getTopArtisans(10);

      expect(result[0].name).toBe('Pierre Artisan');
    });
  });

  describe('clearCache', () => {
    it('should clear all cache keys', async () => {
      await service.clearCache();

      expect(mockRedisService.del).toHaveBeenCalledWith('analytics:business_metrics');
      expect(mockRedisService.del).toHaveBeenCalledWith('analytics:time_series:7');
      expect(mockRedisService.del).toHaveBeenCalledWith('analytics:time_series:30');
      expect(mockRedisService.del).toHaveBeenCalledWith('analytics:top_artisans:10');
    });
  });
});
