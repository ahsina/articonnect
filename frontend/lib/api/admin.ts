import apiClient from './client';

// Fraud Protection Config Types
export interface FraudProtectionConfig {
  id: string;
  // Multi-account detection
  multiAccountDetectionEnabled: boolean;
  multiAccountRiskThreshold: number;
  // Review fraud
  reviewFraudDetectionEnabled: boolean;
  reviewFraudScoreThreshold: number;
  reviewAutoHideEnabled: boolean;
  // Payout fraud
  payoutFraudScreeningEnabled: boolean;
  payoutRiskThreshold: number;
  payoutAutoHoldEnabled: boolean;
  // Price anomaly
  priceAnomalyDetectionEnabled: boolean;
  priceDeviationThreshold: number;
  priceAutoFlagEnabled: boolean;
  // Refund abuse
  refundAbuseDetectionEnabled: boolean;
  refundAbuseScoreThreshold: number;
  refundAutoRejectEnabled: boolean;
  // Session anomaly
  sessionAnomalyDetectionEnabled: boolean;
  sessionThreatLevelThreshold: string;
  sessionAutoLogoutEnabled: boolean;
  // KYC
  kycEnabled: boolean;
  kycSingleTransactionThreshold: number;
  kycCumulativeThreshold: number;
  kycAutoBlockEnabled: boolean;
  // Bot detection
  botDetectionEnabled: boolean;
  botScoreThreshold: number;
  botCaptchaEnabled: boolean;
  // Business verification
  businessVerificationRequired: boolean;
  businessVerificationAutoReject: boolean;
  // Alerts
  fraudAlertEmailEnabled: boolean;
  fraudAlertEmail: string;
  // Metadata
  updatedAt: string;
  updatedBy?: string;
}

export interface FraudSettingsStatus {
  multiAccountDetection: { enabled: boolean; threshold: number };
  reviewFraudDetection: { enabled: boolean; threshold: number; autoHide: boolean };
  payoutFraudScreening: { enabled: boolean; threshold: number; autoHold: boolean };
  priceAnomalyDetection: { enabled: boolean; threshold: number; autoFlag: boolean };
  refundAbuseDetection: { enabled: boolean; threshold: number; autoReject: boolean };
  sessionAnomalyDetection: { enabled: boolean; threatThreshold: string; autoLogout: boolean };
  kyc: {
    enabled: boolean;
    singleThreshold: number;
    cumulativeThreshold: number;
    autoBlock: boolean;
  };
  botDetection: { enabled: boolean; threshold: number; captchaEnabled: boolean };
  businessVerification: { required: boolean; autoReject: boolean };
}

// Monitoring Types
export interface MonitoringDashboard {
  overview: {
    totalMissions: number;
    missionsLast24h: number;
    missionsLast7days: number;
    missionsLast30days: number;
    completedMissions: number;
    autoValidatedMissions: number;
    cancelledMissions: number;
    pendingValidations: number;
    autoValidationRate: string;
    health: string;
  };
  autoValidation: {
    total: number;
    totalAmount: string;
    avgDelayHours: string;
    recentAutoValidations: Array<{
      id: string;
      title: string;
      amount: number;
      validatedAt: string;
    }>;
    dailyStats: Array<{
      date: string;
      count: number;
      amount: number;
    }>;
  };
  cleanup: {
    cancelledBySystemLast30Days: number;
    oldPendingMissions: number;
    nextCleanupRecommended: boolean;
    cleanupFrequency: string;
  };
  alerts: {
    stuckNegotiations: { count: number; missions: unknown[] };
    unpaidMissions: { count: number; totalAmount: string; missions: unknown[] };
    eligibleForAutoValidation: { count: number; totalAmount: string; missions: unknown[] };
  };
  performance: {
    cronExecutions: Record<string, unknown>;
    database: Record<string, unknown>;
  };
  trends: {
    missionsGrowth: string;
    autoValidationGrowth: string;
    prediction: {
      nextMonthMissions: number;
      nextMonthAutoValidations: number;
    };
  };
  generatedAt: string;
}

export interface MonitoringHealthStatus {
  status: string;
  score: number;
  checks: Record<string, { status: string; value: string | number }>;
  alerts: {
    total: number;
    critical: number;
    warnings: number;
    info: number;
  };
  recommendations: string[];
  lastCheck: string;
}

export interface MonitoringAlert {
  level: 'CRITICAL' | 'WARNING' | 'INFO';
  type: string;
  message: string;
  recommendation: string;
  actionUrl?: string;
}

export interface MonitoringAlerts {
  total: number;
  critical: number;
  warnings: number;
  info: number;
  alerts: MonitoringAlert[];
  lastCheck: string;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
  }>;
}

// CRON Types
export interface CronJob {
  name: string;
  schedule: string;
  description: string;
  enabled: boolean;
}

export interface CronJobsStatus {
  jobs: CronJob[];
  timezone: string;
  nextExecutions: Record<string, string>;
}

export interface CronHealth {
  status: string;
  scheduleModuleEnabled: boolean;
  activeJobs: number;
  totalJobs: number;
  timezone: string;
  message: string;
}

export interface AutoValidationResult {
  autoValidatedCount: number;
  missions: Array<{
    id: string;
    title: string;
    clientId: string;
    artisanId: string;
  }>;
}

// Feature Flags Types
export enum FeatureFlagType {
  BOOLEAN = 'BOOLEAN',
  PERCENTAGE = 'PERCENTAGE',
  USER_LIST = 'USER_LIST',
  ENVIRONMENT = 'ENVIRONMENT',
}

