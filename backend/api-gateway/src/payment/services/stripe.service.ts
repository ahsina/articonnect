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
  }) {
    return this.stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency,
      metadata: params.metadata,
      capture_method: 'manual', // For escrow
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
}
