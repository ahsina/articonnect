import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// Fee Settings
export class FeeSettingsDto {
  @ApiProperty({ description: 'Platform commission rate percentage', example: 15 })
  @IsNumber()
  @Min(0)
  @Max(100)
  platformCommissionRate: number;

  @ApiProperty({ description: 'Minimum commission amount in cents', example: 100 })
  @IsNumber()
  @Min(0)
  minCommissionAmount: number;

  @ApiProperty({ description: 'Maximum commission amount in cents', example: 50000 })
  @IsNumber()
  @Min(0)
  maxCommissionAmount: number;

  @ApiProperty({ description: 'Deposit percentage of mission cost', example: 30 })
  @IsNumber()
  @Min(0)
  @Max(100)
  depositPercentage: number;

  @ApiProperty({ description: 'Minimum deposit in cents', example: 1000 })
  @IsNumber()
  @Min(0)
  depositMinimum: number;

  @ApiProperty({ description: 'Maximum deposit in cents', example: 100000 })
  @IsNumber()
  @Min(0)
  depositMaximum: number;

  @ApiProperty({ description: 'Multiplier for urgent missions', example: 1.5 })
  @IsNumber()
  @Min(1)
  urgentMissionMultiplier: number;

  @ApiProperty({ description: 'Multiplier for weekend missions', example: 1.2 })
  @IsNumber()
  @Min(1)
  weekendMultiplier: number;

  @ApiProperty({ description: 'Multiplier for holiday missions', example: 1.5 })
  @IsNumber()
  @Min(1)
  holidayMultiplier: number;

  @ApiProperty({ description: 'Cancellation fee percentage', example: 10 })
  @IsNumber()
  @Min(0)
  @Max(100)
  cancellationFeePercentage: number;

  @ApiProperty({ description: 'Hours before mission for late cancellation', example: 24 })
  @IsNumber()
  @Min(0)
  lateCancellationHours: number;

  @ApiProperty({ description: 'Late cancellation fee percentage', example: 50 })
  @IsNumber()
  @Min(0)
  @Max(100)
  lateCancellationFeePercentage: number;

  @ApiProperty({ description: 'Percentage artisan receives', example: 85 })
  @IsNumber()
  @Min(0)
  @Max(100)
  artisanPayoutPercentage: number;

  @ApiProperty({ description: 'Referral bonus in cents', example: 1000 })
  @IsNumber()
  @Min(0)
  referralBonusAmount: number;

  @ApiProperty({ description: 'First mission discount percentage', example: 10 })
  @IsNumber()
  @Min(0)
  @Max(100)
  firstMissionDiscount: number;
}

// Payment Settings
export class PaymentSettingsDto {
  @ApiProperty()
  @IsBoolean()
  stripeEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  paypalEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  bankTransferEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  walletEnabled: boolean;

  @ApiProperty({ description: 'Minimum payment amount in cents' })
  @IsNumber()
  @Min(0)
  minPaymentAmount: number;

  @ApiProperty({ description: 'Maximum payment amount in cents' })
  @IsNumber()
  @Min(0)
  maxPaymentAmount: number;

  @ApiProperty({ description: 'Days before artisan payout' })
  @IsNumber()
  @Min(0)
  payoutDelayDays: number;

  @ApiProperty()
  @IsBoolean()
  autoPayoutEnabled: boolean;

  @ApiProperty({ description: 'Minimum balance for auto-payout' })
  @IsNumber()
  @Min(0)
  autoPayoutThreshold: number;

  @ApiProperty({ description: 'Days after payment for refund eligibility' })
  @IsNumber()
  @Min(0)
  refundWindowDays: number;

  @ApiProperty()
  @IsBoolean()
  partialRefundEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  instantPayoutEnabled: boolean;

  @ApiProperty({ description: 'Instant payout fee percentage' })
  @IsNumber()
  @Min(0)
  @Max(100)
  instantPayoutFeePercentage: number;

  @ApiProperty()
  @IsBoolean()
  holdFundsForDisputes: boolean;

