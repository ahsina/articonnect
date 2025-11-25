import { Test, TestingModule } from '@nestjs/testing';
import { VatService } from './vat.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { ServiceCategory } from '@prisma/client';

describe('VatService', () => {
  let service: VatService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    taxRate: {
      findFirst: jest.fn(),
    },
    country: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    transaction: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    vatDeclaration: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockCountry = {
    code: 'LU',
    name: 'Luxembourg',
    standardRate: 17,
    taxRates: [
      { category: ServiceCategory.MAINTENANCE, rate: 8 },
      { category: ServiceCategory.INSTALLATION, rate: 17 },
    ],
  };

  const mockTaxRate = {
    id: 'rate-123',
    countryId: 'country-123',
    category: ServiceCategory.MAINTENANCE,
    rate: 8,
    effectiveFrom: new Date('2023-01-01'),
    effectiveTo: null,
    country: mockCountry,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VatService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<VatService>(VatService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTaxRate', () => {
    it('should return specific tax rate for category', async () => {
      mockPrismaService.taxRate.findFirst.mockResolvedValue(mockTaxRate);

      const result = await service.getTaxRate('LU', ServiceCategory.MAINTENANCE);

      expect(result).toBe(8);
    });

    it('should fallback to standard rate if no specific rate exists', async () => {
      mockPrismaService.taxRate.findFirst.mockResolvedValue(null);
      mockPrismaService.country.findUnique.mockResolvedValue(mockCountry);

      const result = await service.getTaxRate('LU', ServiceCategory.OTHER);

      expect(result).toBe(17);
    });

    it('should throw NotFoundException if country not found', async () => {
      mockPrismaService.taxRate.findFirst.mockResolvedValue(null);
      mockPrismaService.country.findUnique.mockResolvedValue(null);

      await expect(
        service.getTaxRate('XX', ServiceCategory.MAINTENANCE),
      ).rejects.toThrow(NotFoundException);
    });

    it('should normalize country code to uppercase', async () => {
      mockPrismaService.taxRate.findFirst.mockResolvedValue(mockTaxRate);

      await service.getTaxRate('lu', ServiceCategory.MAINTENANCE);

      expect(mockPrismaService.taxRate.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          country: { code: 'LU' },
        }),
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });
    });
  });

  describe('calculateVat', () => {
    it('should calculate VAT correctly', async () => {
      mockPrismaService.taxRate.findFirst.mockResolvedValue(mockTaxRate);

      const result = await service.calculateVat(
        'LU',
        ServiceCategory.MAINTENANCE,
        100,
      );

      expect(result).toEqual({
        countryCode: 'LU',
        category: ServiceCategory.MAINTENANCE,
        subtotal: 100,
        vatRate: 8,
        vatAmount: 8,
        totalAmount: 108,
      });
    });

    it('should handle decimal precision correctly', async () => {
      mockPrismaService.taxRate.findFirst.mockResolvedValue({
        ...mockTaxRate,
        rate: 17,
      });

      const result = await service.calculateVat(
        'LU',
        ServiceCategory.INSTALLATION,
        99.99,
      );

      expect(result.vatAmount).toBe(17);
      expect(result.totalAmount).toBe(116.99);
    });

    it('should calculate zero VAT for exempted categories', async () => {
      mockPrismaService.taxRate.findFirst.mockResolvedValue({
        ...mockTaxRate,
        rate: 0,
      });

      const result = await service.calculateVat(
        'LU',
        ServiceCategory.MAINTENANCE,
        100,
      );

      expect(result.vatAmount).toBe(0);
      expect(result.totalAmount).toBe(100);
    });
  });

  describe('determineCategoryFromMission', () => {
    it('should return EMERGENCY for emergency missions', () => {
      const result = service.determineCategoryFromMission('REPAIR', true);

      expect(result).toBe(ServiceCategory.EMERGENCY);
    });

    it('should map INSTALLATION type correctly', () => {
      const result = service.determineCategoryFromMission('INSTALLATION', false);

      expect(result).toBe(ServiceCategory.INSTALLATION);
    });

    it('should map MAINTENANCE type correctly', () => {
      const result = service.determineCategoryFromMission('MAINTENANCE', false);

      expect(result).toBe(ServiceCategory.MAINTENANCE);
    });

    it('should map REPAIR to RENOVATION', () => {
      const result = service.determineCategoryFromMission('REPAIR', false);

      expect(result).toBe(ServiceCategory.RENOVATION);
    });

    it('should return OTHER for unknown types', () => {
      const result = service.determineCategoryFromMission('CUSTOM', false);

      expect(result).toBe(ServiceCategory.OTHER);
    });
  });

  describe('getTaxRatesByCountry', () => {
    it('should return country with tax rates', async () => {
      mockPrismaService.country.findUnique.mockResolvedValue(mockCountry);

      const result = await service.getTaxRatesByCountry('LU');

      expect(result).toEqual(mockCountry);
      expect(mockPrismaService.country.findUnique).toHaveBeenCalledWith({
        where: { code: 'LU' },
        include: expect.objectContaining({
          taxRates: expect.any(Object),
        }),
      });
    });

    it('should throw NotFoundException if country not found', async () => {
      mockPrismaService.country.findUnique.mockResolvedValue(null);

      await expect(service.getTaxRatesByCountry('XX')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should normalize country code', async () => {
      mockPrismaService.country.findUnique.mockResolvedValue(mockCountry);

      await service.getTaxRatesByCountry('lu');

      expect(mockPrismaService.country.findUnique).toHaveBeenCalledWith({
        where: { code: 'LU' },
        include: expect.any(Object),
      });
    });
  });

  describe('getAllCountries', () => {
    it('should return all countries with tax rates', async () => {
      mockPrismaService.country.findMany.mockResolvedValue([mockCountry]);

      const result = await service.getAllCountries();

      expect(result).toHaveLength(1);
      expect(mockPrismaService.country.findMany).toHaveBeenCalledWith({
        include: expect.objectContaining({
          taxRates: expect.any(Object),
        }),
        orderBy: { code: 'asc' },
      });
    });
  });

  describe('checkVatExemption', () => {
    it('should return true if under threshold', async () => {
      mockPrismaService.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 30000 },
      });

      const result = await service.checkVatExemption('artisan-123', 'LU');

      expect(result).toBe(true);
    });

    it('should return false if over threshold', async () => {
      mockPrismaService.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 40000 },
      });

      const result = await service.checkVatExemption('artisan-123', 'LU');

      expect(result).toBe(false);
    });

    it('should handle null revenue', async () => {
      mockPrismaService.transaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await service.checkVatExemption('artisan-123', 'LU');

      expect(result).toBe(true);
    });

    it('should use correct threshold for France', async () => {
      mockPrismaService.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 36000 },
      });

      const result = await service.checkVatExemption('artisan-123', 'FR');

      expect(result).toBe(true); // Under 37500 threshold
    });

    it('should use zero threshold for unknown countries', async () => {
      mockPrismaService.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 100 },
      });

      const result = await service.checkVatExemption('artisan-123', 'XX');

      expect(result).toBe(false); // 100 > 0
    });
  });

  describe('generateVatDeclaration', () => {
    const mockTransactions = [
      {
        id: 'tx-1',
        status: 'COMPLETED',
        artisanAmount: 100,
        mission: { vatRate: 17 },
      },
      {
        id: 'tx-2',
        status: 'COMPLETED',
        artisanAmount: 200,
        mission: { vatRate: 17 },
      },
    ];

    it('should generate quarterly declaration', async () => {
      mockPrismaService.transaction.findMany.mockResolvedValue(mockTransactions);
      mockPrismaService.vatDeclaration.findUnique.mockResolvedValue(null);
      mockPrismaService.vatDeclaration.create.mockResolvedValue({
        id: 'decl-123',
        artisanId: 'artisan-123',
        period: '2025-Q1',
        countryCode: 'LU',
        totalSales: 300,
        totalTax: 51,
        netTaxDue: 51,
        status: 'DRAFT',
      });

      const result = await service.generateVatDeclaration(
        'artisan-123',
        '2025-Q1',
        'LU',
      );

      expect(result.period).toBe('2025-Q1');
      expect(result.totalSales).toBe(300);
    });

    it('should generate monthly declaration', async () => {
      mockPrismaService.transaction.findMany.mockResolvedValue(mockTransactions);
      mockPrismaService.vatDeclaration.findUnique.mockResolvedValue(null);
      mockPrismaService.vatDeclaration.create.mockResolvedValue({
        id: 'decl-123',
        period: '2025-01',
        status: 'DRAFT',
      });

      const result = await service.generateVatDeclaration(
        'artisan-123',
        '2025-01',
        'LU',
      );

      expect(result.period).toBe('2025-01');
    });

    it('should update existing declaration', async () => {
      mockPrismaService.transaction.findMany.mockResolvedValue(mockTransactions);
      mockPrismaService.vatDeclaration.findUnique.mockResolvedValue({
        id: 'existing-decl',
        period: '2025-Q1',
      });
      mockPrismaService.vatDeclaration.update.mockResolvedValue({
        id: 'existing-decl',
        period: '2025-Q1',
        totalSales: 300,
      });

      await service.generateVatDeclaration('artisan-123', '2025-Q1', 'LU');

      expect(mockPrismaService.vatDeclaration.update).toHaveBeenCalled();
      expect(mockPrismaService.vatDeclaration.create).not.toHaveBeenCalled();
    });

    it('should throw error for invalid period format', async () => {
      await expect(
        service.generateVatDeclaration('artisan-123', 'invalid', 'LU'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error for invalid quarter', async () => {
      await expect(
        service.generateVatDeclaration('artisan-123', '2025-Q5', 'LU'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error for invalid month', async () => {
      await expect(
        service.generateVatDeclaration('artisan-123', '2025-13', 'LU'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getVatDeclarations', () => {
    const mockDeclarations = [
      {
        id: 'decl-1',
        artisanId: 'artisan-123',
        period: '2025-Q1',
        countryCode: 'LU',
        status: 'DRAFT',
      },
      {
        id: 'decl-2',
        artisanId: 'artisan-123',
        period: '2024-Q4',
        countryCode: 'LU',
        status: 'SUBMITTED',
      },
    ];

    it('should return all declarations for artisan', async () => {
      mockPrismaService.vatDeclaration.findMany.mockResolvedValue(mockDeclarations);

      const result = await service.getVatDeclarations('artisan-123');

      expect(result).toHaveLength(2);
      expect(mockPrismaService.vatDeclaration.findMany).toHaveBeenCalledWith({
        where: { artisanId: 'artisan-123' },
        orderBy: { period: 'desc' },
      });
    });

    it('should filter by year', async () => {
      mockPrismaService.vatDeclaration.findMany.mockResolvedValue([
        mockDeclarations[0],
      ]);

      await service.getVatDeclarations('artisan-123', { year: 2025 });

      expect(mockPrismaService.vatDeclaration.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          period: { startsWith: '2025' },
        }),
        orderBy: expect.any(Object),
      });
    });

    it('should filter by country code', async () => {
      mockPrismaService.vatDeclaration.findMany.mockResolvedValue(mockDeclarations);

      await service.getVatDeclarations('artisan-123', { countryCode: 'lu' });

      expect(mockPrismaService.vatDeclaration.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          countryCode: 'LU',
        }),
        orderBy: expect.any(Object),
      });
    });

    it('should filter by status', async () => {
      mockPrismaService.vatDeclaration.findMany.mockResolvedValue([
        mockDeclarations[1],
      ]);

      await service.getVatDeclarations('artisan-123', { status: 'SUBMITTED' });

      expect(mockPrismaService.vatDeclaration.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: 'SUBMITTED',
        }),
        orderBy: expect.any(Object),
      });
    });

    it('should combine multiple filters', async () => {
      mockPrismaService.vatDeclaration.findMany.mockResolvedValue([]);

      await service.getVatDeclarations('artisan-123', {
        year: 2025,
        countryCode: 'LU',
        status: 'DRAFT',
      });

      expect(mockPrismaService.vatDeclaration.findMany).toHaveBeenCalledWith({
        where: {
          artisanId: 'artisan-123',
          period: { startsWith: '2025' },
          countryCode: 'LU',
          status: 'DRAFT',
        },
        orderBy: { period: 'desc' },
      });
    });
  });
});
