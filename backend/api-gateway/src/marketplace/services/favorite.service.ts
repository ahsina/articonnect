import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Service de gestion des favoris (artisans et produits)
 */
@Injectable()
export class FavoriteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ajouter un produit aux favoris
   */
  async addProductFavorite(userId: string, productId: string) {
    // Vérifier que le produit existe
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Vérifier si le favori existe déjà
    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Product already in favorites');
    }

    // Créer le favori
    return this.prisma.favorite.create({
      data: {
        userId,
        productId,
      },
      include: {
        product: {
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
        },
      },
    });
  }

  /**
   * Ajouter un artisan aux favoris
   */
  async addArtisanFavorite(userId: string, artisanId: string) {
    // Vérifier que l'artisan existe
    const artisan = await this.prisma.user.findFirst({
      where: {
        id: artisanId,
        role: 'ARTISAN',
      },
    });

    if (!artisan) {
      throw new NotFoundException('Artisan not found');
    }

    // Vérifier si le favori existe déjà
    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_artisanId: {
          userId,
          artisanId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Artisan already in favorites');
    }

    // Créer le favori
    return this.prisma.favorite.create({
      data: {
        userId,
        artisanId,
      },
      include: {
        artisan: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            artisanProfile: {
              select: {
                companyName: true,
                rating: true,
                reviewCount: true,
                specialties: true,
                baseAddress: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Récupérer tous les favoris d'un utilisateur
   */
  async getUserFavorites(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: {
        product: {
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
        },
        artisan: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            artisanProfile: {
              select: {
                companyName: true,
                rating: true,
                reviewCount: true,
                specialties: true,
                baseAddress: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Séparer les produits et les artisans
    const products = favorites
      .filter((f) => f.product !== null)
      .map((f: any) => ({
        id: f.id,
        createdAt: f.createdAt,
        product: f.product,
      }));

    const artisans = favorites
      .filter((f) => f.artisan !== null)
      .map((f: any) => ({
        id: f.id,
        createdAt: f.createdAt,
        artisan: f.artisan,
      }));

    return {
      products,
      artisans,
      total: favorites.length,
    };
  }

  /**
   * Récupérer uniquement les produits favoris
   */
  async getFavoriteProducts(userId: string) {
    return this.prisma.favorite.findMany({
      where: {
        userId,
        productId: { not: null },
      },
      include: {
        product: {
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
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Récupérer uniquement les artisans favoris
   */
  async getFavoriteArtisans(userId: string) {
    return this.prisma.favorite.findMany({
      where: {
        userId,
        artisanId: { not: null },
      },
      include: {
        artisan: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            artisanProfile: {
              select: {
                companyName: true,
                description: true,
                rating: true,
                reviewCount: true,
                specialties: true,
                baseAddress: true,
                available: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Supprimer un favori
   */
  async removeFavorite(userId: string, favoriteId: string) {
    const favorite = await this.prisma.favorite.findFirst({
      where: {
        id: favoriteId,
        userId, // Vérifier que le favori appartient bien à l'utilisateur
      },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    await this.prisma.favorite.delete({
      where: { id: favoriteId },
    });

    return { message: 'Favorite removed successfully' };
  }

  /**
   * Vérifier si un produit est dans les favoris
   */
  async isProductFavorite(userId: string, productId: string): Promise<boolean> {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return favorite !== null;
  }

  /**
   * Vérifier si un artisan est dans les favoris
   */
  async isArtisanFavorite(userId: string, artisanId: string): Promise<boolean> {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_artisanId: {
          userId,
          artisanId,
        },
      },
    });

    return favorite !== null;
  }

  /**
   * Statistiques des favoris
   */
  async getFavoritesStats(userId: string) {
    const [totalFavorites, productFavorites, artisanFavorites] = await Promise.all([
      this.prisma.favorite.count({ where: { userId } }),
      this.prisma.favorite.count({ where: { userId, productId: { not: null } } }),
      this.prisma.favorite.count({ where: { userId, artisanId: { not: null } } }),
    ]);

    return {
      total: totalFavorites,
      products: productFavorites,
      artisans: artisanFavorites,
    };
  }
}
