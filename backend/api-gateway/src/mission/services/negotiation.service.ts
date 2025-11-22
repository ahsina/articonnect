import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateNegotiationDto, AcceptNegotiationDto } from '../dto/negotiation.dto';
import { NotificationService } from '../../notification/services/notification.service';
import { MissionType } from '@prisma/client';

@Injectable()
export class NegotiationService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async create(userId: string, createDto: CreateNegotiationDto) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: createDto.missionId },
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    // Check negotiation limit (max 5 exchanges per mission)
    const existingNegotiationsCount = await this.prisma.negotiation.count({
      where: { missionId: createDto.missionId },
    });

    if (existingNegotiationsCount >= 5) {
      throw new BadRequestException(
        'Limite de négociations atteinte (maximum 5 échanges). Veuillez accepter une offre ou créer une nouvelle demande.'
      );
    }

    // Determine sender and receiver
    let receiverId: string;
    if (mission.clientId === userId) {
      receiverId = mission.artisanId;
    } else if (mission.artisanId === userId) {
      receiverId = mission.clientId;
    } else {
      throw new ForbiddenException('Vous n\'êtes pas autorisé à négocier sur cette mission');
    }

    // Calculate expiration based on mission type
    const expiresAt = this.calculateNegotiationExpiration(mission.type);

    const negotiation = await this.prisma.negotiation.create({
      data: {
        missionId: createDto.missionId,
        senderId: userId,
        receiverId,
        proposedPrice: createDto.proposedPrice,
        laborCost: createDto.laborCost,
        materialCost: createDto.materialCost,
        travelCost: createDto.travelCost,
        message: createDto.message,
        expiresAt,
      },
    });

    // Send notification to receiver
    await this.notificationService.notifyNegotiationReceived(
      receiverId,
      mission.id,
      createDto.proposedPrice,
    );

    return negotiation;
  }

  /**
   * Calculate negotiation expiration based on mission type
   * - EMERGENCY: 15 minutes
   * - SCHEDULED/QUOTE: 24 hours
   */
  private calculateNegotiationExpiration(missionType: MissionType): Date {
    const now = new Date();

    if (missionType === 'EMERGENCY') {
      // 15 minutes for emergency missions
      return new Date(now.getTime() + 15 * 60 * 1000);
    } else {
      // 24 hours for standard missions
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  async accept(userId: string, negotiationId: string, dto: AcceptNegotiationDto) {
    const negotiation = await this.prisma.negotiation.findUnique({
      where: { id: negotiationId },
      include: { mission: true },
    });

    if (!negotiation) {
      throw new NotFoundException('Négociation introuvable');
    }

    // Only receiver can accept
    if (negotiation.receiverId !== userId) {
      throw new ForbiddenException('Vous ne pouvez pas accepter cette offre');
    }

    // Check if negotiation has expired
    if (negotiation.expiresAt && new Date() > negotiation.expiresAt) {
      throw new BadRequestException(
        'Cette négociation a expiré. Veuillez créer une nouvelle offre.'
      );
    }

    // Update negotiation
    const updated = await this.prisma.negotiation.update({
      where: { id: negotiationId },
      data: {
        accepted: dto.accepted,
        ...(dto.rejectedReason && { rejectedReason: dto.rejectedReason }),
      },
    });

    // If accepted, update mission
    if (dto.accepted) {
      await this.prisma.mission.update({
        where: { id: negotiation.missionId },
        data: {
          agreedPrice: negotiation.proposedPrice,
          status: 'ACCEPTED',
        },
      });
    }

    return updated;
  }

  async findByMission(missionId: string, userId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    if (mission.clientId !== userId && mission.artisanId !== userId) {
      throw new ForbiddenException('Accès non autorisé');
    }

    return this.prisma.negotiation.findMany({
      where: { missionId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
