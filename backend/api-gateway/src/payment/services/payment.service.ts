import { Injectable, BadRequestException, UnauthorizedException, ForbiddenException, UnprocessableEntityException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StripeService } from './stripe.service';
import { ReputationService } from './reputation.service';
import { RefundReason, Payment } from '@prisma/client';
import type { MissionWithRelations } from '../types/payment.types';
import { PayoutFraudDetectorService } from '../../fraud/services/payout-fraud-detector.service';
import { FeatureToggleService } from '../../fraud/services/feature-toggle.service';
import { KycService } from '../../compliance/services/kyc.service';
import { PlatformConfigService } from '../../config/services/platform-config.service';
import { FeeSettingsDto } from '../../config/dto/platform-config.dto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
    private reputationService: ReputationService,
    private payoutFraudDetector: PayoutFraudDetectorService,
    private featureToggle: FeatureToggleService,
    @Inject(forwardRef(() => KycService))
    private kycService: KycService,
    private platformConfig: PlatformConfigService,
  ) {}

  /**
   * Calcule la commission plateforme prélevée sur un montant encaissé, avec APPLICATION RÉELLE du
   * plancher/plafond configurés (minCommissionAmount/maxCommissionAmount) — jusqu'ici code mort.
   *
   * Intégrité commission (façon Uber) : la commission n'est JAMAIS nulle ni contournable.
   *  - base * taux, puis clampée au plancher (min) et au plafond (max) ;
   *  - min/maxCommissionAmount sont stockés EN CENTIMES (cf. DTO) -> conversion /100 en euros ;
   *  - backstop absolu : commission strictement > 0 (>= 0,01 €) même si la config est à 0/incohérente ;
   *  - jamais supérieure au montant réellement encaissé (base) pour ne pas produire un net artisan négatif.
   */
  private computeCommission(base: number, fee: FeeSettingsDto): number {
    const safeBase = Number(base) || 0;
    if (safeBase <= 0) {
      // Aucun encaissement possible : refuser plutôt que d'enregistrer une commission fantôme.
      throw new BadRequestException('Montant invalide : la commission plateforme ne peut pas être calculée sur un prix nul.');
    }
    const rate = (Number(fee.platformCommissionRate) || 0) / 100;
    const floorEuros = (Number(fee.minCommissionAmount) || 0) / 100; // config en centimes -> euros
    const capEuros = (Number(fee.maxCommissionAmount) || 0) / 100; // config en centimes -> euros

    let commission = safeBase * rate;
    if (floorEuros > 0) commission = Math.max(commission, floorEuros);
    if (capEuros > 0) commission = Math.min(commission, capEuros);
    // Intégrité : jamais <= 0, jamais > montant encaissé.
    commission = Math.max(commission, 0.01);
    commission = Math.min(commission, safeBase);
    return Math.round(commission * 100) / 100;
  }

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

    if (!(Number(mission.agreedPrice) >= 1)) {
      throw new BadRequestException('Prix non défini ou sous le plancher (1€)');
    }

    // IDEMPOTENCE : 1 seule Transaction par mission. Si elle existe déjà, on réutilise l'intent
    // (pas de doublon de PaymentIntent/Transaction sur re-mount/retry).
    const existingTx = await this.prisma.transaction.findUnique({ where: { missionId } });
    if (existingTx) {
      if (['SUCCEEDED', 'COMPLETED', 'CAPTURED'].includes(existingTx.status as string)) {
        throw new BadRequestException('Cette mission est déjà payée');
      }
      if (existingTx.stripePaymentIntentId) {
        const pi = await this.stripeService.retrievePaymentIntent(existingTx.stripePaymentIntentId);
        // Ne réutiliser que si le PaymentIntent est encore PAYABLE. Un PI canceled/failed/succeeded
        // ne doit PAS être re-servi (sinon le client reçoit le client_secret d'un intent mort).
        const reusable =
          pi &&
          ['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing'].includes(
            pi.status,
          );
        if (reusable && pi.client_secret) {
          return { clientSecret: pi.client_secret };
        }
        // Sinon on repart sur un nouveau PaymentIntent (la Transaction sera mise à jour plus bas).
      }
    }

    const amount = Number(mission.agreedPrice) * 100; // Convert to cents
    const amountInEuros = Number(mission.agreedPrice);

    // KYC Check for high-value payments (if enabled)
    const isKycEnabled = await this.featureToggle.isKycEnabled();
    if (isKycEnabled) {
      const singleTransactionThreshold = await this.featureToggle.getKycSingleTransactionThreshold();
      const cumulativeThreshold = await this.featureToggle.getKycCumulativeThreshold();

      // Check if this transaction exceeds single transaction threshold
      if (amountInEuros >= singleTransactionThreshold) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user?.kycVerified) {
          const autoBlockEnabled = await this.featureToggle.isKycAutoBlockEnabled();

          if (autoBlockEnabled) {
            this.logger.warn(
              `Payment blocked for user ${userId}: amount ${amountInEuros}€ exceeds KYC threshold ${singleTransactionThreshold}€`
            );

            throw new BadRequestException(
              `Vérification d'identité requise pour les transactions supérieures à ${singleTransactionThreshold}€. ` +
              'Veuillez compléter votre vérification KYC dans votre profil.'
            );
          } else {
            this.logger.warn(
              `Payment flagged for user ${userId}: KYC required but auto-block disabled`
            );
          }
        }
      }

      // Check cumulative transaction amount in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentTransactions = await this.prisma.transaction.aggregate({
        where: {
          mission: {
            clientId: userId,
          },
          status: { in: ['COMPLETED', 'HELD'] },
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: {
          amount: true,
        },
      });

      const cumulativeAmount = Number(recentTransactions._sum.amount || 0) + amountInEuros;

      if (cumulativeAmount >= cumulativeThreshold) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user?.kycVerified) {
          const autoBlockEnabled = await this.featureToggle.isKycAutoBlockEnabled();

          if (autoBlockEnabled) {
            this.logger.warn(
              `Payment blocked for user ${userId}: cumulative amount ${cumulativeAmount.toFixed(2)}€ exceeds KYC threshold ${cumulativeThreshold}€`
            );

            throw new BadRequestException(
              `Vérification d'identité requise: vous avez atteint ${cumulativeAmount.toFixed(2)}€ de transactions sur 30 jours. ` +
              `Le seuil est de ${cumulativeThreshold}€. Veuillez compléter votre vérification KYC.`
            );
          } else {
            this.logger.warn(
              `Payment flagged for user ${userId}: cumulative KYC threshold exceeded but auto-block disabled`
            );
          }
        }
      }
    }

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

    // Get commission rates from platform config
    const feeSettings = await this.platformConfig.getFeeSettings();
    const artisanRate = feeSettings.artisanPayoutPercentage / 100;
    // Commission avec plancher/plafond appliqués (jamais nulle / contournable).
    const commission = this.computeCommission(Number(mission.agreedPrice), feeSettings);

    // Upsert : si une Transaction existait déjà (PI mort régénéré), on la met à jour au lieu de
    // violer la contrainte unique sur missionId.
    const txData = {
      type: 'MISSION' as const,
      amount: mission.agreedPrice,
      commission,
      artisanAmount: Number(mission.agreedPrice) * artisanRate,
      stripePaymentIntentId: paymentIntent.id,
      status: 'PENDING' as const,
    };
    await this.prisma.transaction.upsert({
      where: { missionId: mission.id },
      create: { missionId: mission.id, ...txData },
      update: txData,
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
    try {
      await this.stripeService.capturePayment(transaction.stripePaymentIntentId);
    } catch (error) {
      this.logger.error(
        `Stripe capture failed for mission ${missionId}: ${error?.message}`,
      );
      throw new UnprocessableEntityException(
        'Le paiement ne peut pas être capturé dans son état actuel.',
      );
    }

    // Update transaction status
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'COMPLETED' },
    });

    // Payout Fraud Screening (if enabled) - BEFORE transfer to artisan
    const isPayoutScreeningEnabled = await this.featureToggle.isPayoutFraudScreeningEnabled();
    if (isPayoutScreeningEnabled && transaction.mission.artisan?.id) {
      try {
        const payoutAmount = Number(transaction.artisanAmount);
        const fraudResult = await this.payoutFraudDetector.screenPayout(
          transaction.mission.artisan.id,
          payoutAmount
        );

        // Check if auto-hold is enabled
        const autoHoldEnabled = await this.featureToggle.isPayoutAutoHoldEnabled();
        const riskThreshold = await this.featureToggle.getPayoutRiskThreshold();

        if (fraudResult.isRisky && fraudResult.riskScore >= riskThreshold) {
          this.logger.warn(
            `Payout to artisan ${transaction.mission.artisan.id} flagged as risky (score: ${fraudResult.riskScore}). Recommendation: ${fraudResult.recommendation}`
          );

          // Auto-hold payout if enabled and recommendation requires it
          if (autoHoldEnabled &&
              (fraudResult.recommendation === 'HOLD_24H' ||
               fraudResult.recommendation === 'HOLD_48H' ||
               fraudResult.recommendation === 'MANUAL_REVIEW')) {

            const holdDuration = fraudResult.recommendation === 'HOLD_24H' ? 24 : 48;
            this.logger.warn(
              `Payout auto-held for ${holdDuration} hours due to fraud risk`
            );

            await this.prisma.transaction.update({
              where: { id: transaction.id },
              data: { status: 'HELD' },
            });

            return {
              success: true,
              message: `Paiement capturé mais retenu pour ${holdDuration}h (vérification de sécurité)`,
              payoutHeld: true,
              holdDuration,
              riskScore: fraudResult.riskScore,
            };
          }

          // Block payout if recommendation is BLOCK
          if (fraudResult.recommendation === 'BLOCK') {
            await this.prisma.transaction.update({
              where: { id: transaction.id },
              data: { status: 'HELD' },
            });

            throw new BadRequestException(
              'Paiement bloqué pour raisons de sécurité. Contactez le support.'
            );
          }
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error; // Re-throw blocked payout errors
        }
        this.logger.error(`Failed to run payout fraud detection:`, error);
        // Don't block legitimate payouts if fraud detection fails
      }
    }

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
    try {
      await this.stripeService.refundPayment(transaction.stripePaymentIntentId);
    } catch (error) {
      this.logger.error(
        `Stripe refund failed for mission ${missionId}: ${error?.message}`,
      );
      throw new UnprocessableEntityException(
        'Le paiement ne peut pas être remboursé dans son état actuel.',
      );
    }

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

    // IDEMPOTENCE : Stripe redélivre les events ; on n'exécute les effets de bord (capture/refund/transfert)
    // qu'UNE seule fois par event.id.
    const eventId = (event as any).id as string | undefined;
    if (eventId) {
      try {
        await this.prisma.webhookEvent.create({ data: { id: eventId, type: eventData.type } });
      } catch {
        this.logger.warn(`Webhook ${eventId} (${eventData.type}) déjà traité — ignoré (idempotence)`);
        return { received: true, duplicate: true };
      }
    }

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

    if (!transaction) return;

    // COMMANDE marketplace (type PRODUCT / orderId) : encaissement immédiat -> règlement vendeur.
    if (transaction.orderId) {
      let chargeId: string | undefined;
      try {
        const pi = await this.stripeService.retrievePaymentIntent(paymentIntent.id);
        chargeId = (pi as any)?.latest_charge as string | undefined;
      } catch {
        /* le règlement peut se faire sans source_transaction (fallback solde plateforme) */
      }
      await this.settleOrderPayment(transaction.id, chargeId);
      return;
    }

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'HELD' },
    });

    await this.reflectEscrowPaidOnMission(transaction);
  }

  /**
   * Règlement d'une commande marketplace après encaissement Stripe (webhook succeeded).
   * Idempotent : ne règle qu'une commande encore PENDING (une redélivrance PI+charge ne double pas).
   *  1) transaction atomique : décrément du stock + Order.status=PAID + paidAt + Transaction.HELD ;
   *  2) hors transaction : versement du net à chaque VENDEUR (Stripe Connect) — commission plateforme
   *     retenue. Si aucun vendeur onboardé (ou transfert échoué), les fonds restent encaissés côté
   *     plateforme et la commande demeure PAID : versement DIFFÉRÉ/récupérable, commission tracée.
   */
  private async settleOrderPayment(transactionId: string, chargeId?: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });
    if (!transaction || !transaction.orderId) return;

    const order = await this.prisma.order.findUnique({
      where: { id: transaction.orderId },
      include: { items: { include: { product: { select: { id: true, artisanId: true, name: true } } } } },
    });
    if (!order) return;

    // IDEMPOTENCE : on ne règle qu'une commande PENDING (stock décrémenté une seule fois).
    if (order.status !== 'PENDING') return;

    // payment_intent.succeeded ET charge.succeeded arrivent quasi simultanément pour la même charge :
    // les deux tentent de régler. On CLAME la transition PENDING->PAID de façon atomique via updateMany
    // (verrou ligne Postgres) : le 2e event matche 0 ligne et sort sans re-décrémenter le stock.
    const claimed = await this.prisma.$transaction(async (tx) => {
      const res = await tx.order.updateMany({
        where: { id: order.id, status: 'PENDING' },
        data: { status: 'PAID', paidAt: new Date() },
      });
      if (res.count === 0) return false; // déjà réglé par l'autre event

      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: 'HELD' },
      });
      return true;
    });

    // Le règlement (versement vendeur) n'est effectué que par le gagnant du CLAIM.
    if (!claimed) return;

    // Versement vendeur(s) : net = CA produits du vendeur - commission. Barème courant.
    const feeSettings = await this.platformConfig.getFeeSettings();
    const rate = (Number(feeSettings.platformCommissionRate) || 0) / 100;
    const floorEuros = (Number(feeSettings.minCommissionAmount) || 0) / 100;
    const capEuros = (Number(feeSettings.maxCommissionAmount) || 0) / 100;

    const grossBySeller = new Map<string, number>();
    for (const it of order.items) {
      const artisanId = it.product?.artisanId;
      if (!artisanId) continue;
      grossBySeller.set(artisanId, (grossBySeller.get(artisanId) || 0) + Number(it.totalPrice));
    }

    let anyTransfer = false;
    let lastTransferId: string | undefined;
    let allTransferred = true;

    for (const [artisanId, gross] of grossBySeller.entries()) {
      let commission = gross * rate;
      if (floorEuros > 0) commission = Math.max(commission, floorEuros);
      if (capEuros > 0) commission = Math.min(commission, capEuros);
      commission = Math.max(commission, 0.01);
      commission = Math.min(commission, gross);
      const net = Math.round((gross - commission) * 100) / 100;
      if (net <= 0) { allTransferred = false; continue; }

      const seller = await this.prisma.user.findUnique({
        where: { id: artisanId },
        include: { artisanProfile: { select: { stripeAccountId: true, stripeOnboarded: true } } },
      });
      const acct = seller?.artisanProfile;
      if (!acct?.stripeAccountId || !acct?.stripeOnboarded) {
        // Vendeur non onboardé : versement différé (fonds encaissés, commande PAID). Récupérable.
        this.logger.warn(
          `Order ${order.id}: vendeur ${artisanId} sans compte Connect onboardé — versement de ${net}€ différé.`,
        );
        allTransferred = false;
        continue;
      }

      try {
        const transfer = await this.stripeService.createTransfer({
          amount: Math.floor(net * 100),
          destination: acct.stripeAccountId,
          sourceTransaction: chargeId,
          metadata: { orderId: order.id, transactionId: transaction.id, artisanId },
        });
        anyTransfer = true;
        lastTransferId = transfer.id;
        this.logger.log(`Order ${order.id}: versé ${net}€ au vendeur ${artisanId} (transfer ${transfer.id}).`);
      } catch (e) {
        allTransferred = false;
        this.logger.error(
          `Order ${order.id}: échec versement ${net}€ au vendeur ${artisanId}: ${(e as any)?.message}. Fonds encaissés, versement différé.`,
        );
      }
    }

    // Transaction : COMPLETED si tous les vendeurs ont été versés ; sinon on garde HELD (versement
    // différé récupérable) — mais la commande RESTE PAID (le client a bien payé).
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: allTransferred && anyTransfer ? 'COMPLETED' : 'HELD',
        ...(allTransferred && anyTransfer ? { completedAt: new Date() } : {}),
        ...(lastTransferId && grossBySeller.size === 1 ? { stripeTransferId: lastTransferId } : {}),
      },
    });
  }

  /**
   * Reflète un paiement retenu en escrow (Transaction HELD/autorisation carte) sur la mission.
   * Sans ceci, une charge autorisée (charge.succeeded) laissait la mission bloquée à
   * PENDING_DEPOSIT / ACCEPTED « non payé à vie » (le statut acompte/paiement n'était jamais écrit).
   * - Acompte (DEPOSIT)  -> status DEPOSIT_PAID + depositPaidAt
   * - Paiement total     -> status PAID (+ depositPaidAt = trace « payé en escrow »)
   * On n'avance JAMAIS un statut déjà plus avancé (IN_TRANSIT, IN_PROGRESS, COMPLETED, ...).
   */
  private async reflectEscrowPaidOnMission(transaction: {
    missionId: string | null;
    type: string;
  }) {
    if (!transaction.missionId) return;
    const mission = await this.prisma.mission.findUnique({
      where: { id: transaction.missionId },
      select: { status: true, depositPaidAt: true },
    });
    if (!mission) return;

    // Statuts « en attente de paiement » depuis lesquels on peut refléter le paiement escrow.
    const reflectable = ['PENDING_DEPOSIT', 'ACCEPTED', 'NEGOTIATING'];
    const isDeposit = transaction.type === 'DEPOSIT';

    const data: { status?: any; depositPaidAt?: Date } = {};
    if (!mission.depositPaidAt) {
      data.depositPaidAt = new Date();
    }
    if (reflectable.includes(mission.status as string)) {
      data.status = isDeposit ? 'DEPOSIT_PAID' : 'PAID';
    }
    if (Object.keys(data).length === 0) return;

    await this.prisma.mission.update({
      where: { id: transaction.missionId },
      data,
    });
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
        data: { status: 'FAILED' },
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
        client: {
          include: {
            clientProfile: true,
          },
        },
      },
    });

    if (!mission || mission.clientId !== userId) {
      throw new BadRequestException('Non autorisé');
    }

    if (!(Number(mission.agreedPrice) >= 1)) {
      throw new BadRequestException('Prix non défini ou sous le plancher (1€)');
    }

    if (!mission.depositRequired) {
      throw new BadRequestException('Acompte non requis pour cette mission');
    }

    // IDEMPOTENCE : 1 seule Transaction par mission (contrainte unique missionId). Sans garde, un 2e
    // POST /payments/deposit créait un 2e PaymentIntent + une 2e ligne Payment AVANT de crasher en 500
    // sur la contrainte unique (risque de double encaissement + fuite Prisma). On tranche AVANT Stripe :
    //  - déjà payé (HELD/COMPLETED) -> rejet propre
    //  - intent encore payable       -> on renvoie le même clientSecret (idempotent)
    const existingTx = await this.prisma.transaction.findUnique({ where: { missionId } });
    if (existingTx) {
      if (['HELD', 'COMPLETED'].includes(existingTx.status as string)) {
        throw new BadRequestException('L\'acompte de cette mission est déjà payé');
      }
      if (existingTx.stripePaymentIntentId) {
        const pi = await this.stripeService.retrievePaymentIntent(existingTx.stripePaymentIntentId);
        const reusable =
          pi &&
          ['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'requires_capture'].includes(
            pi.status,
          );
        if (reusable && pi.client_secret) {
          return {
            clientSecret: pi.client_secret,
            amount: Number(existingTx.amount),
            depositPercentage: mission.depositPercentage,
          };
        }
      }
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

    // Enregistrement Payment (idempotent : réutiliser la ligne DEPOSIT existante plutôt que d'en
    // empiler une 2e sur retry / PI régénéré).
    const existingDeposit = await this.prisma.payment.findFirst({
      where: { missionId: mission.id, type: 'DEPOSIT' },
    });
    if (existingDeposit) {
      await this.prisma.payment.update({
        where: { id: existingDeposit.id },
        data: { amount: depositAmount, stripePaymentIntentId: paymentIntent.id },
      });
    } else {
      await this.prisma.payment.create({
        data: {
          missionId: mission.id,
          userId,
          type: 'DEPOSIT',
          amount: depositAmount,
          stripePaymentIntentId: paymentIntent.id,
        },
      });
    }

    // Get commission rates from platform config
    const feeSettings = await this.platformConfig.getFeeSettings();
    const artisanRate = feeSettings.artisanPayoutPercentage / 100;
    // Commission avec plancher/plafond appliqués (jamais nulle / contournable).
    const commission = this.computeCommission(depositAmount, feeSettings);

    // Transaction (contrainte unique missionId) : upsert pour ne pas violer la contrainte quand un
    // PaymentIntent mort est régénéré (la Transaction existe déjà).
    const depositTxData = {
      type: 'DEPOSIT' as const,
      amount: depositAmount,
      commission,
      artisanAmount: depositAmount * artisanRate,
      stripePaymentIntentId: paymentIntent.id,
      status: 'PENDING' as const,
    };
    await this.prisma.transaction.upsert({
      where: { missionId: mission.id },
      create: { missionId: mission.id, ...depositTxData },
      update: depositTxData,
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

    // SÉCURITÉ : seul le client de la mission peut demander un remboursement de SA mission.
    if (_requestedBy && mission.clientId !== _requestedBy) {
      throw new ForbiddenException('Vous ne pouvez pas rembourser cette mission');
    }

    // Trouver le paiement principal
    const payment = mission.payments.find((p) => p.type === 'FULL_PAYMENT') ||
      mission.payments.find((p) => p.type === 'DEPOSIT');

    if (!payment || !payment.stripePaymentIntentId) {
      throw new BadRequestException('Aucun paiement à rembourser');
    }

    // SÉCURITÉ : on clamp le montant fourni par le client au montant réellement payé (0 ≤ refund ≤ payé).
    const maxRefund = Number(payment.amount);
    const refundAmount = amount != null ? Math.min(Math.max(Number(amount), 0), maxRefund) : maxRefund;

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
      // Compensation artisan pour déplacement - use no-show compensation minimum as travel fee
      const noShowConfig = await this.platformConfig.getNoShowConfig();
      const compensationAmount = noShowConfig.compensationMinimum / 100; // Convert cents to euros
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

    // Payout Fraud Screening (if enabled)
    const isPayoutScreeningEnabled = await this.featureToggle.isPayoutFraudScreeningEnabled();
    if (isPayoutScreeningEnabled) {
      try {
        const payoutAmount = Number(mission.transaction.artisanAmount);
        const fraudResult = await this.payoutFraudDetector.screenPayout(
          mission.artisan.id,
          payoutAmount
        );

        const autoHoldEnabled = await this.featureToggle.isPayoutAutoHoldEnabled();
        const riskThreshold = await this.featureToggle.getPayoutRiskThreshold();

        if (fraudResult.isRisky && fraudResult.riskScore >= riskThreshold) {
          this.logger.warn(
            `Payout to artisan ${mission.artisan.id} flagged as risky (score: ${fraudResult.riskScore})`
          );

          // Auto-hold payout if enabled
          if (autoHoldEnabled &&
              (fraudResult.recommendation === 'HOLD_24H' ||
               fraudResult.recommendation === 'HOLD_48H' ||
               fraudResult.recommendation === 'MANUAL_REVIEW')) {

            const holdDuration = fraudResult.recommendation === 'HOLD_24H' ? 24 : 48;

            return {
              success: false,
              message: `Paiement retenu pour ${holdDuration}h (vérification de sécurité)`,
              payoutHeld: true,
              holdDuration,
              riskScore: fraudResult.riskScore,
            };
          }

          // Block payout if recommendation is BLOCK
          if (fraudResult.recommendation === 'BLOCK') {
            throw new BadRequestException(
              'Paiement bloqué pour raisons de sécurité. Contactez le support.'
            );
          }
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        this.logger.error(`Failed to run payout fraud detection:`, error);
      }
    }

    // CAPTURE de l'escrow AVANT tout transfert : le PaymentIntent est en capture manuelle, l'argent
    // du client n'est qu'AUTORISÉ. On l'ENCAISSE ici, indépendamment du compte Connect de l'artisan
    // (sinon, sans Connect, l'argent n'est jamais capturé alors que le travail est validé).
    if (mission.transaction.stripePaymentIntentId) {
      try {
        const pi = await this.stripeService.retrievePaymentIntent(
          mission.transaction.stripePaymentIntentId,
        );
        if (pi && pi.status === 'requires_capture') {
          await this.stripeService.capturePayment(mission.transaction.stripePaymentIntentId);
          await this.prisma.transaction.update({
            where: { id: mission.transaction.id },
            data: { status: 'HELD' },
          });
          this.logger.log(`Escrow capturé pour la mission ${missionId} (fonds détenus par la plateforme).`);
        }
      } catch (captureError) {
        this.logger.error(
          `Échec de capture escrow pour la mission ${missionId}: ${(captureError as any)?.message}`,
        );
        throw new BadRequestException('La capture du paiement a échoué.');
      }
    }

    // Transférer à l'artisan (le versement Connect est SÉPARÉ de la capture : son échec ne doit pas
    // annuler la capture déjà effectuée).
    // On vérifie stripeAccountId ET stripeOnboarded : un compte créé mais non onboardé n'a pas la
    // capability `transfers` -> createTransfer échouait côté Stripe. On ne tente donc le versement que
    // si le compte est réellement prêt ; sinon on lève une erreur (payout DIFFÉRÉ, escrow déjà capturé
    // = fonds détenus/HELD, versement RÉCUPÉRABLE une fois l'onboarding terminé).
    const artisanStripe = mission.artisan.artisanProfile;
    if (artisanStripe?.stripeAccountId && artisanStripe?.stripeOnboarded) {
      const transferAmount = Math.floor(Number(mission.transaction.artisanAmount) * 100);

      const transfer = await this.stripeService.createTransfer({
        amount: transferAmount,
        destination: artisanStripe.stripeAccountId,
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

    // Compte Connect absent ou non onboardé : versement impossible pour l'instant. L'escrow reste
    // capturé/HELD (fonds sécurisés, transaction NON marquée COMPLETED car aucun euro versé). Le payout
    // est différé/récupérable et sera retenté une fois le compte prêt.
    throw new BadRequestException(
      artisanStripe?.stripeAccountId
        ? 'Compte de paiement artisan non finalisé (onboarding Stripe Connect requis). Versement différé, fonds sécurisés en escrow.'
        : 'Artisan sans compte Stripe Connect. Versement différé, fonds sécurisés en escrow.',
    );
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
      this.logger.warn(
        `Artisan ${artisanId} has no Stripe account. Transfer skipped.`,
      );
      return;
    }

    if (!stripeOnboarded) {
      this.logger.warn(
        `Artisan ${artisanId} Stripe account not onboarded. Transfer skipped.`,
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

      this.logger.log(
        `Transfer success: ${amount}€ to artisan ${artisanId} (Stripe: ${transfer.id})`,
      );
    } catch (error) {
      this.logger.error(
        `Transfer failed: ${amount}€ to artisan ${artisanId}: ${error.message}`,
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
      this.logger.warn(
        `Radar review: Transaction ${transaction.id} flagged. Review ID: ${review.id}`,
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

      this.logger.log(
        `Radar review closed: Transaction ${transaction.id} ${wasApproved ? 'approved' : 'refunded/closed'}`,
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
      this.logger.error(
        `Early fraud warning: Transaction ${transaction.id}. Charge: ${warning.charge}`,
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
          this.logger.error(`Failed to auto-refund after early fraud warning: ${error.message}`);
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
    this.logger.log(
      `SEPA setup success: Customer ${setupIntent.customer} authorized mandate. PM: ${setupIntent.payment_method}`,
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
    this.logger.error(
      `SEPA setup failed: Customer ${setupIntent.customer}. Error: ${setupIntent.last_setup_error?.message}`,
    );

    // Notify customer about setup failure
    // await this.notificationService.notifySepaSetupFailed(customerId, errorMessage);
  }

  /**
   * Handle SEPA charge succeeded
   * Payment completed successfully (after 5-7 business days)
   */
  private async handleSepaChargeSucceeded(charge: { id: string; payment_intent?: string; amount?: number; metadata?: Record<string, string> }) {
    if (!charge.payment_intent) return;

    const transaction = await this.prisma.transaction.findUnique({
      where: { stripePaymentIntentId: charge.payment_intent as string },
    });

    if (transaction) {
      // COMMANDE marketplace : règlement vendeur (idempotent avec payment_intent.succeeded).
      if (transaction.orderId) {
        await this.settleOrderPayment(transaction.id, charge.id);
        this.logger.log(
          `Order charge success: Transaction ${transaction.id}. Amount: ${charge.amount ? charge.amount / 100 : 'unknown'}€`,
        );
        return;
      }

      // Update transaction to HELD (funds received/authorized, ready to capture)
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'HELD' },
      });

      // charge.succeeded = autorisation carte (escrow) OU encaissement SEPA : dans les deux cas,
      // le paiement est retenu -> on le reflète sur la mission (DEPOSIT_PAID / PAID + depositPaidAt).
      await this.reflectEscrowPaidOnMission(transaction);

      this.logger.log(
        `SEPA charge success: Transaction ${transaction.id}. Amount: ${charge.amount ? charge.amount / 100 : 'unknown'}€`,
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

      this.logger.error(
        `SEPA charge failed: Transaction ${transaction.id}. Reason: ${charge.failure_code} - ${charge.failure_message}`,
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

  /**
   * Remboursement lié à une ANNULATION : rembourse le montant remboursable (prix - frais d'annulation)
   * sur le paiement escrow s'il existe. Retourne { refunded } (0 si aucun paiement à rembourser).
   * Idempotent-safe : si aucun paiement capturé, ne fait rien (pas d'erreur).
   */
  async refundForCancellation(missionId: string, refundableAmount: number): Promise<{ refunded: number; note?: string }> {
    if (!refundableAmount || refundableAmount <= 0) {
      return { refunded: 0, note: 'aucun montant à rembourser (montant demandé nul ou négatif)' };
    }
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: { payments: true, transaction: true },
    });
    const payment =
      mission?.payments.find((p) => p.type === 'FULL_PAYMENT') ||
      mission?.payments.find((p) => p.type === 'DEPOSIT');
    if (!payment || !payment.stripePaymentIntentId) {
      // Aucun paiement encaissé : rien à rembourser (annulation avant paiement).
      // Signalé explicitement pour ne pas masquer un remboursement fantôme (0€ silencieux).
      return { refunded: 0, note: 'aucun paiement capturé à rembourser' };
    }
    const capped = Math.min(refundableAmount, Number(payment.amount));
    // Part de l'escrow retenue au titre des frais d'annulation (barème) = payé - remboursable.
    const feeToRetain = Math.round((Number(payment.amount) - capped) * 100) / 100;

    try {
      // Distinguer un escrow NON capturé (capture_method:'manual' -> statut requires_capture) d'un
      // paiement déjà capturé. Stripe REFUSE refunds.create sur une charge non capturée : il faut
      // libérer l'AUTORISATION (paymentIntents.cancel), ou n'en capturer que les frais (capture
      // partielle) et laisser Stripe relâcher le reste. Sinon toute annulation d'une mission avec
      // acompte retenu était bloquée en 400.
      const pi = await this.stripeService.retrievePaymentIntent(payment.stripePaymentIntentId);
      const stripe = this.stripeService['stripe'];

      let refundedTrace = capped;

      if (pi && pi.status === 'requires_capture') {
        if (feeToRetain > 0) {
          // Capturer uniquement les frais d'annulation ; Stripe relâche automatiquement le reste
          // (= le remboursable) vers le client. => frais prélevés ET remboursable libéré, tracés.
          await stripe.paymentIntents.capture(payment.stripePaymentIntentId, {
            amount_to_capture: Math.round(feeToRetain * 100),
          });
          this.logger.log(
            `Annulation mission ${missionId} (escrow non capturé): frais ${feeToRetain}€ capturés, ${capped}€ libérés au client.`,
          );
        } else {
          // Aucun frais : on annule le PaymentIntent -> autorisation entièrement libérée.
          await stripe.paymentIntents.cancel(payment.stripePaymentIntentId);
          this.logger.log(
            `Annulation mission ${missionId} (escrow non capturé): autorisation de ${capped}€ libérée intégralement.`,
          );
        }

        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { refundedAmount: capped, refundedAt: new Date() },
        });
        if (mission?.transaction) {
          await this.prisma.transaction.update({
            where: { id: mission.transaction.id },
            data: { status: 'REFUNDED', refundedAt: new Date() },
          });
        }
        return { refunded: refundedTrace };
      }

      // Paiement déjà capturé (statut succeeded) : remboursement classique du montant remboursable.
      const refund = await this.stripeService.refundPayment(payment.stripePaymentIntentId, capped * 100);
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          refundedAmount: capped,
          refundedAt: new Date(),
          ...(refund?.id ? { stripeRefundId: refund.id } : {}),
        },
      });
      if (mission?.transaction) {
        await this.prisma.transaction.update({
          where: { id: mission.transaction.id },
          data: { status: 'REFUNDED', refundedAt: new Date() },
        });
      }
      this.logger.log(`Remboursement annulation mission ${missionId}: ${capped}€`);
      return { refunded: refundedTrace };
    } catch (e) {
      this.logger.error(`Échec remboursement annulation mission ${missionId}`, e as any);
      throw new BadRequestException('Le remboursement a échoué. Réessayez ou contactez le support.');
    }
  }
}
