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

      // Enable automatic payment methods (includes 3D Secure)
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'always', // Allow 3D Secure redirects
      },

      // Explicitly request 3D Secure for card payments (SCA compliance)
      payment_method_options: {
        card: {
          request_three_d_secure: 'any', // Always request 3DS when available
        },
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
}
