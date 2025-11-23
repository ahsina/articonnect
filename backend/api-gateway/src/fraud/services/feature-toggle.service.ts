import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FraudProtectionConfig } from '@prisma/client';

@Injectable()
export class FeatureToggleService implements OnModuleInit {
  private readonly logger = new Logger(FeatureToggleService.name);
  private config: FraudProtectionConfig | null = null;

  constructor(private prisma: PrismaService) {}

  /**
   * Initialize and load config on module startup
   */
  async onModuleInit() {
    await this.ensureConfigExists();
    await this.loadConfig();
  }

  /**
   * Ensure fraud protection config exists in database
   */
  private async ensureConfigExists() {
    const existing = await this.prisma.fraudProtectionConfig.findFirst();

    if (!existing) {
      this.logger.log('Creating default fraud protection configuration');
      await this.prisma.fraudProtectionConfig.create({
        data: {}, // Uses schema defaults
      });
    }
  }

  /**
   * Load configuration from database
   */
  private async loadConfig() {
    this.config = await this.prisma.fraudProtectionConfig.findFirst();
    if (!this.config) {
      throw new Error('Failed to load fraud protection configuration');
    }
    this.logger.log('Fraud protection configuration loaded');
  }

  /**
   * Reload configuration from database
   */
  async reloadConfig() {
    await this.loadConfig();
  }

  /**
   * Get current configuration
   */
  async getConfig(): Promise<FraudProtectionConfig> {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config!;
  }

  /**
   * Update configuration
   */
  async updateConfig(
    updates: Partial<FraudProtectionConfig>,
    updatedBy: string,
  ): Promise<FraudProtectionConfig> {
    const config = await this.getConfig();

    const updated = await this.prisma.fraudProtectionConfig.update({
      where: { id: config.id },
      data: {
        ...updates,
        updatedBy,
      },
    });

    this.config = updated;
    this.logger.log(`Configuration updated by ${updatedBy}`);

    return updated;
  }

  // ==========================================
  // FEATURE CHECKS - Used by fraud services
  // ==========================================

  async isMultiAccountDetectionEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.multiAccountDetectionEnabled;
  }

  async getMultiAccountRiskThreshold(): Promise<number> {
    const config = await this.getConfig();
    return config.multiAccountRiskThreshold;
  }

  async isReviewFraudDetectionEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.reviewFraudDetectionEnabled;
  }

  async getReviewFraudThreshold(): Promise<number> {
    const config = await this.getConfig();
    return config.reviewFraudScoreThreshold;
  }

  async isReviewAutoHideEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.reviewAutoHideEnabled;
  }

  async isPayoutFraudScreeningEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.payoutFraudScreeningEnabled;
  }

  async getPayoutRiskThreshold(): Promise<number> {
    const config = await this.getConfig();
    return config.payoutRiskThreshold;
  }

  async isPayoutAutoHoldEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.payoutAutoHoldEnabled;
  }

  async isPriceAnomalyDetectionEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.priceAnomalyDetectionEnabled;
  }

  async getPriceDeviationThreshold(): Promise<number> {
    const config = await this.getConfig();
    return config.priceDeviationThreshold;
  }

  async isPriceAutoFlagEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.priceAutoFlagEnabled;
  }

  async isRefundAbuseDetectionEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.refundAbuseDetectionEnabled;
  }

  async getRefundAbuseThreshold(): Promise<number> {
    const config = await this.getConfig();
    return config.refundAbuseScoreThreshold;
  }

  async isRefundAutoRejectEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.refundAutoRejectEnabled;
  }

  async isSessionAnomalyDetectionEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.sessionAnomalyDetectionEnabled;
  }

  async getSessionThreatThreshold(): Promise<string> {
    const config = await this.getConfig();
    return config.sessionThreatLevelThreshold;
  }

  async isSessionAutoLogoutEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.sessionAutoLogoutEnabled;
  }

  async isKycEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.kycEnabled;
  }

  async getKycSingleTransactionThreshold(): Promise<number> {
    const config = await this.getConfig();
    return config.kycSingleTransactionThreshold;
  }

  async getKycCumulativeThreshold(): Promise<number> {
    const config = await this.getConfig();
    return config.kycCumulativeThreshold;
  }

  async isKycAutoBlockEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.kycAutoBlockEnabled;
  }

  async isBotDetectionEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.botDetectionEnabled;
  }

  async getBotScoreThreshold(): Promise<number> {
    const config = await this.getConfig();
    return config.botScoreThreshold;
  }

  async isBotCaptchaEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.botCaptchaEnabled;
  }

  async isBusinessVerificationRequired(): Promise<boolean> {
    const config = await this.getConfig();
    return config.businessVerificationRequired;
  }

  async isBusinessVerificationAutoReject(): Promise<boolean> {
    const config = await this.getConfig();
    return config.businessVerificationAutoReject;
  }

  async shouldSendFraudAlertEmail(): Promise<boolean> {
    const config = await this.getConfig();
    return config.fraudAlertEmailEnabled;
  }

  async getFraudAlertEmail(): Promise<string> {
    const config = await this.getConfig();
    return config.fraudAlertEmail;
  }
}
