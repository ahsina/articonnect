import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { UpdateConfigDto, CreateConfigDto } from '../dto/update-config.dto';
import { ConfigDataType, ConfigCategory } from '@prisma/client';

@Injectable()
export class ConfigService {
  private readonly CACHE_PREFIX = 'config:';
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Get configuration value by key with type-safe parsing
   */
  async get<T = any>(key: string): Promise<T | null> {
    // Try cache first
    const cached = await this.redis.get(`${this.CACHE_PREFIX}${key}`);
    if (cached) {
      const parsedCache = JSON.parse(cached);
      return this.parseValue<T>(parsedCache.value, parsedCache.dataType);
    }

    // Fetch from database
    const config = await this.prisma.platformConfig.findUnique({
      where: { key, isActive: true },
    });

    if (!config) {
      return null;
    }

    // Cache it
    await this.redis.set(
      `${this.CACHE_PREFIX}${key}`,
      JSON.stringify({ value: config.value, dataType: config.dataType }),
      this.CACHE_TTL,
    );

    return this.parseValue<T>(config.value, config.dataType);
  }

  /**
   * Get configuration with default value
   */
  async getOrDefault<T>(key: string, defaultValue: T): Promise<T> {
    const value = await this.get<T>(key);
    return value !== null ? value : defaultValue;
  }

  /**
   * Get all public configurations (for client apps)
   */
  async getPublicConfigs() {
    const configs = await this.prisma.platformConfig.findMany({
      where: {
        isPublic: true,
        isActive: true,
      },
      select: {
        key: true,
        value: true,
        dataType: true,
        category: true,
        description: true,
      },
    });

    return configs.map((config) => ({
      key: config.key,
      value: this.parseValue(config.value, config.dataType),
      category: config.category,
      description: config.description,
    }));
  }

  /**
   * Get all configurations by category (admin only)
   */
  async getByCategory(category: ConfigCategory) {
    return this.prisma.platformConfig.findMany({
      where: { category, isActive: true },
      orderBy: { key: 'asc' },
    });
  }

  /**
   * Get all configurations (admin only)
   */
  async getAll() {
    return this.prisma.platformConfig.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  /**
   * Create new configuration
   */
  async create(dto: CreateConfigDto, updatedBy: string) {
    // Check if key already exists
    const existing = await this.prisma.platformConfig.findUnique({
      where: { key: dto.key },
    });

    if (existing) {
      throw new NotFoundException(`Configuration with key '${dto.key}' already exists`);
    }

    return this.prisma.platformConfig.create({
      data: {
        key: dto.key,
        value: dto.value,
        dataType: dto.dataType,
        category: dto.category,
        description: dto.description,
        isPublic: dto.isPublic ?? false,
        updatedBy,
      },
    });
  }

  /**
   * Update configuration value
   */
  async update(key: string, dto: UpdateConfigDto, updatedBy: string) {
    const config = await this.prisma.platformConfig.findUnique({
      where: { key },
    });

    if (!config) {
      throw new NotFoundException(`Configuration '${key}' not found`);
    }

    const updated = await this.prisma.platformConfig.update({
      where: { key },
      data: {
        value: dto.value,
        description: dto.description,
        isActive: dto.isActive,
        updatedBy,
      },
    });

    // Invalidate cache
    await this.redis.del(`${this.CACHE_PREFIX}${key}`);

    return updated;
  }

  /**
   * Delete configuration
   */
  async delete(key: string) {
    const config = await this.prisma.platformConfig.findUnique({
      where: { key },
    });

    if (!config) {
      throw new NotFoundException(`Configuration '${key}' not found`);
    }

    await this.redis.del(`${this.CACHE_PREFIX}${key}`);

    return this.prisma.platformConfig.delete({
      where: { key },
    });
  }

  /**
   * Clear all configuration cache
   */
  async clearCache() {
    const client = this.redis.getClient();
    const keys = await client.keys(`${this.CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await Promise.all(keys.map((key) => this.redis.del(key)));
    }
    return { cleared: keys.length };
  }

  /**
   * Parse value based on data type
   */
  private parseValue<T>(value: string, dataType: ConfigDataType): T {
    switch (dataType) {
      case ConfigDataType.NUMBER:
        return parseFloat(value) as T;
      case ConfigDataType.BOOLEAN:
        return (value.toLowerCase() === 'true') as T;
      case ConfigDataType.JSON:
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as T;
        }
      case ConfigDataType.STRING:
      default:
        return value as T;
    }
  }

  /**
   * Commonly used configuration getters
   */

  async getPlatformFeePercentage(): Promise<number> {
    return this.getOrDefault<number>('platform.fee_percentage', 15);
  }

  async getMinMissionAmount(): Promise<number> {
    return this.getOrDefault<number>('platform.min_mission_amount', 50);
  }

  async getMaxMissionAmount(): Promise<number> {
    return this.getOrDefault<number>('platform.max_mission_amount', 10000);
  }

  async isFeatureEnabled(featureKey: string): Promise<boolean> {
    return this.getOrDefault<boolean>(`feature.${featureKey}_enabled`, false);
  }
}
