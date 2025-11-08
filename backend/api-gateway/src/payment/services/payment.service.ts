import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StripeService } from './stripe.service';
import { ReputationService } from './reputation.service';
import { RefundReason, PaymentType } from '@prisma/client';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
    private reputationService: ReputationService,
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

  // ================================================================
  // HYBRID PAYMENT SYSTEM - NEW METHODS
  // ================================================================

  /**
   * Crée un paiement d'acompte basé sur la réputation du client
   */
  async createDepositPayment(missionId: string, userId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        client: true,
      },
    });

    if (!mission || mission.clientId !== userId) {
      throw new BadRequestException('Non autorisé');
    }

    if (!mission.agreedPrice) {
      throw new BadRequestException('Prix non défini');
    }

    if (!mission.depositRequired) {
      throw new BadRequestException('Acompte non requis pour cette mission');
    }

    // Calculer le montant de l'acompte
    const depositAmount = Number(mission.depositAmount) ||
      this.reputationService.calculateDepositAmount(
        Number(mission.agreedPrice),
        mission.depositPercentage,
      );

    const amount = depositAmount * 100; // Convert to cents

    // Créer le Payment Intent Stripe
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount,
      currency: 'eur',
      metadata: {
        missionId: mission.id,
        userId,
        type: 'DEPOSIT',
        depositPercentage: mission.depositPercentage.toString(),
      },
    });

    // Créer l'enregistrement Payment
    await this.prisma.payment.create({
      data: {
        missionId: mission.id,
        userId,
        type: 'DEPOSIT',
        amount: depositAmount,
        stripePaymentIntentId: paymentIntent.id,
      },
    });

    // Créer aussi une transaction (legacy)
    await this.prisma.transaction.create({
      data: {
        type: 'DEPOSIT',
        missionId: mission.id,
        amount: depositAmount,
        commission: depositAmount * 0.12,
        artisanAmount: depositAmount * 0.88,
        stripePaymentIntentId: paymentIntent.id,
        status: 'PENDING',
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      amount: depositAmount,
      depositPercentage: mission.depositPercentage,
    };
  }

  /**
   * Traite le remboursement avec logique de compensation intelligente
   */
  async processRefund(
    missionId: string,
    reason: RefundReason,
    amount?: number,
    requestedBy?: string,
  ) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        client: true,
        artisan: {
          include: {
            artisanProfile: true,
          },
        },
        payments: true,
        transaction: true,
      },
    });

    if (!mission) {
      throw new BadRequestException('Mission introuvable');
    }

    // Trouver le paiement principal
    const payment = mission.payments.find((p) => p.type === 'FULL_PAYMENT') ||
      mission.payments.find((p) => p.type === 'DEPOSIT');

    if (!payment || !payment.stripePaymentIntentId) {
      throw new BadRequestException('Aucun paiement à rembourser');
    }

    const refundAmount = amount || Number(payment.amount);

    // Logique de remboursement selon la raison
    switch (reason) {
      case 'CHANGED_MIND':
      case 'EMERGENCY_RESOLVED':
        // Client remboursé 100% + Artisan compensé 100% → Plateforme absorbe
        return this.refundWithCompensation(
          mission,
          payment,
          refundAmount,
          reason,
          true, // platformAbsorbs
        );

      case 'WORK_NOT_DONE':
      case 'ARTISAN_NO_SHOW':
        // Client remboursé 100% + Artisan NOT paid + Pénalité artisan
        return this.refundNoCompensation(
          mission,
          payment,
          refundAmount,
          reason,
        );

      case 'WORK_INCOMPLETE':
        // Remboursement partiel selon accord
        return this.refundPartial(mission, payment, refundAmount, reason);

      case 'MUTUAL_CANCELLATION':
        // Si artisan en route → Compensation
        // Sinon → Remboursement simple
        return this.refundMutual(mission, payment, refundAmount);

      default:
        throw new BadRequestException('Raison de remboursement invalide');
    }
  }

  /**
   * Remboursement avec compensation artisan (plateforme absorbe)
   */
  private async refundWithCompensation(
    mission: any,
    payment: any,
    amount: number,
    reason: RefundReason,
    platformAbsorbs: boolean,
  ) {
    // 1. Créer le remboursement Stripe
    await this.stripeService.refundPayment(payment.stripePaymentIntentId);

    // 2. Créer le Payment de remboursement
    await this.prisma.payment.create({
      data: {
        missionId: mission.id,
        userId: mission.clientId,
        type: 'REFUND',
        amount,
        refundReason: reason,
        refundedAmount: amount,
        refundedAt: new Date(),
        artisanCompensated: true,
        compensationAmount: amount,
        platformAbsorbedCost: platformAbsorbs,
      },
    });

    // 3. Logger la compensation
    if (platformAbsorbs) {
      await this.prisma.compensationLog.create({
        data: {
          userId: mission.artisanId,
          missionId: mission.id,
          reason:
            reason === 'CHANGED_MIND'
              ? 'CLIENT_CHANGED_MIND'
              : 'CLIENT_EMERGENCY_RESOLVED',
          amount,
          clientRefunded: true,
          refundAmount: amount,
          totalCost: amount * 2, // Plateforme paie client + artisan
          notes: `Remboursement client + compensation artisan - Plateforme absorbe`,
        },
      });
    }

    // 4. Pénaliser le client
    await this.reputationService.applyMissionCancelledPenalty(
      mission.clientId,
      mission.id,
    );

    // 5. Mettre à jour la mission
    await this.prisma.mission.update({
      where: { id: mission.id },
      data: { status: 'CANCELLED' },
    });

    // TODO: Transférer les fonds à l'artisan

    return {
      success: true,
      message: 'Client remboursé et artisan compensé',
      platformCost: platformAbsorbs ? amount * 2 : 0,
    };
  }

  /**
   * Remboursement sans compensation (faute artisan)
   */
  private async refundNoCompensation(
    mission: any,
    payment: any,
    amount: number,
    reason: RefundReason,
  ) {
    // 1. Créer le remboursement Stripe
    await this.stripeService.refundPayment(payment.stripePaymentIntentId);

    // 2. Créer le Payment de remboursement
    await this.prisma.payment.create({
      data: {
        missionId: mission.id,
        userId: mission.clientId,
        type: 'REFUND',
        amount,
        refundReason: reason,
        refundedAmount: amount,
        refundedAt: new Date(),
        artisanCompensated: false,
        platformAbsorbedCost: false,
      },
    });

    // 3. Pénaliser l'artisan
    if (reason === 'WORK_NOT_DONE' || reason === 'ARTISAN_NO_SHOW') {
      await this.reputationService.applyDisputeLostPenalty(
        mission.artisanId,
        mission.id,
      );
    }

    // 4. Mettre à jour la mission
    await this.prisma.mission.update({
      where: { id: mission.id },
      data: { status: 'CANCELLED' },
    });

    // 5. Ouvrir automatiquement un litige
    await this.prisma.dispute.create({
      data: {
        missionId: mission.id,
        createdById: mission.clientId,
        reason: reason === 'WORK_NOT_DONE' ? 'Travail non effectué' : 'No-show artisan',
        description: `Remboursement automatique - Raison: ${reason}`,
        status: 'OPEN',
        priority: 'HIGH',
      },
    });

    return {
      success: true,
      message: 'Client remboursé - Artisan pénalisé',
      disputeCreated: true,
    };
  }

  /**
   * Remboursement partiel (travail incomplet)
   */
  private async refundPartial(
    mission: any,
    payment: any,
    amount: number,
    reason: RefundReason,
  ) {
    // Créer le remboursement Stripe
    await this.stripeService.refundPayment(payment.stripePaymentIntentId);

    // Créer le Payment de remboursement partiel
    await this.prisma.payment.create({
      data: {
        missionId: mission.id,
        userId: mission.clientId,
        type: 'REFUND',
        amount,
        refundReason: reason,
        refundedAmount: amount,
        refundedAt: new Date(),
        artisanCompensated: false,
      },
    });

    return {
      success: true,
      message: `Remboursement partiel de ${amount}€`,
    };
  }

  /**
   * Remboursement mutuel (annulation d'accord)
   */
  private async refundMutual(mission: any, payment: any, amount: number) {
    const artisanTraveling = mission.status === 'IN_TRANSIT';

    if (artisanTraveling) {
      // Compensation artisan pour déplacement
      const compensationAmount = 20; // 20€ frais déplacement
      await this.refundWithCompensation(
        mission,
        payment,
        amount,
        'MUTUAL_CANCELLATION',
        true,
      );

      await this.prisma.compensationLog.create({
        data: {
          userId: mission.artisanId,
          missionId: mission.id,
          reason: 'GOODWILL_GESTURE',
          amount: compensationAmount,
          clientRefunded: true,
          refundAmount: amount,
          totalCost: amount + compensationAmount,
          notes: 'Annulation mutuelle - Artisan en route',
        },
      });

      return {
        success: true,
        message: 'Annulation mutuelle - Artisan compensé pour déplacement',
        compensationPaid: compensationAmount,
      };
    } else {
      // Remboursement simple
      await this.stripeService.refundPayment(payment.stripePaymentIntentId);

      await this.prisma.payment.create({
        data: {
          missionId: mission.id,
          userId: mission.clientId,
          type: 'REFUND',
          amount,
          refundReason: 'MUTUAL_CANCELLATION',
          refundedAmount: amount,
          refundedAt: new Date(),
        },
      });

      return {
        success: true,
        message: 'Annulation mutuelle - Remboursement complet',
      };
    }
  }

  /**
   * Déclenche le paiement final à l'artisan après validation
   */
  async triggerArtisanPayment(missionId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        artisan: {
          include: {
            artisanProfile: true,
          },
        },
        transaction: true,
      },
    });

    if (!mission || !mission.artisan) {
      throw new BadRequestException('Mission ou artisan introuvable');
    }

    if (!mission.transaction) {
      throw new BadRequestException('Aucune transaction trouvée');
    }

    if (mission.transaction.status === 'COMPLETED') {
      return { message: 'Paiement déjà effectué' };
    }

    // Transférer à l'artisan
    if (mission.artisan.artisanProfile?.stripeAccountId) {
      const transferAmount = Math.floor(Number(mission.transaction.artisanAmount) * 100);

      const transfer = await this.stripeService.createTransfer({
        amount: transferAmount,
        destination: mission.artisan.artisanProfile.stripeAccountId,
        metadata: {
          missionId,
          transactionId: mission.transaction.id,
        },
      });

      await this.prisma.transaction.update({
        where: { id: mission.transaction.id },
        data: {
          status: 'COMPLETED',
          stripeTransferId: transfer.id,
          completedAt: new Date(),
        },
      });

      // Mettre à jour la réputation du client
      await this.reputationService.applyMissionCompletedReward(
        mission.clientId,
        mission.id,
      );

      return {
        success: true,
        message: 'Paiement transféré à l\'artisan',
        transferId: transfer.id,
      };
    }

    throw new BadRequestException('Artisan sans compte Stripe Connect');
  }
}
