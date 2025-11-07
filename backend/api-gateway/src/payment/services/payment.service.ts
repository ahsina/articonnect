import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StripeService } from './stripe.service';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
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

    const paymentIntent = await this.stripeService.createPaymentIntent({
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

  async captureMissionPayment(missionId: string) {
    // Find transaction
    const transaction = await this.prisma.transaction.findUnique({
      where: { missionId },
      include: {
        mission: {
          include: {
            artisan: {
              include: {
                artisanProfile: true,
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      throw new BadRequestException('Transaction introuvable');
    }

    if (transaction.status === 'COMPLETED') {
      throw new BadRequestException('Paiement déjà capturé');
    }

    if (!transaction.stripePaymentIntentId) {
      throw new BadRequestException('Pas de paiement Stripe associé');
    }

    // Capture payment
    await this.stripeService.capturePayment(transaction.stripePaymentIntentId);

    // Update transaction status
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'COMPLETED' },
    });

    // Transfer to artisan if Stripe Connect configured
    if (transaction.mission.artisan?.artisanProfile?.stripeAccountId) {
      const transferAmount = Math.floor(Number(transaction.artisanAmount) * 100); // Convert to cents

      const transfer = await this.stripeService.createTransfer({
        amount: transferAmount,
        destination: transaction.mission.artisan.artisanProfile.stripeAccountId,
        metadata: {
          missionId: transaction.missionId,
          transactionId: transaction.id,
        },
      });

      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { stripeTransferId: transfer.id },
      });
    }

    return { success: true, message: 'Paiement capturé et transféré' };
  }

  async refundMissionPayment(missionId: string, reason: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { missionId },
    });

    if (!transaction) {
      throw new BadRequestException('Transaction introuvable');
    }

    if (!transaction.stripePaymentIntentId) {
      throw new BadRequestException('Pas de paiement Stripe associé');
    }

    // Create refund
    await this.stripeService.refundPayment(transaction.stripePaymentIntentId);

    // Update transaction
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'REFUNDED' },
    });

    // Update mission status
    await this.prisma.mission.update({
      where: { id: missionId },
      data: { status: 'CANCELLED' },
    });

    return { success: true, message: 'Paiement remboursé' };
  }

  async handleWebhook(event: Record<string, unknown>) {
    // Handle Stripe webhook events
    const eventData = event as { type: string; data: { object: { id: string; metadata: Record<string, string> } } };

    switch (eventData.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(eventData.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(eventData.data.object);
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
