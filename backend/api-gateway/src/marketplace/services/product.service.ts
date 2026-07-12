import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductFilters,
  CreateProductReviewDto,
  ReplyProductReviewDto,
} from '../dto/product.dto';
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
        // Photos : le front envoie `photos` (ou l'alias `images`). On persiste sur Product.photos
        // (jusqu'ici ignoré -> photos restait toujours []).
        photos: data.photos ?? data.images ?? [],
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
        reviews: {
          include: {
            reviewer: {
              select: { id: true, firstName: true, lastName: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    return {
      ...product,
      reviews: product.reviews.map((r) => this.mapReview(r)),
    };
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

    // Photos : mapper `photos` / alias `images` sur la colonne Product.photos. `images` n'est PAS une
    // colonne Product : le laisser dans le payload Prisma provoquait un 500 (Unknown arg `images`).
    if (updateData.photos !== undefined || updateData.images !== undefined) {
      updateData.photos = updateData.photos ?? updateData.images;
    }
    delete updateData.images;

    // STOCK -> STATUT : quand le vendeur met le stock à 0, le produit passe automatiquement en
    // SOLD_OUT ; s'il réapprovisionne un produit épuisé (SOLD_OUT), il redevient ACTIVE. On ne
    // surcharge pas un statut explicitement fourni par le vendeur (ex : passage manuel en INACTIVE).
    if (updateData.stock !== undefined && updateData.status === undefined) {
      const currentStatus = (product as any).status;
      if (Number(updateData.stock) <= 0) {
        updateData.status = 'SOLD_OUT';
      } else if (currentStatus === 'SOLD_OUT') {
        updateData.status = 'ACTIVE';
      }
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

  // ==================== PRODUCT REVIEWS ====================

  /**
   * Normalise un avis pour le front : expose à la fois `reviewer` (contrat API)
   * et `client` (forme consommée par la page marketplace/[id]).
   */
  private mapReview(review: any) {
    return {
      id: review.id,
      productId: review.productId,
      rating: review.rating,
      comment: review.comment,
      // Réponse publique du vendeur à l'avis (null tant que le vendeur n'a pas répondu).
      sellerReply: review.sellerReply ?? null,
      sellerReplyAt: review.sellerReplyAt ?? null,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      reviewer: review.reviewer,
      client: review.reviewer,
    };
  }

  /**
   * Crée (ou met à jour) l'avis d'un client sur un produit qu'il a commandé.
   * Un seul avis par client et par produit (upsert sur la contrainte unique).
   */
  async createProductReview(userId: string, productId: string, data: CreateProductReviewDto) {
    // Le produit doit exister
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    // L'utilisateur doit avoir commandé ce produit (une de ses commandes contient cet article)
    const hasOrdered = await this.prisma.order.findFirst({
      where: {
        clientId: userId,
        items: { some: { productId } },
      },
      select: { id: true },
    });

    if (!hasOrdered) {
      throw new ForbiddenException(
        'Vous ne pouvez noter qu\'un produit que vous avez commandé',
      );
    }

    const review = await this.prisma.productReview.upsert({
      where: {
        productId_reviewerId: { productId, reviewerId: userId },
      },
      create: {
        productId,
        reviewerId: userId,
        rating: data.rating,
        comment: data.comment,
      },
      update: {
        rating: data.rating,
        comment: data.comment,
      },
      include: {
        reviewer: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    return this.mapReview(review);
  }

  /**
   * Liste les avis d'un produit, du plus récent au plus ancien.
   */
  async getProductReviews(productId: string) {
    const reviews = await this.prisma.productReview.findMany({
      where: { productId },
      include: {
        reviewer: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map((r) => this.mapReview(r));
  }

  /**
   * Réponse du VENDEUR à un avis client (façon Amazon/marketplace).
   * Réservée au propriétaire (artisan) du produit ; pose sellerReply/sellerReplyAt.
   */
  async replyToReview(
    productId: string,
    reviewId: string,
    artisanId: string,
    data: ReplyProductReviewDto,
  ) {
    const review = await this.prisma.productReview.findUnique({
      where: { id: reviewId },
      include: { product: { select: { id: true, artisanId: true } } },
    });

    if (!review || review.productId !== productId) {
      throw new NotFoundException('Avis introuvable');
    }

    // Seul le vendeur (propriétaire du produit) peut répondre.
    if (review.product.artisanId !== artisanId) {
      throw new ForbiddenException("Seul le vendeur du produit peut répondre à cet avis");
    }

    const updated = await this.prisma.productReview.update({
      where: { id: reviewId },
      data: { sellerReply: data.reply, sellerReplyAt: new Date() },
      include: {
        reviewer: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    return this.mapReview(updated);
  }

  // ==================== VENDEUR : MES PRODUITS ====================

  /**
   * Produits de l'artisan connecté — TOUS statuts (DRAFT/ACTIVE/INACTIVE/SOLD_OUT), contrairement
   * au catalogue public qui ne montre que ACTIVE. Sert le tableau de bord vendeur.
   */
  async getMyProducts(artisanId: string) {
    // RÉCONCILIATION SOLD_OUT : le décrément de stock au règlement (webhook Stripe, hors de ce
    // service) ne change pas le statut. On aligne ici le statut sur le stock réel avant de renvoyer
    // la liste : stock <= 0 & ACTIVE -> SOLD_OUT ; stock > 0 & SOLD_OUT -> ACTIVE (réappro).
    const toSoldOut = await this.prisma.product.findMany({
      where: { artisanId, status: 'ACTIVE', stock: { lte: 0 } },
      select: { id: true },
    });
    if (toSoldOut.length) {
      await this.prisma.product.updateMany({
        where: { id: { in: toSoldOut.map((p) => p.id) } },
        data: { status: 'SOLD_OUT' },
      });
    }
    const toActive = await this.prisma.product.findMany({
      where: { artisanId, status: 'SOLD_OUT', stock: { gt: 0 } },
      select: { id: true },
    });
    if (toActive.length) {
      await this.prisma.product.updateMany({
        where: { id: { in: toActive.map((p) => p.id) } },
        data: { status: 'ACTIVE' },
      });
    }

    const LOW_STOCK_THRESHOLD = 5;
    const products = await this.prisma.product.findMany({
      where: { artisanId },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { reviews: true, orderItems: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Annote chaque produit d'un drapeau d'alerte de stock (consommé par le tableau de bord vendeur).
    return products.map((p) => ({
      ...p,
      lowStock: p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD,
      outOfStock: p.stock <= 0 || p.status === 'SOLD_OUT',
    }));
  }
}
