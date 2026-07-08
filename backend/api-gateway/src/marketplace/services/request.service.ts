import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { PrismaService } from '../../common/prisma/prisma.service';

export class CreateRequestDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  artisanId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  estimatedBudget?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: Date;
}

export class UpdateRequestDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  artisanId?: string;

  @IsOptional()
  @IsNumber()
  estimatedBudget?: number;
}

/**
 * Service de gestion des demandes de devis/mission
 */
@Injectable()
export class RequestService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Créer une nouvelle demande
   */
  async create(clientId: string, data: CreateRequestDto) {
    // Si un artisan est spécifié, vérifier qu'il existe
    if (data.artisanId) {
      const artisan = await this.prisma.user.findFirst({
        where: {
          id: data.artisanId,
          role: 'ARTISAN',
        },
      });

      if (!artisan) {
        throw new NotFoundException('Artisan not found');
      }
    }

    // Expiration par défaut: 30 jours
    const expiresAt = data.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return this.prisma.request.create({
      data: {
        clientId,
        artisanId: data.artisanId,
        title: data.title,
        description: data.description,
        category: data.category,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        latitude: data.latitude,
        longitude: data.longitude,
        estimatedBudget: data.estimatedBudget,
        expiresAt,
        status: 'PENDING',
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
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
    });
  }

  /**
   * Récupérer toutes les demandes (avec filtres)
   */
  async findAll(filters?: {
    clientId?: string;
    artisanId?: string;
    status?: string;
    category?: string;
  }) {
    const where: any = {};

    if (filters?.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters?.artisanId) {
      where.artisanId = filters.artisanId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    return this.prisma.request.findMany({
      where,
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
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
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Récupérer une demande par ID
   */
  async findOne(id: string) {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatar: true,
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
                description: true,
                rating: true,
                reviewCount: true,
                specialties: true,
              },
            },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    return request;
  }

  /**
   * Mettre à jour une demande
   */
  async update(id: string, userId: string, userRole: string, data: UpdateRequestDto) {
    const request = await this.prisma.request.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Vérifier les permissions
    if (userRole === 'CLIENT' && request.clientId !== userId) {
      throw new ForbiddenException('You can only update your own requests');
    }

    if (userRole === 'ARTISAN' && request.artisanId !== userId) {
      throw new ForbiddenException('You can only update requests assigned to you');
    }

    // Les clients peuvent modifier tout sauf le statut si un artisan est assigné
    if (userRole === 'CLIENT' && request.artisanId && data.status) {
      throw new ForbiddenException('Cannot change status when an artisan is assigned');
    }

    // Les artisans peuvent modifier le statut et le budget estimé
    if (userRole === 'ARTISAN') {
      const allowedStatuses = ['QUOTED', 'ACCEPTED', 'DECLINED'];
      if (data.status && !allowedStatuses.includes(data.status)) {
        throw new BadRequestException(`Invalid status. Allowed: ${allowedStatuses.join(', ')}`);
      }
    }

    return this.prisma.request.update({
      where: { id },
      data,
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        artisan: {
          select: {
            firstName: true,
            lastName: true,
            artisanProfile: {
              select: {
                companyName: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Supprimer une demande
   */
  async remove(id: string, userId: string, userRole: string) {
    const request = await this.prisma.request.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Seul le client créateur ou un admin peut supprimer
    if (userRole === 'CLIENT' && request.clientId !== userId) {
      throw new ForbiddenException('You can only delete your own requests');
    }

    if (userRole === 'ARTISAN') {
      throw new ForbiddenException('Artisans cannot delete requests');
    }

    await this.prisma.request.delete({
      where: { id },
    });

    return { message: 'Request deleted successfully' };
  }

  /**
   * Assigner un artisan à une demande
   */
  async assignArtisan(requestId: string, artisanId: string, clientId: string) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.clientId !== clientId) {
      throw new ForbiddenException('You can only assign artisans to your own requests');
    }

    if (request.artisanId) {
      throw new BadRequestException('An artisan is already assigned to this request');
    }

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

    return this.prisma.request.update({
      where: { id: requestId },
      data: {
        artisanId,
        status: 'PENDING', // Reset status when assigning
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

  /**
   * Récupérer les demandes expirées
   */
  async getExpiredRequests() {
    return this.prisma.request.findMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        status: {
          in: ['PENDING', 'QUOTED'],
        },
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Marquer les demandes expirées
   */
  async markExpiredRequests() {
    const expiredRequests = await this.getExpiredRequests();

    if (expiredRequests.length === 0) {
      return { count: 0, message: 'No expired requests' };
    }

    const result = await this.prisma.request.updateMany({
      where: {
        id: {
          in: expiredRequests.map((r) => r.id),
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    return {
      count: result.count,
      message: `Marked ${result.count} requests as expired`,
    };
  }

  /**
   * Statistiques des demandes
   */
  async getRequestStats(userId: string, userRole: string) {
    const where: any = {};

    if (userRole === 'CLIENT') {
      where.clientId = userId;
    } else if (userRole === 'ARTISAN') {
      where.artisanId = userId;
    }

    const [total, pending, quoted, accepted, declined, expired] = await Promise.all([
      this.prisma.request.count({ where }),
      this.prisma.request.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.request.count({ where: { ...where, status: 'QUOTED' } }),
      this.prisma.request.count({ where: { ...where, status: 'ACCEPTED' } }),
      this.prisma.request.count({ where: { ...where, status: 'DECLINED' } }),
      this.prisma.request.count({ where: { ...where, status: 'EXPIRED' } }),
    ]);

    return {
      total,
      pending,
      quoted,
      accepted,
      declined,
      expired,
    };
  }
}
