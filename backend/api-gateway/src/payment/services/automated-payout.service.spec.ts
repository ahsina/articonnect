import { Test, TestingModule } from '@nestjs/testing';
import { AutomatedPayoutService } from './automated-payout.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('AutomatedPayoutService', () => {
  let service: AutomatedPayoutService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    company: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    employeeEarnings: {
      findMany: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn((operations) => Promise.all(operations)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomatedPayoutService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AutomatedPayoutService>(AutomatedPayoutService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processCompanyPayouts', () => {
    const mockCompany = {
      id: 'company-123',
      settings: {
        payoutFrequency: 'WEEKLY',
        minimumPayout: new Prisma.Decimal(50),
      },
      employees: [
        { id: 'emp-1', status: 'ACTIVE' },
        { id: 'emp-2', status: 'ACTIVE' },
      ],
    };

    it('should process payouts for employees above minimum', async () => {
      const mockEarnings = [
        {
          id: 'earning-1',
          employeeId: 'emp-1',
          employeeCommission: new Prisma.Decimal(100),
          status: 'PENDING',
          employee: { companyId: 'company-123', status: 'ACTIVE' },
        },
        {
          id: 'earning-2',
          employeeId: 'emp-1',
          employeeCommission: new Prisma.Decimal(50),
          status: 'PENDING',
          employee: { companyId: 'company-123', status: 'ACTIVE' },
        },
      ];

      mockPrismaService.employeeEarnings.findMany.mockResolvedValue(mockEarnings);
      mockPrismaService.employeeEarnings.update.mockResolvedValue({});

      const result = await service.processCompanyPayouts(mockCompany);

      expect(result.processedCount).toBe(2);
      expect(result.companyId).toBe('company-123');
    });

    it('should skip employees below minimum payout', async () => {
      const mockEarnings = [
        {
          id: 'earning-1',
          employeeId: 'emp-1',
          employeeCommission: new Prisma.Decimal(30), // Below 50 minimum
          status: 'PENDING',
          employee: { companyId: 'company-123', status: 'ACTIVE' },
        },
      ];

      mockPrismaService.employeeEarnings.findMany.mockResolvedValue(mockEarnings);

      const result = await service.processCompanyPayouts(mockCompany);

      expect(result.processedCount).toBe(0);
    });

    it('should group earnings by employee', async () => {
      const mockEarnings = [
        {
          id: 'earning-1',
          employeeId: 'emp-1',
          employeeCommission: new Prisma.Decimal(30),
          status: 'PENDING',
          employee: { companyId: 'company-123', status: 'ACTIVE' },
        },
        {
          id: 'earning-2',
          employeeId: 'emp-1',
          employeeCommission: new Prisma.Decimal(30), // Total: 60, above minimum
          status: 'PENDING',
          employee: { companyId: 'company-123', status: 'ACTIVE' },
        },
        {
          id: 'earning-3',
          employeeId: 'emp-2',
          employeeCommission: new Prisma.Decimal(20), // Below minimum
          status: 'PENDING',
          employee: { companyId: 'company-123', status: 'ACTIVE' },
        },
      ];

      mockPrismaService.employeeEarnings.findMany.mockResolvedValue(mockEarnings);
      mockPrismaService.employeeEarnings.update.mockResolvedValue({});

      const result = await service.processCompanyPayouts(mockCompany);

      // Only emp-1's earnings should be processed (2 earnings, total 60)
      expect(result.processedCount).toBe(2);
    });

    it('should use default minimum payout when not set', async () => {
      const companyNoMinimum = {
        ...mockCompany,
        settings: { payoutFrequency: 'WEEKLY' },
      };

      mockPrismaService.employeeEarnings.findMany.mockResolvedValue([]);

      const result = await service.processCompanyPayouts(companyNoMinimum);

      expect(result.processedCount).toBe(0);
    });
  });

  describe('processCompanyPayoutsManually', () => {
    it('should process payouts for a specific company', async () => {
      const mockCompany = {
        id: 'company-123',
        settings: { minimumPayout: new Prisma.Decimal(50) },
        employees: [],
      };

      mockPrismaService.company.findUnique.mockResolvedValue(mockCompany);
      mockPrismaService.employeeEarnings.findMany.mockResolvedValue([]);

      const result = await service.processCompanyPayoutsManually('company-123');

      expect(result.companyId).toBe('company-123');
    });

    it('should throw error if company not found', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(null);

      await expect(
        service.processCompanyPayoutsManually('invalid-id'),
      ).rejects.toThrow('Company not found');
    });
  });

  describe('getPayoutSchedule', () => {
    const mockCompany = {
      id: 'company-123',
      settings: {
        payoutFrequency: 'WEEKLY',
        minimumPayout: new Prisma.Decimal(50),
      },
    };

    it('should return payout schedule for company', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(mockCompany);
      mockPrismaService.employeeEarnings.findMany.mockResolvedValue([
        {
          id: 'earning-1',
          employeeId: 'emp-1',
          employeeCommission: new Prisma.Decimal(100),
          employee: {
            id: 'emp-1',
            userId: 'user-1',
            user: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
          },
        },
      ]);

      const result = await service.getPayoutSchedule('company-123');

      expect(result.companyId).toBe('company-123');
      expect(result.payoutFrequency).toBe('WEEKLY');
      expect(result.minimumPayout).toBe('50');
      expect(result.employeeSchedules).toHaveLength(1);
      expect(result.employeeSchedules[0].meetsMinimum).toBe(true);
    });

    it('should throw error if company not found', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(null);

      await expect(service.getPayoutSchedule('invalid-id')).rejects.toThrow(
        'Company not found',
      );
    });

    it('should identify employees above and below minimum', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(mockCompany);
      mockPrismaService.employeeEarnings.findMany.mockResolvedValue([
        {
          id: 'earning-1',
          employeeId: 'emp-1',
          employeeCommission: new Prisma.Decimal(100),
          employee: {
            id: 'emp-1',
            userId: 'user-1',
            user: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
          },
        },
        {
          id: 'earning-2',
          employeeId: 'emp-2',
          employeeCommission: new Prisma.Decimal(30),
          employee: {
            id: 'emp-2',
            userId: 'user-2',
            user: { id: 'user-2', firstName: 'Jane', lastName: 'Smith' },
          },
        },
      ]);

      const result = await service.getPayoutSchedule('company-123');

      expect(result.employeesAboveMinimum).toBe(1);
      expect(result.employeesBelowMinimum).toBe(1);
    });

    it('should calculate next payout date correctly', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(mockCompany);
      mockPrismaService.employeeEarnings.findMany.mockResolvedValue([]);

      const result = await service.getPayoutSchedule('company-123');

      expect(result.nextPayoutDate).toBeInstanceOf(Date);
      expect(result.nextPayoutDate.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('getPayoutStatistics', () => {
    it('should return payout statistics', async () => {
      mockPrismaService.employeeEarnings.aggregate
        .mockResolvedValueOnce({
          _sum: { employeeCommission: new Prisma.Decimal(1000) },
          _count: 10,
        })
        .mockResolvedValueOnce({
          _sum: { employeeCommission: new Prisma.Decimal(500) },
          _count: 5,
        })
        .mockResolvedValueOnce({
          _sum: { employeeCommission: new Prisma.Decimal(5000) },
          _count: 50,
        });

      const result = await service.getPayoutStatistics();

      expect(result.pending.count).toBe(10);
      expect(result.processing.count).toBe(5);
      expect(result.paid.count).toBe(50);
    });

    it('should handle null sums', async () => {
      mockPrismaService.employeeEarnings.aggregate
        .mockResolvedValueOnce({ _sum: { employeeCommission: null }, _count: 0 })
        .mockResolvedValueOnce({ _sum: { employeeCommission: null }, _count: 0 })
        .mockResolvedValueOnce({ _sum: { employeeCommission: null }, _count: 0 });

      const result = await service.getPayoutStatistics();

      expect(result.pending.amount).toBe(0);
      expect(result.pending.count).toBe(0);
    });
  });

  describe('calculateNextPayoutDate', () => {
    it('should calculate daily payout date', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue({
        id: 'company-123',
        settings: { payoutFrequency: 'DAILY', minimumPayout: new Prisma.Decimal(50) },
      });
      mockPrismaService.employeeEarnings.findMany.mockResolvedValue([]);

      const result = await service.getPayoutSchedule('company-123');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      expect(result.nextPayoutDate.getDate()).toBe(tomorrow.getDate());
    });

    it('should calculate monthly payout date', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue({
        id: 'company-123',
        settings: { payoutFrequency: 'MONTHLY', minimumPayout: new Prisma.Decimal(50) },
      });
      mockPrismaService.employeeEarnings.findMany.mockResolvedValue([]);

      const result = await service.getPayoutSchedule('company-123');
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1, 1);

      expect(result.nextPayoutDate.getMonth()).toBe(nextMonth.getMonth());
      expect(result.nextPayoutDate.getDate()).toBe(1);
    });
  });
});
