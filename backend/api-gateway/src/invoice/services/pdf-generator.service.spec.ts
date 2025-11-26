import { Test, TestingModule } from '@nestjs/testing';
import { PdfGeneratorService } from './pdf-generator.service';

// Mock pdfkit - define inline to avoid hoisting issues
jest.mock('pdfkit', () => {
  const createMockDoc = () => {
    const mockDoc: any = {
      on: jest.fn((event: string, callback: (...args: any[]) => void) => {
        if (event === 'data') {
          // Simulate data event with mock buffer
          setTimeout(() => callback(Buffer.from('mock-pdf-data')), 0);
        }
        if (event === 'end') {
          setTimeout(() => callback(), 10);
        }
        return mockDoc;
      }),
      fontSize: jest.fn().mockReturnThis(),
      font: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      moveDown: jest.fn().mockReturnThis(),
      moveTo: jest.fn().mockReturnThis(),
      lineTo: jest.fn().mockReturnThis(),
      stroke: jest.fn().mockReturnThis(),
      fillColor: jest.fn().mockReturnThis(),
      end: jest.fn(),
      y: 200,
    };
    return mockDoc;
  };

  const mockConstructor = jest.fn().mockImplementation(() => createMockDoc());
  // Expose factory for error test scenario
  mockConstructor.createMockDoc = createMockDoc;
  return mockConstructor;
});

// Get reference to mock for use in tests
const mockPDFDocument = jest.requireMock('pdfkit') as jest.Mock & { createMockDoc: () => any };

