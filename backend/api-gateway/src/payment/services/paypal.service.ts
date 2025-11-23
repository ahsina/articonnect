import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface PayPalOrderRequest {
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
  description?: string;
}

export interface PayPalOrder {
  id: string;
  status: string;
  links: Array<{ href: string; rel: string; method: string }>;
}

export interface PayPalCaptureResponse {
  id: string;
  status: string;
  purchase_units: Array<{
    payments: {
      captures: Array<{
        id: string;
        status: string;
        amount: {
          value: string;
          currency_code: string;
        };
      }>;
    };
  }>;
}

/**
 * PayPal Payment Service
 *
 * Features:
 * - PayPal Checkout integration (Orders API v2)
 * - Order creation and capture
 * - Refund processing
 * - Webhook handling for payment events
 * - Support for multiple currencies
 * - Sandbox and production modes
 *
 * Benefits over Stripe:
 * - No card required (uses PayPal account)
 * - Lower fees in some regions (2.9% + €0.30 vs Stripe's similar)
 * - Trusted brand (many users have PayPal accounts)
 * - Buyer protection built-in
 * - One-click checkout for logged-in users
 *
 * Payment Flow:
 * 1. Client requests payment → create PayPal order
 * 2. Client redirects to PayPal → approves payment
 * 3. Client returns to site → capture payment
 * 4. Webhook confirms payment → update database
 *
 * Webhook Events:
 * - CHECKOUT.ORDER.APPROVED (order approved by customer)
 * - PAYMENT.CAPTURE.COMPLETED (payment captured)
 * - PAYMENT.CAPTURE.DENIED (payment failed)
 * - PAYMENT.CAPTURE.REFUNDED (refund processed)
 */
@Injectable()
export class PaypalService {
  private readonly logger = new Logger(PaypalService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly webhookId: string;
  private readonly enabled: boolean;
  private axiosInstance: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>('PAYPAL_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET') || '';
    this.webhookId = this.configService.get<string>('PAYPAL_WEBHOOK_ID') || '';

    // Use sandbox for development, live for production
    const mode = this.configService.get<string>('PAYPAL_MODE') || 'sandbox';
    const liveUrl = this.configService.get<string>('PAYPAL_API_URL_LIVE') || 'https://api-m.paypal.com';
    const sandboxUrl = this.configService.get<string>('PAYPAL_API_URL_SANDBOX') || 'https://api-m.sandbox.paypal.com';
    this.baseUrl = mode === 'live' ? liveUrl : sandboxUrl;

    this.enabled = !!(this.clientId && this.clientSecret);

    // Initialize axios instance
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (this.enabled) {
      this.logger.log(`✅ PayPal service initialized (${mode} mode)`);
    } else {
      this.logger.warn('⚠️  PayPal service disabled (missing configuration)');
    }
  }

