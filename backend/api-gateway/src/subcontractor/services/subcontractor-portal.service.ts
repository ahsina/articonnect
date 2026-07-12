import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { SubcontractorService } from './subcontractor.service';

export interface AcceptOfferDto {
  notes?: string;
}

export interface DeclineOfferDto {
  reason: string;
}

export interface UpdateProgressDto {
  notes?: string;
  // Avancement 0-100 (persisté sur SubcontractorAssignment.progress).
  progress?: number;
}

export interface SetAvailabilityDto {
  // true = disponible (reçoit des offres) ; false = indisponible (le donneur d'ordre ne peut
  // plus créer de nouvelle attribution car createAssignment exige status === ACTIVE).
  active: boolean;
  // Optionnel : cible une relation précise (donneur d'ordre). Absent = toutes les relations
  // ACTIVE/INACTIVE du sous-traitant.
  subcontractorId?: string;
}

export interface LeaveRelationshipDto {
  subcontractorId: string;
}

export interface RateContractorDto {
  // Note du sous-traitant → donneur d'ordre (1-5). Validée par class-validator côté DTO.
  contractorRating: number;
  contractorFeedback?: string;
}

@Injectable()
export class SubcontractorPortalService {
  private readonly logger = new Logger(SubcontractorPortalService.name);

  // Plancher de commission plateforme (5 %) — identique à SubcontractorService.
  // PLATFORM_MIN_SUBCONTRACTOR_COMMISSION et à settleAssignmentPayout (source de vérité du
  // versement Connect). Le sous-traitant perçoit le NET (montant convenu - commission).
  private static readonly COMMISSION_FLOOR = 5;

  constructor(
    private prisma: PrismaService,
    // Versement Connect réel du sous-traitant à la clôture des travaux (méthode idempotente).
    private subcontractorService: SubcontractorService,
  ) {}

  /**
   * Net réellement perçu par le sous-traitant pour une attribution :
   *   net = agreedAmount - commission, où commission = agreedAmount × max(commissionRate, 5 %).
   * MÊME formule et MÊME arrondi que SubcontractorService.settleAssignmentPayout (le net est
   * calculé identiquement au montant du transfert Stripe Connect réellement émis). La commission
   * exposée est dérivée de (gross - net) afin que net + commission == gross à l'affichage.
   * On n'expose JAMAIS ce détail au client final ; l'exposer au SOUS-TRAITANT sur SES gains est voulu.
   */
  private computeCommission(agreedAmount: unknown, commissionRate: unknown) {
    const gross = Number(agreedAmount) || 0;
    const rate = Math.max(
      Number(commissionRate) || 0,
      SubcontractorPortalService.COMMISSION_FLOOR,
    );
    const commission = (gross * rate) / 100;
    const net = Math.max(0, Math.round((gross - commission) * 100) / 100);
    return {
      gross,
      commissionRate: rate,
      commission: Math.round((gross - net) * 100) / 100,
      net,
    };
  }

