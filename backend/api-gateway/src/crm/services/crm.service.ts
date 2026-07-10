import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateClientRelationshipDto,
  UpdateClientRelationshipDto,
  CreateFollowUpDto,
  UpdateFollowUpDto,
  ClientFilterDto,
  FollowUpStatus,
} from '../dto/crm.dto';

// Plafond dur de fiches renvoyées par page (anti-export de masse / anti-poaching).
const MAX_CLIENT_PAGE_SIZE = 50;

// Projection client "suivi only" façon Uber : JAMAIS d'email ni de téléphone en clair.
// Le CRM sert au suivi de la relation, pas à exfiltrer un carnet d'adresses. Tout contact
// doit passer par la plateforme (mission → chat/relais), pas par des coordonnées dumpées.
const CLIENT_CRM_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
} as const;

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  async createRelationship(artisanId: string, dto: CreateClientRelationshipDto) {
    // Check if relationship already exists
    const existing = await this.prisma.clientRelationship.findUnique({
      where: {
        artisanId_clientId: {
          artisanId,
          clientId: dto.clientId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Client relationship already exists');
    }

    return this.prisma.clientRelationship.create({
      data: {
        artisanId,
        clientId: dto.clientId,
        status: dto.status || 'ACTIVE',
        clientType: dto.clientType || 'REGULAR',
        tags: dto.tags || [],
        preferredContactMethod: dto.preferredContactMethod,
        preferredContactTime: dto.preferredContactTime,
        notes: dto.notes,
        acquisitionSource: dto.acquisitionSource,
      },
      include: {
        client: {
          select: CLIENT_CRM_SELECT,
        },
      },
    });
  }

  async findAllClients(artisanId: string, filters: ClientFilterDto) {
    const { status, clientType, search } = filters;

    // Clamp défensif : même si le @Max(50) du DTO était contourné (validation désactivée,
    // appel interne, etc.), on ne renvoie jamais plus de MAX_CLIENT_PAGE_SIZE fiches par page.
    const page = Math.max(1, Math.floor(filters.page ?? 1));
    const limit = Math.min(
      Math.max(1, Math.floor(filters.limit ?? 20)),
      MAX_CLIENT_PAGE_SIZE,
    );

    const where: any = { artisanId };

    if (status) where.status = status;
    if (clientType) where.clientType = clientType;
    if (search) {
      where.client = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [relationships, total] = await Promise.all([
      this.prisma.clientRelationship.findMany({
        where,
        include: {
          client: {
            select: CLIENT_CRM_SELECT,
          },
          followUps: {
            where: { status: 'PENDING' },
            orderBy: { dueDate: 'asc' },
            take: 1,
          },
        },
        orderBy: { lastContactDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.clientRelationship.count({ where }),
    ]);

    return {
      data: relationships,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRelationship(id: string, artisanId: string) {
    const relationship = await this.prisma.clientRelationship.findUnique({
      where: { id },
      include: {
        client: {
          select: CLIENT_CRM_SELECT,
        },
        followUps: {
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!relationship) {
      throw new NotFoundException('Client relationship not found');
    }

    if (relationship.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    // Get mission history
    const missions = await this.prisma.mission.findMany({
      where: {
        artisanId,
        clientId: relationship.clientId,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        status: true,
        finalPrice: true,
        completedAt: true,
        createdAt: true,
      },
    });

    return { ...relationship, missions };
  }

  async updateRelationship(id: string, artisanId: string, dto: UpdateClientRelationshipDto) {
    const relationship = await this.prisma.clientRelationship.findUnique({
      where: { id },
    });

    if (!relationship) {
      throw new NotFoundException('Client relationship not found');
    }

    if (relationship.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.clientRelationship.update({
      where: { id },
      data: {
        status: dto.status,
        clientType: dto.clientType,
        tags: dto.tags,
        preferredContactMethod: dto.preferredContactMethod,
        preferredContactTime: dto.preferredContactTime,
        notes: dto.notes,
        lastContactDate: new Date(),
      },
      include: {
        client: {
          select: CLIENT_CRM_SELECT,
        },
      },
    });
  }

  async deleteRelationship(id: string, artisanId: string) {
    const relationship = await this.prisma.clientRelationship.findUnique({
      where: { id },
    });

    if (!relationship) {
      throw new NotFoundException('Client relationship not found');
    }

    if (relationship.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.clientRelationship.delete({ where: { id } });

    return { success: true };
  }

  // Follow-ups

  async createFollowUp(artisanId: string, dto: CreateFollowUpDto) {
    const relationship = await this.prisma.clientRelationship.findUnique({
      where: { id: dto.relationshipId },
    });

    if (!relationship) {
      throw new NotFoundException('Client relationship not found');
    }

    if (relationship.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.clientFollowUp.create({
      data: {
        relationshipId: dto.relationshipId,
        title: dto.title,
        description: dto.description,
        type: dto.type || 'GENERAL',
        dueDate: new Date(dto.dueDate),
        reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : null,
        missionId: dto.missionId,
        quoteId: dto.quoteId,
      },
    });
  }

  async getFollowUps(artisanId: string, status?: string) {
    const where: any = {
      relationship: { artisanId },
    };

    if (status) {
      where.status = status;
    }

    return this.prisma.clientFollowUp.findMany({
      where,
      include: {
        relationship: {
          include: {
            client: {
              select: CLIENT_CRM_SELECT,
            },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async updateFollowUp(id: string, artisanId: string, dto: UpdateFollowUpDto) {
    const followUp = await this.prisma.clientFollowUp.findUnique({
      where: { id },
      include: { relationship: true },
    });

    if (!followUp) {
      throw new NotFoundException('Follow-up not found');
    }

    if (followUp.relationship.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.clientFollowUp.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : undefined,
        status: dto.status,
        outcome: dto.outcome,
        completedAt: dto.status === FollowUpStatus.COMPLETED ? new Date() : undefined,
      },
    });
  }

  async deleteFollowUp(id: string, artisanId: string) {
    const followUp = await this.prisma.clientFollowUp.findUnique({
      where: { id },
      include: { relationship: true },
    });

    if (!followUp) {
      throw new NotFoundException('Follow-up not found');
    }

    if (followUp.relationship.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.clientFollowUp.delete({ where: { id } });

    return { success: true };
  }

  // Auto-update stats after mission completion
  async updateClientStats(artisanId: string, clientId: string, missionValue: number) {
    const relationship = await this.prisma.clientRelationship.findUnique({
      where: {
        artisanId_clientId: { artisanId, clientId },
      },
    });

    if (!relationship) return;

    const newTotalMissions = relationship.totalMissions + 1;
    const newTotalSpent = Number(relationship.totalSpent) + missionValue;
    const newAverage = newTotalSpent / newTotalMissions;

    await this.prisma.clientRelationship.update({
      where: { id: relationship.id },
      data: {
        totalMissions: newTotalMissions,
        totalSpent: newTotalSpent,
        averageMissionValue: newAverage,
        lastMissionDate: new Date(),
        lastContactDate: new Date(),
      },
    });
  }

  async getStats(artisanId: string) {
    const [total, active, vip, commercial] = await Promise.all([
      this.prisma.clientRelationship.count({ where: { artisanId } }),
      this.prisma.clientRelationship.count({ where: { artisanId, status: 'ACTIVE' } }),
      this.prisma.clientRelationship.count({ where: { artisanId, clientType: 'VIP' } }),
      this.prisma.clientRelationship.count({ where: { artisanId, clientType: 'COMMERCIAL' } }),
    ]);

    const pendingFollowUps = await this.prisma.clientFollowUp.count({
      where: {
        relationship: { artisanId },
        status: 'PENDING',
      },
    });

    const overdueFollowUps = await this.prisma.clientFollowUp.count({
      where: {
        relationship: { artisanId },
        status: 'PENDING',
        dueDate: { lt: new Date() },
      },
    });

    const totalRevenue = await this.prisma.clientRelationship.aggregate({
      where: { artisanId },
      _sum: { totalSpent: true },
    });

    return {
      totalClients: total,
      activeClients: active,
      vipClients: vip,
      commercialClients: commercial,
      pendingFollowUps,
      overdueFollowUps,
      totalRevenue: totalRevenue._sum.totalSpent || 0,
    };
  }
}
