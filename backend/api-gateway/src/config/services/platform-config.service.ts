import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigCategory, ConfigDataType } from '@prisma/client';
import {
  FeeSettingsDto,
  PaymentSettingsDto,
  RateLimitSettingsDto,
  ReputationRulesDto,
  NoShowConfigDto,
  TaxSettingsDto,
  NotificationSettingsDto,
  IntegrationSettingsDto,
  ContentModerationSettingsDto,
  ComplianceSettingsDto,
  MissionSettingsDto,
  UserProfileSettingsDto,
  PerformanceSettingsDto,
  CancellationPolicy,
  ModerationStrength,
  LogLevel,
} from '../dto/platform-config.dto';

// Default configuration values
const DEFAULT_FEE_SETTINGS: FeeSettingsDto = {
  platformCommissionRate: 12,
  minCommissionAmount: 100,
  maxCommissionAmount: 50000,
  depositPercentage: 30,
  depositMinimum: 1000,
  depositMaximum: 100000,
  urgentMissionMultiplier: 1.5,
  weekendMultiplier: 1.2,
  holidayMultiplier: 1.5,
  cancellationFeePercentage: 10,
  lateCancellationHours: 24,
  lateCancellationFeePercentage: 50,
  artisanPayoutPercentage: 88,
  referralBonusAmount: 1000,
  firstMissionDiscount: 10,
};

const DEFAULT_PAYMENT_SETTINGS: PaymentSettingsDto = {
  stripeEnabled: true,
  paypalEnabled: false,
  bankTransferEnabled: true,
  walletEnabled: false,
  minPaymentAmount: 500,
  maxPaymentAmount: 5000000,
  payoutDelayDays: 7,
  autoPayoutEnabled: true,
  autoPayoutThreshold: 5000,
  refundWindowDays: 14,
  partialRefundEnabled: true,
  instantPayoutEnabled: false,
  instantPayoutFeePercentage: 1.5,
  holdFundsForDisputes: true,
  escrowDurationHours: 168,
  paymentRetryAttempts: 3,
  paymentRetryDelayMinutes: 60,
  failedPaymentNotification: true,
};

const DEFAULT_RATE_LIMIT_SETTINGS: RateLimitSettingsDto = {
  apiRateLimit: 100,
  apiRateLimitWindow: 1,
  loginAttemptsLimit: 5,
  loginLockoutMinutes: 15,
  passwordResetLimit: 3,
  missionCreationLimit: 10,
  messageLimit: 100,
  reviewLimit: 5,
  reportLimit: 10,
  fileUploadLimit: 20,
  fileUploadMaxSizeMb: 10,
  searchRequestsLimit: 30,
  ipBlocklistEnabled: true,
  geoBlockingEnabled: false,
  blockedCountries: [],
  allowedCountries: ['FR', 'LU', 'BE', 'DE'],
  captchaEnabled: true,
  captchaThreshold: 70,
};

const DEFAULT_REPUTATION_RULES: ReputationRulesDto = {
  initialScore: 100,
  maxScore: 200,
  minScore: 0,
  completedMissionBonus: 10,
  fiveStarReviewBonus: 15,
  fourStarReviewBonus: 10,
  threeStarReviewBonus: 5,
  twoStarReviewPenalty: 5,
  oneStarReviewPenalty: 10,
  noShowPenalty: 20,
  cancellationPenalty: 5,
  lateCancellationPenalty: 10,
  disputeLossPenalty: 20,
  disputeWinBonus: 5,
  verificationBonus: 10,
  responseTimeBonus: 5,
  streakBonus: 10,
  streakThreshold: 5,
  inactivityPenalty: 2,
  inactivityThresholdDays: 90,
  goldThreshold: 180,
  silverThreshold: 150,
  bronzeThreshold: 120,
  trustedThreshold: 100,
  warningThreshold: 50,
};

const DEFAULT_NO_SHOW_CONFIG: NoShowConfigDto = {
  enabled: true,
  minimumWaitTimeMinutes: 15,
  gpsVerificationRequired: true,
  gpsRadiusMeters: 100,
  photoEvidenceRequired: true,
  minContactAttempts: 2,
  compensationPercentage: 30,
  compensationMinimum: 1500,
  compensationMaximum: 10000,
  clientPenaltyPercentage: 30,
  autoValidationEnabled: false,
  autoValidationRequirements: {
    minWaitTime: 20,
    gpsVerified: true,
    minContactAttempts: 3,
  },
  disputeWindowHours: 48,
  repeatOffenderThreshold: 3,
  repeatOffenderPenaltyMultiplier: 2,
};