  @ApiProperty({ description: 'Hours funds are held in escrow' })
  @IsNumber()
  @Min(0)
  escrowDurationHours: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  paymentRetryAttempts: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  paymentRetryDelayMinutes: number;

  @ApiProperty()
  @IsBoolean()
  failedPaymentNotification: boolean;
}

// Rate Limit Settings
export class RateLimitSettingsDto {
  @ApiProperty({ description: 'API requests per minute' })
  @IsNumber()
  @Min(1)
  apiRateLimit: number;

  @ApiProperty({ description: 'Rate limit window in minutes' })
  @IsNumber()
  @Min(1)
  apiRateLimitWindow: number;

  @ApiProperty({ description: 'Max login attempts' })
  @IsNumber()
  @Min(1)
  loginAttemptsLimit: number;

  @ApiProperty({ description: 'Lockout duration in minutes' })
  @IsNumber()
  @Min(0)
  loginLockoutMinutes: number;

  @ApiProperty({ description: 'Password resets per day' })
  @IsNumber()
  @Min(0)
  passwordResetLimit: number;

  @ApiProperty({ description: 'Missions per day per user' })
  @IsNumber()
  @Min(0)
  missionCreationLimit: number;

  @ApiProperty({ description: 'Messages per hour' })
  @IsNumber()
  @Min(0)
  messageLimit: number;

  @ApiProperty({ description: 'Reviews per day' })
  @IsNumber()
  @Min(0)
  reviewLimit: number;

  @ApiProperty({ description: 'Reports per day' })
  @IsNumber()
  @Min(0)
  reportLimit: number;

  @ApiProperty({ description: 'Uploads per hour' })
  @IsNumber()
  @Min(0)
  fileUploadLimit: number;

  @ApiProperty({ description: 'Max file size in MB' })
  @IsNumber()
  @Min(1)
  fileUploadMaxSizeMb: number;

  @ApiProperty({ description: 'Searches per minute' })
  @IsNumber()
  @Min(0)
  searchRequestsLimit: number;

  @ApiProperty()
  @IsBoolean()
  ipBlocklistEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  geoBlockingEnabled: boolean;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  blockedCountries: string[];

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  allowedCountries: string[];

  @ApiProperty()
  @IsBoolean()
  captchaEnabled: boolean;

  @ApiProperty({ description: 'Score to trigger captcha' })
  @IsNumber()
  @Min(0)
  captchaThreshold: number;
}

// Reputation Rules
export class ReputationRulesDto {
  @ApiProperty({ description: 'Starting reputation score' })
  @IsNumber()
  initialScore: number;

  @ApiProperty({ description: 'Maximum possible score' })
  @IsNumber()
  maxScore: number;

  @ApiProperty({ description: 'Minimum possible score' })
  @IsNumber()
  minScore: number;

  @ApiProperty({ description: 'Points for completing a mission' })
  @IsNumber()
  completedMissionBonus: number;

  @ApiProperty({ description: 'Points for 5-star review' })
  @IsNumber()
  fiveStarReviewBonus: number;

  @ApiProperty({ description: 'Points for 4-star review' })
  @IsNumber()
  fourStarReviewBonus: number;

  @ApiProperty({ description: 'Points for 3-star review' })
  @IsNumber()
  threeStarReviewBonus: number;

  @ApiProperty({ description: 'Penalty for 2-star review' })
  @IsNumber()
  twoStarReviewPenalty: number;

  @ApiProperty({ description: 'Penalty for 1-star review' })
  @IsNumber()
  oneStarReviewPenalty: number;

  @ApiProperty({ description: 'Penalty for no-show' })
  @IsNumber()
  noShowPenalty: number;

  @ApiProperty({ description: 'Penalty for cancellation' })
  @IsNumber()
  cancellationPenalty: number;

  @ApiProperty({ description: 'Penalty for late cancellation' })
  @IsNumber()
  lateCancellationPenalty: number;

  @ApiProperty({ description: 'Penalty for losing dispute' })
  @IsNumber()
  disputeLossPenalty: number;

  @ApiProperty({ description: 'Bonus for winning dispute' })
  @IsNumber()
  disputeWinBonus: number;