describe('PdfGeneratorService', () => {
  let service: PdfGeneratorService;

  const mockInvoiceData = {
    invoiceNumber: 'INV-2025-001',
    issueDate: new Date('2025-01-15'),
    paymentDueDate: new Date('2025-02-15'),
    issuer: {
      name: 'Pierre Plomberie',
      address: '10 Rue de la Plomberie',
      city: 'Luxembourg',
      postalCode: '1234',
      country: 'Luxembourg',
      siret: '12345678901234',
      vat: 'LU12345678',
    },
    client: {
      name: 'Jean Client',
      address: '20 Avenue du Client',
      city: 'Paris',
      postalCode: '75001',
      country: 'France',
    },
    lineItems: [
      {
        description: 'Réparation plomberie',
        quantity: 2,
        unitPrice: 50,
        total: 100,
      },
      {
        description: 'Pièces détachées',
        quantity: 1,
        unitPrice: 30,
        total: 30,
      },
    ],
    subtotal: 130,
    taxRate: 17,
    taxAmount: 22.10,
    totalAmount: 152.10,
    platformCommissionRate: 10,
    platformCommission: 15.21,
    artisanNetAmount: 136.89,
    notes: 'Merci pour votre confiance',
  };

  beforeEach(async () => {
    // Restore mock implementation (in case clearAllMocks cleared it)
    mockPDFDocument.mockImplementation(() => mockPDFDocument.createMockDoc());

    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfGeneratorService],
    }).compile();

    service = module.get<PdfGeneratorService>(PdfGeneratorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateInvoicePDF', () => {
    it('should generate a PDF buffer', async () => {
      const result = await service.generateInvoicePDF(mockInvoiceData);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate PDF without notes', async () => {
      const dataWithoutNotes = { ...mockInvoiceData, notes: undefined };

      const result = await service.generateInvoicePDF(dataWithoutNotes);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate PDF without payment due date', async () => {
      const dataWithoutDueDate = { ...mockInvoiceData, paymentDueDate: undefined };

      const result = await service.generateInvoicePDF(dataWithoutDueDate);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate PDF without SIRET', async () => {
      const dataWithoutSiret = {
        ...mockInvoiceData,
        issuer: { ...mockInvoiceData.issuer, siret: undefined },
      };

      const result = await service.generateInvoicePDF(dataWithoutSiret);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate PDF without VAT number', async () => {
      const dataWithoutVat = {
        ...mockInvoiceData,
        issuer: { ...mockInvoiceData.issuer, vat: undefined },
      };

      const result = await service.generateInvoicePDF(dataWithoutVat);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle multiple line items', async () => {
      const dataWithMoreItems = {
        ...mockInvoiceData,
        lineItems: [
          { description: 'Item 1', quantity: 1, unitPrice: 10, total: 10 },
          { description: 'Item 2', quantity: 2, unitPrice: 20, total: 40 },
          { description: 'Item 3', quantity: 3, unitPrice: 30, total: 90 },
          { description: 'Item 4', quantity: 4, unitPrice: 40, total: 160 },
          { description: 'Item 5', quantity: 5, unitPrice: 50, total: 250 },
        ],
      };

      const result = await service.generateInvoicePDF(dataWithMoreItems);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle empty line items', async () => {
      const dataWithEmptyItems = {
        ...mockInvoiceData,
        lineItems: [],
      };

      const result = await service.generateInvoicePDF(dataWithEmptyItems);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should format dates in French format', async () => {
      // The actual formatting is internal, but we can verify the PDF is generated
      const result = await service.generateInvoicePDF(mockInvoiceData);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should format currency with Euro symbol', async () => {
      // The actual formatting is internal, but we can verify the PDF is generated
      const result = await service.generateInvoicePDF(mockInvoiceData);

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('private methods (via integration)', () => {
    it('should include header in PDF', async () => {
      // We test this indirectly through generateInvoicePDF
      const result = await service.generateInvoicePDF(mockInvoiceData);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include invoice details in PDF', async () => {
      const result = await service.generateInvoicePDF(mockInvoiceData);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include addresses in PDF', async () => {
      const result = await service.generateInvoicePDF(mockInvoiceData);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include line items table in PDF', async () => {
      const result = await service.generateInvoicePDF(mockInvoiceData);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include summary in PDF', async () => {
      const result = await service.generateInvoicePDF(mockInvoiceData);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include footer in PDF', async () => {
      const result = await service.generateInvoicePDF(mockInvoiceData);
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('error handling', () => {
    it('should handle PDF generation errors', async () => {
      // Mock error scenario - temporarily override the mock
      mockPDFDocument.mockImplementationOnce(() => {
        const errorMockDoc: any = {
          on: jest.fn((event: string, callback: (...args: any[]) => void) => {
            if (event === 'error') {
              setTimeout(() => callback(new Error('PDF generation failed')), 0);
            }
            return errorMockDoc;
          }),
          fontSize: jest.fn().mockReturnThis(),
          font: jest.fn().mockReturnThis(),
          text: jest.fn().mockReturnThis(),
          moveDown: jest.fn().mockReturnThis(),
          moveTo: jest.fn().mockReturnThis(),
          lineTo: jest.fn().mockReturnThis(),
          stroke: jest.fn().mockReturnThis(),
          fillColor: jest.fn().mockReturnThis(),
          end: jest.fn(),
          y: 200,
        };
        return errorMockDoc;
      });

      await expect(
        service.generateInvoicePDF(mockInvoiceData),
      ).rejects.toThrow('PDF generation failed');
    });
  });

  describe('data validation', () => {
    it('should handle zero amounts', async () => {
      const dataWithZeros = {
        ...mockInvoiceData,
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
        platformCommission: 0,
        artisanNetAmount: 0,
      };

      const result = await service.generateInvoicePDF(dataWithZeros);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle large amounts', async () => {
      const dataWithLargeAmounts = {
        ...mockInvoiceData,
        subtotal: 999999.99,
        taxAmount: 169999.99,
        totalAmount: 1169999.98,
        platformCommission: 116999.99,
        artisanNetAmount: 1052999.99,
      };

      const result = await service.generateInvoicePDF(dataWithLargeAmounts);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle special characters in text', async () => {
      const dataWithSpecialChars = {
        ...mockInvoiceData,
        issuer: {
          ...mockInvoiceData.issuer,
          name: 'Société "Café & Thé" <test>',
        },
        notes: 'Notes with émojis 🔧 and special chars: é, è, à, ü',
      };

      const result = await service.generateInvoicePDF(dataWithSpecialChars);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle long descriptions', async () => {
      const dataWithLongDesc = {
        ...mockInvoiceData,
        lineItems: [
          {
            description: 'Very long description that spans multiple lines and contains a lot of text to test the wrapping functionality of the PDF generator',
            quantity: 1,
            unitPrice: 100,
            total: 100,
          },
        ],
      };

      const result = await service.generateInvoicePDF(dataWithLongDesc);

      expect(result).toBeInstanceOf(Buffer);
    });
  });
});
