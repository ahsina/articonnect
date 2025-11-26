import { Injectable, Logger, OnModuleInit, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FeatureFlag,
  FeatureFlagType,
  FeatureFlagStatus,
  FeatureFlagContext,
  FeatureFlagEvaluationResult,
  EvaluationReason,
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  FeatureFlagsModuleOptions,
  DEFAULT_OPTIONS,
  BooleanFlagValue,
  PercentageFlagValue,
  UserListFlagValue,
  EnvironmentFlagValue,
} from './feature-flags.interface';
import { createHash } from 'crypto';

export const FEATURE_FLAGS_OPTIONS = 'FEATURE_FLAGS_OPTIONS';

@Injectable()
export class FeatureFlagsService implements OnModuleInit {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private readonly options: FeatureFlagsModuleOptions;
  private readonly environment: string;

  // In-memory store for flags (can be replaced with database)
  private flags: Map<string, FeatureFlag> = new Map();

  // Redis client (optional dependency)
  private redisClient: any;

  constructor(
    private configService: ConfigService,
    @Optional() @Inject(FEATURE_FLAGS_OPTIONS)
    options?: FeatureFlagsModuleOptions,
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.environment = this.configService.get('NODE_ENV', 'development');
  }

  async onModuleInit() {
    // Try to get Redis client from container
    try {
      const Redis = require('ioredis');
      const redisUrl = this.configService.get('REDIS_URL');
      if (redisUrl) {
        this.redisClient = new Redis(redisUrl);
        this.logger.log('Feature flags: Redis connection established');
      }
    } catch {
      this.logger.warn('Feature flags: Redis not available, using in-memory storage only');
    }

    // Load predefined flags from environment
    await this.loadEnvironmentFlags();
  }

