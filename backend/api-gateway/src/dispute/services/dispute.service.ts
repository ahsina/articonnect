import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDisputeDto, UpdateDisputeDto, ResolveDisputeDto } from '../dto/dispute.dto';
import { DisputeStatus } from '@prisma/client';

@Injectable()
export class DisputeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createDto: CreateDisputeDto) {
    // Verify mission exists and user is involved
    const mission = await this.prisma.mission.findUnique({
      where: { id: createDto.missionId },
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    // Check if user is client or artisan of the mission
    if (mission.clientId !== userId && mission.artisanId !== userId) {
      throw new ForbiddenException('Vous ne pouvez pas créer un litige pour cette mission');
    }

    // Check if mission is in appropriate status
    if (!['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(mission.status)) {
      throw new BadRequestException('Vous ne pouvez créer un litige que pour une mission acceptée, en cours ou terminée');
    }

    // Check if dispute already exists for this mission
    const existingDispute = await this.prisma.dispute.findFirst({
      where: {
        missionId: createDto.missionId,
        status: { in: [DisputeStatus.OPEN, DisputeStatus.IN_REVIEW] },
      },
    });

    if (existingDispute) {
      throw new BadRequestException('Un litige actif existe déjà pour cette mission');
    }

    // Create dispute
    const dispute = await this.prisma.dispute.create({
      data: {
        missionId: createDto.missionId,
        createdById: userId,
        reason: createDto.reason,
        description: createDto.description,
        priority: createDto.priority || 'MEDIUM',
      },
      include: {
        mission: {
          select: {
            title: true,
            category: true,
            status: true,
          },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return dispute;
  }

  async findAll(filters?: {
    status?: DisputeStatus;
    priority?: string;
    userId?: string;
  }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    if (filters?.userId) {
      where.OR = [
        { createdById: filters.userId },
        { mission: { clientId: filters.userId } },
        { mission: { artisanId: filters.userId } },
      ];
    }

    return this.prisma.dispute.findMany({
      where,
      include: {
        mission: {
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            artisan: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        resolvedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(disputeId: string, userId: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        mission: {
          include: {
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            artisan: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        resolvedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Litige introuvable');
    }

    // Check if user is involved in the dispute
    if (
      dispute.createdById !== userId &&
      dispute.mission.clientId !== userId &&
      dispute.mission.artisanId !== userId
    ) {
      throw new ForbiddenException('Accès refusé à ce litige');
    }

    return dispute;
  }

  async update(disputeId: string, userId: string, updateDto: UpdateDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { mission: true },
    });

    if (!dispute) {
      throw new NotFoundException('Litige introuvable');
    }

    // Only creator can update
    if (dispute.createdById !== userId) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres litiges');
    }

    // Can only update if not resolved or closed
    if (dispute.status === DisputeStatus.RESOLVED || dispute.status === DisputeStatus.CLOSED) {
      throw new BadRequestException('Impossible de modifier un litige résolu ou fermé');
    }

    return this.prisma.dispute.update({
      where: { id: disputeId },
      data: updateDto,
      include: {
        mission: {
          select: {
            title: true,
            category: true,
          },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async resolve(disputeId: string, adminId: string, resolveDto: ResolveDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException('Litige introuvable');
    }

    if (dispute.status === DisputeStatus.RESOLVED || dispute.status === DisputeStatus.CLOSED) {
      throw new BadRequestException('Ce litige est déjà résolu ou fermé');
    }

    return this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: DisputeStatus.RESOLVED,
        resolution: resolveDto.resolution,
        resolvedById: adminId,
        resolvedAt: new Date(),
      },
      include: {
        mission: {
          select: {
            title: true,
          },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        resolvedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async cancel(disputeId: string, userId: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException('Litige introuvable');
    }

    // Only creator can cancel
    if (dispute.createdById !== userId) {
      throw new ForbiddenException('Vous ne pouvez annuler que vos propres litiges');
    }

    // Can only cancel if not resolved
    if (dispute.status === DisputeStatus.RESOLVED) {
      throw new BadRequestException('Impossible d\'annuler un litige résolu');
    }

    return this.prisma.dispute.update({
      where: { id: disputeId },
      data: { status: DisputeStatus.CANCELLED },
    });
  }
}