  @ApiProperty({ description: 'Bonus for verification' })
  @IsNumber()
  verificationBonus: number;

  @ApiProperty({ description: 'Bonus for fast response' })
  @IsNumber()
  responseTimeBonus: number;

  @ApiProperty({ description: 'Bonus for consecutive missions' })
  @IsNumber()
  streakBonus: number;

  @ApiProperty({ description: 'Missions needed for streak' })
  @IsNumber()
  @Min(0)
  streakThreshold: number;

  @ApiProperty({ description: 'Penalty per month of inactivity' })
  @IsNumber()
  inactivityPenalty: number;

  @ApiProperty({ description: 'Days before inactive' })
  @IsNumber()
  @Min(0)
  inactivityThresholdDays: number;

  @ApiProperty({ description: 'Score for gold status' })
  @IsNumber()
  goldThreshold: number;

  @ApiProperty({ description: 'Score for silver status' })
  @IsNumber()
  silverThreshold: number;

  @ApiProperty({ description: 'Score for bronze status' })
  @IsNumber()
  bronzeThreshold: number;

  @ApiProperty({ description: 'Score for trusted status' })
  @IsNumber()
  trustedThreshold: number;

  @ApiProperty({ description: 'Score triggering warning' })
  @IsNumber()
  warningThreshold: number;
}

// Auto-validation requirements nested type
export class AutoValidationRequirementsDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  minWaitTime: number;

  @ApiProperty()
  @IsBoolean()
  gpsVerified: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  minContactAttempts: number;
}

// No-Show Configuration
export class NoShowConfigDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: 'How long artisan must wait in minutes' })
  @IsNumber()
  @Min(0)
  minimumWaitTimeMinutes: number;

  @ApiProperty()
  @IsBoolean()
  gpsVerificationRequired: boolean;

  @ApiProperty({ description: 'How close to location in meters' })
  @IsNumber()
  @Min(0)
  gpsRadiusMeters: number;

  @ApiProperty()
  @IsBoolean()
  photoEvidenceRequired: boolean;

  @ApiProperty({ description: 'Minimum contact attempts required' })
  @IsNumber()
  @Min(0)
  minContactAttempts: number;

  @ApiProperty({ description: 'Percentage of mission value' })
  @IsNumber()
  @Min(0)
  @Max(100)
  compensationPercentage: number;

  @ApiProperty({ description: 'Minimum compensation in cents' })
  @IsNumber()
  @Min(0)
  compensationMinimum: number;

  @ApiProperty({ description: 'Maximum compensation in cents' })
  @IsNumber()
  @Min(0)
  compensationMaximum: number;

  @ApiProperty({ description: 'Penalty charged to client' })
  @IsNumber()
  @Min(0)
  @Max(100)
  clientPenaltyPercentage: number;

  @ApiProperty()
  @IsBoolean()
  autoValidationEnabled: boolean;

  @ApiProperty()
  @ValidateNested()
  @Type(() => AutoValidationRequirementsDto)
  autoValidationRequirements: AutoValidationRequirementsDto;

  @ApiProperty({ description: 'Hours client has to dispute' })
  @IsNumber()
  @Min(0)
  disputeWindowHours: number;

  @ApiProperty({ description: 'No-shows before escalation' })
  @IsNumber()
  @Min(0)
  repeatOffenderThreshold: number;

  @ApiProperty({ description: 'Penalty multiplier for repeat offenders' })
  @IsNumber()
  @Min(1)
  repeatOffenderPenaltyMultiplier: number;
}

// VAT Rate nested type
export class VatRateDto {
  @ApiProperty()
  @IsString()
  country: string;

  @ApiProperty()
  @IsNumber()
  rate: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  reducedRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  superReducedRate?: number;
}

// Tax Settings
export class TaxSettingsDto {
  @ApiProperty()
  @IsBoolean()
  vatEnabled: boolean;

  @ApiProperty({ description: 'Default VAT rate percentage' })
  @IsNumber()
  @Min(0)
  defaultVatRate: number;