  // ==========================================================================================
  // GAP 4 — COMMUNICATION SOUS-TRAITANT <-> DONNEUR D'ORDRE (état des lieux, non implémenté ici)
  // ------------------------------------------------------------------------------------------
  // Il n'existe PAS de conversation in-app dédiée sous-traitant<->donneur d'ordre. Les canaux
  // actuels sont : (1) notifications in-app unidirectionnelles (createNotification ci-dessous :
  // offre reçue, acceptée/refusée, travaux terminés, départ) ; (2) coordonnées téléphoniques
  // exposées APRÈS attribution dans getMyAssignments (mission.client.phone + subcontractor.
  // artisan.phone) pour un contact direct hors chat. Un vrai fil de discussion réutiliserait le
  // module Chat/Conversation existant (hors périmètre de cet agent : subcontractor/** uniquement).
  //
  // GAP 5 — RÉMUNÉRATION RÉELLE DU SOUS-TRAITANT (CÂBLÉE)
  // ------------------------------------------------------------------------------------------
  // Un VERSEMENT Stripe Connect RÉEL est désormais déclenché vers le compte du sous-traitant à la
  // clôture : completeWork() (ci-dessous) et updateAssignment(PAID) (côté donneur d'ordre) appellent
  // SubcontractorService.settleAssignmentPayout(). Celui-ci calcule le net (agreedAmount - commission
  // plateforme, plancher 5 %), émet stripe.createTransfer vers artisanProfile.stripeAccountId (après
  // vérif stripeOnboarded), et pose paymentStatus=PAID / paidAt / paymentReference=id du transfert de
  // façon IDEMPOTENTE (aucun double versement). Sous-traitant externe ou non onboardé → reste PENDING
  // (versement différé/récupérable, même pattern que la clôture de mission). Le module payment n'est
  // pas modifié : seule sa méthode existante createTransfer est appelée.
  // ==========================================================================================

  // ============ SUBCONTRACTOR DASHBOARD ============

