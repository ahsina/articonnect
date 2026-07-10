import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateNegotiationDto, AcceptNegotiationDto } from '../dto/negotiation.dto';
import { NotificationService } from '../../notification/services/notification.service';
import { MissionType, MissionStatus } from '@prisma/client';
import { PriceAnomalyDetectorService } from '../../fraud/services/price-anomaly-detector.service';
import { FeatureToggleService } from '../../fraud/services/feature-toggle.service';
import { ContentFilterService } from '../../chat/services/content-filter.service';

@Injectable()
export class NegotiationService {
  private readonly logger = new Logger(NegotiationService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private priceAnomalyDetector: PriceAnomalyDetectorService,
    private featureToggle: FeatureToggleService,
    private contentFilter: ContentFilterService,
  ) {}

  async create(userId: string, createDto: CreateNegotiationDto) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: createDto.missionId },
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    // Limite d'échanges PAR PARTICIPANT (5) — permet à plusieurs artisans d'offrir sur une même mission
    // ouverte sans épuiser un quota global.
    const myExchangesCount = await this.prisma.negotiation.count({
      where: { missionId: createDto.missionId, senderId: userId },
    });

    if (myExchangesCount >= 5) {
      throw new BadRequestException(
        'Limite de négociations atteinte (maximum 5 échanges de votre part sur cette mission).'
      );
    }

    // Determine sender and receiver
    let receiverId: string;
    const missionOpen = ['PENDING', 'NEGOTIATING'].includes(mission.status as string);
    if (mission.clientId === userId) {
      if (mission.artisanId) {
        // Un artisan est déjà assigné : le client négocie directement avec lui.
        receiverId = mission.artisanId;
      } else if (createDto.targetArtisanId) {
        // Mission multi-offres non assignée : le client CONTRE-PROPOSE à un artisan précis.
        // On exige que cet artisan ait déjà fait une offre sur la mission (sinon cible invalide).
        const artisanOffer = await this.prisma.negotiation.findFirst({
          where: { missionId: mission.id, senderId: createDto.targetArtisanId },
        });
        if (!artisanOffer) {
          throw new BadRequestException(
            'Cet artisan n\'a pas fait d\'offre sur cette mission : impossible de lui contre-proposer.'
          );
        }
        receiverId = createDto.targetArtisanId;
      } else {
        // Multi-offres sans cible : message clair plutôt qu'un 400 générique « aucun artisan assigné ».
        throw new BadRequestException(
          'Aucun artisan n\'est encore assigné. Pour contre-proposer, précisez « targetArtisanId » (un artisan ayant déjà fait une offre).'
        );
      }
    } else if (mission.artisanId === userId) {
      // Artisan déjà assigné
      receiverId = mission.clientId;
    } else if (!mission.artisanId && missionOpen) {
      // Artisan CANDIDAT : fait une offre sur une mission ouverte (aucun artisan encore choisi).
      // Le client comparera toutes les offres reçues et en choisira une.
      receiverId = mission.clientId;
      if (mission.status === 'PENDING') {
        await this.prisma.mission.update({
          where: { id: mission.id },
          data: { status: 'NEGOTIATING' },
        });
      }
    } else {
      throw new ForbiddenException('Vous n\'êtes pas autorisé à négocier sur cette mission');
    }

    // Pas de contrepartie (ex: aucun artisan encore assigné) : refus propre (400) au lieu d'un crash.
    if (!receiverId) {
      throw new BadRequestException(
        'Aucun artisan n\'est assigné à cette mission : la négociation n\'est pas possible.'
      );
    }

    // Anti-désintermédiation : le canal négociation/offre était le SEUL canal texte non filtré.
    // On applique le MÊME filtre anti-coordonnées que le chat AVANT de stocker le message.
    // - Violation HIGH (téléphone/email/URL/app de messagerie…) → 400 explicite (comme le chat).
    // - Sinon on stocke la version FILTRÉE (motifs MEDIUM masqués) plutôt que le brut.
    let messageToStore = createDto.message;
    if (createDto.message && createDto.message.trim().length > 0) {
      const filterResult = await this.contentFilter.filterContent(
        createDto.message,
        userId,
        'negotiation',
      );
      if (filterResult.isBlocked) {
        throw new BadRequestException({
          message:
            'Votre offre contient des coordonnées interdites. Communiquez uniquement via Krafolt.',
          code: 'CONTACT_INFO_BLOCKED',
        });
      }
      // Si des motifs (MEDIUM) ont été détectés, on persiste la version masquée, pas le brut.
      messageToStore =
        filterResult.detectedPatterns.length > 0
          ? filterResult.filteredContent
          : createDto.message;
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
        message: messageToStore,
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

    // GARDE (client-10) : une offre déjà traitée (acceptée OU refusée) ne peut être re-traitée.
    // Empêche qu'une offre perdante soit ré-acceptée et écrase agreedPrice / repasse accepted=true.
    if (negotiation.accepted !== null) {
      throw new ConflictException(
        'Cette offre a déjà été traitée (acceptée ou refusée) : elle ne peut plus être modifiée.'
      );
    }

    // GARDE (client-10) : on n'attribue/négocie que sur une mission encore OUVERTE.
    // Une fois ACCEPTED/IN_PROGRESS/…, le prix convenu et l'artisan sont figés.
    const openStatuses: MissionStatus[] = [MissionStatus.PENDING, MissionStatus.NEGOTIATING];
    if (!openStatuses.includes(negotiation.mission.status)) {
      throw new ConflictException(
        'Cette mission n\'est plus ouverte : elle a déjà été attribuée ou clôturée.'
      );
    }

    // L'artisan gagnant = le participant qui n'est pas le client.
    const artisanParticipant =
      negotiation.senderId === negotiation.mission.clientId
        ? negotiation.receiverId
        : negotiation.senderId;

    // Transaction ATOMIQUE (client-10 + artisan-17 « idem ») : toutes les écritures sont conditionnées
    // sur l'état lu, via des updateMany gardés. Deux acceptations concurrentes ne peuvent donc pas
    // toutes deux réussir (le second updateMany renvoie count=0 → 409).
    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Marquer CETTE offre — uniquement si elle est encore en attente (accepted=null).
      const negResult = await tx.negotiation.updateMany({
        where: { id: negotiationId, accepted: null },
        data: {
          accepted: dto.accepted,
          ...(dto.rejectedReason && { rejectedReason: dto.rejectedReason }),
        },
      });
      if (negResult.count === 0) {
        // Une requête concurrente a déjà traité cette offre.
        throw new ConflictException(
          'Cette offre a déjà été traitée (acceptée ou refusée) : elle ne peut plus être modifiée.'
        );
      }

      if (dto.accepted) {
        // 2. Attribuer la mission de façon ATOMIQUE : la mise à jour ne s'applique que si la mission
        //    est TOUJOURS ouverte. Si une autre offre vient d'être acceptée (statut passé à ACCEPTED),
        //    count=0 → on lève 409 et la transaction est annulée (rollback de l'étape 1).
        const missionResult = await tx.mission.updateMany({
          where: { id: negotiation.missionId, status: { in: openStatuses } },
          data: {
            agreedPrice: negotiation.proposedPrice,
            status: MissionStatus.ACCEPTED,
            // Assigner l'artisan choisi (si pas déjà assigné) — cœur du choix multi-offres.
            ...(negotiation.mission.artisanId ? {} : { artisanId: artisanParticipant }),
          },
        });
        if (missionResult.count === 0) {
          throw new ConflictException(
            'Cette mission n\'est plus disponible : elle vient d\'être attribuée.'
          );
        }

        // 3. Rejeter automatiquement les autres offres en attente sur cette mission.
        await tx.negotiation.updateMany({
          where: {
            missionId: negotiation.missionId,
            id: { not: negotiationId },
            accepted: null,
          },
          data: { accepted: false, rejectedReason: 'Une autre offre a été acceptée par le client.' },
        });
      }

      return tx.negotiation.findUnique({ where: { id: negotiationId } });
    });

    // If accepted, check for price anomalies (best-effort, hors transaction)
    if (dto.accepted) {
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
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            reputationScore: true,
            artisanProfile: {
              select: { companyName: true, rating: true, reviewCount: true, businessVerified: true },
            },
          },
        },
      },
    });
  }
}
