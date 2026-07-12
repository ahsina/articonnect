import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../../email/services/email.service';
import { randomBytes } from 'crypto';
import {
  CreateSubcontractorDto,
  UpdateSubcontractorDto,
  CreateSubcontractorAssignmentDto,
  UpdateAssignmentDto,
  SubcontractorStatus,
} from '../dto/subcontractor.dto';

@Injectable()
export class SubcontractorService {
  private readonly logger = new Logger(SubcontractorService.name);

  // Taux de commission plateforme MINIMUM (en %) exigé sur une sous-traitance. En-dessous
  // (typiquement 0), la sous-traitance devient un canal de rémunération « 0 commission »
  // invisible → contournement de la plateforme (ledger parallèle). createAssignment REJETTE (400)
  // tout taux strictement sous ce plancher, ET trace la tentative (AuditLog + signal leakage) pour
  // la rendre visible au détecteur anti-désintermédiation.
  private static readonly PLATFORM_MIN_SUBCONTRACTOR_COMMISSION = 5;

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async create(artisanId: string, dto: CreateSubcontractorDto) {
    if (!dto.subcontractorUserId && !dto.externalEmail) {
      throw new BadRequestException('Either subcontractorUserId or externalEmail is required');
    }

    const invitationToken = randomBytes(32).toString('hex');

    const subcontractor = await this.prisma.subcontractor.create({
      data: {
        artisanId,
        subcontractorUserId: dto.subcontractorUserId,
        externalName: dto.externalName,
        externalEmail: dto.externalEmail,
        externalPhone: dto.externalPhone,
        externalCompany: dto.externalCompany,
        externalSiret: dto.externalSiret,
        invitationToken,
        invitedAt: new Date(),
        defaultCommissionRate: dto.defaultCommissionRate,
        paymentTerms: dto.paymentTerms,
        specialties: dto.specialties || [],
        certifications: dto.certifications || [],
        notes: dto.notes,
      },
      include: {
        subcontractorUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Send invitation email
    const recipientEmail = dto.externalEmail || subcontractor.subcontractorUser?.email;
    const recipientName = dto.externalName ||
      (subcontractor.subcontractorUser ?
        `${subcontractor.subcontractorUser.firstName} ${subcontractor.subcontractorUser.lastName}` :
        'Cher partenaire');

    if (recipientEmail) {
      try {
        // Get artisan info for the email
        const artisan = await this.prisma.user.findUnique({
          where: { id: artisanId },
          select: {
            firstName: true,
            lastName: true,
            artisanProfile: {
              select: { companyName: true },
            },
          },
        });

        const artisanName = artisan ? `${artisan.firstName} ${artisan.lastName}` : 'Un artisan';
        const artisanCompany = artisan?.artisanProfile?.companyName || 'Krafolt';

        await this.emailService.sendSubcontractorInvitationEmail(
          recipientEmail,
          recipientName,
          artisanName,
          artisanCompany,
          invitationToken,
          dto.specialties || [],
        );
        this.logger.log(`Subcontractor invitation email sent to ${recipientEmail}`);
      } catch (error) {
        this.logger.error(`Failed to send subcontractor invitation email to ${recipientEmail}`, error);
        // Don't throw - invitation is still valid, email just failed
      }
    }

    // SÉCURITÉ anti-désintermédiation : NE JAMAIS renvoyer invitationToken en clair dans la
    // réponse API. Le token est un secret d'invitation (bearer) : il ne doit partir QUE par
    // l'email d'invitation ci-dessus (canal plateforme). L'exposer dans la réponse permettrait
    // de le transmettre hors-plateforme et de shunter le flux d'onboarding tracé.
    const { invitationToken: _invitationToken, ...safeSubcontractor } = subcontractor;
    return safeSubcontractor;
  }

  async findAll(artisanId: string, status?: SubcontractorStatus) {
    const where: any = { artisanId };
    if (status) where.status = status;

    return this.prisma.subcontractor.findMany({
      where,
      include: {
        subcontractorUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: { assignments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, artisanId: string) {
    const subcontractor = await this.prisma.subcontractor.findUnique({
      where: { id },
      include: {
        subcontractorUser: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        assignments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            mission: {
              select: { id: true, title: true, status: true, finalPrice: true },
            },
          },
        },
      },
    });

    if (!subcontractor) {
      throw new NotFoundException('Subcontractor not found');
    }

    if (subcontractor.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    return subcontractor;
  }

  async update(id: string, artisanId: string, dto: UpdateSubcontractorDto) {
    const current = await this.findOne(id, artisanId);

    // Anti-désintermédiation : le statut ACTIVE d'un sous-traitant ne doit résulter QUE de
    // l'acceptation d'invitation (acceptInvitation), jamais d'un PUT arbitraire de l'artisan. Sans
    // ce garde, un artisan pouvait forcer PENDING_INVITATION → ACTIVE et enregistrer un partenaire
    // (contacts hors-plateforme) sans passer par le token d'invitation tracé. On restreint donc les
    // transitions de statut autorisées via update(). Le flux légitime d'acceptation utilise un
    // update() interne distinct (acceptInvitation) → non impacté.
    if (dto.status && dto.status !== current.status) {
      const allowedTransitions: Record<string, SubcontractorStatus[]> = {
        [SubcontractorStatus.PENDING_INVITATION]: [SubcontractorStatus.TERMINATED],
        [SubcontractorStatus.ACTIVE]: [
          SubcontractorStatus.INACTIVE,
          SubcontractorStatus.TERMINATED,
        ],
        // INACTIVE → ACTIVE autorisé : réactive un sous-traitant DÉJÀ accepté (passé par ACTIVE),
        // ce n'est donc pas un contournement de l'acceptation d'invitation.
        [SubcontractorStatus.INACTIVE]: [
          SubcontractorStatus.ACTIVE,
          SubcontractorStatus.TERMINATED,
        ],
        [SubcontractorStatus.TERMINATED]: [],
      };
      const allowed = allowedTransitions[current.status] || [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Transition de statut ${current.status} → ${dto.status} non autorisée. ` +
            `Le statut ACTIVE ne peut résulter que de l'acceptation d'une invitation.`,
        );
      }
    }

    return this.prisma.subcontractor.update({
      where: { id },
      data: {
        defaultCommissionRate: dto.defaultCommissionRate,
        paymentTerms: dto.paymentTerms,
        specialties: dto.specialties,
        insuranceVerified: dto.insuranceVerified,
        insuranceExpiryDate: dto.insuranceExpiryDate ? new Date(dto.insuranceExpiryDate) : undefined,
        certifications: dto.certifications,
        notes: dto.notes,
        status: dto.status,
      },
    });
  }

  async acceptInvitation(token: string, userId: string) {
    const subcontractor = await this.prisma.subcontractor.findUnique({
      where: { invitationToken: token },
    });

    if (!subcontractor) {
      throw new NotFoundException('Invalid invitation token');
    }

    if (subcontractor.status !== SubcontractorStatus.PENDING_INVITATION) {
      throw new BadRequestException('Invitation already processed');
    }

    // The (artisanId, subcontractorUserId) pair is unique. If this user is
    // already linked to this artisan (via a prior invitation/record), accepting
    // would violate the constraint and surface a raw Prisma P2002 as a 500.
    // Detect it up front and reject cleanly.
    const existingLink = await this.prisma.subcontractor.findFirst({
      where: {
        artisanId: subcontractor.artisanId,
        subcontractorUserId: userId,
        id: { not: subcontractor.id },
      },
    });

    if (existingLink) {
      throw new ConflictException('You are already a subcontractor of this artisan');
    }

    return this.prisma.subcontractor.update({
      where: { id: subcontractor.id },
      data: {
        subcontractorUserId: userId,
        status: SubcontractorStatus.ACTIVE,
        acceptedAt: new Date(),
        invitationToken: null,
      },
    });
  }

  async terminate(id: string, artisanId: string) {
    await this.findOne(id, artisanId);

    return this.prisma.subcontractor.update({
      where: { id },
      data: { status: SubcontractorStatus.TERMINATED },
    });
  }

  // Assignments

  async createAssignment(artisanId: string, dto: CreateSubcontractorAssignmentDto) {
    const subcontractor = await this.findOne(dto.subcontractorId, artisanId);

    if (subcontractor.status !== SubcontractorStatus.ACTIVE) {
      throw new BadRequestException('Subcontractor is not active');
    }

    const mission = await this.prisma.mission.findUnique({
      where: { id: dto.missionId },
    });

    if (!mission || mission.artisanId !== artisanId) {
      throw new ForbiddenException('Mission not found or access denied');
    }

    // Anti-désintermédiation : une sous-traitance sous le PLANCHER de commission plateforme
    // (typiquement 0 %) est un canal de rémunération « 0 commission » invisible → ledger parallèle
    // + enregistrement illimité de contacts hors-plateforme. On ne se contente plus de flagger : on
    // REJETTE (400) tout taux strictement sous le plancher, tout en TRAÇANT la tentative (best-effort)
    // pour la rendre visible au détecteur (AuditLog + signal leakage).
    if (
      dto.commissionRate == null ||
      dto.commissionRate < SubcontractorService.PLATFORM_MIN_SUBCONTRACTOR_COMMISSION
    ) {
      await this.flagLowCommissionAssignment(artisanId, null, dto);
      throw new BadRequestException(
        `Le taux de commission de sous-traitance doit être au minimum de ${SubcontractorService.PLATFORM_MIN_SUBCONTRACTOR_COMMISSION} % (plancher plateforme). Taux fourni : ${dto.commissionRate ?? 'aucun'} %.`,
      );
    }

    const assignment = await this.prisma.subcontractorAssignment.create({
      data: {
        subcontractorId: dto.subcontractorId,
        missionId: dto.missionId,
        role: dto.role,
        description: dto.description,
        agreedAmount: dto.agreedAmount,
        commissionRate: dto.commissionRate,
      },
      include: {
        mission: {
          select: { id: true, title: true, status: true },
        },
        subcontractor: {
          select: { id: true, externalName: true, subcontractorUser: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    // Notifie le sous-traitant (in-app) qu'une nouvelle offre/mission lui a été attribuée. Ne
    // concerne que les sous-traitants ayant un compte plateforme (subcontractorUserId) ; les
    // sous-traitants externes sont contactés par email d'invitation, pas de notification in-app.
    if (subcontractor.subcontractorUserId) {
      await this.notifyUser(
        subcontractor.subcontractorUserId,
        NotificationType.NEW_MISSION,
        'Nouvelle offre de sous-traitance',
        `Vous avez reçu une offre pour la mission "${assignment.mission.title}" (${Number(dto.agreedAmount)} €).`,
        '/subcontractor-portal',
      );
    }

    return assignment;
  }

  /**
   * Crée une notification in-app (best-effort : ne casse jamais le happy-path si l'écriture échoue).
   * Réutilise le modèle Notification directement via Prisma (même pattern que le portail sous-traitant).
   */
  private async notifyUser(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
  ): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: { userId, type, title, message, link },
      });
    } catch (error) {
      this.logger.error(`Échec création notification pour ${userId}`, error as Error);
    }
  }

  /**
   * Trace (non bloquant) une TENTATIVE de sous-traitance sous le plancher de commission plateforme
   * (REJETÉE par createAssignment) et incrémente le compteur de sollicitation hors-plateforme de
   * l'artisan (réutilise le champ existant offPlatformSolicitationCount → détecteur
   * anti-désintermédiation). `assignmentId` est null car l'attribution n'est jamais créée. Ne lève
   * jamais : la trace est best-effort et ne doit pas masquer le 400 de rejet.
   */
  private async flagLowCommissionAssignment(
    artisanId: string,
    assignmentId: string | null,
    dto: CreateSubcontractorAssignmentDto,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: artisanId,
          action: 'SUBCONTRACTOR_LOW_COMMISSION_REJECTED',
          resource: 'SubcontractorAssignment',
          details: {
            assignmentId,
            subcontractorId: dto.subcontractorId,
            missionId: dto.missionId,
            commissionRate: dto.commissionRate ?? null,
            agreedAmount: dto.agreedAmount,
            minExpected: SubcontractorService.PLATFORM_MIN_SUBCONTRACTOR_COMMISSION,
          },
          ipAddress: 'system',
          userAgent: 'subcontractor-service:low-commission-guard',
        },
      });

      await this.prisma.user.update({
        where: { id: artisanId },
        data: { offPlatformSolicitationCount: { increment: 1 } },
      });

      this.logger.warn(
        `Sous-traitance à commission basse REJETÉE (${dto.commissionRate ?? 'null'}% < ${SubcontractorService.PLATFORM_MIN_SUBCONTRACTOR_COMMISSION}%) | artisan: ${artisanId} → signal leakage +1`,
      );
    } catch (error) {
      // Une trace manquée ne doit jamais casser la création d'attribution (happy-path préservé).
      this.logger.error(`flagLowCommissionAssignment a échoué pour ${artisanId}`, error as Error);
    }
  }

  async getAssignments(artisanId: string, subcontractorId?: string, missionId?: string) {
    const where: any = {
      subcontractor: { artisanId },
    };

    if (subcontractorId) where.subcontractorId = subcontractorId;
    if (missionId) where.missionId = missionId;

    return this.prisma.subcontractorAssignment.findMany({
      where,
      include: {
        mission: {
          select: { id: true, title: true, status: true, finalPrice: true },
        },
        subcontractor: {
          select: {
            id: true,
            externalName: true,
            externalEmail: true,
            subcontractorUser: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateAssignment(id: string, artisanId: string, dto: UpdateAssignmentDto) {
    const assignment = await this.prisma.subcontractorAssignment.findUnique({
      where: { id },
      include: { subcontractor: true },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.subcontractor.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    const updated = await this.prisma.subcontractorAssignment.update({
      where: { id },
      data: {
        role: dto.role,
        description: dto.description,
        agreedAmount: dto.agreedAmount,
        paymentStatus: dto.paymentStatus,
        status: dto.status,
        rating: dto.rating,
        feedback: dto.feedback,
        paidAt: dto.paymentStatus === 'PAID' ? new Date() : undefined,
      },
    });

    // Update subcontractor stats if assignment is completed
    if (dto.status === 'COMPLETED') {
      await this.updateSubcontractorStats(assignment.subcontractorId);
    }

    return updated;
  }

  async deleteAssignment(id: string, artisanId: string) {
    const assignment = await this.prisma.subcontractorAssignment.findUnique({
      where: { id },
      include: { subcontractor: true },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.subcontractor.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.subcontractorAssignment.delete({ where: { id } });

    return { success: true };
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
}
