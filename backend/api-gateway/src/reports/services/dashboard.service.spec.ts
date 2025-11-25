import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { ForbiddenException } from '@nestjs/common';

describe('DashboardService', () => {
  let service: DashboardService;
  let prismaService: PrismaService;
  let redisService: RedisService;

  const mockPrismaService = {
    company: {
      findUnique: jest.fn(),
    },
    companyEmployee: {
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    mission: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    employeeEarnings: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockRedisService = {
    getOrSet: jest.fn(),
  };

  const mockCompany = {
    id: 'company-123',
    companyName: 'Test Company',
    totalMissions: 100,
    totalRevenue: 50000,
  };

  const mockEmployee = {
    id: 'employee-123',
    userId: 'user-123',
    companyId: 'company-123',
    role: 'OWNER',
    status: 'ACTIVE',
    commissionRate: { toNumber: () => 50 },
    user: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    },
    company: {
      companyName: 'Test Company',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCompanyKPIs', () => {
    beforeEach(() => {
      mockPrismaService.companyEmployee.findFirst.mockResolvedValue(mockEmployee);
    });

    it('should return company KPIs from cache', async () => {
      const cachedKPIs = { company: mockCompany, kpis: {} };
      mockRedisService.getOrSet.mockResolvedValue(cachedKPIs);

      const result = await service.getCompanyKPIs('company-123', 'user-123');

      expect(result).toEqual(cachedKPIs);
    });

    it('should throw ForbiddenException if user has no access', async () => {
      mockPrismaService.companyEmployee.findFirst.mockResolvedValue(null);

      await expect(
        service.getCompanyKPIs('company-123', 'unauthorized-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should fetch KPIs from database when cache miss', async () => {
      mockRedisService.getOrSet.mockImplementation(async (key, fetcher) => fetcher());
      mockPrismaService.company.findUnique.mockResolvedValue(mockCompany);
      mockPrismaService.companyEmployee.count.mockResolvedValue(10);
      mockPrismaService.mission.count.mockResolvedValue(50);
      mockPrismaService.mission.aggregate.mockResolvedValue({
        _sum: { finalPrice: { toNumber: () => 25000 } },
      });
      mockPrismaService.employeeEarnings.aggregate.mockResolvedValue({
        _sum: { employeeCommission: { toNumber: () => 5000 } },
        _count: { id: 5 },
      });
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.employeeEarnings.findMany.mockResolvedValue([]);

      const result = await service.getCompanyKPIs('company-123', 'user-123');

      expect(result).toHaveProperty('company');
      expect(result).toHaveProperty('kpis');
    });
  });

  describe('getEmployeeDashboard', () => {
    it('should return employee dashboard', async () => {
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue(mockEmployee);
      mockPrismaService.mission.count.mockResolvedValue(5);
      mockPrismaService.employeeEarnings.aggregate.mockResolvedValue({
        _sum: { employeeCommission: { toNumber: () => 2000 } },
        _count: { id: 3 },
      });
      mockPrismaService.mission.findMany.mockResolvedValue([
        {
          id: 'mission-1',
          title: 'Test Mission',
          status: 'COMPLETED',
          category: 'Plomberie',
          finalPrice: 200,
          scheduledFor: new Date(),
          client: { firstName: 'Jane', lastName: 'Smith' },
        },
      ]);

      const result = await service.getEmployeeDashboard('employee-123', 'user-123');

      expect(result.employee.name).toBe('John Doe');
      expect(result).toHaveProperty('kpis');
      expect(result).toHaveProperty('recentMissions');
    });

    it('should throw ForbiddenException if user is not the employee', async () => {
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue({
        ...mockEmployee,
        userId: 'other-user',
      });

      await expect(
        service.getEmployeeDashboard('employee-123', 'user-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if employee not found', async () => {
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue(null);

      await expect(
        service.getEmployeeDashboard('nonexistent', 'user-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getPerformanceOverview', () => {
    beforeEach(() => {
      mockPrismaService.companyEmployee.findFirst.mockResolvedValue(mockEmployee);
    });

    it('should return performance overview with chart data', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([
        {
          id: 'mission-1',
          status: 'COMPLETED',
          finalPrice: { toNumber: () => 200 },
          createdAt: new Date(),
          completedAt: new Date(),
        },
        {
          id: 'mission-2',
          status: 'IN_PROGRESS',
          finalPrice: null,
          createdAt: new Date(),
          completedAt: null,
        },
      ]);

      const result = await service.getPerformanceOverview(
        'company-123',
        'user-123',
        30,
      );

      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('chartData');
      expect(result).toHaveProperty('totals');
      expect(result.period.days).toBe(30);
    });

    it('should throw ForbiddenException if user has no access', async () => {
      mockPrismaService.companyEmployee.findFirst.mockResolvedValue(null);

      await expect(
        service.getPerformanceOverview('company-123', 'unauthorized', 30),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should use default 30 days if not specified', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);

      const result = await service.getPerformanceOverview(
        'company-123',
        'user-123',
      );

      expect(result.period.days).toBe(30);
    });
  });
});
