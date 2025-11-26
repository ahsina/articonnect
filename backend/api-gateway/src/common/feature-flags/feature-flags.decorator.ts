import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';

export const FEATURE_FLAG_KEY = 'feature_flag';
export const FEATURE_FLAG_CONTEXT = 'feature_flag_context';

/**
 * Decorator to protect a route with a feature flag
 * If the flag is disabled, the route returns 404
 *
 * @param key - The feature flag key
 * @param options - Additional options
 *
 * @example
 * ```ts
 * @FeatureFlag('new-dashboard')
 * @Get('dashboard/v2')
 * getNewDashboard() {
 *   return this.dashboardService.getNewVersion();
 * }
 * ```
 */
export const FeatureFlag = (key: string, options?: FeatureFlagDecoratorOptions) =>
  SetMetadata(FEATURE_FLAG_KEY, { key, ...options });

export interface FeatureFlagDecoratorOptions {
  /**
   * HTTP status to return when flag is disabled
   * @default 404
   */
  statusOnDisabled?: number;

  /**
   * Message to return when flag is disabled
   */
  messageOnDisabled?: string;

  /**
   * Fallback method name to call if flag is disabled
   * Must be a method in the same controller
   */
  fallbackMethod?: string;

  /**
   * Whether to use the request user for context
   * @default true
   */
  useRequestContext?: boolean;
}

/**
 * Get the feature flag metadata from a class or method
 */
export const getFeatureFlagMetadata = (target: any): { key: string } & FeatureFlagDecoratorOptions | undefined => {
  return Reflect.getMetadata(FEATURE_FLAG_KEY, target);
};

/**
 * Decorator to inject feature flag context from request
 *
 * @example
 * ```ts
 * @Get('feature-status')
 * async getStatus(@FeatureFlagContext() context: FeatureFlagContext) {
 *   return this.featureFlagsService.evaluate('my-flag', context);
 * }
 * ```
 */
export const FeatureFlagContext = () => SetMetadata(FEATURE_FLAG_CONTEXT, true);

/**
 * Require multiple feature flags to be enabled
 *
 * @example
 * ```ts
 * @RequireFeatureFlags(['premium-features', 'beta-access'])
 * @Get('premium')
 * getPremiumContent() {
 *   return this.contentService.getPremium();
 * }
 * ```
 */
export const RequireFeatureFlags = (keys: string[], requireAll = true) =>
  SetMetadata(FEATURE_FLAG_KEY, { keys, requireAll, multiple: true });

/**
 * Decorator to mark a method parameter to receive evaluated feature flags
 *
 * @example
 * ```ts
 * @Get('dashboard')
 * getDashboard(@FeatureFlags(['new-ui', 'dark-mode']) flags: Record<string, boolean>) {
 *   if (flags['new-ui']) {
 *     // Show new UI
 *   }
 * }
 * ```
 */
export const FeatureFlags = (keys: string[]) =>
  SetMetadata('evaluated_feature_flags', keys);
