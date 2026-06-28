import { Test, TestingModule } from '@nestjs/testing';
import { FeatureToggleService } from './feature-toggle.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('FeatureToggleService', () => {
  let service: FeatureToggleService;
  let prismaService: PrismaService;

  const mockConfig = {
    id: 'config-123',
    multiAccountDetectionEnabled: true,
    multiAccountRiskThreshold: 70,
    reviewFraudDetectionEnabled: true,
    reviewFraudScoreThreshold: 60,
    reviewAutoHideEnabled: false,
    payoutFraudScreeningEnabled: true,
    payoutRiskThreshold: 75,
    payoutAutoHoldEnabled: true,
    priceAnomalyDetectionEnabled: true,
    priceDeviationThreshold: 30,
    priceAutoFlagEnabled: true,
    refundAbuseDetectionEnabled: true,
    refundAbuseScoreThreshold: 65,
    refundAutoRejectEnabled: false,
    sessionAnomalyDetectionEnabled: true,
    sessionThreatLevelThreshold: 'MEDIUM',
    sessionAutoLogoutEnabled: true,
    kycEnabled: true,
    kycSingleTransactionThreshold: 1000,
    kycCumulativeThreshold: 5000,
    kycAutoBlockEnabled: true,
    botDetectionEnabled: true,
    botScoreThreshold: 50,
    botCaptchaEnabled: true,
    businessVerificationRequired: true,
    businessVerificationAutoReject: false,
    fraudAlertEmailEnabled: true,
    fraudAlertEmail: 'fraud@krafolt.com',
    updatedBy: null,
  };

  const mockPrismaService = {
    fraudProtectionConfig: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureToggleService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FeatureToggleService>(FeatureToggleService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should create default config if none exists', async () => {
      mockPrismaService.fraudProtectionConfig.findFirst
        .mockResolvedValueOnce(null) // ensureConfigExists
        .mockResolvedValueOnce(mockConfig); // loadConfig
      mockPrismaService.fraudProtectionConfig.create.mockResolvedValue(mockConfig);

      await service.onModuleInit();

      expect(mockPrismaService.fraudProtectionConfig.create).toHaveBeenCalledWith({
        data: {},
      });
    });

    it('should not create config if already exists', async () => {
      mockPrismaService.fraudProtectionConfig.findFirst.mockResolvedValue(mockConfig);

      await service.onModuleInit();

      expect(mockPrismaService.fraudProtectionConfig.create).not.toHaveBeenCalled();
    });

    it('should throw error if config cannot be loaded', async () => {
      mockPrismaService.fraudProtectionConfig.findFirst
        .mockResolvedValueOnce(mockConfig) // ensureConfigExists
        .mockResolvedValueOnce(null); // loadConfig

      await expect(service.onModuleInit()).rejects.toThrow(
        'Failed to load fraud protection configuration',
      );
    });
  });

  describe('getConfig', () => {
    it('should return cached config if available', async () => {
      mockPrismaService.fraudProtectionConfig.findFirst.mockResolvedValue(mockConfig);
      await service.onModuleInit();

      const result = await service.getConfig();

      expect(result).toEqual(mockConfig);
      // Should use cached config without additional DB calls after init
      expect(result).toBeDefined();
    });

    it('should load config from database if not cached', async () => {
      mockPrismaService.fraudProtectionConfig.findFirst.mockResolvedValue(mockConfig);
      // Initialize the service first
      await service.onModuleInit();

      const result = await service.getConfig();

      expect(result).toEqual(mockConfig);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', async () => {
      mockPrismaService.fraudProtectionConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.fraudProtectionConfig.update.mockResolvedValue({
        ...mockConfig,
        multiAccountDetectionEnabled: false,
      });

      await service.onModuleInit();
      const result = await service.updateConfig(
        { multiAccountDetectionEnabled: false },
        'admin-123',
      );

      expect(result.multiAccountDetectionEnabled).toBe(false);
      expect(mockPrismaService.fraudProtectionConfig.update).toHaveBeenCalledWith({
        where: { id: mockConfig.id },
        data: {
          multiAccountDetectionEnabled: false,
          updatedBy: 'admin-123',
        },
      });
    });
  });

  describe('feature checks', () => {
    beforeEach(async () => {
      mockPrismaService.fraudProtectionConfig.findFirst.mockResolvedValue(mockConfig);
      await service.onModuleInit();
    });

    it('should check multi-account detection enabled', async () => {
      const result = await service.isMultiAccountDetectionEnabled();
      expect(result).toBe(true);
    });

    it('should get multi-account risk threshold', async () => {
      const result = await service.getMultiAccountRiskThreshold();
      expect(result).toBe(70);
    });

    it('should check review fraud detection enabled', async () => {
      const result = await service.isReviewFraudDetectionEnabled();
      expect(result).toBe(true);
    });

    it('should get review fraud threshold', async () => {
      const result = await service.getReviewFraudThreshold();
      expect(result).toBe(60);
    });

    it('should check review auto-hide enabled', async () => {
      const result = await service.isReviewAutoHideEnabled();
      expect(result).toBe(false);
    });

    it('should check payout fraud screening enabled', async () => {
      const result = await service.isPayoutFraudScreeningEnabled();
      expect(result).toBe(true);
    });

    it('should get payout risk threshold', async () => {
      const result = await service.getPayoutRiskThreshold();
      expect(result).toBe(75);
    });

    it('should check payout auto-hold enabled', async () => {
      const result = await service.isPayoutAutoHoldEnabled();
      expect(result).toBe(true);
    });

    it('should check price anomaly detection enabled', async () => {
      const result = await service.isPriceAnomalyDetectionEnabled();
      expect(result).toBe(true);
    });

    it('should get price deviation threshold', async () => {
      const result = await service.getPriceDeviationThreshold();
      expect(result).toBe(30);
    });

    it('should check price auto-flag enabled', async () => {
      const result = await service.isPriceAutoFlagEnabled();
      expect(result).toBe(true);
    });

    it('should check refund abuse detection enabled', async () => {
      const result = await service.isRefundAbuseDetectionEnabled();
      expect(result).toBe(true);
    });

    it('should get refund abuse threshold', async () => {
      const result = await service.getRefundAbuseThreshold();
      expect(result).toBe(65);
    });

    it('should check refund auto-reject enabled', async () => {
      const result = await service.isRefundAutoRejectEnabled();
      expect(result).toBe(false);
    });

    it('should check session anomaly detection enabled', async () => {
      const result = await service.isSessionAnomalyDetectionEnabled();
      expect(result).toBe(true);
    });

    it('should get session threat threshold', async () => {
      const result = await service.getSessionThreatThreshold();
      expect(result).toBe('MEDIUM');
    });

    it('should check session auto-logout enabled', async () => {
      const result = await service.isSessionAutoLogoutEnabled();
      expect(result).toBe(true);
    });

    it('should check KYC enabled', async () => {
      const result = await service.isKycEnabled();
      expect(result).toBe(true);
    });

    it('should get KYC single transaction threshold', async () => {
      const result = await service.getKycSingleTransactionThreshold();
      expect(result).toBe(1000);
    });

    it('should get KYC cumulative threshold', async () => {
      const result = await service.getKycCumulativeThreshold();
      expect(result).toBe(5000);
    });

    it('should check KYC auto-block enabled', async () => {
      const result = await service.isKycAutoBlockEnabled();
      expect(result).toBe(true);
    });

    it('should check bot detection enabled', async () => {
      const result = await service.isBotDetectionEnabled();
      expect(result).toBe(true);
    });

    it('should get bot score threshold', async () => {
      const result = await service.getBotScoreThreshold();
      expect(result).toBe(50);
    });

    it('should check bot captcha enabled', async () => {
      const result = await service.isBotCaptchaEnabled();
      expect(result).toBe(true);
    });

    it('should check business verification required', async () => {
      const result = await service.isBusinessVerificationRequired();
      expect(result).toBe(true);
    });

    it('should check business verification auto-reject', async () => {
      const result = await service.isBusinessVerificationAutoReject();
      expect(result).toBe(false);
    });

    it('should check fraud alert email enabled', async () => {
      const result = await service.shouldSendFraudAlertEmail();
      expect(result).toBe(true);
    });

    it('should get fraud alert email', async () => {
      const result = await service.getFraudAlertEmail();
      expect(result).toBe('fraud@krafolt.com');
    });
  });

  describe('reloadConfig', () => {
    it('should reload config from database', async () => {
      const updatedConfig = { ...mockConfig, botDetectionEnabled: false };
      // First call for onModuleInit, second for reloadConfig
      mockPrismaService.fraudProtectionConfig.findFirst
        .mockResolvedValueOnce(mockConfig)
        .mockResolvedValueOnce(updatedConfig);

      await service.onModuleInit();

      // Reset mock to return updated config for reload
      mockPrismaService.fraudProtectionConfig.findFirst.mockResolvedValue(updatedConfig);
      await service.reloadConfig();

      const result = await service.isBotDetectionEnabled();
      expect(result).toBe(false);
    });
  });
});
