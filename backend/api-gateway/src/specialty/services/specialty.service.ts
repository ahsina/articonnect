import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { CreateSpecialtyDto, UpdateSpecialtyDto } from '../dto/specialty.dto';

// Cache keys
const CACHE_KEYS = {
  ALL_SPECIALTIES: 'specialties:all',
  BY_CATEGORY: (category: string) => `specialties:category:${category}`,
  CATEGORIES: 'specialties:categories',
};
const CACHE_TTL = 3600; // 1 hour

@Injectable()
export class SpecialtyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(createDto: CreateSpecialtyDto) {
    // Check if specialty with same name already exists
    const existing = await this.prisma.specialty.findUnique({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException('Une spécialité avec ce nom existe déjà');
    }

    const result = await this.prisma.specialty.create({
      data: createDto,
    });

    // Invalidate cache
    await this.invalidateCache();

    return result;
  }

  async findAll(category?: string) {
    const cacheKey = category
      ? CACHE_KEYS.BY_CATEGORY(category)
      : CACHE_KEYS.ALL_SPECIALTIES;

    // Try cache first
    return this.redis.getOrSet(
      cacheKey,
      async () => {
        const where = category ? { category } : {};
        return this.prisma.specialty.findMany({
          where,
          orderBy: [
            { category: 'asc' },
            { name: 'asc' },
          ],
        });
      },
      CACHE_TTL,
    );
  }

  async findOne(id: string) {
    const specialty = await this.prisma.specialty.findUnique({
      where: { id },
      include: {
        _count: {
          select: { artisans: true },
        },
      },
    });

    if (!specialty) {
      throw new NotFoundException('Spécialité introuvable');
    }

    return specialty;
  }

  async update(id: string, updateDto: UpdateSpecialtyDto) {
    // Check if specialty exists
    await this.findOne(id);

    // If name is being updated, check for conflicts
    if (updateDto.name) {
      const existing = await this.prisma.specialty.findUnique({
        where: { name: updateDto.name },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Une spécialité avec ce nom existe déjà');
      }
    }

    const result = await this.prisma.specialty.update({
      where: { id },
      data: updateDto,
    });

    // Invalidate cache
    await this.invalidateCache();

    return result;
  }

  async delete(id: string) {
    // Check if specialty exists
    await this.findOne(id);

    // Delete the specialty (artisan connections will be handled by Prisma cascade)
    await this.prisma.specialty.delete({
      where: { id },
    });

    // Invalidate cache
    await this.invalidateCache();

    return { message: 'Spécialité supprimée avec succès' };
  }

  async getCategories() {
    // Try cache first
    return this.redis.getOrSet(
      CACHE_KEYS.CATEGORIES,
      async () => {
        const specialties = await this.prisma.specialty.findMany({
          select: { category: true },
          distinct: ['category'],
          orderBy: { category: 'asc' },
        });
        return specialties.map((s) => s.category);
      },
      CACHE_TTL,
    );
  }

  /**
   * Invalidate all specialty caches
   */
  private async invalidateCache(): Promise<void> {
    await this.redis.invalidateByPattern('specialties:*');
  }
}
