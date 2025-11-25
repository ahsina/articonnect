import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('AdminService', () => {
  let service: AdminService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    mission: {
      count: jest.fn(),
    },
    transaction: {
      aggregate: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    dispute: {
      count: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
    review: {
      count: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    it('should return comprehensive dashboard statistics', async () => {
      mockPrismaService.user.count
        .mockResolvedValueOnce(1000) // totalUsers
        .mockResolvedValueOnce(300) // artisans
        .mockResolvedValueOnce(700); // clients

      mockPrismaService.mission.count
        .mockResolvedValueOnce(500) // totalMissions
        .mockResolvedValueOnce(50) // activeMissions
        .mockResolvedValueOnce(400) // completedMissions
        .mockResolvedValueOnce(50); // pendingMissions

      mockPrismaService.transaction.aggregate.mockResolvedValue({
        _sum: { commission: 15000 },
      });

      mockPrismaService.transaction.count.mockResolvedValue(350);

      mockPrismaService.dispute.count.mockResolvedValue(5);

      mockPrismaService.product.count.mockResolvedValue(200);

      mockPrismaService.review.count.mockResolvedValue(800);
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: { overallRating: 4.5 },
      });

      const result = await service.getDashboardStats();

      expect(result).toEqual({
        users: {
          total: 1000,
          artisans: 300,
          clients: 700,
        },
        missions: {
          total: 500,
          active: 50,
          completed: 400,
          pending: 50,
        },
        revenue: {
          totalCommission: 15000,
          totalTransactions: 350,
        },
        disputes: {
          active: 5,
        },
        marketplace: {
          totalProducts: 200,
        },
        reviews: {
          total: 800,
          averageRating: 4.5,
        },
      });
    });

    it('should handle null values in aggregations', async () => {
      mockPrismaService.user.count.mockResolvedValue(0);
      mockPrismaService.mission.count.mockResolvedValue(0);
      mockPrismaService.transaction.aggregate.mockResolvedValue({
        _sum: { commission: null },
      });
      mockPrismaService.transaction.count.mockResolvedValue(0);
      mockPrismaService.dispute.count.mockResolvedValue(0);
      mockPrismaService.product.count.mockResolvedValue(0);
      mockPrismaService.review.count.mockResolvedValue(0);
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: { overallRating: null },
      });

      const result = await service.getDashboardStats();

      expect(result.revenue.totalCommission).toBe(0);
      expect(result.reviews.averageRating).toBe(0);
    });
  });

  describe('getRevenueStats', () => {
    it('should return revenue stats for day period', async () => {
      const mockTransactions = [
        { commission: 50, amount: 200, createdAt: new Date() },
        { commission: 75, amount: 300, createdAt: new Date() },
      ];

      mockPrismaService.transaction.findMany.mockResolvedValue(mockTransactions);

      const result = await service.getRevenueStats('day');

      expect(result.period).toBe('day');
      expect(result.totalCommission).toBe(125);
      expect(result.totalVolume).toBe(500);
      expect(result.transactionCount).toBe(2);
      expect(mockPrismaService.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'COMPLETED',
          }),
        }),
      );
    });

    it('should return revenue stats for week period', async () => {
      mockPrismaService.transaction.findMany.mockResolvedValue([]);

      const result = await service.getRevenueStats('week');

      expect(result.period).toBe('week');
      expect(result.totalCommission).toBe(0);
      expect(result.transactionCount).toBe(0);
    });

    it('should return revenue stats for month period (default)', async () => {
      mockPrismaService.transaction.findMany.mockResolvedValue([
        { commission: 100, amount: 400, createdAt: new Date() },
      ]);

      const result = await service.getRevenueStats();

      expect(result.period).toBe('month');
      expect(result.totalCommission).toBe(100);
    });

    it('should return revenue stats for year period', async () => {
      const mockTransactions = Array(12).fill({
        commission: 1000,
        amount: 4000,
        createdAt: new Date(),
      });

      mockPrismaService.transaction.findMany.mockResolvedValue(mockTransactions);

      const result = await service.getRevenueStats('year');

      expect(result.period).toBe('year');
      expect(result.totalCommission).toBe(12000);
      expect(result.totalVolume).toBe(48000);
    });
  });

  describe('getUserGrowthStats', () => {
    it('should return user growth data for last 30 days', async () => {
      const mockUsersByDay = [
        { createdAt: new Date('2024-01-01'), _count: 10 },
        { createdAt: new Date('2024-01-02'), _count: 15 },
        { createdAt: new Date('2024-01-03'), _count: 8 },
      ];

      mockPrismaService.user.groupBy.mockResolvedValue(mockUsersByDay);

      const result = await service.getUserGrowthStats();

      expect(result.period).toBe('last30Days');
      expect(result.data).toEqual(mockUsersByDay);
      expect(mockPrismaService.user.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['createdAt'],
        }),
      );
    });

    it('should handle empty growth data', async () => {
      mockPrismaService.user.groupBy.mockResolvedValue([]);

      const result = await service.getUserGrowthStats();

      expect(result.data).toEqual([]);
    });
  });

  describe('getAllUsers', () => {
    it('should return paginated users list', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'CLIENT',
          status: 'ACTIVE',
          createdAt: new Date(),
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'ARTISAN',
          status: 'ACTIVE',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(50);

      const result = await service.getAllUsers(1, 20);

      expect(result.data).toEqual(mockUsers);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 50,
        totalPages: 3,
      });
    });

    it('should use default pagination values', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      await service.getAllUsers();

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should calculate correct skip value for page 3', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(100);

      await service.getAllUsers(3, 20);

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40,
          take: 20,
        }),
      );
    });
  });

  describe('suspendUser', () => {
    it('should suspend a user', async () => {
      const userId = 'user-123';
      const suspendedUser = {
        id: userId,
        status: 'SUSPENDED',
        email: 'user@example.com',
      };

      mockPrismaService.user.update.mockResolvedValue(suspendedUser);

      const result = await service.suspendUser(userId);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { status: 'SUSPENDED' },
      });
      expect(result.status).toBe('SUSPENDED');
    });
  });

  describe('activateUser', () => {
    it('should activate a user', async () => {
      const userId = 'user-456';
      const activatedUser = {
        id: userId,
        status: 'ACTIVE',
        email: 'user@example.com',
      };

      mockPrismaService.user.update.mockResolvedValue(activatedUser);

      const result = await service.activateUser(userId);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { status: 'ACTIVE' },
      });
      expect(result.status).toBe('ACTIVE');
    });
  });
});