export enum FeatureFlagStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export interface FeatureFlagValue {
  enabled: boolean;
  percentage?: number;
  allowedUsers?: string[];
  allowedRoles?: string[];
  environments?: Record<string, boolean>;
}

export interface FeatureFlagMetadata {
  tags?: string[];
  owner?: string;
  jiraTicket?: string;
  expiresAt?: string;
  notes?: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  type: FeatureFlagType;
  status: FeatureFlagStatus;
  value: FeatureFlagValue;
  metadata?: FeatureFlagMetadata;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateFeatureFlagDto {
  key: string;
  name: string;
  description?: string;
  type: FeatureFlagType;
  value: FeatureFlagValue;
  metadata?: FeatureFlagMetadata;
}

export interface UpdateFeatureFlagDto {
  name?: string;
  description?: string;
  status?: FeatureFlagStatus;
  value?: FeatureFlagValue;
  metadata?: FeatureFlagMetadata;
}

// Mission Types for Admin
export interface AdminMission {
  id: string;
  title: string;
  description: string;
  status: string;
  category: string;
  urgency: string;
  price?: number;
  agreedPrice?: number;
  depositAmount?: number;
  depositPaid: boolean;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  artisan?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    businessName?: string;
  };
  address: {
    street: string;
    city: string;
    postalCode: string;
  };
  createdAt: string;
  updatedAt: string;
  scheduledDate?: string;
  completedAt?: string;
  validatedAt?: string;
}

export interface MissionStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  validated: number;
  cancelled: number;
  disputed: number;
  byCategory: Record<string, number>;
  byUrgency: Record<string, number>;
}