  @ApiProperty({ type: [VatRateDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VatRateDto)
  vatRates: VatRateDto[];

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  vatExemptCategories: string[];

  @ApiProperty()
  @IsBoolean()
  reverseChargeEnabled: boolean;

  @ApiProperty()
  @IsString()
  invoiceNumberPrefix: string;

  @ApiProperty()
  @IsString()
  invoiceNumberFormat: string;

  @ApiProperty()
  @IsBoolean()
  autoGenerateInvoices: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  invoiceRetentionYears: number;

  @ApiProperty()
  @IsBoolean()
  taxReportingEnabled: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  taxReportingThreshold: number;

  @ApiProperty()
  @IsBoolean()
  witholdingTaxEnabled: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  witholdingTaxRate: number;
}

// Notification Settings
export class NotificationSettingsDto {
  @ApiProperty()
  @IsBoolean()
  emailEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  smsEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  pushEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  inAppEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  missionCreatedNotify: boolean;

  @ApiProperty()
  @IsBoolean()
  missionAcceptedNotify: boolean;

  @ApiProperty()
  @IsBoolean()
  missionCompletedNotify: boolean;

  @ApiProperty()
  @IsBoolean()
  missionCancelledNotify: boolean;

  @ApiProperty()
  @IsBoolean()
  paymentReceivedNotify: boolean;

  @ApiProperty()
  @IsBoolean()
  paymentFailedNotify: boolean;

  @ApiProperty()
  @IsBoolean()
  payoutProcessedNotify: boolean;

  @ApiProperty()
  @IsBoolean()
  newMessageNotify: boolean;

  @ApiProperty()
  @IsBoolean()
  newReviewNotify: boolean;

  @ApiProperty()
  @IsBoolean()
  disputeOpenedNotify: boolean;

  @ApiProperty()
  @IsBoolean()
  disputeResolvedNotify: boolean;

  @ApiProperty()
  @IsBoolean()
  verificationStatusNotify: boolean;

  @ApiProperty()
  @IsBoolean()
  promotionalEmailsEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  weeklyDigestEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  marketingOptInDefault: boolean;

  @ApiProperty({ description: 'Hours before mission reminder' })
  @IsNumber()
  @Min(0)
  reminderBeforeMissionHours: number;

  @ApiProperty({ description: 'Hours after mission follow-up' })
  @IsNumber()
  @Min(0)
  followUpAfterMissionHours: number;

  @ApiProperty({ description: 'Days before inactivity reminder' })
  @IsNumber()
  @Min(0)
  inactivityReminderDays: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  maxEmailsPerDay: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  maxSmsPerDay: number;

  @ApiProperty({ example: '22:00' })
  @IsString()
  quietHoursStart: string;

  @ApiProperty({ example: '08:00' })
  @IsString()
  quietHoursEnd: string;

  @ApiProperty()
  @IsBoolean()
  respectQuietHours: boolean;
}

// Integration Settings
export class IntegrationSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stripePublicKey?: string;

  @ApiProperty()
  @IsBoolean()
  stripeWebhookEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  googleMapsEnabled: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  googleMapsApiKey?: string;

  @ApiProperty()
  @IsBoolean()
  twilioEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  twilioSmsEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  twilioVoiceEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  sendgridEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  firebaseEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  firebasePushEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  sentryEnabled: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sentryDsn?: string;

  @ApiProperty()
  @IsBoolean()
  analyticsEnabled: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  googleAnalyticsId?: string;

  @ApiProperty()
  @IsBoolean()
  intercomEnabled: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  intercomAppId?: string;

  @ApiProperty()
  @IsBoolean()
  slackWebhookEnabled: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slackWebhookUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slackAlertChannel?: string;

  @ApiProperty()
  @IsBoolean()
  zapierEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  apiWebhooksEnabled: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  webhookRetryAttempts: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  webhookTimeoutSeconds: number;
}

// Content Moderation Settings
export enum ModerationStrength {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export class ContentModerationSettingsDto {
  @ApiProperty()
  @IsBoolean()
  autoModerationEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  profanityFilterEnabled: boolean;

  @ApiProperty({ enum: ModerationStrength })
  @IsEnum(ModerationStrength)
  profanityFilterStrength: ModerationStrength;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  customBannedWords: string[];

