import { Test, TestingModule } from '@nestjs/testing';
import { StripeService } from './stripe.service';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
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
  }));
});

describe('StripeService', () => {
  let service: StripeService;
  let stripeMock: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StripeService],
    }).compile();

    service = module.get<StripeService>(StripeService);
    stripeMock = (service as any).stripe;
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
      };

      stripeMock.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await service.createPaymentIntent({
        amount: 5000,
        currency: 'eur',
        metadata: { missionId: 'mission-123' },
      });

      expect(result).toEqual(mockPaymentIntent);
      expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000,
          currency: 'eur',
          capture_method: 'manual',
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'always',
          },
        }),
      );
    });

    it('should include customer ID when provided', async () => {
      stripeMock.paymentIntents.create.mockResolvedValue({ id: 'pi_123' });

      await service.createPaymentIntent({
        amount: 5000,
        currency: 'eur',
        customerId: 'cus_123',
      });

      expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_123',
        }),
      );
    });

    it('should include radar session when provided', async () => {
      stripeMock.paymentIntents.create.mockResolvedValue({ id: 'pi_123' });

      await service.createPaymentIntent({
        amount: 5000,
        currency: 'eur',
        radarSession: 'radar_session_123',
      });

      expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          radar_options: { session: 'radar_session_123' },
        }),
      );
    });

    it('should request 3D Secure for card payments', async () => {
      stripeMock.paymentIntents.create.mockResolvedValue({ id: 'pi_123' });

      await service.createPaymentIntent({
        amount: 5000,
        currency: 'eur',
      });

      expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method_options: {
            card: {
              request_three_d_secure: 'any',
            },
          },
        }),
      );
    });
  });

  describe('capturePayment', () => {
    it('should capture a payment intent', async () => {
      const mockCapture = {
        id: 'pi_123',
        status: 'succeeded',
      };

      stripeMock.paymentIntents.capture.mockResolvedValue(mockCapture);

      const result = await service.capturePayment('pi_123');

      expect(result).toEqual(mockCapture);
      expect(stripeMock.paymentIntents.capture).toHaveBeenCalledWith('pi_123');
    });
  });

  describe('createTransfer', () => {
    it('should create a transfer to connected account', async () => {
      const mockTransfer = {
        id: 'tr_123',
        amount: 4500,
        destination: 'acct_123',
      };

      stripeMock.transfers.create.mockResolvedValue(mockTransfer);

      const result = await service.createTransfer({
        amount: 4500,
        destination: 'acct_123',
        metadata: { missionId: 'mission-123' },
      });

      expect(result).toEqual(mockTransfer);
      expect(stripeMock.transfers.create).toHaveBeenCalledWith({
        amount: 4500,
        currency: 'eur',
        destination: 'acct_123',
        metadata: { missionId: 'mission-123' },
      });
    });
  });

  describe('refundPayment', () => {
    it('should refund a payment intent', async () => {
      const mockRefund = {
        id: 're_123',
        payment_intent: 'pi_123',
        status: 'succeeded',
      };

      stripeMock.refunds.create.mockResolvedValue(mockRefund);

      const result = await service.refundPayment('pi_123');

      expect(result).toEqual(mockRefund);
      expect(stripeMock.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_123',
      });
    });
  });

  describe('SEPA Direct Debit', () => {
    describe('createSepaSetupIntent', () => {
      it('should create a setup intent for SEPA Direct Debit', async () => {
        const mockSetupIntent = {
          id: 'seti_123',
          payment_method_types: ['sepa_debit'],
        };

        stripeMock.setupIntents.create.mockResolvedValue(mockSetupIntent);

        const result = await service.createSepaSetupIntent('cus_123', {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        });

        expect(result).toEqual(mockSetupIntent);
        expect(stripeMock.setupIntents.create).toHaveBeenCalledWith(
          expect.objectContaining({
            customer: 'cus_123',
            payment_method_types: ['sepa_debit'],
          }),
        );
      });
    });

    describe('createSepaPaymentIntent', () => {
      it('should create a SEPA payment intent', async () => {
        const mockPaymentIntent = {
          id: 'pi_sepa_123',
          payment_method_types: ['sepa_debit'],
        };

        stripeMock.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

        const result = await service.createSepaPaymentIntent({
          amount: 5000,
          currency: 'eur',
          customerId: 'cus_123',
          paymentMethodId: 'pm_sepa_123',
        });

        expect(result).toEqual(mockPaymentIntent);
        expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: 5000,
            currency: 'eur',
            customer: 'cus_123',
            payment_method: 'pm_sepa_123',
            payment_method_types: ['sepa_debit'],
            confirm: false,
          }),
        );
      });
    });

    describe('confirmSepaPayment', () => {
      it('should confirm a SEPA payment intent', async () => {
        const mockConfirm = {
          id: 'pi_sepa_123',
          status: 'processing',
        };

        stripeMock.paymentIntents.confirm.mockResolvedValue(mockConfirm);

        const result = await service.confirmSepaPayment('pi_sepa_123');

        expect(result).toEqual(mockConfirm);
        expect(stripeMock.paymentIntents.confirm).toHaveBeenCalledWith('pi_sepa_123');
      });
    });

    describe('getSepaMandateDetails', () => {
      it('should retrieve mandate details', async () => {
        const mockMandate = {
          id: 'mandate_123',
          status: 'active',
        };

        stripeMock.mandates.retrieve.mockResolvedValue(mockMandate);

        const result = await service.getSepaMandateDetails('mandate_123');

        expect(result).toEqual(mockMandate);
      });
    });

    describe('listCustomerSepaPaymentMethods', () => {
      it('should list customer SEPA payment methods', async () => {
        const mockMethods = {
          data: [
            { id: 'pm_sepa_1', type: 'sepa_debit' },
            { id: 'pm_sepa_2', type: 'sepa_debit' },
          ],
        };

        stripeMock.paymentMethods.list.mockResolvedValue(mockMethods);

        const result = await service.listCustomerSepaPaymentMethods('cus_123');

        expect(result).toEqual(mockMethods);
        expect(stripeMock.paymentMethods.list).toHaveBeenCalledWith({
          customer: 'cus_123',
          type: 'sepa_debit',
        });
      });
    });

    describe('detachSepaPaymentMethod', () => {
      it('should detach a SEPA payment method', async () => {
        const mockDetach = {
          id: 'pm_sepa_123',
        };

        stripeMock.paymentMethods.detach.mockResolvedValue(mockDetach);

        const result = await service.detachSepaPaymentMethod('pm_sepa_123');

        expect(result).toEqual(mockDetach);
      });
    });
  });

  describe('Connect Accounts', () => {
    describe('createConnectAccount', () => {
      it('should create a Stripe Connect express account', async () => {
        const mockAccount = {
          id: 'acct_123',
          type: 'express',
        };

        stripeMock.accounts.create.mockResolvedValue(mockAccount);

        const result = await service.createConnectAccount('artisan@example.com', 'LU');

        expect(result).toEqual(mockAccount);
        expect(stripeMock.accounts.create).toHaveBeenCalledWith({
          type: 'express',
          country: 'LU',
          email: 'artisan@example.com',
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });
      });

      it('should use default country when not provided', async () => {
        stripeMock.accounts.create.mockResolvedValue({ id: 'acct_123' });

        await service.createConnectAccount('artisan@example.com');

        expect(stripeMock.accounts.create).toHaveBeenCalledWith(
          expect.objectContaining({
            country: 'LU',
          }),
        );
      });
    });

    describe('createConnectAccountLink', () => {
      it('should create an account link for onboarding', async () => {
        const mockLink = {
          url: 'https://connect.stripe.com/...',
        };

        stripeMock.accountLinks.create.mockResolvedValue(mockLink);

        const result = await service.createConnectAccountLink(
          'acct_123',
          'https://app.example.com/return',
          'https://app.example.com/refresh',
        );

        expect(result).toEqual(mockLink);
        expect(stripeMock.accountLinks.create).toHaveBeenCalledWith({
          account: 'acct_123',
          return_url: 'https://app.example.com/return',
          refresh_url: 'https://app.example.com/refresh',
          type: 'account_onboarding',
        });
      });
    });

    describe('getConnectAccount', () => {
      it('should retrieve a Connect account', async () => {
        const mockAccount = {
          id: 'acct_123',
          charges_enabled: true,
          payouts_enabled: true,
        };

        stripeMock.accounts.retrieve.mockResolvedValue(mockAccount);

        const result = await service.getConnectAccount('acct_123');

        expect(result).toEqual(mockAccount);
      });
    });
  });

  describe('Webhooks', () => {
    describe('constructWebhookEvent', () => {
      it('should construct and verify webhook event', () => {
        const mockEvent = {
          id: 'evt_123',
          type: 'payment_intent.succeeded',
        };

        stripeMock.webhooks.constructEvent.mockReturnValue(mockEvent);

        const result = service.constructWebhookEvent(
          'raw-body',
          'signature',
          'webhook-secret',
        );

        expect(result).toEqual(mockEvent);
        expect(stripeMock.webhooks.constructEvent).toHaveBeenCalledWith(
          'raw-body',
          'signature',
          'webhook-secret',
        );
      });

      it('should throw error for invalid signature', () => {
        stripeMock.webhooks.constructEvent.mockImplementation(() => {
          throw new Error('Invalid signature');
        });

        expect(() =>
          service.constructWebhookEvent('raw-body', 'invalid-sig', 'secret'),
        ).toThrow('Invalid signature');
      });
    });
  });

  describe('Apple Pay', () => {
    describe('verifyApplePayDomain', () => {
      it('should verify a new domain', async () => {
        const mockDomain = {
          id: 'apwc_123',
          domain_name: 'example.com',
        };

        stripeMock.applePayDomains.create.mockResolvedValue(mockDomain);

        const result = await service.verifyApplePayDomain('example.com');

        expect(result).toEqual(mockDomain);
      });

      it('should handle already registered domain', async () => {
        const error: any = new Error('Domain already registered');
        error.code = 'apple_pay_domain_already_registered';
        stripeMock.applePayDomains.create.mockRejectedValue(error);

        const result = await service.verifyApplePayDomain('example.com');

        expect(result).toEqual({
          verified: true,
          message: 'Domain already verified',
        });
      });

      it('should throw other errors', async () => {
        stripeMock.applePayDomains.create.mockRejectedValue(
          new Error('Network error'),
        );

        await expect(service.verifyApplePayDomain('example.com')).rejects.toThrow(
          'Network error',
        );
      });
    });

    describe('listApplePayDomains', () => {
      it('should list all verified domains', async () => {
        const mockDomains = {
          data: [{ id: 'apwc_1', domain_name: 'example.com' }],
        };

        stripeMock.applePayDomains.list.mockResolvedValue(mockDomains);

        const result = await service.listApplePayDomains();

        expect(result).toEqual(mockDomains);
        expect(stripeMock.applePayDomains.list).toHaveBeenCalledWith({ limit: 100 });
      });
    });

    describe('deleteApplePayDomain', () => {
      it('should delete a domain', async () => {
        stripeMock.applePayDomains.del.mockResolvedValue({ deleted: true });

        const result = await service.deleteApplePayDomain('apwc_123');

        expect(result).toEqual({ deleted: true });
      });
    });
  });

  describe('Radar Fraud Detection', () => {
    describe('getRadarRiskScore', () => {
      it('should return risk score for a charge', async () => {
        const mockCharge = {
          id: 'ch_123',
          outcome: {
            risk_level: 'normal',
            risk_score: 15,
            reason: null,
            seller_message: 'Payment complete.',
            network_status: 'approved_by_network',
          },
        };

        stripeMock.charges.retrieve.mockResolvedValue(mockCharge);

        const result = await service.getRadarRiskScore('ch_123');

        expect(result).toEqual({
          riskLevel: 'normal',
          riskScore: 15,
          radarReason: null,
          sellerMessage: 'Payment complete.',
          networkStatus: 'approved_by_network',
        });
      });
    });

    describe('reviewCharge', () => {
      it('should approve a flagged charge', async () => {
        stripeMock.reviews.list.mockResolvedValue({
          data: [{ id: 'prv_123', charge: 'ch_123' }],
        });
        stripeMock.reviews.approve.mockResolvedValue({ id: 'prv_123' });

        const result = await service.reviewCharge('ch_123', 'approve');

        expect(stripeMock.reviews.approve).toHaveBeenCalledWith('prv_123');
      });

      it('should refund a flagged charge', async () => {
        stripeMock.reviews.list.mockResolvedValue({
          data: [{ id: 'prv_123', charge: 'ch_123' }],
        });
        stripeMock.refunds.create.mockResolvedValue({ id: 're_123' });

        const result = await service.reviewCharge('ch_123', 'refund');

        expect(stripeMock.refunds.create).toHaveBeenCalledWith({
          payment_intent: 'ch_123',
        });
      });

      it('should throw error if no review found', async () => {
        stripeMock.reviews.list.mockResolvedValue({ data: [] });

        await expect(service.reviewCharge('ch_123', 'approve')).rejects.toThrow(
          'No review found for this charge',
        );
      });
    });

    describe('blockCustomer', () => {
      it('should add customer to block list via metadata', async () => {
        stripeMock.customers.update.mockResolvedValue({ id: 'cus_123' });

        await service.blockCustomer('cus_123', 'Fraud detected');

        expect(stripeMock.customers.update).toHaveBeenCalledWith('cus_123', {
          metadata: {
            blocked: 'true',
            blocked_reason: 'Fraud detected',
            blocked_at: expect.any(String),
          },
        });
      });
    });

    describe('listEarlyFraudWarnings', () => {
      it('should list disputes for fraud monitoring', async () => {
        const mockDisputes = {
          data: [{ id: 'dp_123', charge: 'ch_123' }],
        };

        stripeMock.disputes.list.mockResolvedValue(mockDisputes);

        const result = await service.listEarlyFraudWarnings('ch_123');

        expect(result).toEqual(mockDisputes);
      });
    });

    describe('getRadarConfig', () => {
      it('should return radar configuration', () => {
        const result = service.getRadarConfig();

        expect(result.enabled).toBe(true);
        expect(result).toHaveProperty('instructions');
        expect(result).toHaveProperty('documentation');
      });
    });
  });

  describe('getGooglePayConfig', () => {
    it('should return Google Pay configuration', () => {
      const result = service.getGooglePayConfig();

      expect(result.enabled).toBe(true);
      expect(result.merchantName).toBe('ArtiConnect');
    });
  });
});
