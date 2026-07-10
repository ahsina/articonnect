import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class FavoriteService {
  constructor(private readonly prisma: PrismaService) {}

  async addFavorite(userId: string, artisanId: string) {
    // Get client profile
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { clientProfile: true },
    });

    if (!user || !user.clientProfile) {
      throw new ForbiddenException('Profil client requis');
    }

    // Verify artisan exists
    const artisan = await this.prisma.user.findUnique({
      where: { id: artisanId },
      include: { artisanProfile: true },
    });

    if (!artisan || artisan.role !== 'ARTISAN' || !artisan.artisanProfile) {
      throw new NotFoundException('Artisan introuvable');
    }

    // Check if already saved
    const existing = await this.prisma.savedArtisan.findUnique({
      where: {
        clientId_artisanId: {
          clientId: user.clientProfile.id,
          artisanId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Artisan déjà dans vos favoris');
    }

    // Add to favorites
    return this.prisma.savedArtisan.create({
      data: {
        clientId: user.clientProfile.id,
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
              },
            },
          },
        },
      },
    });
  }

  async removeFavorite(userId: string, artisanId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { clientProfile: true },
    });

    if (!user || !user.clientProfile) {
      throw new ForbiddenException('Profil client requis');
    }

    const saved = await this.prisma.savedArtisan.findUnique({
      where: {
        clientId_artisanId: {
          clientId: user.clientProfile.id,
          artisanId,
        },
      },
    });

    if (!saved) {
      // DELETE idempotent : déjà absent (ex: favori orphelin) -> succès, pas d'erreur 404.
      return { success: true, alreadyRemoved: true };
    }

    await this.prisma.savedArtisan.delete({
      where: {
        clientId_artisanId: {
          clientId: user.clientProfile.id,
          artisanId,
        },
      },
    });

    return { message: 'Artisan retiré des favoris' };
  }

  async getFavorites(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { clientProfile: true },
    });

    if (!user || !user.clientProfile) {
      return [];
    }

    return this.prisma.savedArtisan.findMany({
      where: { clientId: user.clientProfile.id },
      include: {
        artisan: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            // Anti-désintermédiation : un favori ne doit PAS servir de carnet d'adresses.
            // On ne renvoie jamais l'email/téléphone de l'artisan favori — le contact réel
            // n'est révélé qu'après paiement escrow d'une mission (politique « à la Uber »).
            artisanProfile: {
              select: {
                companyName: true,
                rating: true,
                reviewCount: true,
                specialties: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async isFavorite(userId: string, artisanId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { clientProfile: true },
    });

    if (!user || !user.clientProfile) {
      return { isFavorite: false };
    }

    const saved = await this.prisma.savedArtisan.findUnique({
      where: {
        clientId_artisanId: {
          clientId: user.clientProfile.id,
          artisanId,
        },
      },
    });

    return { isFavorite: !!saved };
  }
}