  @ApiProperty()
  @IsBoolean()
  spamDetectionEnabled: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  spamScoreThreshold: number;

  @ApiProperty()
  @IsBoolean()
  imagesModerationEnabled: boolean;

  @ApiProperty()
  @IsString()
  imagesModerationProvider: string;

  @ApiProperty()
  @IsBoolean()
  linkFilterEnabled: boolean;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  allowedDomains: string[];

  @ApiProperty()
  @IsNumber()
  @Min(0)
  maxLinksPerMessage: number;

  @ApiProperty()
  @IsBoolean()
  duplicateContentCheck: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  minReviewLength: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  maxReviewLength: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  minDescriptionLength: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  maxDescriptionLength: number;

  @ApiProperty()
  @IsBoolean()
  requireReviewForPublish: boolean;

  @ApiProperty()
  @IsBoolean()
  autoApproveVerifiedUsers: boolean;

  @ApiProperty({ description: 'Reports needed for manual review' })
  @IsNumber()
  @Min(0)
  flagThresholdForReview: number;

  @ApiProperty({ description: 'Flags to auto-hide content' })
  @IsNumber()
  @Min(0)
  autoHideAfterFlags: number;

  @ApiProperty({ description: 'Days to appeal moderation decision' })
  @IsNumber()
  @Min(0)
  appealWindowDays: number;
}

// Compliance Settings
export class ComplianceSettingsDto {
  @ApiProperty()
  @IsBoolean()
  gdprEnabled: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  gdprDataRetentionDays: number;

  @ApiProperty()
  @IsBoolean()
  gdprRightToErasure: boolean;

  @ApiProperty()
  @IsBoolean()
  gdprDataPortability: boolean;

  @ApiProperty()
  @IsBoolean()
  gdprConsentRequired: boolean;

  @ApiProperty()
  @IsBoolean()
  gdprCookieConsentRequired: boolean;

  @ApiProperty()
  @IsBoolean()
  ccpaEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  ccpaDoNotSellEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  ageVerificationRequired: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  minimumAge: number;

  @ApiProperty()
  @IsString()
  termsVersion: string;

  @ApiProperty()
  @IsString()
  termsLastUpdated: string;

  @ApiProperty()
  @IsString()
  privacyPolicyVersion: string;

  @ApiProperty()
  @IsString()
  privacyPolicyLastUpdated: string;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  requiredDocuments: string[];

  @ApiProperty()
  @IsBoolean()
  documentExpiryCheckEnabled: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  documentExpiryReminderDays: number;

  @ApiProperty()
  @IsBoolean()
  amlCheckRequired: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  amlCheckProvider?: string;

  @ApiProperty({ description: 'Transaction amount triggering AML check' })
  @IsNumber()
  @Min(0)
  amlCheckThreshold: number;

  @ApiProperty()
  @IsBoolean()
  pep_screening_enabled: boolean;

  @ApiProperty()
  @IsBoolean()
  sanctionsListCheckEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  dataEncryptionAtRest: boolean;

  @ApiProperty()
  @IsBoolean()
  dataEncryptionInTransit: boolean;

  @ApiProperty()
  @IsBoolean()
  auditLoggingEnabled: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  auditLogRetentionDays: number;
}

// Urgency Level nested type
export class UrgencyLevelDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  multiplier: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  maxResponseHours: number;
}

// Cancellation Policy enum
export enum CancellationPolicy {
  FLEXIBLE = 'FLEXIBLE',
  MODERATE = 'MODERATE',
  STRICT = 'STRICT',
}

// Mission Settings
export class MissionSettingsDto {
  @ApiProperty({ description: 'Minimum mission value in cents' })
  @IsNumber()
  @Min(0)
  minMissionValue: number;

  @ApiProperty({ description: 'Maximum mission value in cents' })
  @IsNumber()
  @Min(0)
  maxMissionValue: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  maxActiveMissionsPerClient: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  maxActiveMissionsPerArtisan: number;

  @ApiProperty()
  @IsBoolean()
  autoMatchingEnabled: boolean;