const DEFAULT_TAX_SETTINGS: TaxSettingsDto = {
  vatEnabled: true,
  defaultVatRate: 17,
  vatRates: [
    { country: 'LU', rate: 17, reducedRate: 8, superReducedRate: 3 },
    { country: 'FR', rate: 20, reducedRate: 10, superReducedRate: 5.5 },
    { country: 'BE', rate: 21, reducedRate: 12, superReducedRate: 6 },
    { country: 'DE', rate: 19, reducedRate: 7 },
  ],
  vatExemptCategories: [],
  reverseChargeEnabled: true,
  invoiceNumberPrefix: 'INV',
  invoiceNumberFormat: 'INV-{YEAR}-{NUMBER}',
  autoGenerateInvoices: true,
  invoiceRetentionYears: 10,
  taxReportingEnabled: true,
  taxReportingThreshold: 10000,
  witholdingTaxEnabled: false,
  witholdingTaxRate: 0,
};

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettingsDto = {
  emailEnabled: true,
  smsEnabled: true,
  pushEnabled: true,
  inAppEnabled: true,
  missionCreatedNotify: true,
  missionAcceptedNotify: true,
  missionCompletedNotify: true,
  missionCancelledNotify: true,
  paymentReceivedNotify: true,
  paymentFailedNotify: true,
  payoutProcessedNotify: true,
  newMessageNotify: true,
  newReviewNotify: true,
  disputeOpenedNotify: true,
  disputeResolvedNotify: true,
  verificationStatusNotify: true,
  promotionalEmailsEnabled: false,
  weeklyDigestEnabled: true,
  marketingOptInDefault: false,
  reminderBeforeMissionHours: 24,
  followUpAfterMissionHours: 48,
  inactivityReminderDays: 30,
  maxEmailsPerDay: 20,
  maxSmsPerDay: 5,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  respectQuietHours: true,
};

const DEFAULT_INTEGRATION_SETTINGS: IntegrationSettingsDto = {
  stripePublicKey: '',
  stripeWebhookEnabled: true,
  googleMapsEnabled: true,
  googleMapsApiKey: '',
  twilioEnabled: false,
  twilioSmsEnabled: false,
  twilioVoiceEnabled: false,
  sendgridEnabled: true,
  firebaseEnabled: true,
  firebasePushEnabled: true,
  sentryEnabled: true,
  sentryDsn: '',
  analyticsEnabled: true,
  googleAnalyticsId: '',
  intercomEnabled: false,
  intercomAppId: '',
  slackWebhookEnabled: false,
  slackWebhookUrl: '',
  slackAlertChannel: '#alerts',
  zapierEnabled: false,
  apiWebhooksEnabled: true,
  webhookRetryAttempts: 3,
  webhookTimeoutSeconds: 30,
};

const DEFAULT_CONTENT_MODERATION_SETTINGS: ContentModerationSettingsDto = {
  autoModerationEnabled: true,
  profanityFilterEnabled: true,
  profanityFilterStrength: ModerationStrength.MEDIUM,
  customBannedWords: [],
  spamDetectionEnabled: true,
  spamScoreThreshold: 70,
  imagesModerationEnabled: false,
  imagesModerationProvider: 'aws-rekognition',
  linkFilterEnabled: true,
  allowedDomains: [],
  maxLinksPerMessage: 3,
  duplicateContentCheck: true,
  minReviewLength: 10,
  maxReviewLength: 2000,
  minDescriptionLength: 20,
  maxDescriptionLength: 5000,
  requireReviewForPublish: false,
  autoApproveVerifiedUsers: true,
  flagThresholdForReview: 3,
  autoHideAfterFlags: 5,
  appealWindowDays: 14,
};

