import { Test, TestingModule } from '@nestjs/testing';
import { PaypalService } from './paypal.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PaypalService', () => {
  let service: PaypalService;
  let mockAxiosInstance: any;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, string> = {
        PAYPAL_CLIENT_ID: 'test-client-id',
        PAYPAL_CLIENT_SECRET: 'test-client-secret',
        PAYPAL_WEBHOOK_ID: 'webhook-123',
        PAYPAL_MODE: 'sandbox',
        PAYPAL_API_URL_SANDBOX: 'https://api-m.sandbox.paypal.com',
        PAYPAL_API_URL_LIVE: 'https://api-m.paypal.com',
        API_BASE_URL: 'http://localhost:4000',
      };
      return config[key];
    }),
  };

  const mockOrder = {
    id: 'order-123',
    status: 'CREATED',
    links: [
      { href: 'https://paypal.com/approve', rel: 'approve', method: 'GET' },
    ],
  };

  const mockCaptureResponse = {
    id: 'order-123',
    status: 'COMPLETED',
    purchase_units: [
      {
        payments: {
          captures: [
            {
              id: 'capture-123',
              status: 'COMPLETED',
              amount: { value: '100.00', currency_code: 'EUR' },
            },
          ],
        },
      },
    ],
  };

  beforeEach(async () => {
    // Reset mock implementation for ConfigService
    mockConfigService.get.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        PAYPAL_CLIENT_ID: 'test-client-id',
        PAYPAL_CLIENT_SECRET: 'test-client-secret',
        PAYPAL_WEBHOOK_ID: 'webhook-123',
        PAYPAL_MODE: 'sandbox',
        PAYPAL_API_URL_SANDBOX: 'https://api-m.sandbox.paypal.com',
        PAYPAL_API_URL_LIVE: 'https://api-m.paypal.com',
        API_BASE_URL: 'http://localhost:4000',
      };
      return config[key];
    });

    // Mock axios.create to return a mock instance - save reference for tests
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
    };
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaypalService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaypalService>(PaypalService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize service in sandbox mode', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('should disable service when credentials missing', async () => {
      const disabledConfigService = {
        get: jest.fn().mockReturnValue(''),
      };

      const module = await Test.createTestingModule({
        providers: [
          PaypalService,
          { provide: ConfigService, useValue: disabledConfigService },
        ],
      }).compile();

      const disabledService = module.get<PaypalService>(PaypalService);
      expect(disabledService.isEnabled()).toBe(false);
    });

    it('should use live URL in production mode', async () => {
      const prodConfigService = {
        get: jest.fn((key: string) => {
          const config: Record<string, string> = {
            PAYPAL_CLIENT_ID: 'live-client-id',
            PAYPAL_CLIENT_SECRET: 'live-client-secret',
            PAYPAL_MODE: 'live',
            PAYPAL_API_URL_LIVE: 'https://api-m.paypal.com',
          };
          return config[key];
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          PaypalService,
          { provide: ConfigService, useValue: prodConfigService },
        ],
      }).compile();

      const prodService = module.get<PaypalService>(PaypalService);
      expect(prodService.isEnabled()).toBe(true);
    });
  });

  describe('createOrder', () => {
    beforeEach(() => {
      // Mock getAccessToken
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'access-token', expires_in: 3600 },
      });
    });

    it('should create PayPal order', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockOrder });

      const result = await service.createOrder({
        amount: 10000, // 100.00 EUR in cents
        currency: 'EUR',
        description: 'Test payment',
        metadata: { missionId: 'mission-123' },
      });

      expect(result.id).toBe('order-123');
      expect(result.status).toBe('CREATED');
    });

    it('should throw BadRequestException when service is disabled', async () => {
      const disabledConfigService = {
        get: jest.fn().mockReturnValue(''),
      };

      const module = await Test.createTestingModule({
        providers: [
          PaypalService,
          { provide: ConfigService, useValue: disabledConfigService },
        ],
      }).compile();

      const disabledService = module.get<PaypalService>(PaypalService);

      await expect(
        disabledService.createOrder({
          amount: 10000,
          currency: 'EUR',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on API error', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: { data: { message: 'API Error' } },
      });

      await expect(
        service.createOrder({
          amount: 10000,
          currency: 'EUR',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('captureOrder', () => {
    beforeEach(() => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'access-token', expires_in: 3600 },
      });
    });

    it('should capture PayPal order', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: mockCaptureResponse,
      });

      const result = await service.captureOrder('order-123');

      expect(result.status).toBe('COMPLETED');
      expect(result.purchase_units[0].payments.captures[0].id).toBe('capture-123');
    });

    it('should throw BadRequestException when service is disabled', async () => {
      const disabledConfigService = {
        get: jest.fn().mockReturnValue(''),
      };

      const module = await Test.createTestingModule({
        providers: [
          PaypalService,
          { provide: ConfigService, useValue: disabledConfigService },
        ],
      }).compile();

      const disabledService = module.get<PaypalService>(PaypalService);

      await expect(disabledService.captureOrder('order-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException on capture failure', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: { data: { message: 'Capture failed' } },
      });

      await expect(service.captureOrder('order-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getOrder', () => {
    beforeEach(() => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'access-token', expires_in: 3600 },
      });
    });

    it('should get order details', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockOrder });

      const result = await service.getOrder('order-123');

      expect(result.id).toBe('order-123');
    });

    it('should throw BadRequestException when service is disabled', async () => {
      const disabledConfigService = {
        get: jest.fn().mockReturnValue(''),
      };

      const module = await Test.createTestingModule({
        providers: [
          PaypalService,
          { provide: ConfigService, useValue: disabledConfigService },
        ],
      }).compile();

      const disabledService = module.get<PaypalService>(PaypalService);

      await expect(disabledService.getOrder('order-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException on API error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Not found'));

      await expect(service.getOrder('nonexistent')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('refundCapture', () => {
    beforeEach(() => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'access-token', expires_in: 3600 },
      });
    });

    it('should refund full capture amount', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { id: 'refund-123', status: 'COMPLETED' },
      });

      const result = await service.refundCapture('capture-123');

      expect(result.id).toBe('refund-123');
    });

    it('should refund partial amount', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { id: 'refund-123', status: 'COMPLETED' },
      });

      const result = await service.refundCapture('capture-123', 5000, 'EUR');

      expect(result.status).toBe('COMPLETED');
    });

    it('should throw BadRequestException when service is disabled', async () => {
      const disabledConfigService = {
        get: jest.fn().mockReturnValue(''),
      };

      const module = await Test.createTestingModule({
        providers: [
          PaypalService,
          { provide: ConfigService, useValue: disabledConfigService },
        ],
      }).compile();

      const disabledService = module.get<PaypalService>(PaypalService);

      await expect(disabledService.refundCapture('capture-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException on refund failure', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: { data: { message: 'Refund failed' } },
      });

      await expect(service.refundCapture('capture-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyWebhookSignature', () => {
    const mockHeaders = {
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://paypal.com/cert',
      'paypal-transmission-id': 'transmission-123',
      'paypal-transmission-sig': 'signature',
      'paypal-transmission-time': '2025-01-01T00:00:00Z',
    };

    beforeEach(() => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'access-token', expires_in: 3600 },
      });
    });

    it('should return true for valid signature', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { verification_status: 'SUCCESS' },
      });

      const result = await service.verifyWebhookSignature(
        'webhook-123',
        mockHeaders,
        { event_type: 'PAYMENT.CAPTURE.COMPLETED' },
      );

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { verification_status: 'FAILURE' },
      });

      const result = await service.verifyWebhookSignature(
        'webhook-123',
        mockHeaders,
        { event_type: 'PAYMENT.CAPTURE.COMPLETED' },
      );

      expect(result).toBe(false);
    });

    it('should return false when service is disabled', async () => {
      const disabledConfigService = {
        get: jest.fn().mockReturnValue(''),
      };

      const module = await Test.createTestingModule({
        providers: [
          PaypalService,
          { provide: ConfigService, useValue: disabledConfigService },
        ],
      }).compile();

      const disabledService = module.get<PaypalService>(PaypalService);

      const result = await disabledService.verifyWebhookSignature(
        'webhook-123',
        mockHeaders,
        {},
      );

      expect(result).toBe(false);
    });

    it('should return false on verification error', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Error'));

      const result = await service.verifyWebhookSignature(
        'webhook-123',
        mockHeaders,
        {},
      );

      expect(result).toBe(false);
    });
  });

  describe('handleWebhook', () => {
    const mockHeaders = {
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://paypal.com/cert',
      'paypal-transmission-id': 'transmission-123',
      'paypal-transmission-sig': 'signature',
      'paypal-transmission-time': '2025-01-01T00:00:00Z',
    };

    beforeEach(() => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'access-token', expires_in: 3600 },
      });
    });

    it('should handle CHECKOUT.ORDER.APPROVED event', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { verification_status: 'SUCCESS' },
      });

      await expect(
        service.handleWebhook(mockHeaders, {
          event_type: 'CHECKOUT.ORDER.APPROVED',
          resource: { id: 'order-123' },
        }),
      ).resolves.not.toThrow();
    });

    it('should handle PAYMENT.CAPTURE.COMPLETED event', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { verification_status: 'SUCCESS' },
      });

      await expect(
        service.handleWebhook(mockHeaders, {
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          resource: { id: 'capture-123' },
        }),
      ).resolves.not.toThrow();
    });

    it('should handle PAYMENT.CAPTURE.DENIED event', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { verification_status: 'SUCCESS' },
      });

      await expect(
        service.handleWebhook(mockHeaders, {
          event_type: 'PAYMENT.CAPTURE.DENIED',
          resource: { id: 'capture-123' },
        }),
      ).resolves.not.toThrow();
    });

    it('should handle PAYMENT.CAPTURE.REFUNDED event', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { verification_status: 'SUCCESS' },
      });

      await expect(
        service.handleWebhook(mockHeaders, {
          event_type: 'PAYMENT.CAPTURE.REFUNDED',
          resource: { id: 'refund-123' },
        }),
      ).resolves.not.toThrow();
    });

    it('should throw BadRequestException for invalid signature', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { verification_status: 'FAILURE' },
      });

      await expect(
        service.handleWebhook(mockHeaders, {
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          resource: { id: 'capture-123' },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('isEnabled', () => {
    it('should return true when configured', () => {
      expect(service.isEnabled()).toBe(true);
    });
  });

  describe('getClientId', () => {
    it('should return client ID', () => {
      expect(service.getClientId()).toBe('test-client-id');
    });
  });
});