  @ApiProperty({ description: 'Auto-matching radius in km' })
  @IsNumber()
  @Min(0)
  autoMatchingRadius: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  autoMatchingMaxCandidates: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  quotationValidityDays: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  quotationMaxRevisions: number;

  @ApiProperty()
  @IsBoolean()
  negotiationEnabled: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  maxNegotiationRounds: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  negotiationTimeoutHours: number;

  @ApiProperty()
  @IsBoolean()
  depositRequired: boolean;

  @ApiProperty({ description: 'Hours before mission for deposit refund' })
  @IsNumber()
  @Min(0)
  depositRefundableUntilHours: number;

  @ApiProperty()
  @IsBoolean()
  autoValidationEnabled: boolean;

  @ApiProperty({ description: 'Hours after completion' })
  @IsNumber()
  @Min(0)
  autoValidationDelayHours: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  clientValidationWindowHours: number;

  @ApiProperty()
  @IsBoolean()
  allowRescheduling: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  maxReschedulesPerMission: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  reschedulingDeadlineHours: number;

  @ApiProperty({ enum: CancellationPolicy })
  @IsEnum(CancellationPolicy)
  cancellationPolicy: CancellationPolicy;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  categories: string[];

  @ApiProperty({ type: [UrgencyLevelDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UrgencyLevelDto)
  urgencyLevels: UrgencyLevelDto[];

  @ApiProperty({ example: '08:00' })
  @IsString()
  workingHoursStart: string;

  @ApiProperty({ example: '20:00' })
  @IsString()
  workingHoursEnd: string;

  @ApiProperty()
  @IsBoolean()
  weekendMissionsAllowed: boolean;

  @ApiProperty()
  @IsBoolean()
  holidayMissionsAllowed: boolean;
}

// Artisan Requirements nested type
export class ArtisanRequirementsDto {
  @ApiProperty()
  @IsBoolean()
  businessVerificationRequired: boolean;

  @ApiProperty()
  @IsBoolean()
  insuranceRequired: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  minCertifications: number;

  @ApiProperty()
  @IsBoolean()
  portfolioRequired: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  minPortfolioItems: number;
}

// Client Requirements nested type
export class ClientRequirementsDto {
  @ApiProperty()
  @IsBoolean()
  addressRequired: boolean;

  @ApiProperty()
  @IsBoolean()
  phoneRequired: boolean;

  @ApiProperty()
  @IsBoolean()
  identityVerificationRequired: boolean;
}

// User Profile Settings
export class UserProfileSettingsDto {
  @ApiProperty()
  @IsBoolean()
  requireEmailVerification: boolean;

  @ApiProperty()
  @IsBoolean()
  requirePhoneVerification: boolean;

  @ApiProperty()
  @IsBoolean()
  allowUsernameChange: boolean;

  @ApiProperty({ description: 'Username changes per year' })
  @IsNumber()
  @Min(0)
  usernameChangeLimit: number;

  @ApiProperty()
  @IsBoolean()
  profilePhotoRequired: boolean;

  @ApiProperty()
  @IsBoolean()
  profilePhotoModeration: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  bioMaxLength: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  displayNameMaxLength: number;

  @ApiProperty()
  @IsBoolean()
  allowAnonymousProfiles: boolean;

  @ApiProperty()
  @IsBoolean()
  showOnlineStatus: boolean;

  @ApiProperty()
  @IsBoolean()
  showLastActive: boolean;

  @ApiProperty()
  @IsBoolean()
  allowProfileHiding: boolean;

  @ApiProperty()
  @ValidateNested()
  @Type(() => ArtisanRequirementsDto)
  artisanRequirements: ArtisanRequirementsDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => ClientRequirementsDto)
  clientRequirements: ClientRequirementsDto;

  @ApiProperty()
  @IsNumber()
  @Min(6)
  passwordMinLength: number;

  @ApiProperty()
  @IsBoolean()
  passwordRequireUppercase: boolean;

  @ApiProperty()
  @IsBoolean()
  passwordRequireLowercase: boolean;

  @ApiProperty()
  @IsBoolean()
  passwordRequireNumbers: boolean;

  @ApiProperty()
  @IsBoolean()
  passwordRequireSymbols: boolean;

  @ApiProperty({ description: '0 = never expires' })
  @IsNumber()
  @Min(0)
  passwordExpiryDays: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  sessionTimeoutMinutes: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  maxConcurrentSessions: number;

  @ApiProperty()
  @IsBoolean()
  twoFactorAuthRequired: boolean;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  twoFactorAuthMethods: string[];

  @ApiProperty()
  @IsBoolean()
  accountDeletionEnabled: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  accountDeletionCooldownDays: number;
}

// Log Level enum
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

// Performance Settings
export class PerformanceSettingsDto {
  @ApiProperty()
  @IsBoolean()
  cacheEnabled: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  cacheTtlSeconds: number;