const DEFAULT_COMPLIANCE_SETTINGS: ComplianceSettingsDto = {
  gdprEnabled: true,
  gdprDataRetentionDays: 2555,
  gdprRightToErasure: true,
  gdprDataPortability: true,
  gdprConsentRequired: true,
  gdprCookieConsentRequired: true,
  ccpaEnabled: false,
  ccpaDoNotSellEnabled: false,
  ageVerificationRequired: true,
  minimumAge: 18,
  termsVersion: '1.0.0',
  termsLastUpdated: new Date().toISOString(),
  privacyPolicyVersion: '1.0.0',
  privacyPolicyLastUpdated: new Date().toISOString(),
  requiredDocuments: ['identity', 'business_registration'],
  documentExpiryCheckEnabled: true,
  documentExpiryReminderDays: 30,
  amlCheckRequired: false,
  amlCheckProvider: undefined,
  amlCheckThreshold: 10000,
  pep_screening_enabled: false,
  sanctionsListCheckEnabled: false,
  dataEncryptionAtRest: true,
  dataEncryptionInTransit: true,
  auditLoggingEnabled: true,
  auditLogRetentionDays: 365,
};

const DEFAULT_MISSION_SETTINGS: MissionSettingsDto = {
  minMissionValue: 2000,
  maxMissionValue: 10000000,
  maxActiveMissionsPerClient: 10,
  maxActiveMissionsPerArtisan: 20,
  autoMatchingEnabled: true,
  autoMatchingRadius: 50,
  autoMatchingMaxCandidates: 10,
  quotationValidityDays: 7,
  quotationMaxRevisions: 3,
  negotiationEnabled: true,
  maxNegotiationRounds: 5,
  negotiationTimeoutHours: 24,
  depositRequired: true,
  depositRefundableUntilHours: 24,
  autoValidationEnabled: true,
  autoValidationDelayHours: 168,
  clientValidationWindowHours: 48,
  allowRescheduling: true,
  maxReschedulesPerMission: 2,
  reschedulingDeadlineHours: 24,
  cancellationPolicy: CancellationPolicy.MODERATE,
  categories: [
    'Plomberie',
    'Électricité',
    'Serrurerie',
    'Chauffage',
    'Climatisation',
    'Menuiserie',
    'Peinture',
    'Maçonnerie',
    'Carrelage',
    'Jardinage',
    'Nettoyage',
    'Déménagement',
  ],
  urgencyLevels: [
    { name: 'Normal', multiplier: 1, maxResponseHours: 48 },
    { name: 'Urgent', multiplier: 1.3, maxResponseHours: 4 },
    { name: 'Emergency', multiplier: 1.5, maxResponseHours: 1 },
  ],
  workingHoursStart: '08:00',
  workingHoursEnd: '20:00',
  weekendMissionsAllowed: true,
  holidayMissionsAllowed: true,
};

const DEFAULT_USER_PROFILE_SETTINGS: UserProfileSettingsDto = {
  requireEmailVerification: true,
  requirePhoneVerification: false,
  allowUsernameChange: true,
  usernameChangeLimit: 2,
  profilePhotoRequired: false,
  profilePhotoModeration: true,
  bioMaxLength: 500,
  displayNameMaxLength: 50,
  allowAnonymousProfiles: false,
  showOnlineStatus: true,
  showLastActive: true,
  allowProfileHiding: false,
  artisanRequirements: {
    businessVerificationRequired: true,
    insuranceRequired: true,
    minCertifications: 0,
    portfolioRequired: false,
    minPortfolioItems: 0,
  },
  clientRequirements: {
    addressRequired: true,
    phoneRequired: true,
    identityVerificationRequired: false,
  },
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSymbols: false,
  passwordExpiryDays: 0,
  sessionTimeoutMinutes: 60,
  maxConcurrentSessions: 5,
  twoFactorAuthRequired: false,
  twoFactorAuthMethods: ['authenticator', 'sms'],
  accountDeletionEnabled: true,
  accountDeletionCooldownDays: 14,
};

