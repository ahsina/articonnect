import { SetMetadata } from '@nestjs/common';
import { CacheOptions } from './cache.service';

export const CACHE_KEY = 'cache:key';
export const CACHE_OPTIONS = 'cache:options';
export const CACHE_INVALIDATE = 'cache:invalidate';

/**
 * Decorator to cache method results
 *
 * @example
 * ```ts
 * @Cacheable('user:profile', { ttl: 300, tags: ['user_profile'] })
 * async getUserProfile(userId: string) {
 *   return this.userRepository.findOne(userId);
 * }
 * ```
 */
export const Cacheable = (keyPrefix: string, options?: CacheOptions) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY, keyPrefix)(target, propertyKey, descriptor);
    SetMetadata(CACHE_OPTIONS, options)(target, propertyKey, descriptor);
    return descriptor;
  };
};

/**
 * Decorator to invalidate cache after method execution
 *
 * @example
 * ```ts
 * @CacheInvalidate(['user_profile', 'user:${userId}'])
 * async updateUserProfile(userId: string, data: UpdateProfileDto) {
 *   return this.userRepository.update(userId, data);
 * }
 * ```
 */
export const CacheInvalidate = (tags: string[]) => {
  return SetMetadata(CACHE_INVALIDATE, tags);
};

/**
 * Decorator to skip cache for specific calls
 *
 * @example
 * ```ts
 * @SkipCache()
 * async getRealtimeData() {
 *   return this.service.fetchLiveData();
 * }
 * ```
 */
export const SkipCache = () => {
  return SetMetadata(CACHE_OPTIONS, { skipCache: true });
};