  /**
   * Get OAuth2 access token from PayPal
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response = await axios.post(
        `${this.baseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.accessToken = response.data.access_token;
      // Set expiry to 90% of actual expiry (buffer for clock skew)
      this.tokenExpiry = Date.now() + response.data.expires_in * 900;

      this.logger.log('Access token refreshed');
      return this.accessToken;
    } catch (error) {
      this.logger.error('Failed to get PayPal access token', error);
      throw new BadRequestException('Échec de connexion à PayPal');
    }
  }

  /**
   * Create PayPal order
   */
  async createOrder(params: PayPalOrderRequest): Promise<PayPalOrder> {
    if (!this.enabled) {
      throw new BadRequestException('PayPal service is not enabled');
    }

    try {
      const accessToken = await this.getAccessToken();

      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: params.currency.toUpperCase(),
              value: (params.amount / 100).toFixed(2), // Convert cents to decimal
            },
            description: params.description || 'ArtiConnect Mission Payment',
            custom_id: params.metadata?.missionId || undefined,
          },
        ],
        application_context: {
          brand_name: 'ArtiConnect',
          locale: 'fr-FR',
          landing_page: 'NO_PREFERENCE',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
          return_url: `${this.configService.get('API_BASE_URL')}/payment/paypal/success`,
          cancel_url: `${this.configService.get('API_BASE_URL')}/payment/paypal/cancel`,
        },
      };

      const response = await this.axiosInstance.post('/v2/checkout/orders', orderData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      this.logger.log(`PayPal order created: ${response.data.id}`);

      return response.data as PayPalOrder;
    } catch (error) {
      this.logger.error('Failed to create PayPal order', error.response?.data || error);
      throw new BadRequestException('Échec de création de commande PayPal');
    }
  }

  /**
   * Capture payment for approved order
   */
  async captureOrder(orderId: string): Promise<PayPalCaptureResponse> {
    if (!this.enabled) {
      throw new BadRequestException('PayPal service is not enabled');
    }

    try {
      const accessToken = await this.getAccessToken();

      const response = await this.axiosInstance.post(
        `/v2/checkout/orders/${orderId}/capture`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      this.logger.log(`PayPal order captured: ${orderId}`);

      return response.data as PayPalCaptureResponse;
    } catch (error) {
      this.logger.error('Failed to capture PayPal order', error.response?.data || error);
      throw new BadRequestException('Échec de capture du paiement PayPal');
    }
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<any> {
    if (!this.enabled) {
      throw new BadRequestException('PayPal service is not enabled');
    }

    try {
      const accessToken = await this.getAccessToken();

      const response = await this.axiosInstance.get(`/v2/checkout/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get PayPal order', error);
      throw new BadRequestException('Échec de récupération de commande PayPal');
    }
  }

  /**
   * Refund captured payment
   */
  async refundCapture(captureId: string, amount?: number, currency?: string): Promise<any> {
    if (!this.enabled) {
      throw new BadRequestException('PayPal service is not enabled');
    }

    try {
      const accessToken = await this.getAccessToken();

      const refundData: any = {};

      if (amount && currency) {
        refundData.amount = {
          value: (amount / 100).toFixed(2),
          currency_code: currency.toUpperCase(),
        };
      }

      const response = await this.axiosInstance.post(
        `/v2/payments/captures/${captureId}/refund`,
        refundData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      this.logger.log(`PayPal capture refunded: ${captureId}`);

      return response.data;
    } catch (error) {
      this.logger.error('Failed to refund PayPal capture', error.response?.data || error);
      throw new BadRequestException('Échec de remboursement PayPal');
    }
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhookSignature(
    webhookId: string,
    headers: any,
    body: any,
  ): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const accessToken = await this.getAccessToken();

      const verificationData = {
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: webhookId,
        webhook_event: body,
      };

      const response = await this.axiosInstance.post(
        '/v1/notifications/verify-webhook-signature',
        verificationData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data.verification_status === 'SUCCESS';
    } catch (error) {
      this.logger.error('Failed to verify PayPal webhook signature', error);
      return false;
    }
  }

  /**
   * Handle webhook event
   */
  async handleWebhook(headers: any, body: any): Promise<void> {
    // Verify webhook signature
    const isValid = await this.verifyWebhookSignature(this.webhookId, headers, body);

    if (!isValid) {
      this.logger.warn('Invalid PayPal webhook signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    const eventType = body.event_type;
    const resource = body.resource;

    this.logger.log(`PayPal webhook received: ${eventType}`);

    switch (eventType) {
      case 'CHECKOUT.ORDER.APPROVED':
        this.logger.log(`Order approved: ${resource.id}`);
        // Order was approved by customer, ready for capture
        break;

      case 'PAYMENT.CAPTURE.COMPLETED':
        this.logger.log(`Payment captured: ${resource.id}`);
        // Payment was successfully captured
        // Update transaction in database to COMPLETED
        break;

      case 'PAYMENT.CAPTURE.DENIED':
        this.logger.warn(`Payment denied: ${resource.id}`);
        // Payment was denied
        // Update transaction to FAILED
        break;

      case 'PAYMENT.CAPTURE.REFUNDED':
        this.logger.log(`Payment refunded: ${resource.id}`);
        // Refund was processed
        // Update transaction to REFUNDED
        break;

      default:
        this.logger.log(`Unhandled PayPal event: ${eventType}`);
    }
  }

  /**
   * Check if PayPal is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get PayPal client ID for frontend (public key)
   */
  getClientId(): string {
    return this.clientId;
  }
}
