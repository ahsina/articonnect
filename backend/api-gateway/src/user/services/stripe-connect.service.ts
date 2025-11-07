import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StripeService } from '../../payment/services/stripe.service';

@Injectable()
export class StripeConnectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  async createOnboardingLink(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { artisanProfile: true },
    });

    if (!user || user.role !== 'ARTISAN') {
      throw new BadRequestException('Utilisateur non artisan');
    }

    if (!user.artisanProfile) {
      throw new BadRequestException('Profil artisan non trouvé');
    }

    let accountId = user.artisanProfile.stripeAccountId;

    // Create Stripe account if doesn't exist
    if (!accountId) {
      const account = await this.stripeService.createConnectAccount(user.email, 'LU');
      accountId = account.id;

      await this.prisma.artisanProfile.update({
        where: { id: user.artisanProfile.id },
        data: { stripeAccountId: accountId },
      });
    }

    // Create onboarding link
    const returnUrl = `${process.env.FRONTEND_URL}/artisan/stripe/return`;
    const refreshUrl = `${process.env.FRONTEND_URL}/artisan/stripe/refresh`;

    const accountLink = await this.stripeService.createConnectAccountLink(
      accountId,
      returnUrl,
      refreshUrl,
    );

    return { url: accountLink.url };
  }

  async getOnboardingStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { artisanProfile: true },
    });

    if (!user?.artisanProfile?.stripeAccountId) {
      return { onboarded: false, accountId: null };
    }

    const account = await this.stripeService.getConnectAccount(
      user.artisanProfile.stripeAccountId,
    );

    const onboarded = account.details_submitted && account.charges_enabled;

    // Update onboarding status
    if (onboarded && !user.artisanProfile.stripeOnboarded) {
      await this.prisma.artisanProfile.update({
        where: { id: user.artisanProfile.id },
        data: { stripeOnboarded: true },
      });
    }

    return {
      onboarded,
      accountId: user.artisanProfile.stripeAccountId,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    };
  }

  async refreshOnboardingLink(userId: string) {
    return this.createOnboardingLink(userId);
  }
}
