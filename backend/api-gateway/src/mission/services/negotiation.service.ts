import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateNegotiationDto, AcceptNegotiationDto, UpdateNegotiationDto } from '../dto/negotiation.dto';
import { NotificationService } from '../../notification/services/notification.service';
import { MissionType, MissionStatus, NotificationType } from '@prisma/client';
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

  /**
   * Statut DÉRIVÉ lisible d'une offre, calculé à la volée (aucun champ DB dédié).
   * Ordre de priorité :
   *   accepted === true              → 'ACCEPTED'
   *   accepted === false             → 'REJECTED'
   *   en attente & expirée           → 'EXPIRED'
   *   en attente & déjà consultée    → 'VIEWED'
   *   sinon                          → 'SENT'
   */
  private deriveStatus(neg: {
    accepted?: boolean | null;
    expiresAt?: Date | null;
    viewedAt?: Date | null;
  }): 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'VIEWED' | 'SENT' {
    if (neg.accepted === true) return 'ACCEPTED';
    if (neg.accepted === false) return 'REJECTED';
    // accepted == null (en attente)
    if (neg.expiresAt && new Date() > neg.expiresAt) return 'EXPIRED';
    if (neg.viewedAt) return 'VIEWED';
    return 'SENT';
  }

  /**
   * Ajoute le champ calculé `status` à une offre (ou null passe-plat).
   * N'altère aucune donnée persistée ; enrichit seulement la réponse API.
   */
  private withStatus<T extends { accepted?: boolean | null; expiresAt?: Date | null; viewedAt?: Date | null }>(
    neg: T | null,
  ): (T & { status: string }) | null {
    if (!neg) return null;
    return { ...neg, status: this.deriveStatus(neg) };
  }

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
        // Dispo / délai proposés par l'artisan (comparés par le client au même titre que le prix).
        availability: createDto.availability,
        estimatedDuration: createDto.estimatedDuration,
        expiresAt,
      },
    });

    // Send notification to receiver
    await this.notificationService.notifyNegotiationReceived(
      receiverId,
      mission.id,
      createDto.proposedPrice,
    );

    return this.withStatus(negotiation);
  }

  /**
   * MODIFIER SON OFFRE tant qu'elle n'est pas validée (artisan).
   * Gardes :
   *  - l'appelant DOIT être l'auteur de l'offre (senderId === userId) ;
   *  - l'offre doit être ENCORE EN ATTENTE (accepted === null : ni acceptée ni refusée) ;
   *  - l'offre ne doit pas être EXPIRÉE.
   * Le message (s'il est fourni) repasse le filtre anti-coordonnées (comme à la création).
   * Ne touche PAS receiverId/missionId/expiresAt : on ne modifie que le contenu de l'offre.
   */
  async update(userId: string, negotiationId: string, dto: UpdateNegotiationDto) {
    const negotiation = await this.prisma.negotiation.findUnique({
      where: { id: negotiationId },
    });

    if (!negotiation) {
      throw new NotFoundException('Offre introuvable');
    }

    // Seul l'AUTEUR de l'offre peut la modifier.
    if (negotiation.senderId !== userId) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres offres.');
    }

    // Offre déjà traitée (acceptée ou refusée) : figée.
    if (negotiation.accepted !== null) {
      throw new ConflictException(
        'Cette offre a déjà été traitée (acceptée ou refusée) : elle ne peut plus être modifiée.'
      );
    }

    // Offre expirée : on ne modifie pas une offre périmée (l'artisan doit en refaire une).
    if (negotiation.expiresAt && new Date() > negotiation.expiresAt) {
      throw new BadRequestException(
        'Cette offre a expiré : elle ne peut plus être modifiée. Créez une nouvelle offre.'
      );
    }

    // Anti-désintermédiation : le message repasse le MÊME filtre anti-coordonnées qu'à la création.
    // Violation HIGH -> 400 explicite ; sinon on persiste la version filtrée (motifs MEDIUM masqués).
    let messageUpdate: { message?: string } = {};
    if (dto.message !== undefined) {
      if (dto.message && dto.message.trim().length > 0) {
        const filterResult = await this.contentFilter.filterContent(
          dto.message,
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
        messageUpdate.message =
          filterResult.detectedPatterns.length > 0
            ? filterResult.filteredContent
            : dto.message;
      } else {
        // Message explicitement vidé.
        messageUpdate.message = dto.message;
      }
    }

    // PATCH partiel : on ne met à jour QUE les champs fournis (les `undefined` sont ignorés).
    const updated = await this.prisma.negotiation.update({
      where: { id: negotiationId },
      data: {
        ...(dto.proposedPrice !== undefined && { proposedPrice: dto.proposedPrice }),
        ...(dto.laborCost !== undefined && { laborCost: dto.laborCost }),
        ...(dto.materialCost !== undefined && { materialCost: dto.materialCost }),
        ...(dto.travelCost !== undefined && { travelCost: dto.travelCost }),
        ...(dto.availability !== undefined && { availability: dto.availability }),
        ...(dto.estimatedDuration !== undefined && { estimatedDuration: dto.estimatedDuration }),
        ...messageUpdate,
      },
    });

    // Notifie le destinataire (le client) que l'offre a été révisée — best-effort, non bloquant.
    try {
      await this.notificationService.notifyNegotiationReceived(
        negotiation.receiverId,
        negotiation.missionId,
        Number(updated.proposedPrice),
      );
    } catch (error) {
      this.logger.error('Échec notification (offre modifiée) — non bloquant:', error);
    }

    return this.withStatus(updated);
  }

  /**
   * Calculate negotiation expiration based on mission type
   * - EMERGENCY: 15 minutes
   * - SCHEDULED/QUOTE: 24 hours
   */
  private calculateNegotiationExpiration(missionType: MissionType): Date {
    const now = new Date();

    if (missionType === 'EMERGENCY') {
      // Urgence : 6 h. (15 min était irréaliste — le client n'a pas le temps de se connecter
      // et d'accepter, l'offre expirait avant qu'il puisse la choisir.)
      return new Date(now.getTime() + 6 * 60 * 60 * 1000);
    } else {
      // Devis / planifié : 7 jours. (24 h était trop court : le client compare plusieurs offres
      // sur plusieurs jours ; l'offre expirait et le bouton « Choisir » disparaissait.)
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
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

    // 🛡️ Anti-désintermédiation : le motif de REFUS est aussi un canal texte libre où glisser un
    // contact (« je refuse, appelle-moi au … »). On le filtre comme le champ `message` de l'offre.
    if (dto.rejectedReason) {
      const filtered = await this.contentFilter.filterContent(dto.rejectedReason, userId);
      if (filtered.isBlocked) {
        throw new BadRequestException({
          message: 'Votre motif de refus contient des coordonnées interdites. Communiquez uniquement via Krafolt.',
          code: 'CONTACT_INFO_BLOCKED',
        });
      }
      dto.rejectedReason =
        filtered.detectedPatterns.length > 0 ? filtered.filteredContent : dto.rejectedReason;
    }

    // L'artisan gagnant = le participant qui n'est pas le client.
    const artisanParticipant =
      negotiation.senderId === negotiation.mission.clientId
        ? negotiation.receiverId
        : negotiation.senderId;

    // Transaction ATOMIQUE (client-10 + artisan-17 « idem ») : toutes les écritures sont conditionnées
    // sur l'état lu, via des updateMany gardés. Deux acceptations concurrentes ne peuvent donc pas
    // toutes deux réussir (le second updateMany renvoie count=0 → 409).
    // Capture les senders des offres auto-rejetées (pour les notifier après la transaction).
    let losingSenderIds: string[] = [];
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
        //    On capture d'ABORD les expéditeurs (senders) de ces offres perdantes AVANT de les
        //    basculer à accepted=false, afin de pouvoir les notifier après la transaction.
        const losing = await tx.negotiation.findMany({
          where: {
            missionId: negotiation.missionId,
            id: { not: negotiationId },
            accepted: null,
          },
          select: { senderId: true },
        });
        losingSenderIds = losing.map((l) => l.senderId);

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

    // Notifications (best-effort, HORS transaction) : ne bloquent JAMAIS l'attribution.
    // On calque createNotification(userId, type, title, message, link?) sur les helpers existants.
    const missionLink = `/missions/${negotiation.missionId}`;
    try {
      if (dto.accepted) {
        // Artisan GAGNANT = le sender de l'offre acceptée (jamais le client).
        await this.notificationService.createNotification(
          negotiation.senderId,
          NotificationType.NEGOTIATION_ACCEPTED,
          'Votre offre a été acceptée',
          'Le client a retenu votre offre. Consultez la mission pour la suite.',
          missionLink,
          { missionId: negotiation.missionId, negotiationId },
        );
      } else {
        // Refus explicite d'une offre : on notifie l'artisan (sender).
        // La raison a déjà été filtrée anti-coordonnées plus haut (dto.rejectedReason).
        const reasonSuffix = dto.rejectedReason ? ` Motif : ${dto.rejectedReason}` : '';
        await this.notificationService.createNotification(
          negotiation.senderId,
          NotificationType.NEGOTIATION_REJECTED,
          'Votre offre a été refusée',
          `Le client n'a pas retenu votre offre.${reasonSuffix}`,
          missionLink,
          { missionId: negotiation.missionId, negotiationId },
        );
      }
    } catch (error) {
      this.logger.error('Échec notification (accept/reject offre) — non bloquant:', error);
    }

    // Notifier les artisans PERDANTS (offres auto-rejetées par l'acceptation d'une autre offre).
    // Dé-dupliqué par senderId et sans exposer de coordonnées.
    if (dto.accepted && losingSenderIds.length > 0) {
      const uniqueLosers = [...new Set(losingSenderIds)].filter(
        (id) => id !== negotiation.senderId,
      );
      for (const loserId of uniqueLosers) {
        try {
          await this.notificationService.createNotification(
            loserId,
            NotificationType.NEGOTIATION_REJECTED,
            'Une autre offre a été retenue',
            'Le client a choisi une autre offre pour cette mission.',
            missionLink,
            { missionId: negotiation.missionId },
          );
        } catch (error) {
          this.logger.error(
            `Échec notification perdant ${loserId} (non bloquant):`,
            error,
          );
        }
      }
    }

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

    return this.withStatus(updated);
  }

  async findByMission(missionId: string, userId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    const isClient = mission.clientId === userId;
    const isAssignedArtisan = mission.artisanId === userId;

    // ACCÈS : le client et l'artisan assigné ont toujours accès. En plus, un artisan CANDIDAT
    // (mission non encore assignée) doit pouvoir relire SES échanges : on l'autorise s'il est
    // sender OU receiver d'au moins une offre de la mission (corrige le 403 historique).
    let isParticipant = isClient || isAssignedArtisan;
    if (!isParticipant) {
      const myExchange = await this.prisma.negotiation.findFirst({
        where: {
          missionId,
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
        select: { id: true },
      });
      isParticipant = !!myExchange;
    }

    if (!isParticipant) {
      throw new ForbiddenException('Accès non autorisé');
    }

    // 🛡️ Anti-désintermédiation : le CLIENT voit TOUTES les offres (il compare/choisit). Un artisan
    // (candidat OU assigné) ne voit QUE ses propres échanges (offres où il est sender ou receiver),
    // JAMAIS celles d'un concurrent.
    const where = isClient
      ? { missionId }
      : { missionId, OR: [{ senderId: userId }, { receiverId: userId }] };

    // MARQUAGE « VUE » : quand le CLIENT propriétaire ouvre les offres, on horodate viewedAt sur
    // les offres qui lui sont destinées (receiverId===client) encore en attente et non vues.
    // Best-effort, avant de retourner. L'artisan qui relit ses offres ne déclenche PAS le « vue ».
    if (isClient) {
      try {
        await this.prisma.negotiation.updateMany({
          where: {
            missionId,
            receiverId: userId,
            viewedAt: null,
            accepted: null,
          },
          data: { viewedAt: new Date() },
        });
      } catch (error) {
        this.logger.error('Échec marquage viewedAt (non bloquant):', error);
      }
    }

    const negotiations = await this.prisma.negotiation.findMany({
      where,
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

    return negotiations.map((n) => this.withStatus(n));
  }

  /**
   * ENDPOINT AGRÉGÉ « MES OFFRES » (artisan) : toutes les offres ENVOYÉES par l'utilisateur
   * (senderId === userId), across toutes ses missions, triées par createdAt desc.
   * Chaque offre est enrichie du `status` dérivé + résumé de la mission liée + nom client anonymisé
   * (prénom + initiale du nom, JAMAIS de coordonnées : anti-désintermédiation).
   * Renvoie aussi un résumé de stats (counts par statut + taux de conversion).
   */
  async mine(userId: string) {
    const negotiations = await this.prisma.negotiation.findMany({
      where: { senderId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        mission: {
          select: {
            id: true,
            title: true,
            category: true,
            city: true,
            status: true,
            client: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    const offers = negotiations.map((n) => {
      const status = this.deriveStatus(n);
      const client = n.mission?.client;
      // Nom client anonymisé : prénom + initiale du nom (pas de coordonnées).
      const clientName = client
        ? `${client.firstName ?? ''}${client.lastName ? ' ' + client.lastName.charAt(0) + '.' : ''}`.trim()
        : null;
      return {
        id: n.id,
        missionId: n.missionId,
        status,
        proposedPrice: n.proposedPrice,
        laborCost: n.laborCost,
        materialCost: n.materialCost,
        travelCost: n.travelCost,
        availability: n.availability,
        estimatedDuration: n.estimatedDuration,
        message: n.message,
        expiresAt: n.expiresAt,
        viewedAt: n.viewedAt,
        createdAt: n.createdAt,
        mission: n.mission
          ? {
              id: n.mission.id,
              title: n.mission.title,
              category: n.mission.category,
              city: n.mission.city,
              status: n.mission.status,
            }
          : null,
        clientName,
      };
    });

    // Stats : counts par statut + taux de conversion = accepted / (total hors expired).
    const counts = { ACCEPTED: 0, REJECTED: 0, EXPIRED: 0, VIEWED: 0, SENT: 0 };
    for (const o of offers) {
      counts[o.status] = (counts[o.status] ?? 0) + 1;
    }
    const total = offers.length;
    const denominator = total - counts.EXPIRED;
    const conversionRate =
      denominator > 0 ? Math.round((counts.ACCEPTED / denominator) * 100) : 0;

    return {
      offers,
      stats: {
        total,
        counts,
        conversionRate, // en % : offres acceptées / offres traitées (hors expirées)
      },
    };
  }
}