// Audit Log Types
export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent?: string;
  createdAt: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogResponse {
  data: AuditLog[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Dispute Types
export enum DisputeStatus {
  OPEN = 'OPEN',
  IN_REVIEW = 'IN_REVIEW',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED',
}

export enum DisputePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface Dispute {
  id: string;
  missionId: string;
  userId: string;
  reason: string;
  description: string;
  status: DisputeStatus;
  priority: DisputePriority;
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  mission?: {
    id: string;
    title: string;
    status: string;
    agreedPrice?: number;
  };
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface ResolveDisputeDto {
  resolution: string;
}

// Verification Types
export interface VerificationStatus {
  verified: boolean;
  verificationDate?: string;
  businessName?: string;
  registrationNumber?: string;
  registrationType?: string;
  status: 'VERIFIED' | 'UNVERIFIED' | 'PENDING' | 'FAILED';
  lastCheck?: string;
  nextCheckDue?: string;
}

export interface UnverifiedArtisan {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  businessName?: string;
  registrationNumber?: string;
  registrationType?: string;
  createdAt: string;
  verificationStatus?: string;
}

export interface KycStatus {
  userId: string;
  kycVerified: boolean;
  kycLevel?: string;
  verificationDate?: string;
  documents?: Array<{
    type: string;
    status: string;
    uploadedAt: string;
  }>;
}

// No-Show Types
export enum NoShowStatus {
  PENDING = 'PENDING',
  VALIDATED = 'VALIDATED',
  REJECTED = 'REJECTED',
}

export interface NoShowEvent {
  id: string;
  missionId: string;
  artisanId: string;
  clientId: string;
  status: NoShowStatus;
  reportedAt: string;
  validatedAt?: string;
  validatedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  evidence: {
    waitTime: number; // minutes waited
    contactAttempts: number;
    gpsVerified: boolean;
    photos?: string[];
    notes?: string;
  };
  compensation?: {
    artisanAmount: number;
    clientPenalty: number;
  };
  mission?: {
    id: string;
    title: string;
    scheduledDate?: string;
    address?: {
      street: string;
      city: string;
      postalCode: string;
    };
  };
  artisan?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

// Certification Types
export interface Certification {
  id: string;
  artisanUserId: string;
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expiryDate?: string;
  certificateNumber?: string;
  documentUrl?: string;
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
  artisan?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

// Specialty Types
export interface Specialty {
  id: string;
  name: string;
  category: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    artisans: number;
  };
}

export interface CreateSpecialtyDto {
  name: string;
  category: string;
  description?: string;
  icon?: string;
}

export interface UpdateSpecialtyDto {
  name?: string;
  category?: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
}

// Reputation Types
export interface UserReputation {
  userId: string;
  score: number;
  level: string;
  totalMissions: number;
  completedMissions: number;
  cancelledMissions: number;
  noShowCount: number;
  averageRating: number;
  reviewCount: number;
  lastUpdated: string;
}

export interface ReputationAdjustment {
  userId: string;
  adjustment: number;
  reason: string;
  adjustedBy?: string;
  adjustedAt?: string;
}

// Platform Configuration Types
export interface PlatformConfig {
  id: string;
  fees: FeeSettings;
  payments: PaymentSettings;
  rateLimits: RateLimitSettings;
  reputationRules: ReputationRules;
  noShow: NoShowConfig;
  tax: TaxSettings;
  notifications: NotificationSettings;
  integrations: IntegrationSettings;
  contentModeration: ContentModerationSettings;
  compliance: ComplianceSettings;
  missions: MissionSettings;
  users: UserProfileSettings;
  performance: PerformanceSettings;
  updatedAt: string;
  updatedBy?: string;
}

export interface FeeSettings {
  platformCommissionRate: number; // percentage (e.g., 15 for 15%)
  minCommissionAmount: number; // in cents
  maxCommissionAmount: number; // in cents
  depositPercentage: number; // percentage of mission cost
  depositMinimum: number; // minimum deposit in cents
  depositMaximum: number; // maximum deposit in cents
  urgentMissionMultiplier: number; // multiplier for urgent missions
  weekendMultiplier: number; // multiplier for weekend missions
  holidayMultiplier: number; // multiplier for holiday missions
  cancellationFeePercentage: number; // percentage charged on cancellation
  lateCancellationHours: number; // hours before mission for late cancellation
  lateCancellationFeePercentage: number; // higher fee for late cancellation
  artisanPayoutPercentage: number; // percentage artisan receives
  referralBonusAmount: number; // bonus for referrals in cents
  firstMissionDiscount: number; // percentage discount for first mission
}

export interface PaymentSettings {
  stripeEnabled: boolean;
  paypalEnabled: boolean;
  bankTransferEnabled: boolean;
  walletEnabled: boolean;
  minPaymentAmount: number; // in cents
  maxPaymentAmount: number; // in cents
  payoutDelayDays: number; // days before artisan payout
  autoPayoutEnabled: boolean;
  autoPayoutThreshold: number; // minimum balance for auto-payout
  refundWindowDays: number; // days after payment for refund eligibility
  partialRefundEnabled: boolean;
  instantPayoutEnabled: boolean;
  instantPayoutFeePercentage: number;
  holdFundsForDisputes: boolean;
  escrowDurationHours: number; // hours funds are held in escrow
  paymentRetryAttempts: number;
  paymentRetryDelayMinutes: number;
  failedPaymentNotification: boolean;
}

export interface RateLimitSettings {
  apiRateLimit: number; // requests per minute
  apiRateLimitWindow: number; // window in minutes
  loginAttemptsLimit: number; // max login attempts
  loginLockoutMinutes: number; // lockout duration
  passwordResetLimit: number; // resets per day
  missionCreationLimit: number; // missions per day per user
  messageLimit: number; // messages per hour
  reviewLimit: number; // reviews per day
  reportLimit: number; // reports per day
  fileUploadLimit: number; // uploads per hour
  fileUploadMaxSizeMb: number; // max file size in MB
  searchRequestsLimit: number; // searches per minute
  ipBlocklistEnabled: boolean;
  geoBlockingEnabled: boolean;
  blockedCountries: string[];
  allowedCountries: string[];
  captchaEnabled: boolean;
  captchaThreshold: number; // suspicious activity score to trigger captcha
}

export interface ReputationRules {
  initialScore: number; // starting reputation score
  maxScore: number; // maximum possible score
  minScore: number; // minimum possible score
  completedMissionBonus: number; // points for completing a mission
  fiveStarReviewBonus: number; // points for 5-star review
  fourStarReviewBonus: number; // points for 4-star review
  threeStarReviewBonus: number; // points for 3-star review
  twoStarReviewPenalty: number; // penalty for 2-star review
  oneStarReviewPenalty: number; // penalty for 1-star review
  noShowPenalty: number; // penalty for no-show
  cancellationPenalty: number; // penalty for cancellation
  lateCancellationPenalty: number; // penalty for late cancellation
  disputeLossPenalty: number; // penalty for losing dispute
  disputeWinBonus: number; // bonus for winning dispute
  verificationBonus: number; // bonus for verification
  responseTimeBonus: number; // bonus for fast response
  streakBonus: number; // bonus for consecutive completed missions
  streakThreshold: number; // missions needed for streak bonus
  inactivityPenalty: number; // penalty per month of inactivity
  inactivityThresholdDays: number; // days before considered inactive
  goldThreshold: number; // score needed for gold status
  silverThreshold: number; // score needed for silver status
  bronzeThreshold: number; // score needed for bronze status
  trustedThreshold: number; // score needed for trusted status
  warningThreshold: number; // score triggering warning status
}

export interface NoShowConfig {
  enabled: boolean;
  minimumWaitTimeMinutes: number; // how long artisan must wait
  gpsVerificationRequired: boolean;
  gpsRadiusMeters: number; // how close to location
  photoEvidenceRequired: boolean;
  minContactAttempts: number; // minimum contact attempts required
  compensationPercentage: number; // percentage of mission value
  compensationMinimum: number; // minimum compensation in cents
  compensationMaximum: number; // maximum compensation in cents
  clientPenaltyPercentage: number; // penalty charged to client
  autoValidationEnabled: boolean; // auto-validate with sufficient evidence
  autoValidationRequirements: {
    minWaitTime: number;
    gpsVerified: boolean;
    minContactAttempts: number;
  };
  disputeWindowHours: number; // hours client has to dispute
  repeatOffenderThreshold: number; // no-shows before escalation
  repeatOffenderPenaltyMultiplier: number; // penalty multiplier
}

export interface TaxSettings {
  vatEnabled: boolean;
  defaultVatRate: number; // default VAT rate percentage
  vatRates: Array<{
    country: string;
    rate: number;
    reducedRate?: number;
    superReducedRate?: number;
  }>;
  vatExemptCategories: string[]; // mission categories exempt from VAT
  reverseChargeEnabled: boolean; // for B2B transactions
  invoiceNumberPrefix: string;
  invoiceNumberFormat: string; // e.g., "INV-{YEAR}-{NUMBER}"
  autoGenerateInvoices: boolean;
  invoiceRetentionYears: number;
  taxReportingEnabled: boolean;
  taxReportingThreshold: number; // threshold for tax reporting
  witholdingTaxEnabled: boolean;
  witholdingTaxRate: number;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  missionCreatedNotify: boolean;
  missionAcceptedNotify: boolean;
  missionCompletedNotify: boolean;
  missionCancelledNotify: boolean;
  paymentReceivedNotify: boolean;
  paymentFailedNotify: boolean;
  payoutProcessedNotify: boolean;
  newMessageNotify: boolean;
  newReviewNotify: boolean;
  disputeOpenedNotify: boolean;
  disputeResolvedNotify: boolean;
  verificationStatusNotify: boolean;
  promotionalEmailsEnabled: boolean;
  weeklyDigestEnabled: boolean;
  marketingOptInDefault: boolean;
  reminderBeforeMissionHours: number; // hours before mission to send reminder
  followUpAfterMissionHours: number; // hours after mission for follow-up
  inactivityReminderDays: number; // days before sending inactivity reminder
  maxEmailsPerDay: number;
  maxSmsPerDay: number;
  quietHoursStart: string; // e.g., "22:00"
  quietHoursEnd: string; // e.g., "08:00"
  respectQuietHours: boolean;
}

export interface IntegrationSettings {
  stripePublicKey: string;
  stripeWebhookEnabled: boolean;
  googleMapsEnabled: boolean;
  googleMapsApiKey: string;
  twilioEnabled: boolean;
  twilioSmsEnabled: boolean;
  twilioVoiceEnabled: boolean;
  sendgridEnabled: boolean;
  firebaseEnabled: boolean;
  firebasePushEnabled: boolean;
  sentryEnabled: boolean;
  sentryDsn?: string;
  analyticsEnabled: boolean;
  googleAnalyticsId?: string;
  intercomEnabled: boolean;
  intercomAppId?: string;
  slackWebhookEnabled: boolean;
  slackWebhookUrl?: string;
  slackAlertChannel?: string;
  zapierEnabled: boolean;
  apiWebhooksEnabled: boolean;
  webhookRetryAttempts: number;
  webhookTimeoutSeconds: number;
}

export interface ContentModerationSettings {
  autoModerationEnabled: boolean;
  profanityFilterEnabled: boolean;
  profanityFilterStrength: 'LOW' | 'MEDIUM' | 'HIGH';
  customBannedWords: string[];
  spamDetectionEnabled: boolean;
  spamScoreThreshold: number;
  imagesModerationEnabled: boolean;
  imagesModerationProvider: string;
  linkFilterEnabled: boolean;
  allowedDomains: string[];
  maxLinksPerMessage: number;
  duplicateContentCheck: boolean;
  minReviewLength: number;
  maxReviewLength: number;
  minDescriptionLength: number;
  maxDescriptionLength: number;
  requireReviewForPublish: boolean;
  autoApproveVerifiedUsers: boolean;
  flagThresholdForReview: number; // reports needed for manual review
  autoHideAfterFlags: number; // flags to auto-hide content
  appealWindowDays: number; // days to appeal moderation decision
}

export interface ComplianceSettings {
  gdprEnabled: boolean;
  gdprDataRetentionDays: number;
  gdprRightToErasure: boolean;
  gdprDataPortability: boolean;
  gdprConsentRequired: boolean;
  gdprCookieConsentRequired: boolean;
  ccpaEnabled: boolean;
  ccpaDoNotSellEnabled: boolean;
  ageVerificationRequired: boolean;
  minimumAge: number;
  termsVersion: string;
  termsLastUpdated: string;
  privacyPolicyVersion: string;
  privacyPolicyLastUpdated: string;
  requiredDocuments: string[];
  documentExpiryCheckEnabled: boolean;
  documentExpiryReminderDays: number;
  amlCheckRequired: boolean;
  amlCheckProvider?: string;
  amlCheckThreshold: number; // transaction amount triggering AML check
  pep_screening_enabled: boolean;
  sanctionsListCheckEnabled: boolean;
  dataEncryptionAtRest: boolean;
  dataEncryptionInTransit: boolean;
  auditLoggingEnabled: boolean;
  auditLogRetentionDays: number;
}

export interface MissionSettings {
  minMissionValue: number; // in cents
  maxMissionValue: number; // in cents
  maxActiveMissionsPerClient: number;
  maxActiveMissionsPerArtisan: number;
  autoMatchingEnabled: boolean;
  autoMatchingRadius: number; // km
  autoMatchingMaxCandidates: number;
  quotationValidityDays: number;
  quotationMaxRevisions: number;
  negotiationEnabled: boolean;
  maxNegotiationRounds: number;
  negotiationTimeoutHours: number;
  depositRequired: boolean;
  depositRefundableUntilHours: number; // hours before mission
  autoValidationEnabled: boolean;
  autoValidationDelayHours: number; // hours after completion
  clientValidationWindowHours: number;
  allowRescheduling: boolean;
  maxReschedulesPerMission: number;
  reschedulingDeadlineHours: number;
  cancellationPolicy: 'FLEXIBLE' | 'MODERATE' | 'STRICT';
  categories: string[];
  urgencyLevels: Array<{ name: string; multiplier: number; maxResponseHours: number }>;
  workingHoursStart: string; // e.g., "08:00"
  workingHoursEnd: string; // e.g., "20:00"
  weekendMissionsAllowed: boolean;
  holidayMissionsAllowed: boolean;
}

export interface UserProfileSettings {
  requireEmailVerification: boolean;
  requirePhoneVerification: boolean;
  allowUsernameChange: boolean;
  usernameChangeLimit: number; // changes per year
  profilePhotoRequired: boolean;
  profilePhotoModeration: boolean;
  bioMaxLength: number;
  displayNameMaxLength: number;
  allowAnonymousProfiles: boolean;
  showOnlineStatus: boolean;
  showLastActive: boolean;
  allowProfileHiding: boolean;
  artisanRequirements: {
    businessVerificationRequired: boolean;
    insuranceRequired: boolean;
    minCertifications: number;
    portfolioRequired: boolean;
    minPortfolioItems: number;
  };
  clientRequirements: {
    addressRequired: boolean;
    phoneRequired: boolean;
    identityVerificationRequired: boolean;
  };
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
  passwordExpiryDays: number; // 0 = never expires
  sessionTimeoutMinutes: number;
  maxConcurrentSessions: number;
  twoFactorAuthRequired: boolean;
  twoFactorAuthMethods: string[]; // ['sms', 'authenticator', 'email']
  accountDeletionEnabled: boolean;
  accountDeletionCooldownDays: number;
}

export interface PerformanceSettings {
  cacheEnabled: boolean;
  cacheTtlSeconds: number;
  cacheMaxSize: number; // in MB
  cdnEnabled: boolean;
  cdnUrl?: string;
  imageOptimizationEnabled: boolean;
  imageMaxWidth: number;
  imageMaxHeight: number;
  imageQuality: number; // 1-100
  lazyLoadingEnabled: boolean;
  paginationDefaultLimit: number;
  paginationMaxLimit: number;
  searchIndexEnabled: boolean;
  searchIndexRefreshMinutes: number;
  databaseConnectionPoolSize: number;
  databaseQueryTimeout: number; // in ms
  backgroundJobsEnabled: boolean;
  backgroundJobConcurrency: number;
  rateLimitingEnabled: boolean;
  requestTimeoutMs: number;
  enableCompression: boolean;
  compressionLevel: number; // 1-9
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  logRetentionDays: number;
  metricsEnabled: boolean;
  metricsCollectionInterval: number; // in seconds
  healthCheckEnabled: boolean;
  healthCheckInterval: number; // in seconds
}

export interface DashboardStats {
  totalUsers: number;
  totalClients: number;
  totalArtisans: number;
  totalMissions: number;
  pendingMissions: number;
  completedMissions: number;
  totalRevenue: number;
  platformRevenue: number;
  activeUsers30d: number;
  newUsers7d: number;
}

export interface UserWithStats {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified: boolean;
  suspended: boolean;
  createdAt: string;
  lastLoginAt?: string;
  _count?: {
    missions: number;
    reviews: number;
  };
}

export interface BusinessMetrics {
  revenue: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    growth: number;
  };
  missions: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    completionRate: number;
    averageValue: number;
  };
  users: {
    total: number;
    clients: number;
    artisans: number;
    newToday: number;
    newThisWeek: number;
    activeUsers: number;
  };
  payments: {
    successRate: number;
    totalTransactions: number;
    averageTransaction: number;
    failedTransactions: number;
  };
  disputes: {
    total: number;
    pending: number;
    resolved: number;
    resolutionRate: number;
    averageResolutionTime: number;
  };
  noShows: {
    total: number;
    validated: number;
    rejected: number;
    pending: number;
    validationRate: number;
  };
}

export interface TimeSeriesData {
  date: string;
  revenue: number;
  missions: number;
  newUsers: number;
}

export interface TopArtisan {
  id: string;
  name: string;
  completedMissions: number;
  rating: number;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedType: string;
  reportedId: string;
  reason: string;
  description: string;
  status: string;
  createdAt: string;
  reporter: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export const adminApi = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get('/admin/dashboard/stats');
    return response.data;
  },

  // Analytics
  getBusinessMetrics: async (): Promise<BusinessMetrics> => {
    const response = await apiClient.get('/admin/analytics/metrics');
    return response.data.data;
  },

  getTimeSeriesData: async (days: number = 30): Promise<TimeSeriesData[]> => {
    const response = await apiClient.get('/admin/analytics/time-series', {
      params: { days },
    });
    return response.data.data;
  },

  getTopArtisans: async (limit: number = 10): Promise<TopArtisan[]> => {
    const response = await apiClient.get('/admin/analytics/top-artisans', {
      params: { limit },
    });
    return response.data.data;
  },

  // Users
  getUsers: async (filters?: {
    role?: string;
    suspended?: boolean;
    search?: string;
  }): Promise<UserWithStats[]> => {
    const response = await apiClient.get('/admin/users', { params: filters });
    return response.data;
  },

  suspendUser: async (userId: string, reason: string): Promise<void> => {
    await apiClient.post(`/admin/users/${userId}/suspend`, { reason });
  },

  unsuspendUser: async (userId: string): Promise<void> => {
    await apiClient.post(`/admin/users/${userId}/unsuspend`);
  },

  getUserDetails: async (userId: string): Promise<Record<string, unknown>> => {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return response.data;
  },

  getMissionStats: async (): Promise<Record<string, unknown>> => {
    const response = await apiClient.get('/admin/missions/stats');
    return response.data;
  },

  // Moderation
  getReports: async (filters?: { status?: string; type?: string }): Promise<Report[]> => {
    const response = await apiClient.get('/admin/moderation/reports', {
      params: filters,
    });
    return response.data;
  },

  resolveReport: async (reportId: string, action: string, resolution: string): Promise<void> => {
    await apiClient.post(`/admin/moderation/reports/${reportId}/resolve`, {
      action,
      resolution,
    });
  },

  deleteReport: async (reportId: string): Promise<void> => {
    await apiClient.delete(`/admin/moderation/reports/${reportId}`);
  },

  // Fraud Settings
  getFraudSettings: async (): Promise<FraudProtectionConfig> => {
    const response = await apiClient.get('/admin/fraud-settings');
    return response.data;
  },

  getFraudSettingsStatus: async (): Promise<FraudSettingsStatus> => {
    const response = await apiClient.get('/admin/fraud-settings/status');
    return response.data;
  },

  updateFraudSettings: async (
    updates: Partial<FraudProtectionConfig>,
  ): Promise<FraudProtectionConfig> => {
    const response = await apiClient.put('/admin/fraud-settings', updates);
    return response.data;
  },

  toggleMultiAccountDetection: async (enabled: boolean): Promise<FraudProtectionConfig> => {
    const response = await apiClient.put('/admin/fraud-settings/multi-account/toggle', {
      enabled,
    });
    return response.data;
  },

  toggleReviewFraudDetection: async (enabled: boolean): Promise<FraudProtectionConfig> => {
    const response = await apiClient.put('/admin/fraud-settings/review-fraud/toggle', { enabled });
    return response.data;
  },

  togglePayoutFraudScreening: async (enabled: boolean): Promise<FraudProtectionConfig> => {
    const response = await apiClient.put('/admin/fraud-settings/payout-fraud/toggle', { enabled });
    return response.data;
  },

  togglePriceAnomalyDetection: async (enabled: boolean): Promise<FraudProtectionConfig> => {
    const response = await apiClient.put('/admin/fraud-settings/price-anomaly/toggle', {
      enabled,
    });
    return response.data;
  },

  toggleRefundAbuseDetection: async (enabled: boolean): Promise<FraudProtectionConfig> => {
    const response = await apiClient.put('/admin/fraud-settings/refund-abuse/toggle', { enabled });
    return response.data;
  },

  toggleSessionAnomalyDetection: async (enabled: boolean): Promise<FraudProtectionConfig> => {
    const response = await apiClient.put('/admin/fraud-settings/session-anomaly/toggle', {
      enabled,
    });
    return response.data;
  },

  toggleKyc: async (enabled: boolean): Promise<FraudProtectionConfig> => {
    const response = await apiClient.put('/admin/fraud-settings/kyc/toggle', { enabled });
    return response.data;
  },

  toggleBotDetection: async (enabled: boolean): Promise<FraudProtectionConfig> => {
    const response = await apiClient.put('/admin/fraud-settings/bot-detection/toggle', { enabled });
    return response.data;
  },

  toggleBusinessVerification: async (enabled: boolean): Promise<FraudProtectionConfig> => {
    const response = await apiClient.put('/admin/fraud-settings/business-verification/toggle', {
      enabled,
    });
    return response.data;
  },

  // Monitoring
  getMonitoringDashboard: async (): Promise<MonitoringDashboard> => {
    const response = await apiClient.get('/admin/monitoring/dashboard');
    return response.data;
  },

  getMonitoringHealth: async (): Promise<MonitoringHealthStatus> => {
    const response = await apiClient.get('/admin/monitoring/health');
    return response.data;
  },

  getMonitoringAlerts: async (): Promise<MonitoringAlerts> => {
    const response = await apiClient.get('/admin/monitoring/alerts');
    return response.data;
  },

  getAutoValidationChart: async (days: number = 30): Promise<ChartData> => {
    const response = await apiClient.get('/admin/monitoring/auto-validation/chart', {
      params: { days },
    });
    return response.data;
  },

  getMonitoringOverview: async (): Promise<{ overview: MonitoringDashboard['overview'] }> => {
    const response = await apiClient.get('/admin/monitoring/metrics/overview');
    return response.data;
  },

  getMonitoringTrends: async (): Promise<{ trends: MonitoringDashboard['trends'] }> => {
    const response = await apiClient.get('/admin/monitoring/metrics/trends');
    return response.data;
  },

  // CRON Jobs
  getCronJobsStatus: async (): Promise<CronJobsStatus> => {
    const response = await apiClient.get('/admin/cron/status');
    return response.data;
  },

  getCronHealth: async (): Promise<CronHealth> => {
    const response = await apiClient.get('/admin/cron/health');
    return response.data;
  },

  triggerAutoValidation: async (): Promise<AutoValidationResult> => {
    const response = await apiClient.post('/admin/cron/trigger/auto-validate');
    return response.data;
  },

  // Feature Flags
  getFeatureFlags: async (): Promise<FeatureFlag[]> => {
    const response = await apiClient.get('/admin/feature-flags');
    return response.data;
  },

  getFeatureFlag: async (key: string): Promise<FeatureFlag | null> => {
    const response = await apiClient.get(`/admin/feature-flags/${key}`);
    return response.data;
  },

  createFeatureFlag: async (dto: CreateFeatureFlagDto): Promise<FeatureFlag> => {
    const response = await apiClient.post('/admin/feature-flags', dto);
    return response.data;
  },

  updateFeatureFlag: async (key: string, dto: UpdateFeatureFlagDto): Promise<FeatureFlag> => {
    const response = await apiClient.put(`/admin/feature-flags/${key}`, dto);
    return response.data;
  },

  deleteFeatureFlag: async (key: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete(`/admin/feature-flags/${key}`);
    return response.data;
  },

  enableFeatureFlag: async (key: string): Promise<FeatureFlag> => {
    const response = await apiClient.post(`/admin/feature-flags/${key}/enable`);
    return response.data;
  },

  disableFeatureFlag: async (key: string): Promise<FeatureFlag> => {
    const response = await apiClient.post(`/admin/feature-flags/${key}/disable`);
    return response.data;
  },

  // Audit Logs
  getAuditLogs: async (filters?: AuditLogFilters): Promise<AuditLogResponse> => {
    const response = await apiClient.get('/admin/audit-logs', { params: filters });
    return response.data;
  },

  getAuditLog: async (id: string): Promise<AuditLog> => {
    const response = await apiClient.get(`/admin/audit-logs/${id}`);
    return response.data;
  },

  // Disputes
  getDisputes: async (filters?: {
    status?: DisputeStatus;
    priority?: DisputePriority;
  }): Promise<Dispute[]> => {
    const response = await apiClient.get('/disputes', { params: filters });
    return response.data;
  },

  getDispute: async (id: string): Promise<Dispute> => {
    const response = await apiClient.get(`/disputes/${id}`);
    return response.data;
  },

  resolveDispute: async (id: string, dto: ResolveDisputeDto): Promise<Dispute> => {
    const response = await apiClient.post(`/disputes/${id}/resolve`, dto);
    return response.data;
  },

  // Verification / KYC
  getUnverifiedArtisans: async (): Promise<UnverifiedArtisan[]> => {
    const response = await apiClient.get('/verification/admin/unverified');
    return response.data;
  },

  getArtisansNeedingReverification: async (): Promise<UnverifiedArtisan[]> => {
    const response = await apiClient.get('/verification/admin/reverification-needed');
    return response.data;
  },

  getArtisanVerificationStatus: async (artisanId: string): Promise<VerificationStatus> => {
    const response = await apiClient.get(`/verification/artisan/${artisanId}/status`);
    return response.data;
  },

  reverifyArtisan: async (artisanId: string): Promise<VerificationStatus> => {
    const response = await apiClient.post(`/verification/artisan/${artisanId}/reverify`);
    return response.data;
  },

  getKycStatus: async (userId: string): Promise<KycStatus> => {
    const response = await apiClient.get(`/compliance/kyc/status/${userId}`);
    return response.data;
  },

  // No-Show Management
  getPendingNoShows: async (): Promise<NoShowEvent[]> => {
    const response = await apiClient.get('/payments/no-show/pending');
    return response.data;
  },

  validateNoShow: async (noShowEventId: string): Promise<NoShowEvent> => {
    const response = await apiClient.post('/payments/no-show/validate', { noShowEventId });
    return response.data;
  },

  rejectNoShow: async (noShowEventId: string, reason: string): Promise<NoShowEvent> => {
    const response = await apiClient.post('/payments/no-show/reject', { noShowEventId, reason });
    return response.data;
  },

  getNoShowsByMission: async (missionId: string): Promise<NoShowEvent[]> => {
    const response = await apiClient.get(`/payments/no-show/mission/${missionId}`);
    return response.data;
  },

  // Certification Management
  getCertifications: async (artisanUserId?: string): Promise<Certification[]> => {
    const response = await apiClient.get('/certifications', {
      params: artisanUserId ? { artisanUserId } : undefined,
    });
    return response.data;
  },

  getCertification: async (id: string): Promise<Certification> => {
    const response = await apiClient.get(`/certifications/${id}`);
    return response.data;
  },

  verifyCertification: async (id: string): Promise<Certification> => {
    const response = await apiClient.post(`/certifications/${id}/verify`);
    return response.data;
  },

  unverifyCertification: async (id: string): Promise<Certification> => {
    const response = await apiClient.post(`/certifications/${id}/unverify`);
    return response.data;
  },

  // Specialty Management
  getSpecialties: async (category?: string): Promise<Specialty[]> => {
    const response = await apiClient.get('/specialties', {
      params: category ? { category } : undefined,
    });
    return response.data;
  },

  getSpecialtyCategories: async (): Promise<string[]> => {
    const response = await apiClient.get('/specialties/categories');
    return response.data;
  },

  createSpecialty: async (dto: CreateSpecialtyDto): Promise<Specialty> => {
    const response = await apiClient.post('/specialties', dto);
    return response.data;
  },

  updateSpecialty: async (id: string, dto: UpdateSpecialtyDto): Promise<Specialty> => {
    const response = await apiClient.put(`/specialties/${id}`, dto);
    return response.data;
  },

  deleteSpecialty: async (id: string): Promise<void> => {
    await apiClient.delete(`/specialties/${id}`);
  },

  // Reputation Management
  getUserReputation: async (userId: string): Promise<UserReputation> => {
    const response = await apiClient.get(`/reputation/${userId}`);
    return response.data;
  },

  adjustReputation: async (
    userId: string,
    adjustment: number,
    reason: string,
  ): Promise<UserReputation> => {
    const response = await apiClient.post('/reputation/adjust', {
      userId,
      adjustment,
      reason,
    });
    return response.data;
  },

  // Platform Configuration
  getPlatformConfig: async (): Promise<PlatformConfig> => {
    const response = await apiClient.get('/admin/platform-config');
    return response.data;
  },

  updatePlatformConfig: async (updates: Partial<PlatformConfig>): Promise<PlatformConfig> => {
    const response = await apiClient.put('/admin/platform-config', updates);
    return response.data;
  },

  // Fee Settings
  getFeeSettings: async (): Promise<FeeSettings> => {
    const response = await apiClient.get('/admin/platform-config/fees');
    return response.data;
  },

  updateFeeSettings: async (settings: Partial<FeeSettings>): Promise<FeeSettings> => {
    const response = await apiClient.put('/admin/platform-config/fees', settings);
    return response.data;
  },

  // Payment Settings
  getPaymentSettings: async (): Promise<PaymentSettings> => {
    const response = await apiClient.get('/admin/platform-config/payments');
    return response.data;
  },

  updatePaymentSettings: async (settings: Partial<PaymentSettings>): Promise<PaymentSettings> => {
    const response = await apiClient.put('/admin/platform-config/payments', settings);
    return response.data;
  },

  // Rate Limit Settings
  getRateLimitSettings: async (): Promise<RateLimitSettings> => {
    const response = await apiClient.get('/admin/platform-config/rate-limits');
    return response.data;
  },

  updateRateLimitSettings: async (
    settings: Partial<RateLimitSettings>,
  ): Promise<RateLimitSettings> => {
    const response = await apiClient.put('/admin/platform-config/rate-limits', settings);
    return response.data;
  },

  // Reputation Rules
  getReputationRules: async (): Promise<ReputationRules> => {
    const response = await apiClient.get('/admin/platform-config/reputation-rules');
    return response.data;
  },

  updateReputationRules: async (rules: Partial<ReputationRules>): Promise<ReputationRules> => {
    const response = await apiClient.put('/admin/platform-config/reputation-rules', rules);
    return response.data;
  },

  // No-Show Configuration
  getNoShowConfig: async (): Promise<NoShowConfig> => {
    const response = await apiClient.get('/admin/platform-config/no-show');
    return response.data;
  },

  updateNoShowConfig: async (config: Partial<NoShowConfig>): Promise<NoShowConfig> => {
    const response = await apiClient.put('/admin/platform-config/no-show', config);
    return response.data;
  },

  // Tax/VAT Settings
  getTaxSettings: async (): Promise<TaxSettings> => {
    const response = await apiClient.get('/admin/platform-config/tax');
    return response.data;
  },

  updateTaxSettings: async (settings: Partial<TaxSettings>): Promise<TaxSettings> => {
    const response = await apiClient.put('/admin/platform-config/tax', settings);
    return response.data;
  },

  // Notification Settings
  getNotificationSettings: async (): Promise<NotificationSettings> => {
    const response = await apiClient.get('/admin/platform-config/notifications');
    return response.data;
  },

  updateNotificationSettings: async (
    settings: Partial<NotificationSettings>,
  ): Promise<NotificationSettings> => {
    const response = await apiClient.put('/admin/platform-config/notifications', settings);
    return response.data;
  },

  // Integration Settings
  getIntegrationSettings: async (): Promise<IntegrationSettings> => {
    const response = await apiClient.get('/admin/platform-config/integrations');
    return response.data;
  },

  updateIntegrationSettings: async (
    settings: Partial<IntegrationSettings>,
  ): Promise<IntegrationSettings> => {
    const response = await apiClient.put('/admin/platform-config/integrations', settings);
    return response.data;
  },

  // Content Moderation Settings
  getContentModerationSettings: async (): Promise<ContentModerationSettings> => {
    const response = await apiClient.get('/admin/platform-config/content-moderation');
    return response.data;
  },

  updateContentModerationSettings: async (
    settings: Partial<ContentModerationSettings>,
  ): Promise<ContentModerationSettings> => {
    const response = await apiClient.put('/admin/platform-config/content-moderation', settings);
    return response.data;
  },

  // Compliance Settings
  getComplianceSettings: async (): Promise<ComplianceSettings> => {
    const response = await apiClient.get('/admin/platform-config/compliance');
    return response.data;
  },

  updateComplianceSettings: async (
    settings: Partial<ComplianceSettings>,
  ): Promise<ComplianceSettings> => {
    const response = await apiClient.put('/admin/platform-config/compliance', settings);
    return response.data;
  },

  // Mission Settings
  getMissionSettings: async (): Promise<MissionSettings> => {
    const response = await apiClient.get('/admin/platform-config/missions');
    return response.data;
  },

  updateMissionSettings: async (settings: Partial<MissionSettings>): Promise<MissionSettings> => {
    const response = await apiClient.put('/admin/platform-config/missions', settings);
    return response.data;
  },

  // User Settings
  getUserSettings: async (): Promise<UserProfileSettings> => {
    const response = await apiClient.get('/admin/platform-config/users');
    return response.data;
  },

  updateUserSettings: async (
    settings: Partial<UserProfileSettings>,
  ): Promise<UserProfileSettings> => {
    const response = await apiClient.put('/admin/platform-config/users', settings);
    return response.data;
  },

  // Performance Settings
  getPerformanceSettings: async (): Promise<PerformanceSettings> => {
    const response = await apiClient.get('/admin/platform-config/performance');
    return response.data;
  },

  updatePerformanceSettings: async (
    settings: Partial<PerformanceSettings>,
  ): Promise<PerformanceSettings> => {
    const response = await apiClient.put('/admin/platform-config/performance', settings);
    return response.data;
  },
};
