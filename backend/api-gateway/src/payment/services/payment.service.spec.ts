import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StripeService } from './stripe.service';
import { ReputationService } from './reputation.service';
import { PayoutFraudDetectorService } from '../../fraud/services/payout-fraud-detector.service';
import { FeatureToggleService } from '../../fraud/services/feature-toggle.service';
import { KycService } from '../../compliance/services/kyc.service';

describe('PaymentService', () => {
  let service: PaymentService;
  let prismaService: PrismaService;
  let stripeService: StripeService;
  let reputationService: ReputationService;
  let featureToggleService: FeatureToggleService;

  const mockPrismaService = {
    mission: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    reputationHistory: {
      create: jest.fn(),
    },
  };

  const mockStripeService = {
    createPaymentIntent: jest.fn(),
    capturePaymentIntent: jest.fn(),
    createRefund: jest.fn(),
    constructEvent: jest.fn(),
  };

  const mockReputationService = {
    calculateDepositPercentage: jest.fn(),
    updateReputation: jest.fn(),
  };

  const mockPayoutFraudDetectorService = {
    analyzePayoutRisk: jest.fn(),
  };

  const mockFeatureToggleService = {
    isKycEnabled: jest.fn(),
    getKycSingleTransactionThreshold: jest.fn(),
    getKycCumulativeThreshold: jest.fn(),
    isKycAutoBlockEnabled: jest.fn(),
    isPayoutFraudScreeningEnabled: jest.fn(),
    getPayoutRiskThreshold: jest.fn(),
    isPayoutAutoHoldEnabled: jest.fn(),
  };

  const mockKycService = {
    isVerificationRequired: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StripeService, useValue: mockStripeService },
        { provide: ReputationService, useValue: mockReputationService },
        { provide: PayoutFraudDetectorService, useValue: mockPayoutFraudDetectorService },
        { provide: FeatureToggleService, useValue: mockFeatureToggleService },
        { provide: KycService, useValue: mockKycService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prismaService = module.get<PrismaService>(PrismaService);
    stripeService = module.get<StripeService>(StripeService);
    reputationService = module.get<ReputationService>(ReputationService);
    featureToggleService = module.get<FeatureToggleService>(FeatureToggleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentIntent', () => {
    const missionId = 'mission-123';
    const userId = 'user-123';

    const mockMission = {
      id: missionId,
      clientId: userId,
      agreedPrice: 100,
      client: {
        id: userId,
        clientProfile: {
          stripeCustomerId: 'cus_123',
        },
      },
    };

    it('should create a payment intent successfully', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockFeatureToggleService.isKycEnabled.mockResolvedValue(false);
      mockStripeService.createPaymentIntent.mockResolvedValue({
        id: 'pi_123',
        client_secret: 'secret_123',
      });

      const result = await service.createPaymentIntent(missionId, userId);

      expect(result).toBeDefined();
      expect(mockPrismaService.mission.findUnique).toHaveBeenCalledWith({
        where: { id: missionId },
        include: expect.any(Object),
      });
    });

    it('should throw UnauthorizedException if mission does not belong to user', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        clientId: 'different-user',
      });

      await expect(service.createPaymentIntent(missionId, userId)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if mission not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      await expect(service.createPaymentIntent(missionId, userId)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw BadRequestException if agreed price is not set', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        agreedPrice: null,
      });

      await expect(service.createPaymentIntent(missionId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should require KYC for high-value transactions when enabled', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        agreedPrice: 2000,
      });
      mockFeatureToggleService.isKycEnabled.mockResolvedValue(true);
      mockFeatureToggleService.getKycSingleTransactionThreshold.mockResolvedValue(1000);
      mockFeatureToggleService.isKycAutoBlockEnabled.mockResolvedValue(true);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        kycVerified: false,
      });

      await expect(service.createPaymentIntent(missionId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow high-value transactions when KYC is verified', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        agreedPrice: 2000,
      });
      mockFeatureToggleService.isKycEnabled.mockResolvedValue(true);
      mockFeatureToggleService.getKycSingleTransactionThreshold.mockResolvedValue(1000);
      mockFeatureToggleService.getKycCumulativeThreshold.mockResolvedValue(5000);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        kycVerified: true,
      });
      mockPrismaService.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });
      mockStripeService.createPaymentIntent.mockResolvedValue({
        id: 'pi_123',
        client_secret: 'secret_123',
      });

      const result = await service.createPaymentIntent(missionId, userId);

      expect(result).toBeDefined();
    });
  });

  describe('createDepositPayment', () => {
    const missionId = 'mission-123';
    const userId = 'user-123';

    const mockMission = {
      id: missionId,
      clientId: userId,
      agreedPrice: 100,
      depositRequired: true,
      depositPercentage: 30,
      client: {
        id: userId,
        reputationScore: 80,
        clientProfile: {
          stripeCustomerId: 'cus_123',
        },
      },
    };

    it('should create deposit payment based on reputation', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockReputationService.calculateDepositPercentage.mockResolvedValue(30);
      mockStripeService.createPaymentIntent.mockResolvedValue({
        id: 'pi_123',
        client_secret: 'secret_123',
      });
      mockPrismaService.payment.create.mockResolvedValue({
        id: 'payment-123',
        amount: 30,
      });
      mockPrismaService.mission.update.mockResolvedValue({
        ...mockMission,
        depositAmount: 30,
      });

      const result = await service.createDepositPayment(missionId, userId);

      expect(result).toBeDefined();
      expect(mockReputationService.calculateDepositPercentage).toHaveBeenCalled();
    });

    it('should throw error if deposit not required', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        depositRequired: false,
      });
      mockReputationService.calculateDepositPercentage.mockResolvedValue(0);

      await expect(service.createDepositPayment(missionId, userId)).rejects.toThrow();
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify webhook signature', async () => {
      const payload = 'raw-body';
      const signature = 'sig_123';
      const mockEvent = { id: 'evt_123', type: 'payment_intent.succeeded' };

      mockStripeService.constructEvent.mockReturnValue(mockEvent);

      const result = await service.verifyWebhookSignature(payload, signature);

      expect(result).toEqual(mockEvent);
      expect(mockStripeService.constructEvent).toHaveBeenCalledWith(payload, signature);
    });

    it('should throw error for invalid signature', async () => {
      const payload = 'raw-body';
      const signature = 'invalid_sig';

      mockStripeService.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(service.verifyWebhookSignature(payload, signature)).rejects.toThrow();
    });
  });

  describe('processRefund', () => {
    const missionId = 'mission-123';
    const userId = 'user-123';
    const reason = 'CHANGED_MIND';

    const mockMission = {
      id: missionId,
      clientId: userId,
      status: 'COMPLETED',
      agreedPrice: 100,
      client: {
        id: userId,
        reputationScore: 100,
      },
      artisan: {
        id: 'artisan-123',
      },
    };

    const mockPayment = {
      id: 'payment-123',
      missionId,
      amount: 100,
      stripePaymentIntentId: 'pi_123',
      type: 'FULL_PAYMENT',
    };

    it('should process refund for valid mission', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.payment.findFirst.mockResolvedValue(mockPayment);
      mockStripeService.createRefund.mockResolvedValue({
        id: 're_123',
        amount: 10000,
      });
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        refundedAmount: 100,
      });

      const result = await service.processRefund(missionId, reason, undefined, userId);

      expect(result).toBeDefined();
      expect(mockStripeService.createRefund).toHaveBeenCalled();
    });

    it('should throw error if no payment found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.payment.findFirst.mockResolvedValue(null);

      await expect(
        service.processRefund(missionId, reason, undefined, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should compensate artisan for client-fault refunds', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.payment.findFirst.mockResolvedValue(mockPayment);
      mockStripeService.createRefund.mockResolvedValue({
        id: 're_123',
        amount: 10000,
      });
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        refundedAmount: 100,
        artisanCompensated: true,
      });

      const result = await service.processRefund(missionId, 'CHANGED_MIND', undefined, userId);

      expect(result).toBeDefined();
    });
  });

  describe('captureMissionPayment', () => {
    const missionId = 'mission-123';
    const userId = 'user-123';

    const mockMission = {
      id: missionId,
      clientId: userId,
      status: 'IN_PROGRESS',
      agreedPrice: 100,
    };

    const mockTransaction = {
      id: 'tx-123',
      missionId,
      status: 'HELD',
      stripePaymentIntentId: 'pi_123',
    };

    it('should capture payment for completed mission', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.transaction.findUnique.mockResolvedValue(mockTransaction);
      mockStripeService.capturePaymentIntent.mockResolvedValue({
        id: 'pi_123',
        status: 'succeeded',
      });
      mockPrismaService.transaction.update.mockResolvedValue({
        ...mockTransaction,
        status: 'COMPLETED',
      });

      const result = await service.captureMissionPayment(missionId, userId);

      expect(result).toBeDefined();
      expect(mockStripeService.capturePaymentIntent).toHaveBeenCalled();
    });

    it('should throw error if mission not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      await expect(service.captureMissionPayment(missionId, userId)).rejects.toThrow();
    });
  });
});
