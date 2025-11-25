import { Test, TestingModule } from '@nestjs/testing';
import { PaymentCronService } from './payment-cron.service';
import { DeferredPaymentService } from './deferred-payment.service';

describe('PaymentCronService', () => {
  let service: PaymentCronService;
  let deferredPaymentService: DeferredPaymentService;

  const mockDeferredPaymentService = {
    getOverdueInvoices: jest.fn(),
    suspendForNonPayment: jest.fn(),
    checkEligibility: jest.fn(),
    disableDeferredPayment: jest.fn(),
  };

  const mockPrisma = {
    clientProfile: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  // Attach mock prisma to deferred payment service
  (mockDeferredPaymentService as any)['prisma'] = mockPrisma;

  const mockOverdueInvoice = {
    id: 'invoice-123',
    clientId: 'client-123',
    invoiceNumber: 'INV-2025-001',
    totalAmount: { toString: () => '150' },
    paymentDueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
  };

  const mockClientProfile = {
    userId: 'client-123',
    deferredPaymentEnabled: true,
    creditLimit: { toString: () => '1000' },
    user: {
      id: 'client-123',
      email: 'client@example.com',
      reputationScore: 120,
      completedMissions: 15,
      disputeCount: 0,
      noShowCount: 0,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentCronService,
        { provide: DeferredPaymentService, useValue: mockDeferredPaymentService },
      ],
    }).compile();

    service = module.get<PaymentCronService>(PaymentCronService);
    deferredPaymentService = module.get<DeferredPaymentService>(DeferredPaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkOverdueInvoices', () => {
    it('should do nothing when no overdue invoices', async () => {
      mockDeferredPaymentService.getOverdueInvoices.mockResolvedValue([]);

      await service.checkOverdueInvoices();

      expect(mockDeferredPaymentService.getOverdueInvoices).toHaveBeenCalled();
      expect(mockDeferredPaymentService.suspendForNonPayment).not.toHaveBeenCalled();
    });

    it('should process overdue invoices', async () => {
      mockDeferredPaymentService.getOverdueInvoices.mockResolvedValue([mockOverdueInvoice]);

      await service.checkOverdueInvoices();

      expect(mockDeferredPaymentService.getOverdueInvoices).toHaveBeenCalled();
    });

    it('should suspend payment for clients with 3+ overdue invoices', async () => {
      const overdueInvoices = [
        { ...mockOverdueInvoice, id: 'inv-1' },
        { ...mockOverdueInvoice, id: 'inv-2' },
        { ...mockOverdueInvoice, id: 'inv-3' },
      ];
      mockDeferredPaymentService.getOverdueInvoices.mockResolvedValue(overdueInvoices);

      await service.checkOverdueInvoices();

      expect(mockDeferredPaymentService.suspendForNonPayment).toHaveBeenCalledWith(
        'client-123',
      );
    });

    it('should not suspend for less than 3 overdue invoices', async () => {
      const overdueInvoices = [
        { ...mockOverdueInvoice, id: 'inv-1' },
        { ...mockOverdueInvoice, id: 'inv-2' },
      ];
      mockDeferredPaymentService.getOverdueInvoices.mockResolvedValue(overdueInvoices);

      await service.checkOverdueInvoices();

      expect(mockDeferredPaymentService.suspendForNonPayment).not.toHaveBeenCalled();
    });

    it('should group invoices by client', async () => {
      const overdueInvoices = [
        { ...mockOverdueInvoice, id: 'inv-1', clientId: 'client-1' },
        { ...mockOverdueInvoice, id: 'inv-2', clientId: 'client-2' },
        { ...mockOverdueInvoice, id: 'inv-3', clientId: 'client-1' },
      ];
      mockDeferredPaymentService.getOverdueInvoices.mockResolvedValue(overdueInvoices);

      await service.checkOverdueInvoices();

      // Neither client has 3+ invoices, so no suspension
      expect(mockDeferredPaymentService.suspendForNonPayment).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockDeferredPaymentService.getOverdueInvoices.mockRejectedValue(
        new Error('DB error'),
      );

      // Should not throw
      await expect(service.checkOverdueInvoices()).resolves.not.toThrow();
    });

    it('should handle individual client processing errors', async () => {
      mockDeferredPaymentService.getOverdueInvoices.mockResolvedValue([
        { ...mockOverdueInvoice, id: 'inv-1' },
        { ...mockOverdueInvoice, id: 'inv-2' },
        { ...mockOverdueInvoice, id: 'inv-3' },
      ]);
      mockDeferredPaymentService.suspendForNonPayment.mockRejectedValue(
        new Error('Suspend error'),
      );

      await expect(service.checkOverdueInvoices()).resolves.not.toThrow();
    });

    it('should calculate days past due correctly', async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const overdueInvoices = [
        { ...mockOverdueInvoice, id: 'inv-1', paymentDueDate: sevenDaysAgo },
        { ...mockOverdueInvoice, id: 'inv-2', paymentDueDate: fourteenDaysAgo },
        { ...mockOverdueInvoice, id: 'inv-3', paymentDueDate: thirtyDaysAgo },
      ];
      mockDeferredPaymentService.getOverdueInvoices.mockResolvedValue(overdueInvoices);

      await service.checkOverdueInvoices();

      expect(mockDeferredPaymentService.suspendForNonPayment).toHaveBeenCalled();
    });
  });

  describe('quarterlyCreditReview', () => {
    it('should do nothing when no clients have deferred payment', async () => {
      mockPrisma.clientProfile.findMany.mockResolvedValue([]);

      await service.quarterlyCreditReview();

      expect(mockPrisma.clientProfile.findMany).toHaveBeenCalledWith({
        where: { deferredPaymentEnabled: true },
        include: expect.any(Object),
      });
    });

    it('should review eligible clients', async () => {
      mockPrisma.clientProfile.findMany.mockResolvedValue([mockClientProfile]);
      mockDeferredPaymentService.checkEligibility.mockResolvedValue({
        eligible: true,
        score: 120,
      });

      await service.quarterlyCreditReview();

      expect(mockDeferredPaymentService.checkEligibility).toHaveBeenCalledWith(
        'client-123',
      );
    });

    it('should revoke payment for ineligible clients', async () => {
      mockPrisma.clientProfile.findMany.mockResolvedValue([mockClientProfile]);
      mockDeferredPaymentService.checkEligibility.mockResolvedValue({
        eligible: false,
        score: 50,
      });

      await service.quarterlyCreditReview();

      expect(mockDeferredPaymentService.disableDeferredPayment).toHaveBeenCalledWith(
        'client-123',
      );
    });

    it('should increase credit limit for high scorers with many missions', async () => {
      const highScoreProfile = {
        ...mockClientProfile,
        user: {
          ...mockClientProfile.user,
          completedMissions: 25,
        },
      };
      mockPrisma.clientProfile.findMany.mockResolvedValue([highScoreProfile]);
      mockDeferredPaymentService.checkEligibility.mockResolvedValue({
        eligible: true,
        score: 160,
      });

      await service.quarterlyCreditReview();

      expect(mockPrisma.clientProfile.update).toHaveBeenCalledWith({
        where: { userId: 'client-123' },
        data: expect.objectContaining({
          creditLimit: expect.any(Number),
          lastCreditReview: expect.any(Date),
        }),
      });
    });

    it('should decrease credit limit for low scorers', async () => {
      const lowScoreProfile = {
        ...mockClientProfile,
        user: {
          ...mockClientProfile.user,
          disputeCount: 3,
        },
      };
      mockPrisma.clientProfile.findMany.mockResolvedValue([lowScoreProfile]);
      mockDeferredPaymentService.checkEligibility.mockResolvedValue({
        eligible: true,
        score: 80,
      });

      await service.quarterlyCreditReview();

      // Credit limit should be reduced by 30%
      expect(mockPrisma.clientProfile.update).toHaveBeenCalledWith({
        where: { userId: 'client-123' },
        data: expect.objectContaining({
          creditLimit: 700, // 1000 * 0.7
        }),
      });
    });

    it('should cap credit limit at 10000', async () => {
      const highLimitProfile = {
        ...mockClientProfile,
        creditLimit: { toString: () => '9000' },
        user: {
          ...mockClientProfile.user,
          completedMissions: 25,
        },
      };
      mockPrisma.clientProfile.findMany.mockResolvedValue([highLimitProfile]);
      mockDeferredPaymentService.checkEligibility.mockResolvedValue({
        eligible: true,
        score: 160,
      });

      await service.quarterlyCreditReview();

      expect(mockPrisma.clientProfile.update).toHaveBeenCalledWith({
        where: { userId: 'client-123' },
        data: expect.objectContaining({
          creditLimit: 10000, // Capped at 10k
        }),
      });
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.clientProfile.findMany.mockRejectedValue(new Error('DB error'));

      await expect(service.quarterlyCreditReview()).resolves.not.toThrow();
    });

    it('should handle individual client errors', async () => {
      mockPrisma.clientProfile.findMany.mockResolvedValue([mockClientProfile]);
      mockDeferredPaymentService.checkEligibility.mockRejectedValue(
        new Error('Check error'),
      );

      await expect(service.quarterlyCreditReview()).resolves.not.toThrow();
    });
  });

  describe('getCronJobsStatus', () => {
    it('should return cron jobs configuration', () => {
      const status = service.getCronJobsStatus();

      expect(status.jobs).toHaveLength(2);
      expect(status.timezone).toBe('Europe/Paris');
      expect(status.jobs[0].name).toBe('check-overdue-invoices');
      expect(status.jobs[1].name).toBe('quarterly-credit-review');
    });

    it('should include job descriptions', () => {
      const status = service.getCronJobsStatus();

      expect(status.jobs[0].description).toContain('factures impayées');
      expect(status.jobs[1].description).toContain('crédit');
    });

    it('should indicate jobs are enabled', () => {
      const status = service.getCronJobsStatus();

      expect(status.jobs.every((job) => job.enabled)).toBe(true);
    });
  });
});