  async getDashboard(userId: string) {
    const subcontractor = await this.getSubcontractorByUserId(userId);

    if (!subcontractor) {
      return { isSubcontractor: false };
    }

    const [pendingOffers, activeAssignments, completedAssignments, onboardingUser] =
      await Promise.all([
        this.prisma.subcontractorAssignment.count({
          where: {
            subcontractorId: subcontractor.id,
            status: 'ASSIGNED',
          },
        }),
        this.prisma.subcontractorAssignment.findMany({
          where: {
            subcontractorId: subcontractor.id,
            status: 'IN_PROGRESS',
          },
          include: {
            mission: {
              select: {
                id: true,
                title: true,
                scheduledFor: true,
                address: true,
                city: true,
                client: { select: { firstName: true, lastName: true } },
              },
            },
          },
          orderBy: { mission: { scheduledFor: 'asc' } },
        }),
        // Attributions terminées : on lit agreedAmount + commissionRate + paymentStatus pour dériver
        // le NET par attribution (le sous-traitant perçoit le net, pas le brut) et les totaux nets.
        this.prisma.subcontractorAssignment.findMany({
          where: {
            subcontractorId: subcontractor.id,
            status: 'COMPLETED',
          },
          select: { agreedAmount: true, commissionRate: true, paymentStatus: true },
        }),
        // État d'onboarding Stripe Connect du sous-traitant (il EST un ARTISAN) — lecture seule, pour
        // afficher le CTA « Configurer mes versements » dans le portail tant qu'il n'est pas onboardé.
        this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            artisanProfile: { select: { stripeOnboarded: true, stripeAccountId: true } },
          },
        }),
      ]);

    // Agrégats NET (montant réellement perçu) vs BRUT (montant convenu). On garde totalEarnings en
    // brut versé pour compat, et on ajoute les nets (versé / en attente / total).
    let paidGross = 0;
    let paidNet = 0;
    let pendingNet = 0;
    for (const a of completedAssignments) {
      const { gross, net } = this.computeCommission(a.agreedAmount, a.commissionRate);
      if (a.paymentStatus === 'PAID') {
        paidGross += gross;
        paidNet += net;
      } else {
        pendingNet += net;
      }
    }
    const round2 = (n: number) => Math.round(n * 100) / 100;

    const ap = onboardingUser?.artisanProfile;
    const stripeOnboarded = !!ap?.stripeOnboarded;
    const hasStripeAccount = !!ap?.stripeAccountId;

    return {
      isSubcontractor: true,
      subcontractorId: subcontractor.id,
      // Disponibilité pilotée par le sous-traitant (ACTIVE = reçoit des offres, INACTIVE = mis en
      // pause). Voir setAvailability().
      available: subcontractor.status === 'ACTIVE',
      status: subcontractor.status,
      // État Connect (lecture seule) : source du CTA d'onboarding des versements dans le portail.
      stripeOnboarded,
      hasStripeAccount,
      stats: {
        pendingOffers,
        activeAssignments: activeAssignments.length,
        completedMissions: completedAssignments.length,
        // BRUT versé (compat historique).
        totalEarnings: round2(paidGross),
        // NET (ce que le sous-traitant perçoit réellement) : versé, en attente, total.
        totalNet: round2(paidNet),
        pendingNet: round2(pendingNet),
        netEarnings: round2(paidNet + pendingNet),
        averageRating: subcontractor.averageRating,
      },
      currentAssignments: activeAssignments,
    };
  }

  // ============ INVITATIONS EN ATTENTE (GAP 1 — visibilité in-app) ============
  //
  // Une invitation de sous-traitance est une ligne Subcontractor au statut PENDING_INVITATION.
  // Jusqu'ici son SEUL canal de découverte était l'email d'invitation (le token bearer part par
  // email et est masqué de toute réponse API). L'artisan connecté n'avait donc AUCUN moyen de voir
  // « qui l'a invité » in-app. Ces trois méthodes exposent en LECTURE les invitations qui le ciblent
  // (par compte OU par email) et permettent de les accepter/refuser SANS le token email : on passe
  // par l'id de la relation + une vérification d'ownership (subcontractorUserId === userId, ou
  // externalEmail === email de l'utilisateur). Le token invitationToken n'est JAMAIS sélectionné ni
  // renvoyé (secret bearer, anti-désintermédiation) — l'acceptation in-app le neutralise (→ null).

  /**
   * Liste les invitations de sous-traitance EN ATTENTE (PENDING_INVITATION) ciblant l'utilisateur
   * courant, matchées par compte (subcontractorUserId) OU par email (externalEmail, insensible à la
   * casse). Lecture seule, sans token en clair. Retourne le donneur d'ordre (nom + société) et les
   * termes proposés pour permettre une décision éclairée.
   */
  async getPendingInvitations(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const email = user?.email || null;

    // `where: any` (même pattern que getMyAssignments) pour composer le OR compte/email sans friction
    // de typage. invitationToken n'est volontairement PAS dans le select.
    const where: any = {
      status: 'PENDING_INVITATION',
      OR: [{ subcontractorUserId: userId }],
    };
    if (email) {
      where.OR.push({ externalEmail: { equals: email, mode: 'insensitive' } });
    }

    const invitations = await this.prisma.subcontractor.findMany({
      where,
      select: {
        id: true,
        status: true,
        specialties: true,
        defaultCommissionRate: true,
        invitedAt: true,
        notes: true,
        subcontractorUserId: true,
        artisan: {
          select: {
            firstName: true,
            lastName: true,
            artisanProfile: { select: { companyName: true } },
          },
        },
      },
      orderBy: { invitedAt: 'desc' },
    });

    return invitations.map((inv) => ({
      id: inv.id,
      status: inv.status,
      specialties: inv.specialties,
      defaultCommissionRate: inv.defaultCommissionRate,
      invitedAt: inv.invitedAt,
      notes: inv.notes || null,
      artisanName: `${inv.artisan.firstName} ${inv.artisan.lastName}`.trim(),
      artisanCompany: inv.artisan.artisanProfile?.companyName || null,
      // 'account' = invité via son compte plateforme ; 'email' = invité par email (rattaché ici).
      matchedBy: inv.subcontractorUserId === userId ? 'account' : 'email',
    }));
  }

  /**
   * Charge une invitation par id et vérifie qu'elle CIBLE bien l'utilisateur courant (par compte ou
   * par email). Factorise l'ownership pour accept/decline. NE sélectionne pas le token.
   */
  private async getInvitationForUser(invitationId: string, userId: string) {
    const inv = await this.prisma.subcontractor.findUnique({
      where: { id: invitationId },
      select: {
        id: true,
        status: true,
        artisanId: true,
        subcontractorUserId: true,
        externalEmail: true,
      },
    });
    if (!inv) {
      throw new NotFoundException('Invitation introuvable');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const email = (user?.email || '').toLowerCase();
    const targetsUser =
      inv.subcontractorUserId === userId ||
      (!!inv.externalEmail && inv.externalEmail.toLowerCase() === email);
    if (!targetsUser) {
      throw new ForbiddenException('Access denied');
    }

    return inv;
  }

  /**
   * Acceptation IN-APP d'une invitation (par id, sans token email). Rattache l'utilisateur courant à
   * la relation (subcontractorUserId), passe le statut à ACTIVE, neutralise le token. Reproduit les
   * gardes de SubcontractorService.acceptInvitation : statut PENDING requis, et refus propre si
   * l'utilisateur est DÉJÀ lié à ce donneur d'ordre (contrainte unique artisanId+subcontractorUserId).
   */
  async acceptInvitationInApp(userId: string, invitationId: string) {
    const inv = await this.getInvitationForUser(invitationId, userId);

    if (inv.status !== 'PENDING_INVITATION') {
      throw new BadRequestException('Invitation déjà traitée');
    }

    // Contrainte unique (artisanId, subcontractorUserId) : une autre relation déjà liée provoquerait
    // un P2002 (500). On la détecte pour renvoyer un 409 lisible (même approche que le service).
    const existingLink = await this.prisma.subcontractor.findFirst({
      where: {
        artisanId: inv.artisanId,
        subcontractorUserId: userId,
        id: { not: inv.id },
      },
      select: { id: true },
    });
    if (existingLink) {
      throw new ConflictException("Vous êtes déjà sous-traitant de ce donneur d'ordre");
    }

    const updated = await this.prisma.subcontractor.update({
      where: { id: inv.id },
      data: {
        subcontractorUserId: userId,
        status: 'ACTIVE',
        acceptedAt: new Date(),
        invitationToken: null,
      },
      select: { id: true, status: true, artisanId: true },
    });

    await this.createNotification(
      updated.artisanId,
      'Invitation acceptée',
      'Votre invitation de sous-traitance a été acceptée.',
    );

    return { success: true, id: updated.id, status: updated.status };
  }

  /**
   * Refus IN-APP d'une invitation (par id). Passe la relation à TERMINATED et neutralise le token.
   * Notifie le donneur d'ordre.
   */
  async declineInvitation(userId: string, invitationId: string) {
    const inv = await this.getInvitationForUser(invitationId, userId);

    if (inv.status !== 'PENDING_INVITATION') {
      throw new BadRequestException('Invitation déjà traitée');
    }

    await this.prisma.subcontractor.update({
      where: { id: inv.id },
      data: { status: 'TERMINATED', invitationToken: null },
    });

    await this.createNotification(
      inv.artisanId,
      'Invitation refusée',
      'Votre invitation de sous-traitance a été refusée.',
    );

    return { success: true, id: inv.id, status: 'TERMINATED' };
  }

  // ============ OFFERS MANAGEMENT ============

  async getPendingOffers(userId: string) {
    const subcontractor = await this.getSubcontractorByUserId(userId);
    if (!subcontractor) return []; // artisan pas encore sous-traitant -> portail vide (pas d'erreur)

    return this.prisma.subcontractorAssignment.findMany({
      where: {
        subcontractorId: subcontractor.id,
        status: 'ASSIGNED', // ASSIGNED = pending offer
      },
      include: {
        mission: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            address: true,
            city: true,
            postalCode: true,
            scheduledFor: true,
            client: { select: { firstName: true, lastName: true } },
          },
        },
        subcontractor: {
          select: {
            artisan: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptOffer(userId: string, assignmentId: string, dto: AcceptOfferDto) {
    const assignment = await this.getAssignmentForUser(assignmentId, userId);

    if (assignment.status !== 'ASSIGNED') {
      throw new BadRequestException('This offer is no longer pending');
    }

    const updated = await this.prisma.subcontractorAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'IN_PROGRESS',
        description: dto.notes ? `${assignment.description || ''}\n[Accepted]: ${dto.notes}` : assignment.description,
      },
      include: {
        mission: { select: { id: true, title: true, artisanId: true } },
      },
    });

    // Notify the artisan
    await this.createNotification(
      updated.mission.artisanId,
      'Offre acceptée',
      `Le sous-traitant a accepté la mission "${updated.mission.title}"`,
    );

    return updated;
  }

  async declineOffer(userId: string, assignmentId: string, dto: DeclineOfferDto) {
    const assignment = await this.getAssignmentForUser(assignmentId, userId);

    if (assignment.status !== 'ASSIGNED') {
      throw new BadRequestException('This offer is no longer pending');
    }

    const updated = await this.prisma.subcontractorAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'CANCELLED',
        feedback: `Refusé: ${dto.reason}`,
      },
      include: {
        mission: { select: { id: true, title: true, artisanId: true } },
      },
    });

    // Notify the artisan
    await this.createNotification(
      updated.mission.artisanId,
      'Offre refusée',
      `Le sous-traitant a refusé la mission "${updated.mission.title}". Raison: ${dto.reason}`,
    );

    return updated;
  }

  // ============ MISSION PROGRESS ============

  async getMyAssignments(userId: string, status?: string) {
    const subcontractor = await this.getSubcontractorByUserId(userId);
    if (!subcontractor) return []; // portail vide

    const where: any = { subcontractorId: subcontractor.id };
    if (status) where.status = status;

    return this.prisma.subcontractorAssignment.findMany({
      where,
      include: {
        mission: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            address: true,
            city: true,
            postalCode: true,
            scheduledFor: true,
            status: true,
            client: { select: { firstName: true, lastName: true, phone: true } },
          },
        },
        subcontractor: {
          select: {
            // `artisan.id` = userId du donneur d'ordre : requis pour le contact in-app (chat) et
            // pour afficher qui noter (notation réciproque). `artisan` est une relation User.
            artisan: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * NOTATION RÉCIPROQUE — le sous-traitant note le DONNEUR D'ORDRE (fiabilité, paiement à temps).
   * Écrit contractorRating/contractorFeedback sur l'attribution du sous-traitant courant.
   * Ownership STRICT (getAssignmentForUser vérifie subcontractor.subcontractorUserId === userId) et
   * la mission doit être COMPLETED (on ne note qu'une collaboration terminée). Symétrique de la note
   * donneur d'ordre → sous-traitant (rating/feedback). Idempotent : ré-écrit la note (pas de doublon).
   */
  async rateContractor(userId: string, assignmentId: string, dto: RateContractorDto) {
    const assignment = await this.getAssignmentForUser(assignmentId, userId);

    if (assignment.status !== 'COMPLETED') {
      throw new BadRequestException(
        "Vous ne pouvez évaluer le donneur d'ordre qu'une fois la mission terminée",
      );
    }

    const rating = Number(dto?.contractorRating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('La note (contractorRating) doit être un entier entre 1 et 5');
    }

    const feedback =
      typeof dto?.contractorFeedback === 'string' && dto.contractorFeedback.trim().length > 0
        ? dto.contractorFeedback.trim()
        : null;

    const updated = await this.prisma.subcontractorAssignment.update({
      where: { id: assignmentId },
      data: {
        contractorRating: rating,
        contractorFeedback: feedback,
      },
      include: {
        mission: { select: { id: true, title: true, artisanId: true } },
      },
    });

    // Notifie le donneur d'ordre de l'évaluation reçue.
    await this.createNotification(
      updated.mission.artisanId,
      'Évaluation reçue',
      `Le sous-traitant a évalué votre collaboration sur "${updated.mission.title}" (${rating}/5).`,
    );

    return updated;
  }

  async updateProgress(userId: string, assignmentId: string, dto: UpdateProgressDto) {
    const assignment = await this.getAssignmentForUser(assignmentId, userId);

    if (assignment.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Assignment must be in progress');
    }

    // Validation de l'avancement (0-100). On accepte l'absence de progress (mise à jour de note
    // seule) mais on rejette toute valeur hors bornes ou non numérique.
    let progress: number | undefined;
    if (dto.progress !== undefined && dto.progress !== null) {
      const p = Number(dto.progress);
      if (!Number.isFinite(p) || p < 0 || p > 100) {
        throw new BadRequestException("L'avancement (progress) doit être un entier entre 0 et 100");
      }
      progress = Math.round(p);
    }

    // Add progress note to description
    const timestamp = new Date().toISOString();
    const progressLabel = progress !== undefined ? ` (${progress}%)` : '';
    const progressNote = `[${timestamp}]${progressLabel}: ${dto.notes || 'Progress update'}`;
    const newDescription = `${assignment.description || ''}\n${progressNote}`;

    return this.prisma.subcontractorAssignment.update({
      where: { id: assignmentId },
      data: {
        description: newDescription,
        // Persiste l'avancement uniquement s'il est fourni (sinon inchangé).
        ...(progress !== undefined ? { progress } : {}),
      },
    });
  }

  async completeWork(userId: string, assignmentId: string, notes?: string) {
    const assignment = await this.getAssignmentForUser(assignmentId, userId);

    if (assignment.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Assignment must be in progress');
    }

    const updated = await this.prisma.subcontractorAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'COMPLETED',
        feedback: notes || 'Travaux terminés',
      },
      include: {
        mission: { select: { id: true, title: true, artisanId: true } },
      },
    });

    // Notify the artisan
    await this.createNotification(
      updated.mission.artisanId,
      'Travaux terminés',
      `Le sous-traitant a terminé la mission "${updated.mission.title}"`,
    );

    // Update subcontractor stats
    await this.updateSubcontractorStats(assignment.subcontractorId);

    // VERSEMENT RÉEL du sous-traitant à la clôture des travaux (Stripe Connect). Idempotent et
    // best-effort : un échec ou un compte Connect non onboardé laisse l'attribution PENDING sans
    // casser la clôture (le versement est différé/récupérable). Voir settleAssignmentPayout().
    let payout: Awaited<ReturnType<SubcontractorService['settleAssignmentPayout']>> | undefined;
    try {
      payout = await this.subcontractorService.settleAssignmentPayout(assignmentId);
    } catch (error) {
      this.logger.error(
        `completeWork ${assignmentId}: échec du déclenchement du versement sous-traitant`,
        error as Error,
      );
    }

    return { ...updated, payout };
  }

  // ============ EARNINGS & PAYMENTS ============

  async getEarnings(userId: string, fromDate?: string, toDate?: string) {
    const subcontractor = await this.getSubcontractorByUserId(userId);
    if (!subcontractor) return { totalEarnings: 0, assignments: [] }; // portail vide

    const where: any = {
      subcontractorId: subcontractor.id,
      status: 'COMPLETED',
    };

    if (fromDate || toDate) {
      where.updatedAt = {};
      if (fromDate) where.updatedAt.gte = new Date(fromDate);
      if (toDate) where.updatedAt.lte = new Date(toDate);
    }

    const assignments = await this.prisma.subcontractorAssignment.findMany({
      where,
      include: {
        mission: { select: { title: true, completedAt: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const round2 = (n: number) => Math.round(n * 100) / 100;

    // Détail BRUT (montant convenu) vs NET (réellement perçu = montant - commission plateforme,
    // plancher 5 %). Même formule que le versement Connect (settleAssignmentPayout).
    const rows = assignments.map((a) => ({
      a,
      c: this.computeCommission(a.agreedAmount, a.commissionRate),
    }));

    const totalEarned = round2(rows.reduce((s, { c }) => s + c.gross, 0));
    const totalNet = round2(rows.reduce((s, { c }) => s + c.net, 0));
    const totalPaid = round2(
      rows.filter(({ a }) => a.paymentStatus === 'PAID').reduce((s, { c }) => s + c.gross, 0),
    );
    const paidNet = round2(
      rows.filter(({ a }) => a.paymentStatus === 'PAID').reduce((s, { c }) => s + c.net, 0),
    );
    const totalPending = round2(totalEarned - totalPaid);
    const pendingNet = round2(totalNet - paidNet);

    return {
      summary: {
        // BRUT (compat historique).
        totalEarned,
        totalPaid,
        totalPending,
        // NET (ce que le sous-traitant perçoit réellement).
        totalNet,
        paidNet,
        pendingNet,
        missionsCompleted: assignments.length,
      },
      assignments: rows.map(({ a, c }) => ({
        id: a.id,
        missionTitle: a.mission.title,
        // `amount` = brut (montant convenu, compat) ; `netAmount` = net perçu ; + détail commission.
        amount: a.agreedAmount,
        netAmount: c.net,
        commission: c.commission,
        commissionRate: c.commissionRate,
        completedAt: a.updatedAt,
        paymentStatus: a.paymentStatus,
        paidAt: a.paidAt,
      })),
    };
  }

  // ============ HELPERS ============

  private async getSubcontractorByUserId(userId: string) {
    // On inclut INACTIVE (sous-traitant en pause via setAvailability) pour qu'il conserve l'accès à
    // son portail (dashboard, missions en cours, gains) tout en ne recevant plus de NOUVELLES offres
    // — ce blocage est appliqué côté donneur d'ordre dans createAssignment (exige status === ACTIVE).
    // orderBy status asc => 'ACTIVE' passe avant 'INACTIVE' si l'utilisateur a plusieurs relations.
    return this.prisma.subcontractor.findFirst({
      where: {
        subcontractorUserId: userId,
        status: { in: ['ACTIVE', 'INACTIVE'] },
      },
      orderBy: { status: 'asc' },
    });
  }

  // ============ DISPONIBILITÉ & RELATIONS (SELF-SERVICE) ============

  /**
   * Liste les relations de sous-traitance de l'utilisateur courant (en tant que sous-traitant),
   * avec le donneur d'ordre et le statut. Sert de base à l'UI de disponibilité / départ.
   */
  async listRelationships(userId: string) {
    const relations = await this.prisma.subcontractor.findMany({
      where: {
        subcontractorUserId: userId,
        status: { in: ['ACTIVE', 'INACTIVE'] },
      },
      select: {
        id: true,
        status: true,
        specialties: true,
        acceptedAt: true,
        artisan: {
          select: {
            firstName: true,
            lastName: true,
            artisanProfile: { select: { companyName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return relations.map((r) => ({
      id: r.id,
      status: r.status,
      available: r.status === 'ACTIVE',
      specialties: r.specialties,
      acceptedAt: r.acceptedAt,
      artisanName: `${r.artisan.firstName} ${r.artisan.lastName}`.trim(),
      artisanCompany: r.artisan.artisanProfile?.companyName || null,
    }));
  }

  /**
   * Le sous-traitant pilote SA propre disponibilité : ACTIVE (reçoit des offres) <-> INACTIVE (en
   * pause). Vérifie l'ownership (subcontractorUserId === userId). Si subcontractorId est fourni, ne
   * bascule que cette relation ; sinon toutes les relations ACTIVE/INACTIVE de l'utilisateur.
   * TERMINATED n'est jamais réactivable ici (départ définitif via leaveRelationship).
   */
  async setAvailability(userId: string, dto: SetAvailabilityDto) {
    if (typeof dto?.active !== 'boolean') {
      throw new BadRequestException('Le champ "active" (booléen) est requis');
    }
    const targetStatus = dto.active ? 'ACTIVE' : 'INACTIVE';

    if (dto.subcontractorId) {
      const relation = await this.prisma.subcontractor.findUnique({
        where: { id: dto.subcontractorId },
        select: { id: true, subcontractorUserId: true, status: true },
      });
      if (!relation) {
        throw new NotFoundException('Relation de sous-traitance introuvable');
      }
      if (relation.subcontractorUserId !== userId) {
        throw new ForbiddenException('Access denied');
      }
      if (relation.status === 'TERMINATED' || relation.status === 'PENDING_INVITATION') {
        throw new BadRequestException(
          `Impossible de modifier la disponibilité d'une relation ${relation.status}`,
        );
      }
      await this.prisma.subcontractor.update({
        where: { id: relation.id },
        data: { status: targetStatus },
      });
      return { updated: 1, active: dto.active, subcontractorId: relation.id };
    }

    // Toutes les relations ACTIVE/INACTIVE de l'utilisateur.
    const result = await this.prisma.subcontractor.updateMany({
      where: {
        subcontractorUserId: userId,
        status: { in: ['ACTIVE', 'INACTIVE'] },
      },
      data: { status: targetStatus },
    });

    return { updated: result.count, active: dto.active };
  }

  /**
   * Le sous-traitant quitte définitivement une relation (status -> TERMINATED). Vérifie l'ownership.
   * Notifie le donneur d'ordre. Les attributions en cours ne sont pas supprimées (traçabilité), mais
   * plus aucune nouvelle offre ne pourra être créée (createAssignment exige ACTIVE).
   */
  async leaveRelationship(userId: string, dto: LeaveRelationshipDto) {
    if (!dto?.subcontractorId) {
      throw new BadRequestException('subcontractorId est requis');
    }
    const relation = await this.prisma.subcontractor.findUnique({
      where: { id: dto.subcontractorId },
      select: { id: true, subcontractorUserId: true, status: true, artisanId: true },
    });
    if (!relation) {
      throw new NotFoundException('Relation de sous-traitance introuvable');
    }
    if (relation.subcontractorUserId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    if (relation.status === 'TERMINATED') {
      // Idempotent : déjà quitté.
      return { success: true, subcontractorId: relation.id, alreadyTerminated: true };
    }

    await this.prisma.subcontractor.update({
      where: { id: relation.id },
      data: { status: 'TERMINATED' },
    });

    // Notifie le donneur d'ordre du départ du sous-traitant.
    await this.createNotification(
      relation.artisanId,
      'Sous-traitant parti',
      'Un sous-traitant a quitté votre réseau de partenaires.',
    );

    return { success: true, subcontractorId: relation.id };
  }

  private async getAssignmentForUser(assignmentId: string, userId: string) {
    const assignment = await this.prisma.subcontractorAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        subcontractor: true,
        mission: { select: { artisanId: true } },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.subcontractor.subcontractorUserId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return assignment;
  }

  private async updateSubcontractorStats(subcontractorId: string) {
    const assignments = await this.prisma.subcontractorAssignment.findMany({
      where: { subcontractorId, status: 'COMPLETED' },
    });

    const totalMissions = assignments.length;
    const totalEarnings = assignments.reduce((sum, a) => sum + Number(a.agreedAmount), 0);
    const ratings = assignments.filter(a => a.rating).map(a => a.rating!);
    const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

    await this.prisma.subcontractor.update({
      where: { id: subcontractorId },
      data: {
        totalMissions,
        totalEarnings,
        averageRating,
      },
    });
  }

  private async createNotification(
    userId: string,
    title: string,
    message: string,
  ) {
    try {
      await this.prisma.notification.create({
        data: {
          userId,
          type: NotificationType.SYSTEM,
          title,
          message,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create notification', error);
    }
  }
}
