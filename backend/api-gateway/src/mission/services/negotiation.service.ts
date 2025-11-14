import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateNegotiationDto, AcceptNegotiationDto } from '../dto/negotiation.dto';
import { NotificationService } from '../../notification/services/notification.service';

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

    // Determine sender and receiver
    let receiverId: string;
    if (mission.clientId === userId) {
      receiverId = mission.artisanId;
    } else if (mission.artisanId === userId) {
      receiverId = mission.clientId;
    } else {
      throw new ForbiddenException('Vous n\'êtes pas autorisé à négocier sur cette mission');
    }

    const negotiation = await this.prisma.negotiation.create({
      data: {
        missionId: createDto.missionId,
        senderId: userId,
        receiverId,
        proposedPrice: createDto.proposedPrice,
        message: createDto.message,
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
