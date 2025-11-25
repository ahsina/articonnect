import { Test, TestingModule } from '@nestjs/testing';
import { ExportService } from './export.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { ExportFormat, ExportType } from '../dto/export.dto';
import { Decimal } from '@prisma/client/runtime/library';

describe('ExportService', () => {
  let service: ExportService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    invoice: {
      findMany: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
    },
    vatDeclaration: {
      findMany: jest.fn(),
    },
    mission: {
      findMany: jest.fn(),
    },
  };

  const mockInvoices = [
    {
      id: 'inv-1',
      invoiceNumber: 'INV-2025-001',
      issueDate: new Date('2025-01-15'),
      subtotal: new Decimal(100),
      taxAmount: new Decimal(17),
      totalAmount: new Decimal(117),
      status: 'PAID',
      mission: { title: 'Fix plumbing' },
    },
    {
      id: 'inv-2',
      invoiceNumber: 'INV-2025-002',
      issueDate: new Date('2025-02-20'),
      subtotal: new Decimal(200),
      taxAmount: new Decimal(34),
      totalAmount: new Decimal(234),
      status: 'PENDING',
      mission: { title: 'Electrical work' },
    },
  ];

  const mockTransactions = [
    {
      id: 'txn-1',
      stripePaymentIntentId: 'pi_123',
      amount: new Decimal(117),
      commission: new Decimal(11.7),
      artisanAmount: new Decimal(105.3),
      status: 'COMPLETED',
      createdAt: new Date('2025-01-15'),
      mission: {
        title: 'Fix plumbing',
        client: { firstName: 'John', lastName: 'Doe' },
      },
    },
  ];

  const mockVatDeclarations = [
    {
      id: 'vat-1',
      period: '2025-Q1',
      countryCode: 'LU',
      totalSales: new Decimal(10000),
      totalTax: new Decimal(1700),
      totalTaxCredit: new Decimal(200),
      netTaxDue: new Decimal(1500),
      status: 'SUBMITTED',
      createdAt: new Date('2025-04-01'),
    },
  ];

  const mockMissions = [
    {
      id: 'mission-1',
      status: 'COMPLETED',
      finalPrice: new Decimal(117),
      completedAt: new Date('2025-01-15'),
    },
    {
      id: 'mission-2',
      status: 'COMPLETED',
      finalPrice: new Decimal(234),
      completedAt: new Date('2025-01-20'),
    },
    {
      id: 'mission-3',
      status: 'COMPLETED',
      finalPrice: new Decimal(150),
      completedAt: new Date('2025-02-10'),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateExport - CSV', () => {
    it('should generate invoices CSV export', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'ARTISAN',
        artisanProfile: { id: 'artisan-123' },
      });
      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);

      const result = await service.generateExport(
        {
          type: ExportType.INVOICES,
          format: ExportFormat.CSV,
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          artisanId: 'artisan-123',
        },
        'artisan-123',
      );

      expect(result).toBeInstanceOf(Buffer);
      const csvContent = result.toString('utf-8');
      expect(csvContent).toContain('N° Facture');
      expect(csvContent).toContain('INV-2025-001');
    });

    it('should generate transactions CSV export', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'ARTISAN',
        artisanProfile: { id: 'artisan-123' },
      });
      mockPrismaService.transaction.findMany.mockResolvedValue(mockTransactions);

      const result = await service.generateExport(
        {
          type: ExportType.TRANSACTIONS,
          format: ExportFormat.CSV,
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          artisanId: 'artisan-123',
        },
        'artisan-123',
      );

      const csvContent = result.toString('utf-8');
      expect(csvContent).toContain('Transaction ID');
      expect(csvContent).toContain('John Doe');
    });

    it('should generate VAT declarations CSV export', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'ARTISAN',
        artisanProfile: { id: 'artisan-123' },
      });
      mockPrismaService.vatDeclaration.findMany.mockResolvedValue(
        mockVatDeclarations,
      );

      const result = await service.generateExport(
        {
          type: ExportType.VAT_DECLARATIONS,
          format: ExportFormat.CSV,
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          artisanId: 'artisan-123',
        },
        'artisan-123',
      );

      const csvContent = result.toString('utf-8');
      expect(csvContent).toContain('Période');
      expect(csvContent).toContain('2025-Q1');
    });

    it('should generate revenue report CSV export', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'ARTISAN',
        artisanProfile: { id: 'artisan-123' },
      });
      mockPrismaService.mission.findMany.mockResolvedValue(mockMissions);

      const result = await service.generateExport(
        {
          type: ExportType.REVENUE_REPORT,
          format: ExportFormat.CSV,
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          artisanId: 'artisan-123',
        },
        'artisan-123',
      );

      const csvContent = result.toString('utf-8');
      expect(csvContent).toContain('Mois');
      expect(csvContent).toContain('Nb Missions');
      expect(csvContent).toContain('TOTAL');
    });
  });

  describe('generateExport - PDF', () => {
    it('should generate invoices PDF export', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'ARTISAN',
        artisanProfile: { id: 'artisan-123' },
      });
      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);

      const result = await service.generateExport(
        {
          type: ExportType.INVOICES,
          format: ExportFormat.PDF,
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          artisanId: 'artisan-123',
        },
        'artisan-123',
      );

      expect(result).toBeInstanceOf(Buffer);
      // PDF should start with %PDF
      expect(result.toString('utf-8').substring(0, 4)).toBe('%PDF');
    });
  });

  describe('access control', () => {
    it('should allow admin to access any artisan data', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
      });
      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);

      await expect(
        service.generateExport(
          {
            type: ExportType.INVOICES,
            format: ExportFormat.CSV,
            startDate: '2025-01-01',
            endDate: '2025-12-31',
            artisanId: 'other-artisan',
          },
          'admin-123',
        ),
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundException for unauthorized access', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'ARTISAN',
        artisanProfile: { id: 'artisan-123' },
      });

      await expect(
        service.generateExport(
          {
            type: ExportType.INVOICES,
            format: ExportFormat.CSV,
            startDate: '2025-01-01',
            endDate: '2025-12-31',
            artisanId: 'other-artisan',
          },
          'artisan-123',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.generateExport(
          {
            type: ExportType.INVOICES,
            format: ExportFormat.CSV,
            startDate: '2025-01-01',
            endDate: '2025-12-31',
            artisanId: 'artisan-123',
          },
          'nonexistent',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('CSV generation', () => {
    it('should escape commas in values', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'ARTISAN',
        artisanProfile: { id: 'artisan-123' },
      });
      mockPrismaService.invoice.findMany.mockResolvedValue([
        {
          ...mockInvoices[0],
          mission: { title: 'Fix plumbing, electrical work' },
        },
      ]);

      const result = await service.generateExport(
        {
          type: ExportType.INVOICES,
          format: ExportFormat.CSV,
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          artisanId: 'artisan-123',
        },
        'artisan-123',
      );

      const csvContent = result.toString('utf-8');
      expect(csvContent).toContain('"Fix plumbing, electrical work"');
    });
  });

  describe('revenue report aggregation', () => {
    it('should group missions by month', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'ARTISAN',
        artisanProfile: { id: 'artisan-123' },
      });
      mockPrismaService.mission.findMany.mockResolvedValue(mockMissions);

      const result = await service.generateExport(
        {
          type: ExportType.REVENUE_REPORT,
          format: ExportFormat.CSV,
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          artisanId: 'artisan-123',
        },
        'artisan-123',
      );

      const csvContent = result.toString('utf-8');
      expect(csvContent).toContain('2025-01'); // January
      expect(csvContent).toContain('2025-02'); // February
    });

    it('should calculate correct totals', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'ARTISAN',
        artisanProfile: { id: 'artisan-123' },
      });
      mockPrismaService.mission.findMany.mockResolvedValue(mockMissions);

      const result = await service.generateExport(
        {
          type: ExportType.REVENUE_REPORT,
          format: ExportFormat.CSV,
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          artisanId: 'artisan-123',
        },
        'artisan-123',
      );

      const csvContent = result.toString('utf-8');
      // Total should be 117 + 234 + 150 = 501
      expect(csvContent).toContain('501.00');
    });
  });
});
