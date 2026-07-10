import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MissionStatus, Prisma } from '@prisma/client';

export interface MissionSearchFilters {
  // Text search
  query?: string;

  // Category filters
  category?: string;
  categories?: string[];

  // Location filters
  city?: string;
  region?: string;
  maxDistance?: number;
  latitude?: number;
  longitude?: number;

  // Budget filters
  minBudget?: number;
  maxBudget?: number;

  // Date filters
  scheduledFrom?: Date;
  scheduledTo?: Date;
  createdAfter?: Date;
  createdBefore?: Date;

  // Status filters
  status?: MissionStatus;
  statuses?: MissionStatus[];

  // Urgency filter
  isUrgent?: boolean;

  // Artisan filters (for artisan-specific searches)
  requiresVerification?: boolean;
  minRating?: number;

  // Client filters
  clientId?: string;
  artisanId?: string;

  // Sorting
  sortBy?: 'createdAt' | 'scheduledFor' | 'clientBudget' | 'distance';
  sortOrder?: 'asc' | 'desc';

  // Pagination
  page?: number;
  limit?: number;
}

export interface MissionSearchResult {
  missions: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class MissionSearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search missions with advanced filters
   */
  async searchMissions(
    filters: MissionSearchFilters,
    viewerId?: string,
  ): Promise<MissionSearchResult> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.MissionWhereInput = this.buildWhereClause(filters);

    // Build order by clause
    const orderBy = this.buildOrderByClause(filters);

