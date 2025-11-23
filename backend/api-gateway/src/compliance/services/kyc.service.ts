import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StripeService } from '../../payment/services/stripe.service';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);
  private readonly KYC_THRESHOLD_SINGLE = 1000; // €1000 single transaction
  private readonly KYC_THRESHOLD_CUMULATIVE = 3000; // €3000 cumulative/month

  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
  ) {}

  /**
   * Check if KYC is required for a transaction
   */
  async isKycRequired(userId: string, transactionAmount: number): Promise<boolean> {
    // 1. Single transaction threshold
    if (transactionAmount >= this.KYC_THRESHOLD_SINGLE) {
      return true;
    }

    // 2. Cumulative transactions in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const cumulativeAmount = await this.prisma.transaction.aggregate({
      where: {
        mission: {
          clientId: userId,
        },
        createdAt: {
          gte: thirtyDaysAgo,
        },
        status: 'COMPLETED',
      },
      _sum: {
        amount: true,
      },
    });

    const total = Number(cumulativeAmount._sum.amount || 0) + transactionAmount;

    return total >= this.KYC_THRESHOLD_CUMULATIVE;
  }

  /**
   * Get KYC status for a user
   */
  async getKycStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        kycVerified: true,
        kycVerifiedAt: true,
        kycStatus: true,
        kycProvider: true,
      },
    });

    return {
      verified: user?.kycVerified || false,
      verifiedAt: user?.kycVerifiedAt,
      status: user?.kycStatus || 'PENDING',
      provider: user?.kycProvider,
    };
  }

  /**
   * Initiate KYC verification via Stripe Identity
   */
  async initiateKycVerification(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        clientProfile: {
          select: {
            stripeCustomerId: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // In production, this would create a Stripe Identity VerificationSession
    // For now, return mock URL
    const verificationUrl = `https://stripe.com/identity/verify/${userId}`;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: 'PENDING',
        kycProvider: 'STRIPE_IDENTITY',
      },
    });

    this.logger.log(`KYC verification initiated for user ${userId}`);

    return {
      verificationUrl,
      sessionId: `vs_${userId}_${Date.now()}`,
    };
  }

  /**
   * Handle KYC verification webhook from Stripe
   */
  async handleKycWebhook(sessionId: string, status: 'verified' | 'rejected') {
    // Extract userId from sessionId (in production, query by sessionId)
    const userId = sessionId.split('_')[1];

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        kycVerified: status === 'verified',
        kycVerifiedAt: status === 'verified' ? new Date() : null,
        kycStatus: status === 'verified' ? 'VERIFIED' : 'REJECTED',
      },
    });

    this.logger.log(`KYC ${status} for user ${userId}`);
  }
}
