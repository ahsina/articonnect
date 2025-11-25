import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceService } from './invoice.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { S3Service } from '../../upload/services/s3.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InvoiceType } from '@prisma/client';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let prismaService: PrismaService;
  let pdfGenerator: PdfGeneratorService;
  let s3Service: S3Service;

  const mockPrismaService = {
    invoice: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    invoiceSequence: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    mission: {
      findUnique: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockPdfGenerator = {
    generateInvoicePDF: jest.fn(),
  };

  const mockS3Service = {
    uploadBuffer: jest.fn(),
  };

  const mockInvoice = {
    id: 'invoice-123',
    invoiceNumber: 'INV-2025-00001',
    year: 2025,
    sequenceNumber: 1,
    type: InvoiceType.MISSION,
    missionId: 'mission-123',
    issuerId: 'artisan-123',
    clientId: 'client-123',
    subtotal: 100,
    taxRate: 17,
    taxAmount: 17,
    totalAmount: 117,
    platformCommissionRate: 12,
    platformCommission: 12,
    artisanNetAmount: 88,
    status: 'DRAFT',
    issueDate: new Date(),
    pdfUrl: null,
    issuer: {
      id: 'artisan-123',
      email: 'artisan@example.com',
      firstName: 'John',
      lastName: 'Doe',
    },
    client: {
      id: 'client-123',
      email: 'client@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PdfGeneratorService, useValue: mockPdfGenerator },
        { provide: S3Service, useValue: mockS3Service },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
    prismaService = module.get<PrismaService>(PrismaService);
    pdfGenerator = module.get<PdfGeneratorService>(PdfGeneratorService);
    s3Service = module.get<S3Service>(S3Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      type: InvoiceType.MISSION,
      missionId: 'mission-123',
      issuerId: 'artisan-123',
      clientId: 'client-123',
      subtotal: 100,
      taxRate: 17,
      lineItems: [{ description: 'Service', quantity: 1, unitPrice: 100, total: 100 }],
      issuerAddress: { name: 'Artisan', address: '123 St' },
      clientAddress: { name: 'Client', address: '456 St' },
      paymentDueDate: '2025-02-01',
    };

    it('should create an invoice with generated number', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          invoiceSequence: {
            findUnique: jest.fn().mockResolvedValue({ year: 2025, lastSequence: 0 }),
            create: jest.fn(),
            update: jest.fn().mockResolvedValue({ year: 2025, lastSequence: 1 }),
          },
        };
        return callback(tx);
      });
      mockPrismaService.invoice.create.mockResolvedValue(mockInvoice);

      const result = await service.create(createDto);

      expect(result).toEqual(mockInvoice);
      expect(mockPrismaService.invoice.create).toHaveBeenCalled();
    });

    it('should calculate amounts correctly', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          invoiceSequence: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ year: 2025, lastSequence: 0 }),
            update: jest.fn().mockResolvedValue({ year: 2025, lastSequence: 1 }),
          },
        };
        return callback(tx);
      });
      mockPrismaService.invoice.create.mockResolvedValue(mockInvoice);

      await service.create(createDto);

      expect(mockPrismaService.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taxAmount: 17,
            totalAmount: 117,
            platformCommission: 12,
            artisanNetAmount: 88,
          }),
        }),
      );
    });
  });

  describe('generatePDF', () => {
    it('should generate and upload PDF', async () => {
      const pdfBuffer = Buffer.from('PDF content');
      const pdfUrl = 'https://s3.example.com/invoices/INV-2025-00001.pdf';

      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockPdfGenerator.generateInvoicePDF.mockResolvedValue(pdfBuffer);
      mockS3Service.uploadBuffer.mockResolvedValue(pdfUrl);
      mockPrismaService.invoice.update.mockResolvedValue({ ...mockInvoice, pdfUrl });

      const result = await service.generatePDF('invoice-123');

      expect(result).toBe(pdfUrl);
      expect(mockPdfGenerator.generateInvoicePDF).toHaveBeenCalled();
      expect(mockS3Service.uploadBuffer).toHaveBeenCalledWith(
        pdfBuffer,
        'invoices/INV-2025-00001.pdf',
        'application/pdf',
      );
    });

    it('should throw NotFoundException if invoice not found', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      await expect(service.generatePDF('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('issue', () => {
    it('should issue draft invoice and generate PDF', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockPdfGenerator.generateInvoicePDF.mockResolvedValue(Buffer.from('PDF'));
      mockS3Service.uploadBuffer.mockResolvedValue('https://s3.example.com/invoice.pdf');
      mockPrismaService.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: 'ISSUED',
        pdfUrl: 'https://s3.example.com/invoice.pdf',
      });

      const result = await service.issue('invoice-123');

      expect(result.status).toBe('ISSUED');
    });

    it('should throw NotFoundException if invoice not found', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      await expect(service.issue('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if not draft', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue({
        ...mockInvoice,
        status: 'ISSUED',
      });

      await expect(service.issue('invoice-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('markAsPaid', () => {
    it('should mark invoice as paid', async () => {
      mockPrismaService.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: 'PAID',
        paidAt: new Date(),
      });

      const result = await service.markAsPaid('invoice-123');

      expect(result.status).toBe('PAID');
      expect(result.paidAt).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return paginated invoices', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([mockInvoice]);
      mockPrismaService.invoice.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.invoices).toEqual([mockInvoice]);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by issuerId', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.invoice.count.mockResolvedValue(0);

      await service.findAll({ issuerId: 'artisan-123' });

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ issuerId: 'artisan-123' }),
        }),
      );
    });

    it('should filter by date range', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.invoice.count.mockResolvedValue(0);

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      await service.findAll({ startDate, endDate });

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            issueDate: { gte: startDate, lte: endDate },
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return invoice by id', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      const result = await service.findOne('invoice-123');

      expect(result).toEqual(mockInvoice);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByInvoiceNumber', () => {
    it('should return invoice by number', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      const result = await service.findByInvoiceNumber('INV-2025-00001');

      expect(result).toEqual(mockInvoice);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      await expect(
        service.findByInvoiceNumber('INV-NONEXISTENT'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto = {
      notes: 'Updated notes',
    };

    it('should update draft invoice', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockPrismaService.invoice.update.mockResolvedValue({
        ...mockInvoice,
        notes: 'Updated notes',
      });

      const result = await service.update('invoice-123', updateDto);

      expect(result.notes).toBe('Updated notes');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for non-draft invoice full update', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue({
        ...mockInvoice,
        status: 'ISSUED',
      });

      await expect(
        service.update('invoice-123', { subtotal: 200, notes: 'test' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should recalculate amounts when subtotal changes', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockPrismaService.invoice.update.mockResolvedValue({
        ...mockInvoice,
        subtotal: 200,
        taxAmount: 34,
        totalAmount: 234,
      });

      await service.update('invoice-123', { subtotal: 200 });

      expect(mockPrismaService.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taxAmount: expect.any(Number),
            totalAmount: expect.any(Number),
          }),
        }),
      );
    });
  });

  describe('cancel', () => {
    it('should cancel invoice', async () => {
      mockPrismaService.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: 'CANCELLED',
      });

      const result = await service.cancel('invoice-123');

      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('remove', () => {
    it('should delete draft invoice', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockPrismaService.invoice.delete.mockResolvedValue(mockInvoice);

      await service.remove('invoice-123');

      expect(mockPrismaService.invoice.delete).toHaveBeenCalledWith({
        where: { id: 'invoice-123' },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for issued invoice', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue({
        ...mockInvoice,
        status: 'ISSUED',
      });

      await expect(service.remove('invoice-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createFromMission', () => {
    const mockMission = {
      id: 'mission-123',
      title: 'Plumbing repair',
      clientId: 'client-123',
      artisanId: 'artisan-123',
      finalPrice: 150,
      vatRate: 17,
      address: '123 Main St',
      city: 'Luxembourg',
      postalCode: '1234',
      country: 'LU',
      completedAt: new Date(),
      client: {
        firstName: 'Jane',
        lastName: 'Smith',
      },
      artisan: {
        firstName: 'John',
        lastName: 'Doe',
        artisanProfile: {
          baseAddress: '456 Pro St',
          siret: '12345678901234',
          vatNumber: 'LU12345678',
        },
      },
    };

    it('should create invoice from mission', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          invoiceSequence: {
            findUnique: jest.fn().mockResolvedValue({ year: 2025, lastSequence: 0 }),
            update: jest.fn().mockResolvedValue({ year: 2025, lastSequence: 1 }),
          },
        };
        return callback(tx);
      });
      mockPrismaService.invoice.create.mockResolvedValue(mockInvoice);

      const result = await service.createFromMission('mission-123');

      expect(result).toEqual(mockInvoice);
    });

    it('should throw NotFoundException if mission not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      await expect(service.createFromMission('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if mission has no artisan', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        artisan: null,
      });

      await expect(service.createFromMission('mission-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createFromOrder', () => {
    const mockOrder = {
      id: 'order-123',
      clientId: 'client-123',
      subtotal: 200,
      vat: 34,
      shippingAddress: '123 Shipping St',
      client: {
        firstName: 'Jane',
        lastName: 'Smith',
      },
      items: [
        {
          quantity: 2,
          unitPrice: 100,
          totalPrice: 200,
          product: {
            name: 'Handmade Item',
            artisan: {
              id: 'artisan-123',
              firstName: 'John',
              lastName: 'Doe',
              artisanProfile: {
                baseAddress: '456 Pro St',
                siret: '12345678901234',
                vatNumber: 'LU12345678',
              },
            },
          },
        },
      ],
    };

    it('should create invoice from order', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          invoiceSequence: {
            findUnique: jest.fn().mockResolvedValue({ year: 2025, lastSequence: 0 }),
            update: jest.fn().mockResolvedValue({ year: 2025, lastSequence: 1 }),
          },
        };
        return callback(tx);
      });
      mockPrismaService.invoice.create.mockResolvedValue({
        ...mockInvoice,
        type: InvoiceType.MARKETPLACE,
      });

      const result = await service.createFromOrder('order-123');

      expect(result.type).toBe(InvoiceType.MARKETPLACE);
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.createFromOrder('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if order has no artisan', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        items: [
          {
            ...mockOrder.items[0],
            product: {
              ...mockOrder.items[0].product,
              artisan: null,
            },
          },
        ],
      });

      await expect(service.createFromOrder('order-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
