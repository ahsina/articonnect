import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProductDto, UpdateProductDto, ProductFilters } from '../dto/product.dto';
import { CreateVariantDto, UpdateVariantDto } from '../dto/variant.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  /**
   * Résout une catégorie fournie soit par ID, soit par SLUG (ex 'lighting').
   * Le champ DTO `category` est documenté avec un slug ; on accepte donc les deux
   * pour éviter le 400 trompeur "Invalid category" quand un slug est passé.
   * Retourne toujours l'ID de catégorie à persister.
   */
  private async resolveCategoryId(categoryIdOrSlug: string): Promise<string> {
    const category = await this.prisma.category.findFirst({
      where: {
        OR: [{ id: categoryIdOrSlug }, { slug: categoryIdOrSlug }],
      },
      select: { id: true },
    });
    if (!category) {
      throw new BadRequestException(
        'Invalid category: provide an existing category id or slug',
      );
    }
    return category.id;
  }

  async create(artisanId: string, data: CreateProductDto) {
    const categoryId = await this.resolveCategoryId(data.category);

    return this.prisma.product.create({
      data: {
        artisanId,
        name: data.name,
        description: data.description,
        price: data.price,
        vatRate: data.vatRate || 17, // Luxembourg standard VAT rate
        categoryId,
        stock: data.stock,
        sku: data.sku,
        status: data.status || 'DRAFT',
      },
      include: {
        artisan: {
          select: {
            firstName: true,
            lastName: true,
            artisanProfile: {
              select: {
                companyName: true,
                rating: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll(filters?: ProductFilters) {
    const where: Prisma.ProductWhereInput = {
      status: filters?.status || 'ACTIVE',
    };

    if (filters?.category) {
      where.categoryId = filters.category;
    }

    if (filters?.artisanId) {
      where.artisanId = filters.artisanId;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Price range filter
    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      where.price = {};
      if (filters?.minPrice !== undefined) {
        where.price.gte = filters.minPrice;
      }
      if (filters?.maxPrice !== undefined) {
        where.price.lte = filters.maxPrice;
      }
    }

    // Rating filter (filter artisans with minimum rating)
    if (filters?.minRating !== undefined) {
      where.artisan = {
        artisanProfile: {
          rating: {
            gte: filters.minRating,
          },
        },
      };
    }

    // Sorting
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };

    if (filters?.sortBy) {
      const sortOrder = filters.sortOrder || 'desc';

      switch (filters.sortBy) {
        case 'price':
          orderBy = { price: sortOrder };
          break;
        case 'rating':
          orderBy = { artisan: { artisanProfile: { rating: sortOrder } } };
          break;
        case 'newest':
          orderBy = { createdAt: 'desc' };
          break;
        case 'popular':
          // For "popular", we could sort by order count or review count
          // For now, using createdAt as placeholder
          orderBy = { createdAt: 'desc' };
          break;
      }
    }

    // Pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 12;
    const skip = (page - 1) * limit;

    // Get total count for pagination metadata
    const total = await this.prisma.product.count({ where });

    // Get paginated products
    const products = await this.prisma.product.findMany({
      where,
      include: {
        artisan: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            artisanProfile: {
              select: {
                companyName: true,
                rating: true,
              },
            },
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    });

    // Return paginated response with metadata
    return {
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        artisan: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            artisanProfile: true,
          },
        },
        variants: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    return product;
  }

  async update(id: string, artisanId: string, data: UpdateProductDto) {
    // Verify product exists + ownership (un artisan ne modifie que SES produits)
    const product = await this.findOne(id);
    if ((product as any).artisanId !== artisanId) {
      throw new ForbiddenException('Vous n\'avez pas accès à ce produit');
    }

    // Transform category to categoryId if present (accepte id OU slug)
    const updateData: any = { ...data };
    if (updateData.category) {
      updateData.categoryId = await this.resolveCategoryId(updateData.category);
      delete updateData.category;
    }

    return this.prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        artisan: {
          select: {
            firstName: true,
            lastName: true,
            artisanProfile: {
              select: {
                companyName: true,
                rating: true,
              },
            },
          },
        },
      },
    });
  }

  async delete(id: string, artisanId: string) {
    // Verify product exists + ownership
    const product = await this.findOne(id);
    if ((product as any).artisanId !== artisanId) {
      throw new ForbiddenException('Vous n\'avez pas accès à ce produit');
    }

    await this.prisma.product.delete({
      where: { id },
    });

    return { message: 'Produit supprimé avec succès' };
  }

  // ==================== PRODUCT VARIANTS ====================

  async createVariant(productId: string, artisanId: string, data: CreateVariantDto) {
    // Verify product exists and belongs to artisan
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    if (product.artisanId !== artisanId) {
      throw new ForbiddenException('Vous n\'avez pas accès à ce produit');
    }

    return this.prisma.productVariant.create({
      data: {
        productId,
        name: data.name,
        priceAdjustment: data.priceAdjustment,
        stock: data.stock,
      },
    });
  }

  async getVariants(productId: string) {
    return this.prisma.productVariant.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getVariant(variantId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            artisanId: true,
          },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException('Variante introuvable');
    }

    return variant;
  }

  async updateVariant(variantId: string, artisanId: string, data: UpdateVariantDto) {
    // Verify variant exists and belongs to artisan
    const variant = await this.getVariant(variantId);

    if (variant.product.artisanId !== artisanId) {
      throw new ForbiddenException('Vous n\'avez pas accès à cette variante');
    }

    return this.prisma.productVariant.update({
      where: { id: variantId },
      data,
    });
  }

  async deleteVariant(variantId: string, artisanId: string) {
    // Verify variant exists and belongs to artisan
    const variant = await this.getVariant(variantId);

    if (variant.product.artisanId !== artisanId) {
      throw new ForbiddenException('Vous n\'avez pas accès à cette variante');
    }

    await this.prisma.productVariant.delete({
      where: { id: variantId },
    });

    return { message: 'Variante supprimée avec succès' };
  }
}