const DEFAULT_PERFORMANCE_SETTINGS: PerformanceSettingsDto = {
  cacheEnabled: true,
  cacheTtlSeconds: 300,
  cacheMaxSize: 512,
  cdnEnabled: false,
  cdnUrl: undefined,
  imageOptimizationEnabled: true,
  imageMaxWidth: 1920,
  imageMaxHeight: 1080,
  imageQuality: 85,
  lazyLoadingEnabled: true,
  paginationDefaultLimit: 20,
  paginationMaxLimit: 100,
  searchIndexEnabled: true,
  searchIndexRefreshMinutes: 5,
  databaseConnectionPoolSize: 10,
  databaseQueryTimeout: 30000,
  backgroundJobsEnabled: true,
  backgroundJobConcurrency: 5,
  rateLimitingEnabled: true,
  requestTimeoutMs: 30000,
  enableCompression: true,
  compressionLevel: 6,
  logLevel: LogLevel.INFO,
  logRetentionDays: 30,
  metricsEnabled: true,
  metricsCollectionInterval: 60,
  healthCheckEnabled: true,
  healthCheckInterval: 30,
};

// Config key prefixes
const CONFIG_KEYS = {
  FEES: 'settings.fees',
  PAYMENTS: 'settings.payments',
  RATE_LIMITS: 'settings.rateLimits',
  REPUTATION_RULES: 'settings.reputationRules',
  NO_SHOW: 'settings.noShow',
  TAX: 'settings.tax',
  NOTIFICATIONS: 'settings.notifications',
  INTEGRATIONS: 'settings.integrations',
  CONTENT_MODERATION: 'settings.contentModeration',
  COMPLIANCE: 'settings.compliance',
  MISSIONS: 'settings.missions',
  USERS: 'settings.users',
  PERFORMANCE: 'settings.performance',
};

