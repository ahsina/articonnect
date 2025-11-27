import { Test, TestingModule } from '@nestjs/testing';
import { DeferredPaymentService } from './deferred-payment.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PlatformConfigService } from '../../config/services/platform-config.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('DeferredPaymentService', () => {
  let service: DeferredPaymentService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    clientProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    invoice: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockPlatformConfigService = {
    getReputationRules: jest.fn().mockResolvedValue({
      trustedThreshold: 150,
      warningThreshold: 50,
      minScore: 0,
      maxScore: 200,
    }),
    getFeeSettings: jest.fn().mockResolvedValue({
      platformCommissionRate: 12,
      artisanPayoutPercentage: 88,
    }),
  };

  beforeEach(async () => {
    // Reset mock implementations
    mockPlatformConfigService.getReputationRules.mockResolvedValue({
      trustedThreshold: 150,
      warningThreshold: 50,
      minScore: 0,
      maxScore: 200,
    });
    mockPlatformConfigService.getFeeSettings.mockResolvedValue({
      platformCommissionRate: 12,
      artisanPayoutPercentage: 88,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeferredPaymentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PlatformConfigService, useValue: mockPlatformConfigService },
      ],
    }).compile();

    service = module.get<DeferredPaymentService>(DeferredPaymentService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enableDeferredPayment', () => {
    const params = {
      clientId: 'client-123',
      creditLimit: 5000,
      paymentTermDays: 30,
      notes: 'Approved after credit review',
    };

    it('should enable deferred payment for eligible client', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'client-123',
        role: 'CLIENT',
        reputationScore: 160,
        clientMissions: Array(15).fill({ status: 'COMPLETED' }),
        disputesCreated: [],
        noShowCount: 0,
        completedMissions: 15,
        disputeRate: 0,
        clientProfile: {},
      });
      mockPrismaService.clientProfile.update.mockResolvedValue({});

      const result = await service.enableDeferredPayment(params);

      expect(result.creditLimit).toBe(5000);
      expect(result.paymentTermDays).toBe(30);
      expect(mockPrismaService.clientProfile.update).toHaveBeenCalledWith({
        where: { userId: 'client-123' },
        data: expect.objectContaining({
          deferredPaymentEnabled: true,
          creditLimit: 5000,
          paymentTermDays: 30,
        }),
      });
    });

    it('should throw if client not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.enableDeferredPayment(params)).rejects.toThrow(BadRequestException);
    });

    it('should throw if user is not a client', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        role: 'ARTISAN',
      });

      await expect(service.enableDeferredPayment(params)).rejects.toThrow('Client introuvable');
    });

    it('should throw if client not eligible', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'client-123',
        role: 'CLIENT',
        reputationScore: 100, // Below 150
        clientMissions: [],
        disputesCreated: [],
        noShowCount: 0,
        completedMissions: 0,
        disputeRate: 0,
        clientProfile: {},
      });

      await expect(service.enableDeferredPayment(params)).rejects.toThrow('Client non éligible');
    });
  });

  describe('disableDeferredPayment', () => {
    it('should disable deferred payment when balance is zero', async () => {
      mockPrismaService.clientProfile.findUnique.mockResolvedValue({
        userId: 'client-123',
        deferredPaymentEnabled: true,
        currentOutstanding: 0,
      });
      mockPrismaService.clientProfile.update.mockResolvedValue({});

      const result = await service.disableDeferredPayment('client-123');

      expect(result.message).toBe('Paiement différé désactivé');
      expect(mockPrismaService.clientProfile.update).toHaveBeenCalledWith({
        where: { userId: 'client-123' },
        data: {
          deferredPaymentEnabled: false,
          creditLimit: 0,
        },
      });
    });

    it('should throw if deferred payment not enabled', async () => {
      mockPrismaService.clientProfile.findUnique.mockResolvedValue({
        userId: 'client-123',
        deferredPaymentEnabled: false,
      });

      await expect(service.disableDeferredPayment('client-123')).rejects.toThrow(
        'Paiement différé non activé',
      );
    });

    it('should throw if there is outstanding balance', async () => {
      mockPrismaService.clientProfile.findUnique.mockResolvedValue({
        userId: 'client-123',
        deferredPaymentEnabled: true,
        currentOutstanding: 500,
      });

      await expect(service.disableDeferredPayment('client-123')).rejects.toThrow(
        '500€ en attente de paiement',
      );
    });
  });

  describe('checkEligibility', () => {
    it('should return eligible for qualifying client', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'client-123',
        reputationScore: 160,
        clientMissions: Array(15).fill({ status: 'COMPLETED' }),
        disputesCreated: [],
        noShowCount: 0,
        completedMissions: 15,
        disputeRate: 0,
        clientProfile: {},
      });

      const result = await service.checkEligibility('client-123');

      expect(result.eligible).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it('should not be eligible with low reputation score', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'client-123',
        reputationScore: 100,
        clientMissions: Array(15).fill({ status: 'COMPLETED' }),
        disputesCreated: [],
        noShowCount: 0,
        completedMissions: 15,
        disputeRate: 0,
        clientProfile: {},
      });

      const result = await service.checkEligibility('client-123');

      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain('Score de réputation insuffisant (min. 150)');
    });

    it('should not be eligible with insufficient missions', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'client-123',
        reputationScore: 160,
        clientMissions: Array(5).fill({ status: 'COMPLETED' }),
        disputesCreated: [],
        noShowCount: 0,
        completedMissions: 5,
        disputeRate: 0,
        clientProfile: {},
      });

      const result = await service.checkEligibility('client-123');

      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain('Historique insuffisant (min. 10 missions)');
    });

    it('should not be eligible with recent disputes', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'client-123',
        reputationScore: 160,
        clientMissions: Array(15).fill({ status: 'COMPLETED' }),
        disputesCreated: [{ id: 'dispute-1', createdAt: new Date() }],
        noShowCount: 0,
        completedMissions: 15,
        disputeRate: 0,
        clientProfile: {},
      });

      const result = await service.checkEligibility('client-123');

      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain('Litiges récents (6 derniers mois)');
    });

    it('should return not eligible for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.checkEligibility('invalid-id');

      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain('Utilisateur introuvable');
    });
  });

  describe('canDeferPayment', () => {
    it('should return true when within credit limit', async () => {
      mockPrismaService.clientProfile.findUnique.mockResolvedValue({
        deferredPaymentEnabled: true,
        creditLimit: 5000,
        currentOutstanding: 2000,
      });

      const result = await service.canDeferPayment('client-123', 1000);

      expect(result).toBe(true);
    });

    it('should return false when exceeds credit limit', async () => {
      mockPrismaService.clientProfile.findUnique.mockResolvedValue({
        deferredPaymentEnabled: true,
        creditLimit: 5000,
        currentOutstanding: 4500,
      });

      const result = await service.canDeferPayment('client-123', 1000);

      expect(result).toBe(false);
    });

    it('should return false when deferred payment not enabled', async () => {
      mockPrismaService.clientProfile.findUnique.mockResolvedValue({
        deferredPaymentEnabled: false,
      });

      const result = await service.canDeferPayment('client-123', 1000);

      expect(result).toBe(false);
    });

    it('should return false when profile not found', async () => {
      mockPrismaService.clientProfile.findUnique.mockResolvedValue(null);

      const result = await service.canDeferPayment('client-123', 1000);

      expect(result).toBe(false);
    });
  });

  describe('createDeferredPayment', () => {
    const params = {
      missionId: 'mission-123',
      clientId: 'client-123',
      amount: 500,
    };

    it('should create deferred payment when within limit', async () => {
      mockPrismaService.clientProfile.findUnique.mockResolvedValue({
        deferredPaymentEnabled: true,
        creditLimit: 5000,
        currentOutstanding: 1000,
        paymentTermDays: 30,
      });
      mockPrismaService.clientProfile.update.mockResolvedValue({});

      const result = await service.createDeferredPayment(params);

      expect(result.success).toBe(true);
      expect(result.paymentTermDays).toBe(30);
      expect(mockPrismaService.clientProfile.update).toHaveBeenCalledWith({
        where: { userId: 'client-123' },
        data: {
          currentOutstanding: { increment: 500 },
        },
      });
    });

    it('should throw if deferred payment not enabled', async () => {
      mockPrismaService.clientProfile.findUnique.mockResolvedValue({
        deferredPaymentEnabled: false,
      });

      await expect(service.createDeferredPayment(params)).rejects.toThrow(ForbiddenException);
    });

    it('should throw if exceeds credit limit', async () => {
      mockPrismaService.clientProfile.findUnique.mockResolvedValue({
        deferredPaymentEnabled: true,
        creditLimit: 1000,
        currentOutstanding: 900,
        paymentTermDays: 30,
      });

      await expect(service.createDeferredPayment(params)).rejects.toThrow(
        'Limite de crédit dépassée',
      );
    });
  });

  describe('markPaid', () => {
    it('should mark invoice as paid and update outstanding', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue({
        id: 'invoice-123',
        status: 'ISSUED',
        clientId: 'client-123',
        totalAmount: 500,
        client: {
          clientProfile: { deferredPaymentEnabled: true },
        },
      });
      mockPrismaService.invoice.update.mockResolvedValue({});
      mockPrismaService.clientProfile.update.mockResolvedValue({});

      const result = await service.markPaid('invoice-123');

      expect(result.message).toBe('Paiement enregistré');
      expect(mockPrismaService.clientProfile.update).toHaveBeenCalledWith({
        where: { userId: 'client-123' },
        data: {
          currentOutstanding: { decrement: 500 },
        },
      });
    });

    it('should throw if invoice not found', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      await expect(service.markPaid('invalid-id')).rejects.toThrow('Facture introuvable');
    });

    it('should return message if already paid', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue({
        id: 'invoice-123',
        status: 'PAID',
        client: { clientProfile: {} },
      });

      const result = await service.markPaid('invoice-123');

      expect(result.message).toBe('Facture déjà payée');
    });
  });

  describe('getOverdueInvoices', () => {
    it('should return and update overdue invoices', async () => {
      const overdueInvoices = [
        { id: 'inv-1', status: 'ISSUED', paymentDueDate: new Date('2023-01-01') },
        { id: 'inv-2', status: 'ISSUED', paymentDueDate: new Date('2023-01-02') },
      ];

      mockPrismaService.invoice.findMany.mockResolvedValue(overdueInvoices);
      mockPrismaService.invoice.update.mockResolvedValue({});

      const result = await service.getOverdueInvoices();

      expect(result).toHaveLength(2);
      expect(mockPrismaService.invoice.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('getStatus', () => {
    it('should return full status for enabled client', async () => {
      mockPrismaService.clientProfile.findUnique.mockResolvedValue({
        deferredPaymentEnabled: true,
        creditLimit: 5000,
        currentOutstanding: 1500,
        paymentTermDays: 30,
        lastCreditReview: new Date('2023-06-01'),
      });
      mockPrismaService.invoice.count.mockResolvedValue(2);

      const result = await service.getStatus('client-123');

      expect(result.enabled).toBe(true);
      expect(result.creditLimit).toBe(5000);
      expect(result.currentOutstanding).toBe(1500);
      expect(result.availableCredit).toBe(3500);
      expect(result.overdueInvoicesCount).toBe(2);
    });

    it('should return disabled status when not enabled', async () => {
      mockPrismaService.clientProfile.findUnique.mockResolvedValue({
        deferredPaymentEnabled: false,
      });

      const result = await service.getStatus('client-123');

      expect(result.enabled).toBe(false);
      expect(result.message).toBe('Paiement différé non activé');
    });

    it('should return disabled status when profile not found', async () => {
      mockPrismaService.clientProfile.findUnique.mockResolvedValue(null);

      const result = await service.getStatus('client-123');

      expect(result.enabled).toBe(false);
    });
  });

  describe('suspendForNonPayment', () => {
    it('should suspend deferred payment', async () => {
      mockPrismaService.clientProfile.update.mockResolvedValue({});

      const result = await service.suspendForNonPayment('client-123');

      expect(result.message).toBe('Paiement différé suspendu');
      expect(mockPrismaService.clientProfile.update).toHaveBeenCalledWith({
        where: { userId: 'client-123' },
        data: {
          deferredPaymentEnabled: false,
          deferredPaymentNotes: 'Suspendu pour factures impayées',
        },
      });
    });
  });
});
