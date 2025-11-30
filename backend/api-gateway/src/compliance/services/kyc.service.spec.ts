import { Test, TestingModule } from '@nestjs/testing';
import { KycService } from './kyc.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StripeService } from '../../payment/services/stripe.service';

describe('KycService', () => {
  let service: KycService;
  let prismaService: PrismaService;
  let stripeService: StripeService;

  const mockPrismaService = {
    transaction: {
      aggregate: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockStripeService = {};

  const mockUser = {
    id: 'user-123',
    email: 'user@example.com',
    kycVerified: false,
    kycVerifiedAt: null,
    kycStatus: 'PENDING',
    kycProvider: null,
    clientProfile: {
      stripeCustomerId: 'cus_123',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StripeService, useValue: mockStripeService },
      ],
    }).compile();

    service = module.get<KycService>(KycService);
    prismaService = module.get<PrismaService>(PrismaService);
    stripeService = module.get<StripeService>(StripeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isKycRequired', () => {
    it('should return true for single transaction above threshold (€1000)', async () => {
      const result = await service.isKycRequired('user-123', 1500);

      expect(result).toBe(true);
    });

    it('should return false for single transaction below threshold', async () => {
      mockPrismaService.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 500 },
      });

      const result = await service.isKycRequired('user-123', 200);

      expect(result).toBe(false);
    });

    it('should return true when cumulative transactions exceed threshold (€3000)', async () => {
      mockPrismaService.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 2500 },
      });

      const result = await service.isKycRequired('user-123', 600);

      expect(result).toBe(true);
    });

    it('should return false when cumulative transactions below threshold', async () => {
      mockPrismaService.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 1000 },
      });

      const result = await service.isKycRequired('user-123', 500);

      expect(result).toBe(false);
    });

    it('should handle null cumulative amount', async () => {
      mockPrismaService.transaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await service.isKycRequired('user-123', 500);

      expect(result).toBe(false);
    });

    it('should check transactions from last 30 days only', async () => {
      mockPrismaService.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });

      await service.isKycRequired('user-123', 500);

      expect(mockPrismaService.transaction.aggregate).toHaveBeenCalledWith({
        where: expect.objectContaining({
          createdAt: {
            gte: expect.any(Date),
          },
        }),
        _sum: { amount: true },
      });
    });
  });

  describe('getKycStatus', () => {
    it('should return KYC status for verified user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        kycVerified: true,
        kycVerifiedAt: new Date('2024-01-15'),
        kycStatus: 'VERIFIED',
        kycProvider: 'STRIPE_IDENTITY',
      });

      const result = await service.getKycStatus('user-123');

      expect(result).toEqual({
        verified: true,
        verifiedAt: expect.any(Date),
        status: 'VERIFIED',
        provider: 'STRIPE_IDENTITY',
      });
    });

    it('should return default status for user without KYC', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        kycVerified: false,
        kycVerifiedAt: null,
        kycStatus: null,
        kycProvider: null,
      });

      const result = await service.getKycStatus('user-123');

      expect(result).toEqual({
        verified: false,
        verifiedAt: null,
        status: 'PENDING',
        provider: null,
      });
    });

    it('should handle user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.getKycStatus('nonexistent');

      expect(result).toEqual({
        verified: false,
        verifiedAt: undefined,
        status: 'PENDING',
        provider: undefined,
      });
    });
  });

  describe('initiateKycVerification', () => {
    it('should initiate KYC verification successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        kycStatus: 'PENDING',
        kycProvider: 'MOCK',
      });

      const result = await service.initiateKycVerification('user-123');

      expect(result).toHaveProperty('verificationUrl');
      expect(result).toHaveProperty('sessionId');
      expect(result.verificationUrl).toContain('user-123');
    });

    it('should update user KYC status to PENDING', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({});

      await service.initiateKycVerification('user-123');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          kycStatus: 'PENDING',
          kycProvider: 'MOCK', // Falls back to MOCK when Stripe Identity is not configured
        },
      });
    });

    it('should throw error if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.initiateKycVerification('nonexistent'),
      ).rejects.toThrow('User not found');
    });
  });

  describe('handleKycWebhook', () => {
    it('should update user as verified when status is verified', async () => {
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        kycVerified: true,
        kycStatus: 'VERIFIED',
      });

      await service.handleKycWebhook('vs_user-123_1234567890', 'verified');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          kycVerified: true,
          kycVerifiedAt: expect.any(Date),
          kycStatus: 'VERIFIED',
        },
      });
    });

    it('should update user as rejected when status is rejected', async () => {
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        kycVerified: false,
        kycStatus: 'REJECTED',
      });

      await service.handleKycWebhook('vs_user-123_1234567890', 'rejected');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          kycVerified: false,
          kycVerifiedAt: null,
          kycStatus: 'REJECTED',
        },
      });
    });

    it('should extract userId from sessionId', async () => {
      mockPrismaService.user.update.mockResolvedValue({});

      await service.handleKycWebhook('vs_user-456_1234567890', 'verified');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-456' },
        data: expect.any(Object),
      });
    });
  });
});
