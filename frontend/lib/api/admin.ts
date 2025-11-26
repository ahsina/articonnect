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
  getReports: async (filters?: {
    status?: string;
    type?: string;
  }): Promise<Report[]> => {
    const response = await apiClient.get('/admin/moderation/reports', {
      params: filters,
    });
    return response.data;
  },

  resolveReport: async (
    reportId: string,
    action: string,
    resolution: string,
  ): Promise<void> => {
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
};
