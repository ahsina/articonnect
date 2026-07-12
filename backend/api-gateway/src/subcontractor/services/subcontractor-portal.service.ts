import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationType } from '@prisma/client';

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

@Injectable()
export class SubcontractorPortalService {
  private readonly logger = new Logger(SubcontractorPortalService.name);

  constructor(private prisma: PrismaService) {}

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
  // GAP 5 — RÉMUNÉRATION RÉELLE DU SOUS-TRAITANT (résiduel documenté)
  // ------------------------------------------------------------------------------------------
  // Aucun VERSEMENT Stripe réel n'est déclenché vers le compte Connect du sous-traitant. Le champ
  // SubcontractorAssignment.paymentStatus ('PENDING'->'PAID', posé par le donneur d'ordre via
  // updateAssignment) et paidAt restent de simples FLAGS comptables : ils alimentent getEarnings
  // (totalPaid/totalPending) mais ne meuvent aucun fonds. Câbler un transfert réel nécessiterait
  // d'appeler le Payment/StripeService (ex. createTransfer vers le Connect du sous-traitant à la
  // clôture) — hors périmètre strict de cet agent (subcontractor/** ; interdiction de toucher
  // payment/* et de créer une dépendance vers de nouvelles méthodes paiement). RÉSIDUEL À CÂBLER
  // CENTRALEMENT : à completeWork()/updateAssignment(PAID), invoquer le service paiement pour un
  // transfert Connect idempotent (create-intent/webhook/capture/transfer déjà en place pour les
  // missions) et stocker paymentReference = id du transfert.
  // ==========================================================================================

  // ============ SUBCONTRACTOR DASHBOARD ============

  async getDashboard(userId: string) {
    const subcontractor = await this.getSubcontractorByUserId(userId);

    if (!subcontractor) {
      return { isSubcontractor: false };
    }

    const [pendingOffers, activeAssignments, completedCount, earnings] = await Promise.all([
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
      this.prisma.subcontractorAssignment.count({
        where: {
          subcontractorId: subcontractor.id,
          status: 'COMPLETED',
        },
      }),
      this.prisma.subcontractorAssignment.aggregate({
        where: {
          subcontractorId: subcontractor.id,
          paymentStatus: 'PAID',
        },
        _sum: { agreedAmount: true },
      }),
    ]);

    return {
      isSubcontractor: true,
      subcontractorId: subcontractor.id,
      // Disponibilité pilotée par le sous-traitant (ACTIVE = reçoit des offres, INACTIVE = mis en
      // pause). Voir setAvailability().
      available: subcontractor.status === 'ACTIVE',
      status: subcontractor.status,
      stats: {
        pendingOffers,
        activeAssignments: activeAssignments.length,
        completedMissions: completedCount,
        totalEarnings: earnings._sum.agreedAmount || 0,
        averageRating: subcontractor.averageRating,
      },
      currentAssignments: activeAssignments,
    };
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
            artisan: { select: { firstName: true, lastName: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
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

    return updated;
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

    const totalEarned = assignments.reduce((sum, a) => sum + Number(a.agreedAmount), 0);
    const totalPaid = assignments
      .filter(a => a.paymentStatus === 'PAID')
      .reduce((sum, a) => sum + Number(a.agreedAmount), 0);
    const totalPending = totalEarned - totalPaid;

    return {
      summary: {
        totalEarned,
        totalPaid,
        totalPending,
        missionsCompleted: assignments.length,
      },
      assignments: assignments.map(a => ({
        id: a.id,
        missionTitle: a.mission.title,
        amount: a.agreedAmount,
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
