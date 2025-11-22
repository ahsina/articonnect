import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StripeService } from './stripe.service';
import { ReputationService } from './reputation.service';
import { RefundReason, Payment } from '@prisma/client';
import type { MissionWithRelations } from '../types/payment.types';

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
      include: {
        client: {
          include: {
            clientProfile: true,
          },
        },
      },
    });

    if (!mission || mission.clientId !== userId) {
      throw new UnauthorizedException('Non autorisé');
    }

    if (!mission.agreedPrice) {
      throw new BadRequestException('Prix non défini');
    }

    const amount = Number(mission.agreedPrice) * 100; // Convert to cents

    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount,
      currency: 'eur',
      metadata: {
        missionId: mission.id,
        userId,
      },
      // Pass Stripe customer ID for 3D Secure authentication
      customerId: mission.client.clientProfile?.stripeCustomerId || undefined,
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

  async refundMissionPayment(missionId: string, _reason: string) {
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

  /**
   * Verify Stripe webhook signature for security
   * Prevents unauthorized webhook requests
   */
  async verifyWebhookSignature(
    rawBody: string | Buffer,
    signature: string,
  ): Promise<any> {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        throw new BadRequestException('Webhook secret not configured');
      }

      // Convert Buffer to string if needed
      const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');

      // Verify signature using Stripe SDK
      const event = this.stripeService.constructWebhookEvent(
        body,
        signature,
        webhookSecret,
      );

      return event;
    } catch (error) {
      throw new UnauthorizedException(
        `Webhook signature verification failed: ${error.message}`,
      );
    }
  }

  async handleWebhook(event: Record<string, unknown>) {
    // Handle Stripe webhook events
    const eventData = event as { type: string; data: { object: { id: string; status?: string; charge?: string; metadata: Record<string, string> } } };

    switch (eventData.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(eventData.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(eventData.data.object);
        break;
      case 'payment_intent.requires_action':
        // This event is triggered when 3D Secure authentication is required
        await this.handlePaymentRequiresAction(eventData.data.object);
        break;
      case 'payment_intent.canceled':
        // Handle canceled payments (e.g., when 3DS authentication times out)
        await this.handlePaymentCanceled(eventData.data.object);
        break;

      // Stripe Radar fraud detection events
      case 'review.opened':
        // Payment flagged for review by Radar
        await this.handleRadarReviewOpened(eventData.data.object);
        break;
      case 'review.closed':
        // Review resolved (approved or refunded)
        await this.handleRadarReviewClosed(eventData.data.object);
        break;
      case 'radar.early_fraud_warning.created':
        // Early fraud warning from card issuer
        await this.handleEarlyFraudWarning(eventData.data.object);
        break;

      // SEPA Direct Debit events
      case 'setup_intent.succeeded':
        // SEPA mandate created successfully
        await this.handleSepaSetupSuccess(eventData.data.object);
        break;
      case 'setup_intent.setup_failed':
        // SEPA mandate creation failed
        await this.handleSepaSetupFailed(eventData.data.object);
        break;
      case 'charge.succeeded':
        // SEPA payment succeeded (after 5-7 days)
        await this.handleSepaChargeSucceeded(eventData.data.object);
        break;
      case 'charge.failed':
        // SEPA payment failed (insufficient funds, etc.)
        await this.handleSepaChargeFailed(eventData.data.object);
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

  /**
   * Handle 3D Secure authentication requirement
   * This is triggered when the payment requires additional authentication
   */
  private async handlePaymentRequiresAction(paymentIntent: { id: string; status?: string; metadata: Record<string, string> }) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (transaction && transaction.status === 'PENDING') {
      // Update status to indicate 3DS authentication is in progress
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'PENDING', // Keep as PENDING while awaiting authentication
          // We could add a new field like 'requiresAction: true' if we want more granularity
        },
      });

      // Optionally, send a notification to the user to complete authentication
      // await this.notificationService.notify3DSRequired(...)
    }
  }

  /**
   * Handle canceled payments (e.g., when 3DS authentication times out or is abandoned)
   */
  private async handlePaymentCanceled(paymentIntent: { id: string; metadata: Record<string, string> }) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (transaction) {
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'CANCELLED' },
      });

      // If this was a deposit payment that was canceled, notify the client
      if (paymentIntent.metadata.type === 'DEPOSIT') {
        // Optionally send notification
        // await this.notificationService.notifyDepositCanceled(...)
      }
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

    // Créer le Payment Intent Stripe avec support 3D Secure
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount,
      currency: 'eur',
      metadata: {
        missionId: mission.id,
        userId,
        type: 'DEPOSIT',
        depositPercentage: mission.depositPercentage.toString(),
      },
      // Pass Stripe customer ID for 3D Secure authentication
      customerId: mission.client.clientProfile?.stripeCustomerId || undefined,
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
    _requestedBy?: string,
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
   * Uses atomic transaction to ensure data consistency
   */
  private async refundWithCompensation(
    mission: MissionWithRelations,
    payment: Payment,
    amount: number,
    reason: RefundReason,
    platformAbsorbs: boolean,
  ) {
    // 1. Créer le remboursement Stripe (outside transaction - can be retried)
    await this.stripeService.refundPayment(payment.stripePaymentIntentId);

    // 2. Atomic transaction for all database operations
    await this.prisma.$transaction(async (tx) => {
      // 2a. Créer le Payment de remboursement
      await tx.payment.create({
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

      // 2b. Logger la compensation
      if (platformAbsorbs) {
        await tx.compensationLog.create({
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

      // 2c. Pénaliser le client (inline to include in transaction)
      const user = await tx.user.findUnique({
        where: { id: mission.clientId },
      });
      if (user) {
        const previousScore = user.reputationScore;
        const newScore = Math.max(0, Math.min(200, previousScore - 5));

        await tx.user.update({
          where: { id: mission.clientId },
          data: { reputationScore: newScore },
        });

        await tx.reputationHistory.create({
          data: {
            userId: mission.clientId,
            action: 'MISSION_CANCELLED',
            pointsChange: -5,
            previousScore,
            newScore,
            reason: 'Mission annulée',
            relatedMissionId: mission.id,
          },
        });
      }

      // 2d. Mettre à jour la mission
      await tx.mission.update({
        where: { id: mission.id },
        data: { status: 'CANCELLED' },
      });
    });

    // 3. Transférer les fonds à l'artisan via Stripe (outside transaction)
    // If this fails, compensation is still recorded in DB
    await this.transferToArtisan(mission.artisanId, amount, {
      missionId: mission.id,
      type: 'COMPENSATION',
      reason: 'Client cancellation - artisan compensation',
    });

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
    mission: MissionWithRelations,
    payment: Payment,
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
    mission: MissionWithRelations,
    payment: Payment,
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
  private async refundMutual(mission: MissionWithRelations, payment: Payment, amount: number) {
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

  /**
   * Transfère de l'argent à un artisan via Stripe Connect
   * @param artisanId - ID de l'artisan
   * @param amount - Montant en euros (sera converti en centimes)
   * @param metadata - Métadonnées pour le transfert
   */
  private async transferToArtisan(
    artisanId: string,
    amount: number,
    metadata?: Record<string, string>,
  ): Promise<void> {
    // 1. Récupérer le profil artisan avec stripeAccountId
    const artisan = await this.prisma.user.findUnique({
      where: { id: artisanId },
      include: { artisanProfile: true },
    });

    if (!artisan?.artisanProfile) {
      throw new BadRequestException('Profil artisan introuvable');
    }

    const { stripeAccountId, stripeOnboarded } = artisan.artisanProfile;

    // 2. Vérifier que l'artisan a un compte Stripe Connect
    if (!stripeAccountId) {
      // Log warning but don't fail - artisan needs to complete onboarding
      console.warn(
        `[TRANSFER WARNING] Artisan ${artisanId} has no Stripe account. Transfer skipped.`,
      );
      return;
    }

    if (!stripeOnboarded) {
      console.warn(
        `[TRANSFER WARNING] Artisan ${artisanId} Stripe account not onboarded. Transfer skipped.`,
      );
      return;
    }

    // 3. Créer le transfert Stripe (convertir en centimes)
    const transferAmount = Math.floor(amount * 100);

    try {
      const transfer = await this.stripeService.createTransfer({
        amount: transferAmount,
        destination: stripeAccountId,
        metadata: metadata || {},
      });

      console.log(
        `[TRANSFER SUCCESS] ${amount}€ transferred to artisan ${artisanId} (Stripe Transfer: ${transfer.id})`,
      );
    } catch (error) {
      console.error(
        `[TRANSFER ERROR] Failed to transfer ${amount}€ to artisan ${artisanId}:`,
        error.message,
      );
      throw new BadRequestException(
        `Échec du transfert vers l'artisan: ${error.message}`,
      );
    }
  }

  // ================================================================
  // STRIPE RADAR - FRAUD DETECTION WEBHOOKS
  // ================================================================

  /**
   * Handle Radar review opened event
   * Payment has been flagged for manual review due to fraud risk
   */
  private async handleRadarReviewOpened(review: { id: string; charge?: string; metadata: Record<string, string> }) {
    if (!review.charge) return;

    // Find transaction by charge ID
    const charge = await this.stripeService['stripe'].charges.retrieve(review.charge);
    const transaction = await this.prisma.transaction.findUnique({
      where: { stripePaymentIntentId: charge.payment_intent as string },
    });

    if (transaction) {
      // Update transaction to indicate manual review required
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'PENDING', // Keep as PENDING during review
          // Could add a 'underReview' flag if we extend the schema
        },
      });

      // Log the review for admin action
      console.warn(
        `[RADAR REVIEW] Transaction ${transaction.id} flagged for review. Review ID: ${review.id}`,
      );

      // Optionally send notification to admin
      // await this.notificationService.notifyAdminRadarReview(transaction.id, review.id);
    }
  }

  /**
   * Handle Radar review closed event
   * Review has been resolved (approved or refunded)
   */
  private async handleRadarReviewClosed(review: { id: string; charge?: string; reason?: string; metadata: Record<string, string> }) {
    if (!review.charge) return;

    const charge = await this.stripeService['stripe'].charges.retrieve(review.charge);
    const transaction = await this.prisma.transaction.findUnique({
      where: { stripePaymentIntentId: charge.payment_intent as string },
    });

    if (transaction) {
      // Check if review was approved or resulted in refund
      const wasApproved = review.reason === 'approved';

      console.log(
        `[RADAR REVIEW CLOSED] Transaction ${transaction.id} review ${wasApproved ? 'approved' : 'refunded/closed'}`,
      );

      // If approved, proceed with payment
      if (wasApproved && transaction.status === 'PENDING') {
        await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: 'HELD' },
        });
      }
    }
  }

  /**
   * Handle early fraud warning from card issuer
   * Card issuer has notified Stripe of potential fraud
   */
  private async handleEarlyFraudWarning(warning: { id: string; charge?: string; metadata: Record<string, string> }) {
    if (!warning.charge) return;

    const charge = await this.stripeService['stripe'].charges.retrieve(warning.charge);
    const transaction = await this.prisma.transaction.findUnique({
      where: { stripePaymentIntentId: charge.payment_intent as string },
    });

    if (transaction) {
      // Log early fraud warning
      console.error(
        `[EARLY FRAUD WARNING] Transaction ${transaction.id} has early fraud warning. Charge: ${warning.charge}`,
      );

      // Update transaction status to reflect fraud warning
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED', // Mark as failed to prevent capture
        },
      });

      // Automatically refund if payment was already captured
      if (transaction.status === 'COMPLETED') {
        try {
          await this.stripeService.refundPayment(charge.payment_intent as string);
          await this.prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: 'REFUNDED' },
          });
        } catch (error) {
          console.error('Failed to auto-refund after early fraud warning:', error);
        }
      }

      // Send urgent notification to admin
      // await this.notificationService.notifyAdminFraudWarning(transaction.id, warning.id);
    }
  }

  // ================================================================
  // SEPA DIRECT DEBIT WEBHOOKS
  // ================================================================

  /**
   * Handle SEPA setup success (mandate created)
   * Customer has authorized bank account debits
   */
  private async handleSepaSetupSuccess(setupIntent: { id: string; payment_method?: string; customer?: string; metadata: Record<string, string> }) {
    console.log(
      `[SEPA SETUP SUCCESS] Customer ${setupIntent.customer} authorized SEPA mandate. Payment Method: ${setupIntent.payment_method}`,
    );

    // Store payment method ID for future payments
    if (setupIntent.customer && setupIntent.payment_method) {
      // Could update customer profile with default payment method
      // await this.prisma.clientProfile.update({
      //   where: { stripeCustomerId: setupIntent.customer },
      //   data: { defaultPaymentMethod: setupIntent.payment_method },
      // });
    }

    // Notify customer that mandate is ready
    // await this.notificationService.notifySepaSetupComplete(customerId);
  }

  /**
   * Handle SEPA setup failure (mandate creation failed)
   * Customer authorization failed or IBAN invalid
   */
  private async handleSepaSetupFailed(setupIntent: { id: string; last_setup_error?: { message?: string }; customer?: string; metadata: Record<string, string> }) {
    console.error(
      `[SEPA SETUP FAILED] Setup failed for customer ${setupIntent.customer}. Error: ${setupIntent.last_setup_error?.message}`,
    );

    // Notify customer about setup failure
    // await this.notificationService.notifySepaSetupFailed(customerId, errorMessage);
  }

  /**
   * Handle SEPA charge succeeded
   * Payment completed successfully (after 5-7 business days)
   */
  private async handleSepaChargeSucceeded(charge: { id: string; payment_intent?: string; amount: number; metadata: Record<string, string> }) {
    if (!charge.payment_intent) return;

    const transaction = await this.prisma.transaction.findUnique({
      where: { stripePaymentIntentId: charge.payment_intent as string },
    });

    if (transaction) {
      // Update transaction to HELD (funds received, ready to capture)
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'HELD' },
      });

      console.log(
        `[SEPA CHARGE SUCCESS] Transaction ${transaction.id} succeeded via SEPA. Amount: ${charge.amount / 100}€`,
      );

      // Notify parties that SEPA payment is complete
      // await this.notificationService.notifySepaPaymentComplete(transaction.missionId);
    }
  }

  /**
   * Handle SEPA charge failed
   * Payment failed (insufficient funds, account closed, mandate revoked)
   */
  private async handleSepaChargeFailed(charge: { id: string; payment_intent?: string; failure_code?: string; failure_message?: string; metadata: Record<string, string> }) {
    if (!charge.payment_intent) return;

    const transaction = await this.prisma.transaction.findUnique({
      where: { stripePaymentIntentId: charge.payment_intent as string },
    });

    if (transaction) {
      // Mark transaction as failed
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'FAILED' },
      });

      console.error(
        `[SEPA CHARGE FAILED] Transaction ${transaction.id} failed. Reason: ${charge.failure_code} - ${charge.failure_message}`,
      );

      // Common SEPA failure reasons:
      // - insufficient_funds: Not enough money in account
      // - account_closed: Bank account is closed
      // - debit_not_authorized: Mandate was revoked
      // - invalid_account_number: IBAN is invalid

      // Notify customer about payment failure
      // await this.notificationService.notifySepaPaymentFailed(
      //   transaction.missionId,
      //   charge.failure_message
      // );

      // For missions, may need to request alternative payment method
      if (transaction.missionId) {
        await this.prisma.mission.update({
          where: { id: transaction.missionId },
          data: { status: 'PENDING' }, // Reset to pending for alternative payment
        });
      }
    }
  }
}
