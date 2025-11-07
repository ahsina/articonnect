import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateMissionDto, UpdateMissionStatusDto } from '../dto/mission.dto';
import { MissionStatus } from '@prisma/client';

@Injectable()
export class MissionService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createDto: CreateMissionDto) {
    // Calculate VAT rate based on country
    const vatRate = this.getVatRate(createDto.country);

    const mission = await this.prisma.mission.create({
      data: {
        clientId: userId,
        type: createDto.type,
        title: createDto.title,
        description: createDto.description,
        category: createDto.category,
        address: createDto.address,
        city: createDto.city,
        postalCode: createDto.postalCode,
        country: createDto.country,
        latitude: createDto.latitude,
        longitude: createDto.longitude,
        scheduledFor: createDto.scheduledFor,
        clientBudget: createDto.clientBudget,
        vatRate,
        photos: createDto.photos || [],
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    // Trigger matching algorithm to find nearby artisans
    await this.findAndNotifyNearbyArtisans(mission);

    return mission;
  }

  async findAll(userId: string, role: string) {
    const where: {
      clientId?: string;
      artisanId?: string;
    } = {};

    if (role === 'CLIENT') {
      where.clientId = userId;
    } else if (role === 'ARTISAN') {
      where.artisanId = userId;
    }

    const missions = await this.prisma.mission.findMany({
      where,
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        artisan: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
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

    return missions;
  }

  async findOne(missionId: string, userId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        artisan: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            artisanProfile: {
              select: {
                companyName: true,
                rating: true,
                reviewCount: true,
              },
            },
          },
        },
        negotiations: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    // Check if user has access to this mission
    if (mission.clientId !== userId && mission.artisanId !== userId) {
      throw new ForbiddenException('Accès non autorisé');
    }

    return mission;
  }

  async updateStatus(
    missionId: string,
    userId: string,
    updateDto: UpdateMissionStatusDto,
  ) {
    const mission = await this.findOne(missionId, userId);

    // Validate status transitions
    this.validateStatusTransition(mission.status, updateDto.status);

    const updated = await this.prisma.mission.update({
      where: { id: missionId },
      data: {
        status: updateDto.status,
        ...(updateDto.status === MissionStatus.ACCEPTED && {
          acceptedAt: new Date(),
        }),
        ...(updateDto.status === MissionStatus.IN_PROGRESS && {
          startedAt: new Date(),
        }),
        ...(updateDto.status === MissionStatus.COMPLETED && {
          completedAt: new Date(),
        }),
        ...(updateDto.status === MissionStatus.CANCELLED && {
          cancelledAt: new Date(),
        }),
      },
    });

    return updated;
  }

  async acceptMission(missionId: string, artisanId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    if (mission.status !== MissionStatus.PENDING) {
      throw new BadRequestException('Cette mission n\'est plus disponible');
    }

    const updated = await this.prisma.mission.update({
      where: { id: missionId },
      data: {
        artisanId,
        status: MissionStatus.NEGOTIATING,
      },
    });

    // TODO: Send notification to client

    return updated;
  }

  async getNearbyMissions(
    artisanId: string,
    latitude: number,
    longitude: number,
    radiusKm: number = 20,
  ) {
    // Simple distance calculation (for production, use PostGIS or specialized geo queries)
    const missions = await this.prisma.mission.findMany({
      where: {
        status: MissionStatus.PENDING,
        artisanId: null,
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      take: 50,
    });

    // Filter by distance (simplified Haversine formula)
    const filtered = missions.filter((mission) => {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        mission.latitude,
        mission.longitude,
      );
      return distance <= radiusKm;
    });

    return filtered;
  }

  async findAndNotifyNearbyArtisans(mission: { id: string; category: string; latitude: number; longitude: number; title: string }) {
    // Find artisans with matching specialty and within service radius
    const artisans = await this.prisma.user.findMany({
      where: {
        role: 'ARTISAN',
        status: 'ACTIVE',
        artisanProfile: {
          available: true,
          specialties: {
            some: {
              category: mission.category,
            },
          },
        },
      },
      include: {
        artisanProfile: {
          select: {
            latitude: true,
            longitude: true,
            serviceRadius: true,
          },
        },
      },
    });

    // Filter artisans by distance
    const nearbyArtisans = artisans.filter((artisan) => {
      if (!artisan.artisanProfile) return false;

      const distance = this.calculateDistance(
        mission.latitude,
        mission.longitude,
        artisan.artisanProfile.latitude,
        artisan.artisanProfile.longitude,
      );

      return distance <= (artisan.artisanProfile.serviceRadius || 20);
    });

    // Send notifications to matched artisans (max 10)
    const artisansToNotify = nearbyArtisans.slice(0, 10);

    for (const artisan of artisansToNotify) {
      // Create notification in database
      await this.prisma.notification.create({
        data: {
          userId: artisan.id,
          type: 'NEW_MISSION',
          title: 'Nouvelle mission disponible',
          message: `Une nouvelle mission "${mission.title}" correspond à vos compétences`,
          link: `/artisan/missions/${mission.id}`,
          metadata: { missionId: mission.id },
        },
      });
    }

    return { notifiedCount: artisansToNotify.length };
  }

  private getVatRate(country: string): number {
    const vatRates = {
      LU: 17, // Luxembourg standard rate
      FR: 20, // France standard rate
      BE: 21, // Belgium standard rate
    };

    return vatRates[country] || 20;
  }

  private validateStatusTransition(
    current: MissionStatus,
    next: MissionStatus,
  ): void {
    const validTransitions: Record<MissionStatus, MissionStatus[]> = {
      [MissionStatus.PENDING]: [
        MissionStatus.NEGOTIATING,
        MissionStatus.CANCELLED,
      ],
      [MissionStatus.NEGOTIATING]: [
        MissionStatus.ACCEPTED,
        MissionStatus.CANCELLED,
      ],
      [MissionStatus.ACCEPTED]: [
        MissionStatus.PAID,
        MissionStatus.CANCELLED,
      ],
      [MissionStatus.PAID]: [
        MissionStatus.IN_PROGRESS,
        MissionStatus.CANCELLED,
      ],
      [MissionStatus.IN_PROGRESS]: [
        MissionStatus.COMPLETED,
        MissionStatus.DISPUTED,
      ],
      [MissionStatus.COMPLETED]: [],
      [MissionStatus.CANCELLED]: [],
      [MissionStatus.DISPUTED]: [
        MissionStatus.COMPLETED,
        MissionStatus.CANCELLED,
      ],
    };

    if (!validTransitions[current]?.includes(next)) {
      throw new BadRequestException(
        `Transition de statut invalide: ${current} -> ${next}`,
      );
    }
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth radius in km
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

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
