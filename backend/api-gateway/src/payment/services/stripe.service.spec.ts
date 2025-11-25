import { Test, TestingModule } from '@nestjs/testing';
import { StripeService } from './stripe.service';

// Mock Stripe with proper default export
const mockStripeInstance = {
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

jest.mock('stripe', () => {
  return {
    __esModule: true,
    default: jest.fn(() => mockStripeInstance),
  };
});

describe('StripeService', () => {
  let service: StripeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StripeService],
    }).compile();

    service = module.get<StripeService>(StripeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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

      const result = await service.createPaymentIntent(5000, 'eur', {
        missionId: 'mission-123',
      });

      expect(result).toEqual(mockPaymentIntent);
      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith({
        amount: 5000,
        currency: 'eur',
        automatic_payment_methods: { enabled: true },
        metadata: { missionId: 'mission-123' },
        capture_method: 'manual',
      });
    });

    it('should handle payment intent creation errors', async () => {
      mockStripeInstance.paymentIntents.create.mockRejectedValue(
        new Error('Card declined'),
      );

      await expect(
        service.createPaymentIntent(5000, 'eur', {}),
      ).rejects.toThrow('Card declined');
    });
  });

  describe('capturePaymentIntent', () => {
    it('should capture a payment intent', async () => {
      const mockCapturedIntent = {
        id: 'pi_123',
        status: 'succeeded',
        amount_captured: 5000,
      };

      mockStripeInstance.paymentIntents.capture.mockResolvedValue(mockCapturedIntent);

      const result = await service.capturePaymentIntent('pi_123');

      expect(result).toEqual(mockCapturedIntent);
      expect(mockStripeInstance.paymentIntents.capture).toHaveBeenCalledWith('pi_123');
    });
  });

  describe('createRefund', () => {
    it('should create a refund for a payment intent', async () => {
      const mockRefund = {
        id: 're_123',
        amount: 5000,
        status: 'succeeded',
      };

      mockStripeInstance.refunds.create.mockResolvedValue(mockRefund);

      const result = await service.createRefund('pi_123', 5000, 'Customer request');

      expect(result).toEqual(mockRefund);
      expect(mockStripeInstance.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_123',
        amount: 5000,
        reason: 'requested_by_customer',
        metadata: { reason: 'Customer request' },
      });
    });

    it('should create a full refund when no amount specified', async () => {
      const mockRefund = {
        id: 're_123',
        status: 'succeeded',
      };

      mockStripeInstance.refunds.create.mockResolvedValue(mockRefund);

      const result = await service.createRefund('pi_123');

      expect(result).toEqual(mockRefund);
      expect(mockStripeInstance.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_123',
        amount: undefined,
        reason: 'requested_by_customer',
        metadata: { reason: undefined },
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

      const result = await service.createTransfer(4500, 'acct_123', {
        missionId: 'mission-123',
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

  describe('createConnectedAccount', () => {
    it('should create a connected account for artisan', async () => {
      const mockAccount = {
        id: 'acct_123',
        type: 'express',
      };

      mockStripeInstance.accounts.create.mockResolvedValue(mockAccount);

      const result = await service.createConnectedAccount(
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

  describe('createAccountLink', () => {
    it('should create an onboarding link for connected account', async () => {
      const mockAccountLink = {
        url: 'https://connect.stripe.com/setup/...',
        expires_at: 1234567890,
      };

      mockStripeInstance.accountLinks.create.mockResolvedValue(mockAccountLink);

      const result = await service.createAccountLink(
        'acct_123',
        'https://example.com/refresh',
        'https://example.com/return',
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

      const result = service.constructWebhookEvent(payload, signature);

      expect(result).toEqual(mockEvent);
      expect(mockStripeInstance.webhooks.constructEvent).toHaveBeenCalled();
    });

    it('should throw on invalid signature', () => {
      mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      expect(() => service.constructWebhookEvent('{}', 'invalid')).toThrow(
        'Invalid signature',
      );
    });
  });

  describe('getConnectedAccount', () => {
    it('should retrieve connected account details', async () => {
      const mockAccount = {
        id: 'acct_123',
        charges_enabled: true,
        payouts_enabled: true,
      };

      mockStripeInstance.accounts.retrieve.mockResolvedValue(mockAccount);

      const result = await service.getConnectedAccount('acct_123');

      expect(result).toEqual(mockAccount);
      expect(mockStripeInstance.accounts.retrieve).toHaveBeenCalledWith('acct_123');
    });
  });
});
