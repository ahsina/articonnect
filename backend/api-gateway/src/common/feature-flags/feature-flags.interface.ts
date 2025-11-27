/**
 * Feature flags types and interfaces
 */

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

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  type: FeatureFlagType;
  status: FeatureFlagStatus;
  value: FeatureFlagValue;
  metadata?: FeatureFlagMetadata;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export type FeatureFlagValue =
  | BooleanFlagValue
  | PercentageFlagValue
  | UserListFlagValue
  | EnvironmentFlagValue;

export interface BooleanFlagValue {
  enabled: boolean;
}

export interface PercentageFlagValue {
  percentage: number; // 0-100
  enabled: boolean;
}

export interface UserListFlagValue {
  enabled: boolean;
  allowedUsers: string[];
  allowedRoles?: string[];
}

export interface EnvironmentFlagValue {
  enabled: boolean;
  environments: {
    development?: boolean;
    staging?: boolean;
    production?: boolean;
    test?: boolean;
    [key: string]: boolean | undefined; // Allow custom environments
  };
}

export interface FeatureFlagMetadata {
  tags?: string[];
  owner?: string;
  jiraTicket?: string;
  expiresAt?: Date;
  notes?: string;
}

export interface FeatureFlagContext {
  userId?: string;
  userRole?: string;
  environment?: string;
  sessionId?: string;
  attributes?: Record<string, any>;
}

export interface FeatureFlagEvaluationResult {
  key: string;
  enabled: boolean;
  reason: EvaluationReason;
  variant?: string;
}

export enum EvaluationReason {
  FLAG_NOT_FOUND = 'FLAG_NOT_FOUND',
  FLAG_INACTIVE = 'FLAG_INACTIVE',
  DEFAULT_VALUE = 'DEFAULT_VALUE',
  BOOLEAN_MATCH = 'BOOLEAN_MATCH',
  PERCENTAGE_MATCH = 'PERCENTAGE_MATCH',
  PERCENTAGE_NO_MATCH = 'PERCENTAGE_NO_MATCH',
  USER_ALLOWED = 'USER_ALLOWED',
  USER_NOT_ALLOWED = 'USER_NOT_ALLOWED',
  ROLE_ALLOWED = 'ROLE_ALLOWED',
  ENVIRONMENT_MATCH = 'ENVIRONMENT_MATCH',
  ENVIRONMENT_NO_MATCH = 'ENVIRONMENT_NO_MATCH',
  ERROR = 'ERROR',
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

export interface FeatureFlagsModuleOptions {
  cacheEnabled?: boolean;
  cacheTtl?: number; // seconds
  defaultValue?: boolean;
  redisKeyPrefix?: string;
}

export const DEFAULT_OPTIONS: FeatureFlagsModuleOptions = {
  cacheEnabled: true,
  cacheTtl: 60, // 1 minute
  defaultValue: false,
  redisKeyPrefix: 'feature_flags:',
};