@Injectable()
export class PlatformConfigService {
  private readonly logger = new Logger(PlatformConfigService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get a config value from the database or return default
   */
  private async getConfigValue<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const config = await this.prisma.platformConfig.findUnique({
        where: { key },
      });

      if (!config) {
        return defaultValue;
      }

      // Parse based on data type
      if (config.dataType === ConfigDataType.JSON) {
        return JSON.parse(config.value) as T;
      }

      return config.value as T;
    } catch (error) {
      this.logger.error(`Error getting config ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Set a config value in the database
   */
  private async setConfigValue<T>(
    key: string,
    value: T,
    category: ConfigCategory,
    description?: string,
    userId?: string,
  ): Promise<void> {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      const dataType = typeof value === 'object' ? ConfigDataType.JSON : ConfigDataType.STRING;

      await this.prisma.platformConfig.upsert({
        where: { key },
        update: {
          value: stringValue,
          dataType,
          updatedBy: userId,
          updatedAt: new Date(),
        },
        create: {
          key,
          value: stringValue,
          dataType,
          category,
          description: description || `Platform configuration for ${key}`,
          isPublic: false,
          isActive: true,
          updatedBy: userId,
        },
      });
    } catch (error) {
      this.logger.error(`Error setting config ${key}:`, error);
      throw error;
    }
  }

  // Fee Settings
  async getFeeSettings(): Promise<FeeSettingsDto> {
    return this.getConfigValue(CONFIG_KEYS.FEES, DEFAULT_FEE_SETTINGS);
  }

  async updateFeeSettings(settings: Partial<FeeSettingsDto>, userId?: string): Promise<FeeSettingsDto> {
    const current = await this.getFeeSettings();
    const updated = { ...current, ...settings };
    await this.setConfigValue(CONFIG_KEYS.FEES, updated, ConfigCategory.FEES, 'Platform fee configuration', userId);
    return updated;
  }

  // Payment Settings
  async getPaymentSettings(): Promise<PaymentSettingsDto> {
    return this.getConfigValue(CONFIG_KEYS.PAYMENTS, DEFAULT_PAYMENT_SETTINGS);
  }

  async updatePaymentSettings(settings: Partial<PaymentSettingsDto>, userId?: string): Promise<PaymentSettingsDto> {
    const current = await this.getPaymentSettings();
    const updated = { ...current, ...settings };
    await this.setConfigValue(CONFIG_KEYS.PAYMENTS, updated, ConfigCategory.PAYMENT, 'Payment configuration', userId);
    return updated;
  }

  // Rate Limit Settings
  async getRateLimitSettings(): Promise<RateLimitSettingsDto> {
    return this.getConfigValue(CONFIG_KEYS.RATE_LIMITS, DEFAULT_RATE_LIMIT_SETTINGS);
  }

  async updateRateLimitSettings(settings: Partial<RateLimitSettingsDto>, userId?: string): Promise<RateLimitSettingsDto> {
    const current = await this.getRateLimitSettings();
    const updated = { ...current, ...settings };
    await this.setConfigValue(CONFIG_KEYS.RATE_LIMITS, updated, ConfigCategory.LIMIT, 'Rate limit configuration', userId);
    return updated;
  }

  // Reputation Rules
  async getReputationRules(): Promise<ReputationRulesDto> {
    return this.getConfigValue(CONFIG_KEYS.REPUTATION_RULES, DEFAULT_REPUTATION_RULES);
  }

  async updateReputationRules(rules: Partial<ReputationRulesDto>, userId?: string): Promise<ReputationRulesDto> {
    const current = await this.getReputationRules();
    const updated = { ...current, ...rules };
    await this.setConfigValue(CONFIG_KEYS.REPUTATION_RULES, updated, ConfigCategory.GENERAL, 'Reputation rules configuration', userId);
    return updated;
  }

  // No-Show Config
  async getNoShowConfig(): Promise<NoShowConfigDto> {
    return this.getConfigValue(CONFIG_KEYS.NO_SHOW, DEFAULT_NO_SHOW_CONFIG);
  }

  async updateNoShowConfig(config: Partial<NoShowConfigDto>, userId?: string): Promise<NoShowConfigDto> {
    const current = await this.getNoShowConfig();
    const updated = { ...current, ...config };
    await this.setConfigValue(CONFIG_KEYS.NO_SHOW, updated, ConfigCategory.GENERAL, 'No-show configuration', userId);
    return updated;
  }

  // Tax Settings
  async getTaxSettings(): Promise<TaxSettingsDto> {
    return this.getConfigValue(CONFIG_KEYS.TAX, DEFAULT_TAX_SETTINGS);
  }

  async updateTaxSettings(settings: Partial<TaxSettingsDto>, userId?: string): Promise<TaxSettingsDto> {
    const current = await this.getTaxSettings();
    const updated = { ...current, ...settings };
    await this.setConfigValue(CONFIG_KEYS.TAX, updated, ConfigCategory.FEES, 'Tax/VAT configuration', userId);
    return updated;
  }

  // Notification Settings
  async getNotificationSettings(): Promise<NotificationSettingsDto> {
    return this.getConfigValue(CONFIG_KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATION_SETTINGS);
  }

  async updateNotificationSettings(settings: Partial<NotificationSettingsDto>, userId?: string): Promise<NotificationSettingsDto> {
    const current = await this.getNotificationSettings();
    const updated = { ...current, ...settings };
    await this.setConfigValue(CONFIG_KEYS.NOTIFICATIONS, updated, ConfigCategory.NOTIFICATION, 'Notification configuration', userId);
    return updated;
  }

  // Integration Settings
  async getIntegrationSettings(): Promise<IntegrationSettingsDto> {
    return this.getConfigValue(CONFIG_KEYS.INTEGRATIONS, DEFAULT_INTEGRATION_SETTINGS);
  }

  async updateIntegrationSettings(settings: Partial<IntegrationSettingsDto>, userId?: string): Promise<IntegrationSettingsDto> {
    const current = await this.getIntegrationSettings();
    const updated = { ...current, ...settings };
    await this.setConfigValue(CONFIG_KEYS.INTEGRATIONS, updated, ConfigCategory.GENERAL, 'Integration configuration', userId);
    return updated;
  }

  // Content Moderation Settings
  async getContentModerationSettings(): Promise<ContentModerationSettingsDto> {
    return this.getConfigValue(CONFIG_KEYS.CONTENT_MODERATION, DEFAULT_CONTENT_MODERATION_SETTINGS);
  }

  async updateContentModerationSettings(settings: Partial<ContentModerationSettingsDto>, userId?: string): Promise<ContentModerationSettingsDto> {
    const current = await this.getContentModerationSettings();
    const updated = { ...current, ...settings };
    await this.setConfigValue(CONFIG_KEYS.CONTENT_MODERATION, updated, ConfigCategory.GENERAL, 'Content moderation configuration', userId);
    return updated;
  }

  // Compliance Settings
  async getComplianceSettings(): Promise<ComplianceSettingsDto> {
    return this.getConfigValue(CONFIG_KEYS.COMPLIANCE, DEFAULT_COMPLIANCE_SETTINGS);
  }

  async updateComplianceSettings(settings: Partial<ComplianceSettingsDto>, userId?: string): Promise<ComplianceSettingsDto> {
    const current = await this.getComplianceSettings();
    const updated = { ...current, ...settings };
    await this.setConfigValue(CONFIG_KEYS.COMPLIANCE, updated, ConfigCategory.GENERAL, 'Compliance configuration', userId);
    return updated;
  }

  // Mission Settings
  async getMissionSettings(): Promise<MissionSettingsDto> {
    return this.getConfigValue(CONFIG_KEYS.MISSIONS, DEFAULT_MISSION_SETTINGS);
  }

  async updateMissionSettings(settings: Partial<MissionSettingsDto>, userId?: string): Promise<MissionSettingsDto> {
    const current = await this.getMissionSettings();
    const updated = { ...current, ...settings };
    await this.setConfigValue(CONFIG_KEYS.MISSIONS, updated, ConfigCategory.GENERAL, 'Mission configuration', userId);
    return updated;
  }

  // User Profile Settings
  async getUserProfileSettings(): Promise<UserProfileSettingsDto> {
    return this.getConfigValue(CONFIG_KEYS.USERS, DEFAULT_USER_PROFILE_SETTINGS);
  }

  async updateUserProfileSettings(settings: Partial<UserProfileSettingsDto>, userId?: string): Promise<UserProfileSettingsDto> {
    const current = await this.getUserProfileSettings();
    const updated = { ...current, ...settings };
    await this.setConfigValue(CONFIG_KEYS.USERS, updated, ConfigCategory.GENERAL, 'User profile configuration', userId);
    return updated;
  }

  // Performance Settings
  async getPerformanceSettings(): Promise<PerformanceSettingsDto> {
    return this.getConfigValue(CONFIG_KEYS.PERFORMANCE, DEFAULT_PERFORMANCE_SETTINGS);
  }

  async updatePerformanceSettings(settings: Partial<PerformanceSettingsDto>, userId?: string): Promise<PerformanceSettingsDto> {
    const current = await this.getPerformanceSettings();
    const updated = { ...current, ...settings };
    await this.setConfigValue(CONFIG_KEYS.PERFORMANCE, updated, ConfigCategory.GENERAL, 'Performance configuration', userId);
    return updated;
  }

  // Get all platform config
  async getPlatformConfig(): Promise<{
    id: string;
    fees: FeeSettingsDto;
    payments: PaymentSettingsDto;
    rateLimits: RateLimitSettingsDto;
    reputationRules: ReputationRulesDto;
    noShow: NoShowConfigDto;
    tax: TaxSettingsDto;
    notifications: NotificationSettingsDto;
    integrations: IntegrationSettingsDto;
    contentModeration: ContentModerationSettingsDto;
    compliance: ComplianceSettingsDto;
    missions: MissionSettingsDto;
    users: UserProfileSettingsDto;
    performance: PerformanceSettingsDto;
    updatedAt: string;
    updatedBy?: string;
  }> {
    const [
      fees,
      payments,
      rateLimits,
      reputationRules,
      noShow,
      tax,
      notifications,
      integrations,
      contentModeration,
      compliance,
      missions,
      users,
      performance,
    ] = await Promise.all([
      this.getFeeSettings(),
      this.getPaymentSettings(),
      this.getRateLimitSettings(),
      this.getReputationRules(),
      this.getNoShowConfig(),
      this.getTaxSettings(),
      this.getNotificationSettings(),
      this.getIntegrationSettings(),
      this.getContentModerationSettings(),
      this.getComplianceSettings(),
      this.getMissionSettings(),
      this.getUserProfileSettings(),
      this.getPerformanceSettings(),
    ]);

    // Get the most recent update time
    const latestConfig = await this.prisma.platformConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true, updatedBy: true },
    });

    return {
      id: 'platform-config',
      fees,
      payments,
      rateLimits,
      reputationRules,
      noShow,
      tax,
      notifications,
      integrations,
      contentModeration,
      compliance,
      missions,
      users,
      performance,
      updatedAt: latestConfig?.updatedAt?.toISOString() || new Date().toISOString(),
      updatedBy: latestConfig?.updatedBy || undefined,
    };
  }
}