  /**
   * Load feature flags from environment variables
   * Format: FEATURE_FLAG_<KEY>=true|false
   */
  private async loadEnvironmentFlags(): Promise<void> {
    const envFlags = Object.keys(process.env)
      .filter(key => key.startsWith('FEATURE_FLAG_'))
      .map(key => ({
        key: key.replace('FEATURE_FLAG_', '').toLowerCase().replace(/_/g, '-'),
        value: process.env[key] === 'true',
      }));

    for (const { key, value } of envFlags) {
      if (!this.flags.has(key)) {
        this.flags.set(key, {
          id: `env-${key}`,
          key,
          name: key,
          description: 'Environment-defined feature flag',
          type: FeatureFlagType.BOOLEAN,
          status: FeatureFlagStatus.ACTIVE,
          value: { enabled: value },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    this.logger.log(`Loaded ${envFlags.length} feature flags from environment`);
  }

  /**
   * Check if a feature flag is enabled
   */
  async isEnabled(key: string, context?: FeatureFlagContext): Promise<boolean> {
    const result = await this.evaluate(key, context);
    return result.enabled;
  }

  /**
   * Evaluate a feature flag with full context
   */
  async evaluate(
    key: string,
    context?: FeatureFlagContext,
  ): Promise<FeatureFlagEvaluationResult> {
    try {
      // Check cache first
      if (this.options.cacheEnabled && this.redisClient) {
        const cached = await this.getFromCache(key);
        if (cached) {
          return this.evaluateFlag(cached, context);
        }
      }

      // Get from memory store
      const flag = this.flags.get(key);
      if (!flag) {
        return {
          key,
          enabled: this.options.defaultValue!,
          reason: EvaluationReason.FLAG_NOT_FOUND,
        };
      }

      // Cache the flag if Redis available
      if (this.options.cacheEnabled && this.redisClient) {
        await this.setToCache(key, flag);
      }

      return this.evaluateFlag(flag, context);
    } catch (error) {
      this.logger.error(`Error evaluating flag ${key}:`, error);
      return {
        key,
        enabled: this.options.defaultValue!,
        reason: EvaluationReason.ERROR,
      };
    }
  }

  /**
   * Evaluate a flag based on its type
   */
  private evaluateFlag(
    flag: FeatureFlag,
    context?: FeatureFlagContext,
  ): FeatureFlagEvaluationResult {
    if (flag.status !== FeatureFlagStatus.ACTIVE) {
      return {
        key: flag.key,
        enabled: false,
        reason: EvaluationReason.FLAG_INACTIVE,
      };
    }

    switch (flag.type) {
      case FeatureFlagType.BOOLEAN:
        return this.evaluateBooleanFlag(flag);
      case FeatureFlagType.PERCENTAGE:
        return this.evaluatePercentageFlag(flag, context);
      case FeatureFlagType.USER_LIST:
        return this.evaluateUserListFlag(flag, context);
      case FeatureFlagType.ENVIRONMENT:
        return this.evaluateEnvironmentFlag(flag);
      default:
        return {
          key: flag.key,
          enabled: this.options.defaultValue!,
          reason: EvaluationReason.DEFAULT_VALUE,
        };
    }
  }

  /**
   * Evaluate boolean flag
   */
  private evaluateBooleanFlag(flag: FeatureFlag): FeatureFlagEvaluationResult {
    const value = flag.value as BooleanFlagValue;
    return {
      key: flag.key,
      enabled: value.enabled,
      reason: EvaluationReason.BOOLEAN_MATCH,
    };
  }

  /**
   * Evaluate percentage-based flag
   * Uses consistent hashing to ensure same user always gets same result
   */
  private evaluatePercentageFlag(
    flag: FeatureFlag,
    context?: FeatureFlagContext,
  ): FeatureFlagEvaluationResult {
    const value = flag.value as PercentageFlagValue;

    if (!value.enabled) {
      return {
        key: flag.key,
        enabled: false,
        reason: EvaluationReason.BOOLEAN_MATCH,
      };
    }

    // Use userId or sessionId for consistent bucketing
    const identifier = context?.userId || context?.sessionId || Math.random().toString();
    const bucket = this.getBucket(flag.key, identifier);

    const enabled = bucket < value.percentage;
    return {
      key: flag.key,
      enabled,
      reason: enabled ? EvaluationReason.PERCENTAGE_MATCH : EvaluationReason.PERCENTAGE_NO_MATCH,
    };
  }

  /**
   * Evaluate user list flag
   */
  private evaluateUserListFlag(
    flag: FeatureFlag,
    context?: FeatureFlagContext,
  ): FeatureFlagEvaluationResult {
    const value = flag.value as UserListFlagValue;

    if (!value.enabled) {
      return {
        key: flag.key,
        enabled: false,
        reason: EvaluationReason.BOOLEAN_MATCH,
      };
    }

    // Check if user is in allowed list
    if (context?.userId && value.allowedUsers.includes(context.userId)) {
      return {
        key: flag.key,
        enabled: true,
        reason: EvaluationReason.USER_ALLOWED,
      };
    }

    // Check if user's role is in allowed roles
    if (context?.userRole && value.allowedRoles?.includes(context.userRole)) {
      return {
        key: flag.key,
        enabled: true,
        reason: EvaluationReason.ROLE_ALLOWED,
      };
    }

    return {
      key: flag.key,
      enabled: false,
      reason: EvaluationReason.USER_NOT_ALLOWED,
    };
  }

  /**
   * Evaluate environment-based flag
   */
  private evaluateEnvironmentFlag(flag: FeatureFlag): FeatureFlagEvaluationResult {
    const value = flag.value as EnvironmentFlagValue;

    if (!value.enabled) {
      return {
        key: flag.key,
        enabled: false,
        reason: EvaluationReason.BOOLEAN_MATCH,
      };
    }

    const envKey = this.environment as keyof typeof value.environments;
    const enabled = value.environments[envKey] ?? false;

    return {
      key: flag.key,
      enabled,
      reason: enabled ? EvaluationReason.ENVIRONMENT_MATCH : EvaluationReason.ENVIRONMENT_NO_MATCH,
    };
  }

  /**
   * Get consistent bucket (0-100) for percentage rollouts
   */
  private getBucket(flagKey: string, identifier: string): number {
    const hash = createHash('md5')
      .update(`${flagKey}:${identifier}`)
      .digest('hex');

    // Use first 8 chars of hash to get a number
    const num = parseInt(hash.substring(0, 8), 16);
    return num % 100;
  }

  /**
   * Create a new feature flag
   */
  async createFlag(dto: CreateFeatureFlagDto, createdBy?: string): Promise<FeatureFlag> {
    if (this.flags.has(dto.key)) {
      throw new Error(`Feature flag with key "${dto.key}" already exists`);
    }

    const flag: FeatureFlag = {
      id: `ff-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      key: dto.key,
      name: dto.name,
      description: dto.description,
      type: dto.type,
      status: FeatureFlagStatus.ACTIVE,
      value: dto.value,
      metadata: dto.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
    };

    this.flags.set(dto.key, flag);
    await this.invalidateCache(dto.key);

    this.logger.log(`Created feature flag: ${dto.key}`);
    return flag;
  }

  /**
   * Update an existing feature flag
   */
  async updateFlag(
    key: string,
    dto: UpdateFeatureFlagDto,
    updatedBy?: string,
  ): Promise<FeatureFlag> {
    const flag = this.flags.get(key);
    if (!flag) {
      throw new Error(`Feature flag with key "${key}" not found`);
    }

    const updated: FeatureFlag = {
      ...flag,
      ...dto,
      updatedAt: new Date(),
      updatedBy,
    };

    this.flags.set(key, updated);
    await this.invalidateCache(key);

    this.logger.log(`Updated feature flag: ${key}`);
    return updated;
  }

  /**
   * Delete a feature flag
   */
  async deleteFlag(key: string): Promise<void> {
    if (!this.flags.has(key)) {
      throw new Error(`Feature flag with key "${key}" not found`);
    }

    this.flags.delete(key);
    await this.invalidateCache(key);

    this.logger.log(`Deleted feature flag: ${key}`);
  }

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    return Array.from(this.flags.values());
  }

  /**
   * Get a specific feature flag
   */
  async getFlag(key: string): Promise<FeatureFlag | null> {
    return this.flags.get(key) || null;
  }

  /**
   * Enable a feature flag quickly
   */
  async enableFlag(key: string, updatedBy?: string): Promise<FeatureFlag> {
    const flag = this.flags.get(key);
    if (!flag) {
      throw new Error(`Feature flag with key "${key}" not found`);
    }

    return this.updateFlag(key, {
      value: { ...flag.value, enabled: true } as any,
    }, updatedBy);
  }

  /**
   * Disable a feature flag quickly
   */
  async disableFlag(key: string, updatedBy?: string): Promise<FeatureFlag> {
    const flag = this.flags.get(key);
    if (!flag) {
      throw new Error(`Feature flag with key "${key}" not found`);
    }

    return this.updateFlag(key, {
      value: { ...flag.value, enabled: false } as any,
    }, updatedBy);
  }

  /**
   * Get flag value from cache
   */
  private async getFromCache(key: string): Promise<FeatureFlag | null> {
    if (!this.redisClient) return null;

    try {
      const cached = await this.redisClient.get(`${this.options.redisKeyPrefix}${key}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  /**
   * Set flag value to cache
   */
  private async setToCache(key: string, flag: FeatureFlag): Promise<void> {
    if (!this.redisClient) return;

    try {
      await this.redisClient.setex(
        `${this.options.redisKeyPrefix}${key}`,
        this.options.cacheTtl,
        JSON.stringify(flag),
      );
    } catch {
      // Ignore cache errors
    }
  }

  /**
   * Invalidate cache for a flag
   */
  private async invalidateCache(key: string): Promise<void> {
    if (!this.redisClient) return;

    try {
      await this.redisClient.del(`${this.options.redisKeyPrefix}${key}`);
    } catch {
      // Ignore cache errors
    }
  }

  /**
   * Evaluate multiple flags at once
   */
  async evaluateMultiple(
    keys: string[],
    context?: FeatureFlagContext,
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const key of keys) {
      results[key] = await this.isEnabled(key, context);
    }

    return results;
  }
}
