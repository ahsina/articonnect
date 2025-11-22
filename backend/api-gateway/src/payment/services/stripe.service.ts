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

  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    metadata?: Record<string, string>;
    customerId?: string;
  }) {
    return this.stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency,
      metadata: params.metadata,
      capture_method: 'manual', // For escrow

      // Enable automatic payment methods (includes Card, Apple Pay, Google Pay, 3D Secure)
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'always', // Allow 3D Secure redirects
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

  async refundPayment(paymentIntentId: string) {
    return this.stripe.refunds.create({
      payment_intent: paymentIntentId,
    });
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
      merchantName: 'ArtiConnect',
      // Google Pay is automatically configured via automatic_payment_methods
      // Frontend can use Stripe.js Payment Request Button API
    };
  }
}
