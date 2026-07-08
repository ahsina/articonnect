import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16',
    });
  }

  /** Récupère un PaymentIntent existant (idempotence : réutiliser au lieu de recréer). */
  async retrievePaymentIntent(id: string) {
    return this.stripe.paymentIntents.retrieve(id);
  }

  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    metadata?: Record<string, string>;
    customerId?: string;
    radarSession?: string; // Radar session from frontend (stripe.js)
    userIp?: string; // User IP for fraud detection
  }) {
    return this.stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency,
      metadata: params.metadata,
      capture_method: 'manual', // For escrow

      // Escrow carte : on autorise les cartes + wallets (Apple/Google Pay) mais PAS les méthodes à
      // redirection externe (Klarna/Link/Satispay), sinon la confirmation carte part en redirect et
      // ne peut aboutir sans navigateur. Le 3DS reste géré in-page par le Payment Element.
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },

      // Explicitly request 3D Secure for card payments (SCA compliance)
      payment_method_options: {
        card: {
          request_three_d_secure: 'any', // Always request 3DS when available
        },
        // Apple Pay and Google Pay are automatically enabled via automatic_payment_methods
        // They appear when available on compatible devices/browsers
      },

      // Link to customer if provided
      ...(params.customerId && { customer: params.customerId }),

      // Stripe Radar fraud detection configuration
      // Radar is ENABLED by default and analyzes every payment
      // We enhance detection by providing additional data:
      ...(params.radarSession && { radar_options: { session: params.radarSession } }),

      // Return URL after 3D Secure authentication (for redirect flow)
      // Note: This is optional - the frontend will handle this via stripe.js
      // but it's good practice to set it for webhook/server-side flows
    });
  }

  async capturePayment(paymentIntentId: string) {
    return this.stripe.paymentIntents.capture(paymentIntentId);
  }

  async createTransfer(params: {
    amount: number;
    destination: string;
    metadata?: Record<string, string>;
  }) {
    return this.stripe.transfers.create({
      amount: params.amount,
      currency: 'eur',
      destination: params.destination,
      metadata: params.metadata,
    });
  }

  async refundPayment(paymentIntentId: string, amountCents?: number) {
    return this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      ...(amountCents && amountCents > 0 ? { amount: Math.round(amountCents) } : {}),
    });
  }

  // ================================================================
  // SEPA DIRECT DEBIT PAYMENT METHOD
  // ================================================================

  /**
   * Create SetupIntent for SEPA Direct Debit mandate
   * Customer must authorize bank account debits via SEPA mandate
   *
   * Process:
   * 1. Create SetupIntent with SEPA payment method type
   * 2. Customer provides IBAN and authorizes mandate (frontend)
   * 3. Stripe verifies IBAN and creates mandate
   * 4. Future payments use the payment method ID
   */
  async createSepaSetupIntent(customerId: string, metadata?: Record<string, string>) {
    return this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['sepa_debit'],
      metadata: metadata || {},
      // Mandate data for SEPA Direct Debit
      mandate_data: {
        customer_acceptance: {
          type: 'online',
          online: {
            ip_address: metadata?.ipAddress,
            user_agent: metadata?.userAgent,
          },
        },
      },
    });
  }

  /**
   * Create Payment Intent with SEPA Direct Debit
   * Requires existing payment method from SetupIntent
   */
  async createSepaPaymentIntent(params: {
    amount: number;
    currency: string;
    customerId: string;
    paymentMethodId: string;
    metadata?: Record<string, string>;
  }) {
    return this.stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency || 'eur',
      customer: params.customerId,
      payment_method: params.paymentMethodId,
      payment_method_types: ['sepa_debit'],
      metadata: params.metadata,
      capture_method: 'manual', // For escrow
      // SEPA payments are confirmed automatically but take 5-7 business days
      confirm: false, // Confirm explicitly after creation
    });
  }

  /**
   * Confirm SEPA payment intent
   * Payment is submitted but funds take 5-7 business days to arrive
   */
  async confirmSepaPayment(paymentIntentId: string) {
    return this.stripe.paymentIntents.confirm(paymentIntentId);
  }

  /**
   * Get SEPA mandate details
   * Shows customer authorization status and bank account info
   */
  async getSepaMandateDetails(mandateId: string) {
    return this.stripe.mandates.retrieve(mandateId);
  }

  /**
   * List customer's SEPA payment methods
   * Shows all authorized bank accounts
   */
  async listCustomerSepaPaymentMethods(customerId: string) {
    return this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'sepa_debit',
    });
  }

  /**
   * Detach SEPA payment method (revoke mandate)
   * Customer removes authorization for bank account debits
   */
  async detachSepaPaymentMethod(paymentMethodId: string) {
    return this.stripe.paymentMethods.detach(paymentMethodId);
  }

  async createConnectAccount(email: string, country = 'LU') {
    return this.stripe.accounts.create({
      type: 'express',
      country,
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
  }

  async createConnectAccountLink(accountId: string, returnUrl: string, refreshUrl: string) {
    return this.stripe.accountLinks.create({
      account: accountId,
      return_url: returnUrl,
      refresh_url: refreshUrl,
      type: 'account_onboarding',
    });
  }

  async getConnectAccount(accountId: string) {
    return this.stripe.accounts.retrieve(accountId);
  }

  /**
   * Construct and verify webhook event from Stripe
   * Ensures webhook authenticity by verifying the signature
   */
  constructWebhookEvent(
    rawBody: string,
    signature: string,
    webhookSecret: string,
  ): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  }

  // ================================================================
  // APPLE PAY & GOOGLE PAY CONFIGURATION
  // ================================================================

  /**
   * Create or verify Apple Pay domain
   * Required to enable Apple Pay on your domain
   *
   * Steps:
   * 1. Host apple-developer-merchantid-domain-association file at:
   *    https://yourdomain.com/.well-known/apple-developer-merchantid-domain-association
   * 2. Call this method to verify the domain with Apple
   * 3. Apple Pay will be automatically available via automatic_payment_methods
   */
  async verifyApplePayDomain(domainName: string) {
    try {
      return await this.stripe.applePayDomains.create({
        domain_name: domainName,
      });
    } catch (error: any) {
      // Domain might already be verified
      if (error.code === 'apple_pay_domain_already_registered') {
        return { verified: true, message: 'Domain already verified' };
      }
      throw error;
    }
  }

  /**
   * List all verified Apple Pay domains
   */
  async listApplePayDomains() {
    return this.stripe.applePayDomains.list({ limit: 100 });
  }

  /**
   * Delete Apple Pay domain verification
   */
  async deleteApplePayDomain(domainId: string) {
    return this.stripe.applePayDomains.del(domainId);
  }

  /**
   * Google Pay Configuration
   *
   * Google Pay is automatically enabled via automatic_payment_methods.
   * No additional server-side configuration needed.
   *
   * Frontend requirements:
   * 1. Include Google Pay button in payment form
   * 2. Google Pay will appear automatically when:
   *    - User is on Chrome/Android
   *    - User has Google Pay set up
   *    - Payment amount and currency are supported
   *
   * For production, ensure your domain is added to:
   * - Stripe Dashboard > Settings > Payment methods > Google Pay
   */
  getGooglePayConfig() {
    return {
      enabled: true,
      merchantId: process.env.STRIPE_MERCHANT_ID || undefined,
      merchantName: 'Krafolt',
      // Google Pay is automatically configured via automatic_payment_methods
      // Frontend can use Stripe.js Payment Request Button API
    };
  }

  // ================================================================
  // STRIPE RADAR - FRAUD DETECTION
  // ================================================================

  /**
   * Stripe Radar is ENABLED by default for all Stripe accounts
   * It automatically analyzes every payment for fraud signals
   *
   * Radar uses machine learning to:
   * - Detect fraudulent cards and transactions
   * - Block high-risk payments automatically
   * - Request 3D Secure for elevated risk
   * - Flag suspicious activity for review
   *
   * Risk Levels:
   * - Normal: Payment proceeds normally
   * - Elevated: 3D Secure requested (SCA)
   * - Highest: Payment blocked or requires manual review
   *
   * Configuration is done via Stripe Dashboard:
   * - Settings > Radar > Rules
   * - Settings > Radar > Block/Review lists
   */

  /**
   * Get Radar risk score for a charge or payment intent
   * Risk score ranges from 0-100 (higher = more risky)
   */
  async getRadarRiskScore(chargeId: string) {
    const charge = await this.stripe.charges.retrieve(chargeId);
    return {
      riskLevel: charge.outcome?.risk_level,
      riskScore: charge.outcome?.risk_score,
      radarReason: charge.outcome?.reason,
      sellerMessage: charge.outcome?.seller_message,
      networkStatus: charge.outcome?.network_status,
    };
  }

  /**
   * Manually review a charge flagged by Radar
   * Actions: approve or refund
   */
  async reviewCharge(chargeId: string, action: 'approve' | 'refund') {
    // List reviews without charge filter (Stripe API doesn't support charge parameter)
    const review = await this.stripe.reviews.list({
      limit: 100,
    });

    // Find the review for this charge
    const chargeReview = review.data.find((r) => r.charge === chargeId);

    if (!chargeReview) {
      throw new Error('No review found for this charge');
    }

    if (action === 'approve') {
      return this.stripe.reviews.approve(chargeReview.id);
    } else {
      // Refund the charge
      return this.refundPayment(chargeId);
    }
  }

  /**
   * Block or unblock a customer/card using Radar block lists
   * Used to permanently block fraudulent actors
   */
  async blockCustomer(customerId: string, reason: string) {
    // Add customer to Radar block list
    // Note: This requires Radar for Fraud Teams (paid feature)
    // For standard Radar, block via Dashboard or use metadata flags
    return this.stripe.customers.update(customerId, {
      metadata: {
        blocked: 'true',
        blocked_reason: reason,
        blocked_at: new Date().toISOString(),
      },
    });
  }

  /**
   * List early fraud warnings (EFWs)
   * These are notifications from card issuers about disputed charges
   * Note: Early Fraud Warnings API has been deprecated by Stripe
   * Use Disputes API instead for fraud monitoring
   */
  async listEarlyFraudWarnings(chargeId?: string) {
    // Early Fraud Warnings API is deprecated
    // Use Disputes API as alternative
    const disputes = await this.stripe.disputes.list({
      ...(chargeId && { charge: chargeId }),
      limit: 100,
    });
    return disputes;
  }

  /**
   * Get Radar session for frontend integration
   * Returns configuration for stripe.js Radar session tracking
   */
  getRadarConfig() {
    return {
      enabled: true,
      // Frontend should create Radar session using stripe.js:
      // const radarSession = await stripe.radar.session()
      // Then pass radarSession.id when creating payment intent
      instructions: {
        frontend: 'Use stripe.js to create Radar session',
        backend: 'Pass radarSession parameter to createPaymentIntent()',
      },
      documentation: 'https://stripe.com/docs/radar',
    };
  }
}