    // Execute query
    const [missions, total] = await Promise.all([
      this.prisma.mission.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          // Select WHITELIST — jamais email/phone (anti-désintermédiation / RGPD).
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          artisan: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              // WHITELIST du profil artisan embarqué : jamais baseAddress / latitude / longitude
              // bruts (l'adresse exacte de l'artisan fuirait via l'annuaire des missions).
              // redactMissionLocation ne caviarde que l'adresse de la MISSION, pas ce sous-objet.
              artisanProfile: {
                select: {
                  id: true,
                  companyName: true,
                  description: true,
                  rating: true,
                  reviewCount: true,
                  missionCount: true,
                  serviceRadius: true,
                  available: true,
                  hourlyRate: true,
                  emergencyRate: true,
                  businessVerified: true,
                  businessVerificationStatus: true,
                  specialties: true,
                },
              },
            },
          },
          // Statut escrow pour décider de la révélation de l'adresse exacte à l'artisan assigné.
          transaction: { select: { status: true } },
        },
      }),
      this.prisma.mission.count({ where }),
    ]);

    // Calculate distance if coordinates provided
    let enrichedMissions = missions;
    if (filters.latitude && filters.longitude) {
      enrichedMissions = this.calculateDistances(
        missions,
        filters.latitude,
        filters.longitude,
      );

      // Sort by distance if requested
      if (filters.sortBy === 'distance') {
        enrichedMissions.sort((a, b) => {
          const distA = (a as any).distance || Infinity;
          const distB = (b as any).distance || Infinity;
          return filters.sortOrder === 'desc' ? distB - distA : distA - distB;
        });
      }
    }

    return {
      // Adresse exacte masquée (zone approximative) sauf pour l'artisan assigné après escrow.
      missions: enrichedMissions.map((m) => this.redactMissionLocation(m, viewerId)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * « Payée en escrow » : Transaction HELD/COMPLETED OU mission.status avancé (post-paiement) OU
   * depositPaidAt posé.
   */
  private isMissionPaidInEscrow(mission: any): boolean {
    const paidStatuses = [
      'PAID',
      'DEPOSIT_PAID',
      'IN_TRANSIT',
      'IN_PROGRESS',
      'COMPLETED',
      'AUTO_VALIDATED',
    ];
    const txStatus = mission?.transaction?.status;
    return (
      !!mission?.depositPaidAt ||
      txStatus === 'HELD' ||
      txStatus === 'COMPLETED' ||
      paidStatuses.includes(String(mission?.status))
    );
  }

  /**
   * Adresse exacte (rue + code postal + lat/lng précis) révélée UNIQUEMENT à l'artisan assigné après
   * escrow sécurisé. Sinon : seulement ville + lat/lng arrondis (~1 km) + drapeau approximatif.
   */
  private redactMissionLocation(mission: any, viewerId?: string) {
    if (!mission) return mission;
    const isAssignedArtisan =
      !!viewerId && !!mission.artisanId && mission.artisanId === viewerId;
    if (isAssignedArtisan && this.isMissionPaidInEscrow(mission)) {
      // Ne pas divulguer l'objet transaction (montants) même dans ce cas.
      const { transaction: _t, ...full } = mission;
      return full;
    }
    const {
      address: _address,
      postalCode: _postalCode,
      latitude,
      longitude,
      transaction: _transaction,
      ...rest
    } = mission;
    return {
      ...rest,
      city: mission.city,
      latitude: latitude != null ? Math.round(latitude * 100) / 100 : latitude,
      longitude: longitude != null ? Math.round(longitude * 100) / 100 : longitude,
      addressApproximate: true,
    };
  }

  /**
   * Get mission recommendations for an artisan based on their profile
   */
  async getRecommendationsForArtisan(
    artisanId: string,
    limit: number = 10,
  ): Promise<any[]> {
    // Get artisan profile
    const artisan = await this.prisma.user.findUnique({
      where: { id: artisanId },
      include: {
        artisanProfile: {
          include: {
            specialties: true,
          },
        },
      },
    });

    if (!artisan || !artisan.artisanProfile) {
      return [];
    }

    // Get categories from specialties
    const categories = artisan.artisanProfile.specialties.map(s => s.category);

    // Build recommendations based on artisan's specialties and location
    const recommendations = await this.prisma.mission.findMany({
      where: {
        status: MissionStatus.PENDING,
        ...(categories.length > 0 && { category: { in: categories } }),
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
      take: limit,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Missions PENDING ouvertes : zone approximative (jamais l'adresse exacte avant escrow).
    return recommendations.map((m) => this.redactMissionLocation(m, artisanId));
  }

  /**
   * Get similar missions based on a reference mission
   */
  async getSimilarMissions(
    missionId: string,
    limit: number = 5,
    viewerId?: string,
  ): Promise<any[]> {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      return [];
    }

    const similar = await this.prisma.mission.findMany({
      where: {
        id: { not: missionId },
        status: MissionStatus.PENDING,
        OR: [
          { category: mission.category },
          { city: mission.city },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Missions PENDING ouvertes : zone approximative (jamais l'adresse exacte avant escrow).
    return similar.map((m) => this.redactMissionLocation(m, viewerId));
  }

  /**
   * Private: Build WHERE clause from filters
   */
  private buildWhereClause(filters: MissionSearchFilters): Prisma.MissionWhereInput {
    const where: Prisma.MissionWhereInput = {};

    // Text search
    if (filters.query) {
      where.OR = [
        { title: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
      ];
    }

    // Category filters
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.categories && filters.categories.length > 0) {
      where.category = { in: filters.categories };
    }

    // Location filters
    if (filters.city) {
      where.city = filters.city;
    }

    // Budget filters
    if (filters.minBudget !== undefined || filters.maxBudget !== undefined) {
      where.clientBudget = {};
      if (filters.minBudget !== undefined) {
        where.clientBudget.gte = filters.minBudget;
      }
      if (filters.maxBudget !== undefined) {
        where.clientBudget.lte = filters.maxBudget;
      }
    }

    // Date filters
    if (filters.scheduledFrom || filters.scheduledTo) {
      where.scheduledFor = {};
      if (filters.scheduledFrom) {
        where.scheduledFor.gte = filters.scheduledFrom;
      }
      if (filters.scheduledTo) {
        where.scheduledFor.lte = filters.scheduledTo;
      }
    }

    if (filters.createdAfter || filters.createdBefore) {
      where.createdAt = {};
      if (filters.createdAfter) {
        where.createdAt.gte = filters.createdAfter;
      }
      if (filters.createdBefore) {
        where.createdAt.lte = filters.createdBefore;
      }
    }

    // Status filters
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.statuses && filters.statuses.length > 0) {
      where.status = { in: filters.statuses };
    }

    // Client/Artisan filters
    if (filters.clientId) {
      where.clientId = filters.clientId;
    }
    if (filters.artisanId) {
      where.artisanId = filters.artisanId;
    }

    return where;
  }

  /**
   * Private: Build ORDER BY clause
   */
  private buildOrderByClause(
    filters: MissionSearchFilters,
  ): Prisma.MissionOrderByWithRelationInput | Prisma.MissionOrderByWithRelationInput[] {
    const sortOrder = filters.sortOrder || 'desc';

    if (filters.sortBy === 'createdAt') {
      return { createdAt: sortOrder };
    } else if (filters.sortBy === 'scheduledFor') {
      return { scheduledFor: sortOrder };
    } else if (filters.sortBy === 'clientBudget') {
      return { clientBudget: sortOrder };
    }

    // Default: newest first
    return { createdAt: 'desc' };
  }

  /**
   * Private: Calculate distances from a reference point
   */
  private calculateDistances(
    missions: any[],
    refLat: number,
    refLng: number,
  ): any[] {
    return missions.map((mission) => {
      if (mission.address && mission.address.latitude && mission.address.longitude) {
        const distance = this.calculateHaversineDistance(
          refLat,
          refLng,
          Number(mission.address.latitude),
          Number(mission.address.longitude),
        );

        return {
          ...mission,
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal
        };
      }

      return mission;
    });
  }

  /**
   * Private: Calculate distance between two coordinates (Haversine formula)
   */
  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radius of Earth in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Private: Convert degrees to radians
   */
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