  @ApiProperty({ description: 'Max cache size in MB' })
  @IsNumber()
  @Min(0)
  cacheMaxSize: number;

  @ApiProperty()
  @IsBoolean()
  cdnEnabled: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cdnUrl?: string;

  @ApiProperty()
  @IsBoolean()
  imageOptimizationEnabled: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  imageMaxWidth: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  imageMaxHeight: number;

  @ApiProperty({ description: 'Image quality 1-100' })
  @IsNumber()
  @Min(1)
  @Max(100)
  imageQuality: number;

  @ApiProperty()
  @IsBoolean()
  lazyLoadingEnabled: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  paginationDefaultLimit: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  paginationMaxLimit: number;

  @ApiProperty()
  @IsBoolean()
  searchIndexEnabled: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  searchIndexRefreshMinutes: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  databaseConnectionPoolSize: number;

  @ApiProperty({ description: 'Query timeout in ms' })
  @IsNumber()
  @Min(0)
  databaseQueryTimeout: number;

  @ApiProperty()
  @IsBoolean()
  backgroundJobsEnabled: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  backgroundJobConcurrency: number;

  @ApiProperty()
  @IsBoolean()
  rateLimitingEnabled: boolean;

  @ApiProperty({ description: 'Request timeout in ms' })
  @IsNumber()
  @Min(0)
  requestTimeoutMs: number;

  @ApiProperty()
  @IsBoolean()
  enableCompression: boolean;

  @ApiProperty({ description: 'Compression level 1-9' })
  @IsNumber()
  @Min(1)
  @Max(9)
  compressionLevel: number;

  @ApiProperty({ enum: LogLevel })
  @IsEnum(LogLevel)
  logLevel: LogLevel;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  logRetentionDays: number;

  @ApiProperty()
  @IsBoolean()
  metricsEnabled: boolean;

  @ApiProperty({ description: 'Metrics collection interval in seconds' })
  @IsNumber()
  @Min(1)
  metricsCollectionInterval: number;

  @ApiProperty()
  @IsBoolean()
  healthCheckEnabled: boolean;

  @ApiProperty({ description: 'Health check interval in seconds' })
  @IsNumber()
  @Min(1)
  healthCheckInterval: number;
}

// Update DTOs (partial versions for PATCH operations)
export class UpdateFeeSettingsDto extends FeeSettingsDto {}
export class UpdatePaymentSettingsDto extends PaymentSettingsDto {}
export class UpdateRateLimitSettingsDto extends RateLimitSettingsDto {}
export class UpdateReputationRulesDto extends ReputationRulesDto {}
export class UpdateNoShowConfigDto extends NoShowConfigDto {}
export class UpdateTaxSettingsDto extends TaxSettingsDto {}
export class UpdateNotificationSettingsDto extends NotificationSettingsDto {}
export class UpdateIntegrationSettingsDto extends IntegrationSettingsDto {}
export class UpdateContentModerationSettingsDto extends ContentModerationSettingsDto {}
export class UpdateComplianceSettingsDto extends ComplianceSettingsDto {}
export class UpdateMissionSettingsDto extends MissionSettingsDto {}
export class UpdateUserProfileSettingsDto extends UserProfileSettingsDto {}
export class UpdatePerformanceSettingsDto extends PerformanceSettingsDto {}
