import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
  Optional,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StripeService } from '../../payment/services/stripe.service';
import { StripeIdentityService } from './stripe-identity.service';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);
  private readonly KYC_THRESHOLD_SINGLE = 1000; // €1000 single transaction
  private readonly KYC_THRESHOLD_CUMULATIVE = 3000; // €3000 cumulative/month

  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
    @Optional()
    @Inject(forwardRef(() => StripeIdentityService))
    private stripeIdentityService?: StripeIdentityService,
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
    // Use Stripe Identity service for real verification when available
    if (this.stripeIdentityService?.isEnabled()) {
      this.logger.log(`Initiating Stripe Identity verification for user ${userId}`);
      const session = await this.stripeIdentityService.createVerificationSession(userId);
      return {
        verificationUrl: session.url,
        sessionId: session.sessionId,
      };
    }

    // Fallback for development without Stripe Identity configured
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.logger.warn(
      `Stripe Identity not configured. Using mock verification for user ${userId}. ` +
      'Configure STRIPE_SECRET_KEY for production KYC.',
    );

    const sessionId = `mock_${userId}_${Date.now()}`;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: 'PENDING',
        kycProvider: 'MOCK',
        // Persist the mock session id so the webhook can resolve the user
        // authoritatively (by lookup) instead of parsing an attacker-controllable string.
        stripeIdentitySessionId: sessionId,
      },
    });

    // Development mock URL
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/artisan/settings?kyc=mock&userId=${userId}`;

    return {
      verificationUrl,
      sessionId,
    };
  }

  /**
   * Get verification status with Stripe Identity details when available
   */
  async getVerificationStatusDetailed(userId: string) {
    if (this.stripeIdentityService?.isEnabled()) {
      return this.stripeIdentityService.getVerificationStatus(userId);
    }
    return this.getKycStatus(userId);
  }

  /**
   * Handle KYC verification webhook.
   *
   * When Stripe Identity is configured, real webhooks are signature-verified and
   * dispatched by StripeIdentityService.handleWebhook (using session metadata) — this
   * mock path must NOT be reachable in production, otherwise anyone POSTing a mock
   * sessionId could validate an identity with no authentication.
   */
  async handleKycWebhook(sessionId: string, status: 'verified' | 'rejected') {
    // Hard block in production: real KYC must go through the signed Stripe webhook.
    if (
      process.env.NODE_ENV === 'production' ||
      this.stripeIdentityService?.isEnabled()
    ) {
      this.logger.error(
        `Rejected unsigned mock KYC webhook (session ${sessionId}). ` +
          'Use the Stripe-signed Identity webhook in production.',
      );
      throw new ForbiddenException('Mock KYC webhook is disabled in this environment');
    }

    // Resolve the user authoritatively by the persisted session id rather than
    // parsing the (attacker-controllable) sessionId string.
    const user = await this.prisma.user.findFirst({
      where: { stripeIdentitySessionId: sessionId, kycProvider: 'MOCK' },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('KYC session not found');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        kycVerified: status === 'verified',
        kycVerifiedAt: status === 'verified' ? new Date() : null,
        kycStatus: status === 'verified' ? 'VERIFIED' : 'REJECTED',
      },
    });

    this.logger.warn(`[MOCK] KYC ${status} for user ${user.id} (dev-only mock webhook)`);
  }
}
