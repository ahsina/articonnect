import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StripeService } from './stripe.service';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private stripe: StripeService,
  ) {}

  async createPaymentIntent(missionId: string, userId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: { client: true },
    });

    if (!mission || mission.clientId !== userId) {
      throw new Error('Non autorisé');
    }

    if (!mission.agreedPrice) {
      throw new Error('Prix non défini');
    }

    const amount = Number(mission.agreedPrice) * 100; // Convert to cents

    const paymentIntent = await this.stripe.createPaymentIntent({
      amount,
      currency: 'eur',
      metadata: {
        missionId: mission.id,
        userId,
      },
    });

    await this.prisma.transaction.create({
      data: {
        type: 'MISSION',
        missionId: mission.id,
        amount: mission.agreedPrice,
        commission: Number(mission.agreedPrice) * 0.12,
        artisanAmount: Number(mission.agreedPrice) * 0.88,
        stripePaymentIntentId: paymentIntent.id,
        status: 'PENDING',
      },
    });

    return { clientSecret: paymentIntent.client_secret };
  }

  async handleWebhook(event: Record<string, unknown>) {
    // Handle Stripe webhook events
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
    }
  }

  private async handlePaymentSuccess(paymentIntent: { id: string; metadata: Record<string, string> }) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (transaction) {
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'HELD' },
      });

      await this.prisma.mission.update({
        where: { id: transaction.missionId },
        data: { status: 'PAID' },
      });
    }
  }

  private async handlePaymentFailed(paymentIntent: { id: string; metadata: Record<string, string> }) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (transaction) {
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'FAILED' },
      });
    }
  }
}
