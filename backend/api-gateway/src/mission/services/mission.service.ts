import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateMissionDto, UpdateMissionStatusDto } from '../dto/mission.dto';
import { MissionStatus } from '@prisma/client';
import { ReputationService } from '../../payment/services/reputation.service';
import { PaymentService } from '../../payment/services/payment.service';
import { NotificationService } from '../../notification/services/notification.service';
import { ContactRevealService } from './contact-reveal.service';

@Injectable()
export class MissionService {
  // Révélation de contact time-boxée + auditée + révocable (anti-désintermédiation).
  // Instanciée manuellement (pas de provider dédié) : partage la même connexion Prisma.
  private readonly contactReveal: ContactRevealService;

  constructor(
    private prisma: PrismaService,
    private reputationService: ReputationService,
    private paymentService: PaymentService,
    private notificationService: NotificationService,
  ) {
    this.contactReveal = new ContactRevealService(this.prisma);
  }

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

    // Create initial history entry
    await this.createHistoryEntry(
      mission.id,
      mission.status,
      userId,
      'CLIENT',
      'Mission créée',
    );

    // Trigger matching algorithm to find nearby artisans
    await this.findAndNotifyNearbyArtisans(mission);

    return mission;
  }

  async findAll(userId: string, role: string, status?: string) {
    const where: {
      clientId?: string;
      artisanId?: string;
      status?: any;
    } = {};

    if (role === 'CLIENT') {
      where.clientId = userId;
    } else if (role === 'ARTISAN') {
      where.artisanId = userId;
    }

    // Filtre optionnel par statut : sans ce garde, le paramètre ?status= était ignoré et l'endpoint
    // renvoyait des missions dans n'importe quel statut (ex NEGOTIATING pour ?status=COMPLETED).
    if (status) {
      where.status = status;
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

  async findOne(missionId: string, userId: string, role?: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        // Select WHITELIST (jamais l'objet User brut). phone/email sont chargés mais NE SONT PAS
        // renvoyés par défaut : ils sont masqués plus bas selon statut+rôle (révélation façon Uber).
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            phone: true,
            email: true,
          },
        },
        artisan: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
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
        // Statut escrow nécessaire pour décider de la révélation des coordonnées.
        transaction: { select: { status: true } },
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

    // Contrôle d'accès : client, artisan assigné, OU (mission ouverte -> tout artisan peut la voir
    // pour offrir) OU participant à une négociation (ex: artisan dont l'offre a été rejetée).
    const isOpen = !mission.artisanId && ['PENDING', 'NEGOTIATING'].includes(String(mission.status));
    const isNegotiationParticipant = (mission.negotiations || []).some(
      (n: any) => n.senderId === userId || n.receiverId === userId,
    );
    if (
      role !== 'ADMIN' &&
      mission.clientId !== userId &&
      mission.artisanId !== userId &&
      !isOpen &&
      !isNegotiationParticipant
    ) {
      throw new ForbiddenException('Accès non autorisé');
    }

    // ── RÉVÉLATION DES COORDONNÉES (façon Uber) : TIME-BOXÉE + AUDITÉE + RÉVOCABLE ──────────────
    // Le téléphone réel n'est révélé que pendant la FENÊTRE ACTIVE de la mission (escrow sécurisé,
    // et PAS au-delà de COMPLETED/AUTO_VALIDATED + 72h de grâce → re-masquage), uniquement au CLIENT
    // et à l'ARTISAN ASSIGNÉ. Chaque révélation croisée est journalisée (ContactRevealLog) et refusée
    // à un viewer déjà `leakageFlagged` qui n'avait pas déjà déverrouillé ce contact. Un simple
    // participant à la négociation (offre bidon à 1€) ne voit que prénom + initiale + note.
    const isAdmin = role === 'ADMIN';
    const isClientViewer = mission.clientId === userId;
    const isAssignedArtisanViewer = !!mission.artisanId && mission.artisanId === userId;
    const escrowSecured = this.isMissionPaidInEscrow(mission);

    const { revealClientContact, revealArtisanContact } =
      await this.contactReveal.resolveContactReveal({
        mission,
        userId,
        isAdmin,
        isClientViewer,
        isAssignedArtisanViewer,
        escrowSecured,
      });

    const sanitized: any = { ...mission };
    sanitized.client = this.maskUserContact(mission.client, revealClientContact);
    sanitized.artisan = mission.artisan
      ? this.maskUserContact(mission.artisan, revealArtisanContact)
      : mission.artisan;
    // Ne pas divulguer l'objet transaction (montants/commission) via cet endpoint.
    delete sanitized.transaction;
    return sanitized;
  }

  /**
   * Masque les coordonnées réelles d'un utilisateur (phone/email) et son nom de famille tant que la
   * révélation n'est pas autorisée. Avant révélation : prénom + initiale du nom + note (via profil).
   *
   * CHOIX MESSAGING-FIRST : l'EMAIL n'est JAMAIS exposé, même après paiement / fenêtre active. Seul
   * le TÉLÉPHONE (canal d'appel façon Uber) est révélé pendant la fenêtre ; tout le reste des échanges
   * passe par le chat in-app filtré (anti-désintermédiation). On force donc `email: null` dans les deux
   * branches.
   */
  private maskUserContact(user: any, reveal: boolean) {
    if (!user) return user;
    if (reveal) {
      // Fenêtre active : téléphone révélé, mais email toujours masqué (pousser vers le chat in-app).
      return { ...user, email: null };
    }
    const { phone: _phone, email: _email, lastName, ...rest } = user;
    return {
      ...rest,
      lastName: lastName ? `${String(lastName).charAt(0)}.` : null,
      phone: null,
      email: null,
    };
  }

  /**
   * « Payée en escrow » au sens révélation (façon Uber) : repose UNIQUEMENT sur la PREUVE FINANCIÈRE.
   *   Transaction.status ∈ {HELD, COMPLETED}  OU  depositPaidAt posé (webhook Stripe).
   *
   * On NE se fie PLUS à mission.status (PAID/IN_PROGRESS/COMPLETED…) : un statut avancé forcé via
   * l'endpoint générique PUT /:id/status (sans passer par l'escrow) ne doit JAMAIS révéler le contact
   * (faille anti-désintermédiation). Seule la preuve financière déverrouille les coordonnées.
   * NB : findOne charge bien `transaction { status }` et `depositPaidAt` (scalaire), donc le critère
   * est calculable dans le contexte de révélation.
   */
  private isMissionPaidInEscrow(mission: any): boolean {
    return this.hasSecuredFunds(mission);
  }

  /**
   * Garde PAIEMENT stricte (money gate) : la plateforme a-t-elle réellement sécurisé l'argent ?
   * On ne se fie PAS au seul mission.status (qui peut être avancé par erreur), mais à la preuve
   * financière : Transaction HELD/COMPLETED (autorisation/capture) OU depositPaidAt (webhook Stripe).
   */
  private hasSecuredFunds(mission: any): boolean {
    const txStatus = mission?.transaction?.status;
    return (
      !!mission?.depositPaidAt || txStatus === 'HELD' || txStatus === 'COMPLETED'
    );
  }

  async updateStatus(
    missionId: string,
    userId: string,
    updateDto: UpdateMissionStatusDto,
  ) {
    const mission = await this.findOne(missionId, userId);

    // Validate status transitions
    this.validateStatusTransition(mission.status, updateDto.status);

    // Get user role for history tracking
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // ── MONEY GATE (anti-désintermédiation) ──────────────────────────────────────────────────────
    // Cet endpoint GÉNÉRIQUE ne doit JAMAIS permettre de franchir la barrière paiement : sans lui, un
    // participant pouvait forcer ACCEPTED→PAID→IN_PROGRESS→COMPLETED sans escrow (mission terminée
    // sans commission + contact révélé). Toute transition vers un statut impliquant paiement/avancement
    // exige la PREUVE FINANCIÈRE réelle (hasSecuredFunds). findOne masque `transaction`, on recharge
    // donc la preuve (transaction.status + depositPaidAt) directement.
    const fundedStatuses: MissionStatus[] = [
      MissionStatus.PAID,
      MissionStatus.DEPOSIT_PAID,
      MissionStatus.IN_TRANSIT,
      MissionStatus.IN_PROGRESS,
      MissionStatus.COMPLETED,
      MissionStatus.AUTO_VALIDATED,
    ];
    if (fundedStatuses.includes(updateDto.status)) {
      // Un ARTISAN ne pose JAMAIS lui-même un statut de paiement : PAID/DEPOSIT_PAID viennent du
      // webhook Stripe. On refuse explicitement (défense en profondeur en plus du money gate).
      if (
        user?.role === 'ARTISAN' &&
        (updateDto.status === MissionStatus.PAID ||
          updateDto.status === MissionStatus.DEPOSIT_PAID)
      ) {
        throw new ForbiddenException(
          'Le paiement est confirmé par la plateforme (webhook Stripe), pas par l\'artisan',
        );
      }
      const funded = await this.prisma.mission.findUnique({
        where: { id: missionId },
        select: {
          depositPaidAt: true,
          transaction: { select: { status: true } },
        },
      });
      if (!this.hasSecuredFunds(funded)) {
        throw new BadRequestException(
          'Paiement plateforme requis (escrow) avant ce changement de statut',
        );
      }
    }

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

    // Create history entry
    await this.createHistoryEntry(
      missionId,
      updateDto.status,
      userId,
      user?.role || 'CLIENT',
      updateDto.note,
    );

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

    // ATOMIQUE (anti-race) : la mission n'est attribuée que si elle est ENCORE PENDING au moment de
    // l'update. Deux artisans qui acceptent en parallèle -> un seul gagne (count===1), l'autre échoue.
    const claimed = await this.prisma.mission.updateMany({
      where: { id: missionId, status: MissionStatus.PENDING },
      data: { artisanId, status: MissionStatus.NEGOTIATING },
    });
    if (claimed.count === 0) {
      throw new BadRequestException('Cette mission n\'est plus disponible');
    }
    const updated = await this.prisma.mission.findUnique({ where: { id: missionId } });

    // Create history entry
    await this.createHistoryEntry(
      missionId,
      MissionStatus.NEGOTIATING,
      artisanId,
      'ARTISAN',
      'Artisan a accepté la mission',
    );

    // Send notification to client
    const artisan = await this.prisma.user.findUnique({
      where: { id: artisanId },
      include: {
        artisanProfile: true,
      },
    });

    const artisanName = artisan?.artisanProfile?.companyName ||
      `${artisan?.firstName} ${artisan?.lastName}`;

    await this.notificationService.notifyMissionAccepted(
      mission.clientId,
      missionId,
      artisanName,
    );

    return updated;
  }

  async getNearbyMissions(
    artisanId: string,
    latitude: number,
    longitude: number,
    radiusKm: number = 20,
  ) {
    // Missions OUVERTES (non assignées) découvrables : PENDING **et** NEGOTIATING (une mission avec
    // déjà une offre reste ouverte à d'autres offres — cf. offres comparables).
    const missions = await this.prisma.mission.findMany({
      where: {
        status: { in: [MissionStatus.PENDING, MissionStatus.NEGOTIATING] },
        artisanId: null,
      },
      include: {
        client: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Si l'artisan n'a pas de géoloc utilisable, on renvoie les missions ouvertes récentes
    // (mieux vaut voir les missions que d'avoir une liste vide → l'artisan ne peut plus offrir).
    const hasLocation = !!latitude && !!longitude && !(latitude === 0 && longitude === 0);
    if (!hasLocation) return missions;

    const filtered = missions.filter((mission) => {
      if (mission.latitude == null || mission.longitude == null) return true; // mission sans géo -> visible
      return this.calculateDistance(latitude, longitude, mission.latitude, mission.longitude) <= radiusKm;
    });

    // Fallback : si le rayon exclut tout, on renvoie quand même les missions ouvertes récentes.
    const result = filtered.length > 0 ? filtered : missions;
    // Ces missions sont OUVERTES (non attribuées, non payées) : on n'expose que la zone approximative
    // (ville + lat/lng arrondis). L'adresse exacte n'est révélée à l'artisan assigné qu'après escrow.
    return result.map((m) => this.approximateMissionLocation(m));
  }

  /**
   * Floute la localisation d'une mission tant qu'elle n'est pas payée+attribuée : retire l'adresse
   * exacte / le code postal et arrondit lat/lng (~1 km). Ne conserve que la ville et une zone floue.
   */
  private approximateMissionLocation(mission: any) {
    if (!mission) return mission;
    const { address: _address, postalCode: _postalCode, latitude, longitude, ...rest } = mission;
    return {
      ...rest,
      city: mission.city,
      latitude: latitude != null ? Math.round(latitude * 100) / 100 : latitude,
      longitude: longitude != null ? Math.round(longitude * 100) / 100 : longitude,
      addressApproximate: true,
    };
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

    // Batch create notifications for performance (N+1 fix)
    if (artisansToNotify.length > 0) {
      await this.prisma.notification.createMany({
        data: artisansToNotify.map((artisan) => ({
          userId: artisan.id,
          type: 'NEW_MISSION',
          title: 'Nouvelle mission disponible',
          message: `Une nouvelle mission "${mission.title}" correspond à vos compétences`,
          link: `/artisan/missions/${mission.id}`,
          metadata: { missionId: mission.id },
        })),
        skipDuplicates: true,
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
      [MissionStatus.PENDING_DEPOSIT]: [
        MissionStatus.DEPOSIT_PAID,
        MissionStatus.CANCELLED,
      ],
      [MissionStatus.DEPOSIT_PAID]: [
        MissionStatus.IN_TRANSIT,
        MissionStatus.CANCELLED,
      ],
      [MissionStatus.IN_TRANSIT]: [
        MissionStatus.IN_PROGRESS,
        MissionStatus.CANCELLED_NO_SHOW,
      ],
      [MissionStatus.AUTO_VALIDATED]: [],
      [MissionStatus.CANCELLED_NO_SHOW]: [],
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

  /**
   * Create a history entry for mission status changes
   */
  private async createHistoryEntry(
    missionId: string,
    status: MissionStatus,
    changedBy: string | null,
    changedByRole: string,
    note?: string,
  ) {
    // changedById est une FK vers User(id) (nullable). Le sentinel 'SYSTEM' n'est PAS un utilisateur :
    // l'écrire tel quel violait la contrainte MissionHistory_changedById_fkey (crash auto-validation).
    // On normalise 'SYSTEM'/valeurs non-UUID système -> null (colonne nullable, changedByRole conserve 'SYSTEM').
    const changedById = changedBy && changedBy !== 'SYSTEM' ? changedBy : null;
    await this.prisma.missionHistory.create({
      data: {
        missionId,
        status,
        changedById,
        changedByRole,
        note,
      },
    });
  }

  /**
   * Get mission tracking history/timeline
   */
  async getMissionTracking(missionId: string, userId: string) {
    // Verify user has access to this mission
    await this.findOne(missionId, userId);

    const history = await this.prisma.missionHistory.findMany({
      where: { missionId },
      orderBy: { createdAt: 'asc' },
    });

    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      select: {
        status: true,
        createdAt: true,
        acceptedAt: true,
        startedAt: true,
        completedAt: true,
        cancelledAt: true,
      },
    });

    return {
      currentStatus: mission?.status,
      timeline: history,
      milestones: {
        created: mission?.createdAt,
        accepted: mission?.acceptedAt,
        started: mission?.startedAt,
        completed: mission?.completedAt,
        cancelled: mission?.cancelledAt,
      },
    };
  }

  // ================================================================
  // HYBRID PAYMENT SYSTEM - NEW METHODS
  // ================================================================

  /**
   * Configure deposit requirements based on client reputation
   * Called after price is agreed
   */
  async setupDepositRequirements(missionId: string, agreedPrice: number) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        client: true,
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    // Determine payment model based on client reputation
    const paymentModel = await this.reputationService.determinePaymentModel(
      mission.client,
      mission.type,
    );

    // Calculate deposit amount
    const depositAmount = this.reputationService.calculateDepositAmount(
      agreedPrice,
      paymentModel.depositPercentage,
    );

    // Calculate retraction period (48h after completion)
    const now = new Date();
    const retractionExpiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Update mission with deposit requirements
    const updated = await this.prisma.mission.update({
      where: { id: missionId },
      data: {
        agreedPrice,
        totalAmount: agreedPrice,
        depositRequired: paymentModel.depositRequired,
        depositPercentage: paymentModel.depositPercentage,
        depositAmount,
        retractionExpiresAt,
        status: MissionStatus.PENDING_DEPOSIT,
      },
    });

    // Create history entry
    await this.createHistoryEntry(
      missionId,
      MissionStatus.PENDING_DEPOSIT,
      mission.clientId,
      'SYSTEM',
      `Acompte requis: ${paymentModel.depositPercentage}% (${depositAmount}€) - ${paymentModel.reason}`,
    );

    return {
      mission: updated,
      paymentModel,
      depositAmount,
    };
  }

  /**
   * Start travel - Check deposit paid before allowing
   */
  async startTravel(missionId: string, artisanId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        transaction: true,
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    if (mission.artisanId !== artisanId) {
      throw new ForbiddenException('Vous n\'êtes pas assigné à cette mission');
    }

    // GARDE PAIEMENT (money gate, façon Uber) : l'artisan ne peut PAS se mettre en route tant que la
    // plateforme n'a pas sécurisé l'argent. On exige la PREUVE FINANCIÈRE (Transaction HELD/COMPLETED
    // ou depositPaidAt posé par le webhook), pas un simple Payment/PaymentIntent créé à l'intent, et
    // PAS le seul mission.status (qui pourrait être avancé sans paiement). Vaut même sans acompte :
    // une mission sans fonds sécurisés ne doit jamais progresser vers IN_TRANSIT/IN_PROGRESS.
    if (!this.hasSecuredFunds(mission)) {
      throw new BadRequestException(
        'Paiement plateforme requis avant de commencer le déplacement (escrow non sécurisé).',
      );
    }

    // Mettre à jour le statut
    const updated = await this.prisma.mission.update({
      where: { id: missionId },
      data: {
        status: MissionStatus.IN_TRANSIT,
      },
    });

    await this.createHistoryEntry(
      missionId,
      MissionStatus.IN_TRANSIT,
      artisanId,
      'ARTISAN',
      'Artisan en route vers le client',
    );

    return updated;
  }

  /**
   * Mark arrival at client location
   */
  async markArrival(missionId: string, artisanId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: { transaction: { select: { status: true } } },
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    if (mission.artisanId !== artisanId) {
      throw new ForbiddenException('Vous n\'êtes pas assigné à cette mission');
    }

    // GARDE PAIEMENT : impossible de démarrer le travail (IN_PROGRESS) sans que la plateforme ait
    // sécurisé l'argent. Ferme le contournement /arrive qui court-circuitait /start-travel.
    if (!this.hasSecuredFunds(mission)) {
      throw new BadRequestException(
        'Paiement plateforme requis avant de démarrer la mission (escrow non sécurisé).',
      );
    }

    const updated = await this.prisma.mission.update({
      where: { id: missionId },
      data: {
        arrivedAt: new Date(),
        status: MissionStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });

    await this.createHistoryEntry(
      missionId,
      MissionStatus.IN_PROGRESS,
      artisanId,
      'ARTISAN',
      'Artisan arrivé sur place - Travail commencé',
    );

    return updated;
  }

  /**
   * Client validates work completion (or auto-validated after 48h)
   */
  async validateCompletion(missionId: string, userId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: { transaction: { select: { status: true } } },
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    if (mission.clientId !== userId) {
      throw new ForbiddenException('Seul le client peut valider la mission');
    }

    if (mission.status !== MissionStatus.COMPLETED) {
      throw new BadRequestException('La mission doit être terminée pour être validée');
    }

    // GARDE PAIEMENT : ne PAS valider (donc ne pas déclencher un payout / clore) une mission dont
    // l'escrow n'a jamais été financé. Ce cas ne doit plus exister (markCompleted gate désormais),
    // mais on refuse explicitement au lieu d'avaler silencieusement l'absence de transaction —
    // sinon la mission serait validée sans qu'aucun euro (ni commission) ne soit encaissé.
    if (!this.hasSecuredFunds(mission)) {
      console.error(
        `[validateCompletion] BLOQUÉ : mission ${missionId} COMPLETED sans escrow sécurisé ` +
          `(transaction.status=${mission.transaction?.status ?? 'ABSENTE'}, depositPaidAt=${mission.depositPaidAt ?? 'null'}). ` +
          `Validation refusée pour préserver l'intégrité du paiement/commission.`,
      );
      throw new BadRequestException(
        'Aucun paiement sécurisé (escrow) pour cette mission : validation impossible.',
      );
    }

    // Check if within retraction period
    const now = new Date();
    const retractionExpired = mission.retractionExpiresAt &&
      now > mission.retractionExpiresAt;

    const updated = await this.prisma.mission.update({
      where: { id: missionId },
      data: {
        validatedAt: new Date(),
      },
    });

    await this.createHistoryEntry(
      missionId,
      MissionStatus.COMPLETED,
      userId,
      'CLIENT',
      'Travail validé par le client',
    );

    // Paiement artisan : NE DOIT PAS faire échouer la validation si le payout n'est pas encore
    // possible (ex: Stripe Connect pas onboardé). La validation reste effective ; le payout sera retenté.
    let payoutStatus: 'done' | 'deferred' = 'done';
    try {
      await this.paymentService.triggerArtisanPayment(missionId);
    } catch (payoutError) {
      payoutStatus = 'deferred';
      console.warn(
        `[validateCompletion] Payout artisan différé pour la mission ${missionId} : ${(payoutError as any)?.message}`,
      );
    }

    return { mission: updated, retractionExpired, payoutStatus };
  }

  /**
   * Auto-validate missions stuck in COMPLETED for > 7 days
   * Called by CRON job
   */
  async autoValidateStuckMissions() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find missions completed > 7 days ago without validation
    const stuckMissions = await this.prisma.mission.findMany({
      where: {
        status: MissionStatus.COMPLETED,
        completedAt: {
          lt: sevenDaysAgo,
        },
        validatedAt: null,
        autoValidatedAt: null,
        disputes: {
          none: {}, // No open disputes
        },
      },
      include: {
        client: true,
        artisan: true,
        transaction: { select: { status: true } },
      },
    });

    const results = [];

    for (const mission of stuckMissions) {
      try {
        // GARDE PAIEMENT : ne JAMAIS auto-valider une mission sans escrow sécurisé (pas de commission).
        // Ce cas ne devrait plus survenir (markCompleted gate), mais on le trace au lieu de le clore.
        if (!this.hasSecuredFunds(mission)) {
          console.error(
            `[autoValidateStuckMissions] IGNORÉE : mission ${mission.id} COMPLETED sans escrow sécurisé ` +
              `(transaction.status=${mission.transaction?.status ?? 'ABSENTE'}). Auto-validation refusée.`,
          );
          results.push({
            missionId: mission.id,
            status: 'skipped_no_escrow',
            message: 'Auto-validation refusée : aucun paiement sécurisé (escrow) pour cette mission',
          });
          continue;
        }

        // Auto-validate
        const _updated = await this.prisma.mission.update({
          where: { id: mission.id },
          data: {
            status: MissionStatus.AUTO_VALIDATED,
            autoValidatedAt: new Date(),
            validatedAt: new Date(),
          },
        });

        await this.createHistoryEntry(
          mission.id,
          MissionStatus.AUTO_VALIDATED,
          null, // changement système : pas de User -> changedById null (évite la violation de FK)
          'SYSTEM',
          'Mission auto-validée après 7 jours sans action',
        );

        // Déclencher le paiement artisan APRÈS AUTO_VALIDATED. Le payout ne doit PAS faire échouer
        // l'auto-validation ni empêcher la récompense de réputation (ex: Stripe Connect non onboardé).
        let payoutStatus: 'done' | 'deferred' = 'done';
        try {
          await this.paymentService.triggerArtisanPayment(mission.id);
        } catch (payoutError) {
          payoutStatus = 'deferred';
          console.warn(
            `[autoValidateStuckMissions] Payout artisan différé pour la mission ${mission.id} : ${(payoutError as any)?.message}`,
          );
        }

        // Award reputation points to client
        await this.reputationService.applyMissionCompletedReward(
          mission.clientId,
          mission.id,
        );

        results.push({
          missionId: mission.id,
          status: 'success',
          payoutStatus,
          message:
            payoutStatus === 'done'
              ? 'Auto-validated and payment triggered'
              : 'Auto-validated (payout différé)',
        });
      } catch (error) {
        results.push({
          missionId: mission.id,
          status: 'error',
          message: error.message,
        });
      }
    }

    return {
      processed: stuckMissions.length,
      results,
    };
  }

  /**
   * Mark mission as completed by artisan
   * Start 48h retraction period
   */
  async markCompleted(missionId: string, artisanId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: { transaction: { select: { status: true } } },
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    if (mission.artisanId !== artisanId) {
      throw new ForbiddenException('Vous n\'êtes pas assigné à cette mission');
    }

    // GARDE PAIEMENT : une mission ne peut PAS être terminée (COMPLETED) sans que la plateforme ait
    // sécurisé l'argent en escrow. Sans ce gate, l'artisan clôturait le chantier hors-plateforme
    // (règlement cash) et la commission n'était jamais perçue.
    if (!this.hasSecuredFunds(mission)) {
      throw new BadRequestException(
        'Paiement plateforme requis avant de terminer la mission (escrow non sécurisé).',
      );
    }

    // Calculate retraction expiry (48h from now)
    const now = new Date();
    const retractionExpiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const updated = await this.prisma.mission.update({
      where: { id: missionId },
      data: {
        status: MissionStatus.COMPLETED,
        completedAt: now,
        retractionExpiresAt,
      },
    });

    await this.createHistoryEntry(
      missionId,
      MissionStatus.COMPLETED,
      artisanId,
      'ARTISAN',
      'Travail terminé - Délai de rétractation 48h',
    );

    // Notify client to validate work
    await this.notificationService.notifyMissionCompleted(
      mission.clientId,
      missionId,
    );

    return {
      mission: updated,
      retractionExpiresAt,
      message: 'Mission terminée - Le client a 48h pour valider ou demander un remboursement',
    };
  }

  /**
   * Get deposit status for a mission
   */
  async getDepositStatus(missionId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        payments: true,
        client: {
          select: {
            reputationScore: true,
            completedMissions: true,
            noShowCount: true,
          },
        },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    const _depositPayment = mission.payments.find((p) => p.type === 'DEPOSIT');

    return {
      depositRequired: mission.depositRequired,
      depositPercentage: mission.depositPercentage,
      depositAmount: mission.depositAmount ? Number(mission.depositAmount) : 0,
      depositPaid: !!mission.depositPaidAt,
      depositPaidAt: mission.depositPaidAt,
      clientReputation: mission.client.reputationScore,
      retractionExpiresAt: mission.retractionExpiresAt,
    };
  }

  // ================================================================
  // Annulation / refus / photos
  // ================================================================

  async declineMission(missionId: string, userId: string) {
    const mission = await this.prisma.mission.findUnique({ where: { id: missionId } });
    if (!mission) throw new NotFoundException('Mission introuvable');
    if (mission.artisanId !== userId) {
      throw new ForbiddenException("Vous n'êtes pas assigné à cette mission");
    }
    const updated = await this.prisma.mission.update({
      where: { id: missionId },
      data: { status: MissionStatus.PENDING, artisanId: null },
    });
    await this.createHistoryEntry(
      missionId,
      MissionStatus.PENDING,
      userId,
      'ARTISAN',
      "Mission refusée par l'artisan",
    );
    return updated;
  }

  async cancelMission(missionId: string, userId: string, reason?: string) {
    const mission = await this.findOne(missionId, userId);
    if (
      mission.status === MissionStatus.COMPLETED ||
      mission.status === MissionStatus.CANCELLED
    ) {
      throw new BadRequestException('Cette mission ne peut plus être annulée');
    }
    // Barème d'annulation (même logique que getCancellationFees) + remboursement RÉEL.
    const basePrice = Number(mission.agreedPrice || mission.clientBudget || 0);
    let feeRate = 0;
    if (mission.status === MissionStatus.ACCEPTED || mission.status === MissionStatus.IN_TRANSIT) {
      feeRate = 0.1;
    } else if (mission.status === MissionStatus.IN_PROGRESS) {
      feeRate = 0.25;
    }
    const cancellationFee = Math.round(basePrice * feeRate * 100) / 100;
    const refundable = Math.round((basePrice - cancellationFee) * 100) / 100;

    // Rembourser le montant remboursable AVANT d'annuler (si le paiement échoue, on n'annule pas).
    const refundResult = await this.paymentService.refundForCancellation(missionId, refundable);

    const updated = await this.prisma.mission.update({
      where: { id: missionId },
      data: { status: MissionStatus.CANCELLED, cancelledAt: new Date() },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    await this.createHistoryEntry(
      missionId,
      MissionStatus.CANCELLED,
      userId,
      user?.role || 'CLIENT',
      `${reason || 'Mission annulée'} — frais ${cancellationFee}€, remboursé ${refundResult.refunded}€`,
    );

    // ── ANNULATION-APRÈS-MATCH NON GRATUITE (anti-désintermédiation) ──────────────────────────────
    // Sans escrow, une annulation ne prélève rien : un client pouvait matcher un artisan (contact
    // partiel + échanges) puis annuler à l'infini pour conclure hors plateforme, sans coût. On rend
    // l'annulation d'une mission DÉJÀ APPARIÉE (ACCEPTED + artisan assigné) par le CLIENT coûteuse EN
    // RÉPUTATION, même en l'absence de fonds sécurisés. Best-effort : ne casse pas l'annulation.
    const wasMatchedByClient =
      mission.clientId === userId &&
      !!mission.artisanId &&
      mission.status === MissionStatus.ACCEPTED;
    if (wasMatchedByClient) {
      try {
        await this.reputationService.applyMissionCancelledPenalty(userId, missionId);
      } catch (e) {
        // La pénalité de réputation ne doit jamais empêcher l'annulation/le remboursement.
        console.error(
          `[cancelMission] pénalité réputation non appliquée (mission ${missionId})`,
          e,
        );
      }
    }

    return { ...updated, cancellationFee, refunded: refundResult.refunded };
  }

  async getCancellationFees(missionId: string, userId: string) {
    const mission = await this.findOne(missionId, userId);
    const basePrice = Number(mission.agreedPrice || mission.clientBudget || 0);
    let feeRate = 0;
    if (
      mission.status === MissionStatus.ACCEPTED ||
      mission.status === MissionStatus.IN_TRANSIT
    ) {
      feeRate = 0.1;
    } else if (mission.status === MissionStatus.IN_PROGRESS) {
      feeRate = 0.25;
    }
    const cancellationFee = Math.round(basePrice * feeRate * 100) / 100;
    return {
      missionId,
      status: mission.status,
      basePrice,
      feeRate,
      cancellationFee,
      refundable: Math.round((basePrice - cancellationFee) * 100) / 100,
    };
  }

  async addPhotos(
    missionId: string,
    userId: string,
    photos: string[],
    type?: 'before' | 'after' | 'general',
  ) {
    const mission = await this.findOne(missionId, userId);

    // Anti XSS stocké : chaque photo DOIT être une URL http(s) valide.
    // On rejette javascript:, data:, chemins relatifs et chaînes non-URL.
    if (!Array.isArray(photos)) {
      throw new BadRequestException('Le champ "photos" doit être un tableau d\'URLs.');
    }
    const sanitized = photos.map((p) => {
      if (typeof p !== 'string' || !this.isSafeHttpUrl(p)) {
        throw new BadRequestException(
          `URL de photo invalide ou non sécurisée: ${typeof p === 'string' ? p : typeof p}. Seules les URLs http(s) sont acceptées.`,
        );
      }
      return p.trim();
    });

    const field =
      type === 'before'
        ? 'beforePhotos'
        : type === 'after'
          ? 'afterPhotos'
          : 'photos';
    const existing: string[] = (mission as any)[field] || [];
    const updated = await this.prisma.mission.update({
      where: { id: missionId },
      data: { [field]: [...existing, ...sanitized] } as any,
    });
    return { missionId, [field]: (updated as any)[field] };
  }

  /** Valide qu'une chaîne est une URL absolue en http(s) (rejette javascript:, data:, etc.). */
  private isSafeHttpUrl(value: string): boolean {
    const raw = value.trim();
    if (!raw) return false;
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      return false;
    }
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  }
}
