import { Test, TestingModule } from '@nestjs/testing';
import { StripeService } from './stripe.service';

// Mock Stripe - create mockStripeInstance inside factory and store on globalThis
jest.mock('stripe', () => {
  const mockInstance = {
    paymentIntents: {
      create: jest.fn(),
      capture: jest.fn(),
      confirm: jest.fn(),
    },
    refunds: {
      create: jest.fn(),
    },
    transfers: {
      create: jest.fn(),
    },
    setupIntents: {
      create: jest.fn(),
    },
    mandates: {
      retrieve: jest.fn(),
    },
    paymentMethods: {
      list: jest.fn(),
      detach: jest.fn(),
    },
    accounts: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    accountLinks: {
      create: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
    applePayDomains: {
      create: jest.fn(),
      list: jest.fn(),
      del: jest.fn(),
    },
    charges: {
      retrieve: jest.fn(),
    },
    reviews: {
      list: jest.fn(),
      approve: jest.fn(),
    },
    customers: {
      update: jest.fn(),
    },
    disputes: {
      list: jest.fn(),
    },
  };
  // Store on globalThis for test access (globalThis exists before hoisting)
  (globalThis as any).__stripeMockInstance = mockInstance;
  return {
    __esModule: true,
    default: function MockStripe() {
      return mockInstance;
    },
  };
});

// Get reference to mock instance from globalThis
const getMockStripeInstance = () => (globalThis as any).__stripeMockInstance;

describe('StripeService', () => {
  let service: StripeService;
  let mockStripeInstance: ReturnType<typeof getMockStripeInstance>;

  beforeEach(async () => {
    // Get the mock instance
    mockStripeInstance = getMockStripeInstance();

    // Clear call history (not implementations) for all Stripe mock methods
    if (mockStripeInstance) {
      Object.keys(mockStripeInstance).forEach((key) => {
        const group = mockStripeInstance[key as keyof typeof mockStripeInstance];
        if (typeof group === 'object') {
          Object.keys(group).forEach((method) => {
            (group as any)[method].mockClear();
          });
        }
      });
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [StripeService],
    }).compile();

    service = module.get<StripeService>(StripeService);
  });

  // Note: Do NOT use jest.clearAllMocks() as it clears mock implementations

  describe('createPaymentIntent', () => {
    it('should create a payment intent with automatic payment methods', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        amount: 5000,
        currency: 'eur',
        status: 'requires_payment_method',
        client_secret: 'pi_123_secret_456',
      };

      mockStripeInstance.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await service.createPaymentIntent({
        amount: 5000,
        currency: 'eur',
        metadata: { missionId: 'mission-123' },
      });

      expect(result).toEqual(mockPaymentIntent);
      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000,
          currency: 'eur',
          metadata: { missionId: 'mission-123' },
          capture_method: 'manual',
        }),
      );
    });

    it('should handle payment intent creation errors', async () => {
      mockStripeInstance.paymentIntents.create.mockRejectedValue(
        new Error('Card declined'),
      );

      await expect(
        service.createPaymentIntent({ amount: 5000, currency: 'eur' }),
      ).rejects.toThrow('Card declined');
    });
  });

  describe('capturePayment', () => {
    it('should capture a payment intent', async () => {
      const mockCapturedIntent = {
        id: 'pi_123',
        status: 'succeeded',
        amount_captured: 5000,
      };

      mockStripeInstance.paymentIntents.capture.mockResolvedValue(mockCapturedIntent);

      const result = await service.capturePayment('pi_123');

      expect(result).toEqual(mockCapturedIntent);
      expect(mockStripeInstance.paymentIntents.capture).toHaveBeenCalledWith('pi_123');
    });
  });

  describe('refundPayment', () => {
    it('should create a refund for a payment intent', async () => {
      const mockRefund = {
        id: 're_123',
        status: 'succeeded',
      };

      mockStripeInstance.refunds.create.mockResolvedValue(mockRefund);

      const result = await service.refundPayment('pi_123');

      expect(result).toEqual(mockRefund);
      expect(mockStripeInstance.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_123',
      });
    });
  });

  describe('createTransfer', () => {
    it('should create a transfer to connected account', async () => {
      const mockTransfer = {
        id: 'tr_123',
        amount: 4500,
        destination: 'acct_123',
      };

      mockStripeInstance.transfers.create.mockResolvedValue(mockTransfer);

      const result = await service.createTransfer({
        amount: 4500,
        destination: 'acct_123',
        metadata: { missionId: 'mission-123' },
      });

      expect(result).toEqual(mockTransfer);
      expect(mockStripeInstance.transfers.create).toHaveBeenCalledWith({
        amount: 4500,
        currency: 'eur',
        destination: 'acct_123',
        metadata: { missionId: 'mission-123' },
      });
    });
  });

  describe('createConnectAccount', () => {
    it('should create a connected account for artisan', async () => {
      const mockAccount = {
        id: 'acct_123',
        type: 'express',
      };

      mockStripeInstance.accounts.create.mockResolvedValue(mockAccount);

      const result = await service.createConnectAccount(
        'artisan@example.com',
        'FR',
      );

      expect(result).toEqual(mockAccount);
      expect(mockStripeInstance.accounts.create).toHaveBeenCalledWith({
        type: 'express',
        email: 'artisan@example.com',
        country: 'FR',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
    });
  });

  describe('createConnectAccountLink', () => {
    it('should create an onboarding link for connected account', async () => {
      const mockAccountLink = {
        url: 'https://connect.stripe.com/setup/...',
        expires_at: 1234567890,
      };

      mockStripeInstance.accountLinks.create.mockResolvedValue(mockAccountLink);

      const result = await service.createConnectAccountLink(
        'acct_123',
        'https://example.com/return',
        'https://example.com/refresh',
      );

      expect(result).toEqual(mockAccountLink);
      expect(mockStripeInstance.accountLinks.create).toHaveBeenCalledWith({
        account: 'acct_123',
        refresh_url: 'https://example.com/refresh',
        return_url: 'https://example.com/return',
        type: 'account_onboarding',
      });
    });
  });

  describe('constructWebhookEvent', () => {
    it('should construct and verify webhook event', () => {
      const mockEvent = {
        id: 'evt_123',
        type: 'payment_intent.succeeded',
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);

      const payload = JSON.stringify({ id: 'evt_123' });
      const signature = 'sig_123';

      const result = service.constructWebhookEvent(payload, signature, 'whsec_123');

      expect(result).toEqual(mockEvent);
      expect(mockStripeInstance.webhooks.constructEvent).toHaveBeenCalled();
    });

    it('should throw on invalid signature', () => {
      mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      expect(() =>
        service.constructWebhookEvent('{}', 'invalid', 'whsec_123'),
      ).toThrow('Invalid signature');
    });
  });

  describe('getConnectAccount', () => {
    it('should retrieve connected account details', async () => {
      const mockAccount = {
        id: 'acct_123',
        charges_enabled: true,
        payouts_enabled: true,
      };

      mockStripeInstance.accounts.retrieve.mockResolvedValue(mockAccount);

      const result = await service.getConnectAccount('acct_123');

      expect(result).toEqual(mockAccount);
      expect(mockStripeInstance.accounts.retrieve).toHaveBeenCalledWith('acct_123');
    });
  });

  describe('SEPA Direct Debit', () => {
    it('should create SEPA setup intent', async () => {
      const mockSetupIntent = {
        id: 'seti_123',
        payment_method_types: ['sepa_debit'],
      };

      mockStripeInstance.setupIntents.create.mockResolvedValue(mockSetupIntent);

      const result = await service.createSepaSetupIntent('cus_123', {
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result).toEqual(mockSetupIntent);
      expect(mockStripeInstance.setupIntents.create).toHaveBeenCalled();
    });

    it('should list customer SEPA payment methods', async () => {
      const mockPaymentMethods = {
        data: [{ id: 'pm_123', type: 'sepa_debit' }],
      };

      mockStripeInstance.paymentMethods.list.mockResolvedValue(mockPaymentMethods);

      const result = await service.listCustomerSepaPaymentMethods('cus_123');

      expect(result).toEqual(mockPaymentMethods);
      expect(mockStripeInstance.paymentMethods.list).toHaveBeenCalledWith({
        customer: 'cus_123',
        type: 'sepa_debit',
      });
    });
  });

  describe('Apple Pay', () => {
    it('should verify Apple Pay domain', async () => {
      const mockDomain = {
        id: 'apwc_123',
        domain_name: 'example.com',
      };

      mockStripeInstance.applePayDomains.create.mockResolvedValue(mockDomain);

      const result = await service.verifyApplePayDomain('example.com');

      expect(result).toEqual(mockDomain);
    });

    it('should handle already verified domain', async () => {
      mockStripeInstance.applePayDomains.create.mockRejectedValue({
        code: 'apple_pay_domain_already_registered',
      });

      const result = await service.verifyApplePayDomain('example.com');

      expect(result).toEqual({ verified: true, message: 'Domain already verified' });
    });
  });

  describe('Radar', () => {
    it('should get Radar risk score', async () => {
      const mockCharge = {
        id: 'ch_123',
        outcome: {
          risk_level: 'normal',
          risk_score: 15,
          reason: 'approved',
          seller_message: 'Payment complete',
          network_status: 'approved_by_network',
        },
      };

      mockStripeInstance.charges.retrieve.mockResolvedValue(mockCharge);

      const result = await service.getRadarRiskScore('ch_123');

      expect(result.riskLevel).toBe('normal');
      expect(result.riskScore).toBe(15);
    });

    it('should return Google Pay config', () => {
      const config = service.getGooglePayConfig();

      expect(config.enabled).toBe(true);
      expect(config.merchantName).toBe('ArtiConnect');
    });

    it('should return Radar config', () => {
      const config = service.getRadarConfig();

      expect(config.enabled).toBe(true);
      expect(config.documentation).toContain('stripe.com');
    });
  });
});
