import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateNegotiationDto, AcceptNegotiationDto } from '../dto/negotiation.dto';
import { NotificationService } from '../../notification/services/notification.service';
import { MissionType } from '@prisma/client';
import { PriceAnomalyDetectorService } from '../../fraud/services/price-anomaly-detector.service';
import { FeatureToggleService } from '../../fraud/services/feature-toggle.service';

@Injectable()
export class NegotiationService {
  private readonly logger = new Logger(NegotiationService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private priceAnomalyDetector: PriceAnomalyDetectorService,
    private featureToggle: FeatureToggleService,
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

    // Pas de contrepartie (ex: aucun artisan encore assigné) : refus propre (400) au lieu d'un crash.
    if (!receiverId) {
      throw new BadRequestException(
        'Aucun artisan n\'est assigné à cette mission : la négociation n\'est pas possible.'
      );
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

    // If accepted, update mission and check for price anomalies
    if (dto.accepted) {
      await this.prisma.mission.update({
        where: { id: negotiation.missionId },
        data: {
          agreedPrice: negotiation.proposedPrice,
          status: 'ACCEPTED',
        },
      });

      // Price Anomaly Detection (if enabled)
      const isPriceAnomalyDetectionEnabled = await this.featureToggle.isPriceAnomalyDetectionEnabled();
      if (isPriceAnomalyDetectionEnabled) {
        try {
          const anomalyResult = await this.priceAnomalyDetector.detectPriceAnomaly(
            negotiation.missionId
          );

          // Update mission with anomaly detection results
          await this.prisma.mission.update({
            where: { id: negotiation.missionId },
            data: {
              priceAnomalyFlag: anomalyResult.isAnomalous,
              expectedPrice: anomalyResult.expectedPrice,
              priceDeviation: anomalyResult.deviationPercentage,
              priceAnomalySignals: anomalyResult.signals.map((s) => s.type),
            },
          });

          // Auto-flag for review if enabled
          const autoFlagEnabled = await this.featureToggle.isPriceAutoFlagEnabled();
          const deviationThreshold = await this.featureToggle.getPriceDeviationThreshold();

          if (autoFlagEnabled &&
              anomalyResult.isAnomalous &&
              anomalyResult.deviationPercentage <= deviationThreshold) {

            this.logger.warn(
              `Mission ${negotiation.missionId} price flagged as anomalous: ${Number(negotiation.proposedPrice)}€ ` +
              `(expected: ${Number(anomalyResult.expectedPrice)}€, deviation: ${anomalyResult.deviationPercentage}%)`
            );

            // Could send notification to admin for manual review
            // await this.notificationService.notifyAdminPriceAnomaly(...)
          }
        } catch (error) {
          this.logger.error(`Failed to run price anomaly detection:`, error);
          // Don't block price agreement if fraud detection fails
        }
      }
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
