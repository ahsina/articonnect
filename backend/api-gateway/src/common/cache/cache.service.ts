import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

/**
 * Cache configuration options
 */
export interface CacheOptions {
  /** Time to live in seconds */
  ttl?: number;
  /** Tags for grouped invalidation */
  tags?: string[];
  /** Skip cache entirely */
  skipCache?: boolean;
}

/**
 * Default TTL values in seconds
 */
export const CacheTTL = {
  SHORT: 60,           // 1 minute
  MEDIUM: 300,         // 5 minutes
  LONG: 900,           // 15 minutes
  HOUR: 3600,          // 1 hour
  DAY: 86400,          // 24 hours
  WEEK: 604800,        // 7 days
} as const;

/**
 * Cache key prefixes for different entity types
 */
export const CachePrefix = {
  USER: 'user',
  MISSION: 'mission',
  ARTISAN: 'artisan',
  PRODUCT: 'product',
  ORDER: 'order',
  REVIEW: 'review',
  NOTIFICATION: 'notification',
  SESSION: 'session',
  CONFIG: 'config',
  RATE_LIMIT: 'rate_limit',
  TAG: 'tag',
} as const;

/**
 * Cache tags for grouped invalidation
 */
export const CacheTags = {
  USER_PROFILE: 'user_profile',
  USER_SETTINGS: 'user_settings',
  MISSION_LIST: 'mission_list',
  MISSION_DETAIL: 'mission_detail',
  PRODUCT_LIST: 'product_list',
  PRODUCT_DETAIL: 'product_detail',
  REVIEW_LIST: 'review_list',
  ARTISAN_LIST: 'artisan_list',
  ARTISAN_PROFILE: 'artisan_profile',
  NOTIFICATION_LIST: 'notification_list',
  ORDER_LIST: 'order_list',
  CONFIG: 'config',
} as const;

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly appPrefix = 'ac'; // ArtiConnect prefix

  constructor(private readonly redis: RedisService) {}

  /**
   * Build a consistent cache key with prefix
   */
  buildKey(prefix: string, ...parts: (string | number)[]): string {
    return `${this.appPrefix}:${prefix}:${parts.join(':')}`;
  }

  /**
   * Get cached value or fetch from source
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    const { ttl = CacheTTL.MEDIUM, tags = [], skipCache = false } = options;

    if (skipCache) {
      return fetcher();
    }

    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      this.logger.debug(`Cache hit: ${key}`);
      return cached;
    }

    // Fetch from source
    this.logger.debug(`Cache miss: ${key}`);
    const value = await fetcher();

    // Store in cache with tags
    await this.set(key, value, { ttl, tags });

    return value;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      return await this.redis.getJson<T>(key);
    } catch (error) {
      this.logger.error(`Cache get error for ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with optional tags
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const { ttl = CacheTTL.MEDIUM, tags = [] } = options;

    try {
      // Store the value
      await this.redis.setJson(key, value, ttl);

      // Store tag associations for later invalidation
      if (tags.length > 0) {
        await this.addKeyToTags(key, tags, ttl);
      }
    } catch (error) {
      this.logger.error(`Cache set error for ${key}:`, error);
    }
  }

  /**
   * Delete a specific cache key
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete error for ${key}:`, error);
    }
  }

  /**
   * Delete multiple cache keys
   */
  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    try {
      await this.redis.invalidateMany(keys);
      this.logger.debug(`Cache deleted ${keys.length} keys`);
    } catch (error) {
      this.logger.error('Cache deleteMany error:', error);
    }
  }

  /**
   * Invalidate cache by tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    const tagKey = this.buildTagKey(tag);

    try {
      // Get all keys associated with this tag
      const keys = await this.redis.lrange(tagKey, 0, -1);

      if (keys.length > 0) {
        // Delete all associated keys
        await this.redis.invalidateMany(keys);
        // Delete the tag itself
        await this.redis.del(tagKey);
        this.logger.debug(`Invalidated ${keys.length} keys for tag: ${tag}`);
      }

      return keys.length;
    } catch (error) {
      this.logger.error(`Cache invalidateByTag error for ${tag}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate cache by multiple tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let totalInvalidated = 0;

    for (const tag of tags) {
      totalInvalidated += await this.invalidateByTag(tag);
    }

    return totalInvalidated;
  }

  /**
   * Invalidate cache by pattern (use sparingly - expensive operation)
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    try {
      const fullPattern = `${this.appPrefix}:${pattern}`;
      const client = this.redis.getClient();
      const keys = await client.keys(fullPattern);

      if (keys.length > 0) {
        await this.redis.invalidateMany(keys);
        this.logger.debug(`Invalidated ${keys.length} keys matching pattern: ${pattern}`);
      }

      return keys.length;
    } catch (error) {
      this.logger.error(`Cache invalidateByPattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Add a key to tag sets for later invalidation
   */
  private async addKeyToTags(key: string, tags: string[], ttl: number): Promise<void> {
    const client = this.redis.getClient();
    const pipeline = client.pipeline();

    for (const tag of tags) {
      const tagKey = this.buildTagKey(tag);
      pipeline.lpush(tagKey, key);
      pipeline.ltrim(tagKey, 0, 9999); // Keep max 10000 keys per tag
      pipeline.expire(tagKey, ttl + 3600); // Tag lives slightly longer than cached items
    }

    await pipeline.exec();
  }

  /**
   * Build tag key
   */
  private buildTagKey(tag: string): string {
    return `${this.appPrefix}:${CachePrefix.TAG}:${tag}`;
  }

  // ================================
  // CONVENIENCE METHODS FOR COMMON ENTITIES
  // ================================

  /**
   * Cache user profile
   */
  async cacheUserProfile<T>(userId: string, data: T, ttl = CacheTTL.MEDIUM): Promise<void> {
    const key = this.buildKey(CachePrefix.USER, userId, 'profile');
    await this.set(key, data, { ttl, tags: [CacheTags.USER_PROFILE, `user:${userId}`] });
  }

  /**
   * Get cached user profile
   */
  async getUserProfile<T>(userId: string): Promise<T | null> {
    const key = this.buildKey(CachePrefix.USER, userId, 'profile');
    return this.get<T>(key);
  }

  /**
   * Invalidate user cache
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.invalidateByTag(`user:${userId}`);
  }

  /**
   * Cache mission detail
   */
  async cacheMission<T>(missionId: string, data: T, ttl = CacheTTL.MEDIUM): Promise<void> {
    const key = this.buildKey(CachePrefix.MISSION, missionId);
    await this.set(key, data, { ttl, tags: [CacheTags.MISSION_DETAIL, `mission:${missionId}`] });
  }

  /**
   * Get cached mission
   */
  async getMission<T>(missionId: string): Promise<T | null> {
    const key = this.buildKey(CachePrefix.MISSION, missionId);
    return this.get<T>(key);
  }

  /**
   * Invalidate mission cache
   */
  async invalidateMission(missionId: string): Promise<void> {
    await this.invalidateByTag(`mission:${missionId}`);
    await this.invalidateByTag(CacheTags.MISSION_LIST);
  }

  /**
   * Cache product detail
   */
  async cacheProduct<T>(productId: string, data: T, ttl = CacheTTL.LONG): Promise<void> {
    const key = this.buildKey(CachePrefix.PRODUCT, productId);
    await this.set(key, data, { ttl, tags: [CacheTags.PRODUCT_DETAIL, `product:${productId}`] });
  }

  /**
   * Get cached product
   */
  async getProduct<T>(productId: string): Promise<T | null> {
    const key = this.buildKey(CachePrefix.PRODUCT, productId);
    return this.get<T>(key);
  }

  /**
   * Invalidate product cache
   */
  async invalidateProduct(productId: string): Promise<void> {
    await this.invalidateByTag(`product:${productId}`);
    await this.invalidateByTag(CacheTags.PRODUCT_LIST);
  }

  /**
   * Cache artisan profile
   */
  async cacheArtisan<T>(artisanId: string, data: T, ttl = CacheTTL.MEDIUM): Promise<void> {
    const key = this.buildKey(CachePrefix.ARTISAN, artisanId);
    await this.set(key, data, { ttl, tags: [CacheTags.ARTISAN_PROFILE, `artisan:${artisanId}`] });
  }

  /**
   * Get cached artisan
   */
  async getArtisan<T>(artisanId: string): Promise<T | null> {
    const key = this.buildKey(CachePrefix.ARTISAN, artisanId);
    return this.get<T>(key);
  }

  /**
   * Invalidate artisan cache
   */
  async invalidateArtisan(artisanId: string): Promise<void> {
    await this.invalidateByTag(`artisan:${artisanId}`);
    await this.invalidateByTag(CacheTags.ARTISAN_LIST);
  }

  /**
   * Clear all cache (use with caution!)
   */
  async clearAll(): Promise<void> {
    await this.invalidateByPattern('*');
    this.logger.warn('All cache cleared');
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memoryUsage: string;
    totalKeys: number;
    hitRate: string;
  }> {
    const client = this.redis.getClient();

    try {
      const info = await client.info('memory');
      const keys = await client.dbsize();
      const statsInfo = await client.info('stats');

      // Parse memory usage
      const memoryMatch = info.match(/used_memory_human:(\S+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'unknown';

      // Parse hit rate
      const hitsMatch = statsInfo.match(/keyspace_hits:(\d+)/);
      const missesMatch = statsInfo.match(/keyspace_misses:(\d+)/);
      const hits = hitsMatch ? parseInt(hitsMatch[1]) : 0;
      const misses = missesMatch ? parseInt(missesMatch[1]) : 0;
      const total = hits + misses;
      const hitRate = total > 0 ? ((hits / total) * 100).toFixed(2) + '%' : 'N/A';

      return {
        memoryUsage,
        totalKeys: keys,
        hitRate,
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return {
        memoryUsage: 'unknown',
        totalKeys: 0,
        hitRate: 'N/A',
      };
    }
  }
}
