import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDisputeDto, UpdateDisputeDto, ResolveDisputeDto, DisputeOutcome } from '../dto/dispute.dto';
import { DisputeStatus } from '@prisma/client';
import { RefundAbuseDetectorService } from '../../fraud/services/refund-abuse-detector.service';
import { FeatureToggleService } from '../../fraud/services/feature-toggle.service';
import { PaymentService } from '../../payment/services/payment.service';

@Injectable()
export class DisputeService {
  private readonly logger = new Logger(DisputeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly refundAbuseDetector: RefundAbuseDetectorService,
    private readonly featureToggle: FeatureToggleService,
    private readonly paymentService: PaymentService,
  ) {}

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

    // Refund Abuse Detection (if enabled and dispute is for refund)
    const isRefundAbuseDetectionEnabled = await this.featureToggle.isRefundAbuseDetectionEnabled();
    const isRefundRelated = createDto.reason?.toLowerCase().includes('refund') ||
                            createDto.reason?.toLowerCase().includes('remboursement') ||
                            createDto.description?.toLowerCase().includes('refund') ||
                            createDto.description?.toLowerCase().includes('remboursement');

    if (isRefundAbuseDetectionEnabled && isRefundRelated) {
      try {
        const abuseResult = await this.refundAbuseDetector.detectRefundAbuse(userId, createDto.missionId);

        // Update user refund statistics
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            refundAbuseScore: abuseResult.abuseScore,
            refundBlocked: abuseResult.isAbusive,
          },
        });

        // Check if auto-reject is enabled
        const autoRejectEnabled = await this.featureToggle.isRefundAutoRejectEnabled();
        const abuseThreshold = await this.featureToggle.getRefundAbuseThreshold();

        if (abuseResult.isAbusive && abuseResult.abuseScore >= abuseThreshold) {
          this.logger.warn(
            `Refund dispute from user ${userId} flagged as abusive (score: ${abuseResult.abuseScore})`
          );

          // Auto-reject if enabled and recommendation requires it
          if (autoRejectEnabled && abuseResult.recommendation === 'REJECT') {
            throw new BadRequestException(
              'Votre demande de remboursement ne peut pas être traitée. Contactez le support pour plus d\'informations.'
            );
          }

          // Manually review if high-risk but not auto-reject
          if (abuseResult.recommendation === 'MANUAL_REVIEW') {
            this.logger.warn(
              `Refund dispute ${userId} requires manual review (abuse score: ${abuseResult.abuseScore})`
            );
            // Dispute will be created but flagged for admin review
          }
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error; // Re-throw rejection errors
        }
        this.logger.error(`Failed to run refund abuse detection:`, error);
        // Don't block legitimate disputes if fraud detection fails
      }
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

  async findOne(disputeId: string, userId: string, userRole?: string) {
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

    // L'ADMIN peut ouvrir n'importe quel litige (il peut déjà les lister et les résoudre).
    if (userRole === 'ADMIN') {
      return dispute;
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

    // Déclenche un VRAI remboursement escrow si l'issue est en faveur du client.
    // (Avant : la résolution n'écrivait qu'un texte, aucun argent ne bougeait.)
    let refund: { refunded: number; note?: string } | null = null;
    if (
      resolveDto.outcome === DisputeOutcome.REFUND_CLIENT ||
      resolveDto.outcome === DisputeOutcome.PARTIAL_REFUND
    ) {
      const missionForRefund = await this.prisma.mission.findUnique({
        where: { id: dispute.missionId },
        select: { agreedPrice: true, clientBudget: true },
      });
      const fullPrice = Number(missionForRefund?.agreedPrice ?? missionForRefund?.clientBudget ?? 0);
      const amount =
        resolveDto.outcome === DisputeOutcome.PARTIAL_REFUND
          ? Number(resolveDto.refundAmount ?? 0)
          : Number(resolveDto.refundAmount ?? fullPrice);
      try {
        refund = await this.paymentService.refundForCancellation(dispute.missionId, amount);
        if (refund.refunded === 0) {
          // Remboursement fantôme : l'issue est en faveur du client mais aucun euro n'a bougé.
          // On remonte un signal clair au lieu d'un 0 silencieux.
          this.logger.warn(
            `Litige ${disputeId} résolu (${resolveDto.outcome}) mais AUCUN remboursement effectué : ${refund.note ?? 'aucun paiement capturé à rembourser'}.`,
          );
        } else {
          this.logger.log(
            `Litige ${disputeId} résolu (${resolveDto.outcome}) : ${refund.refunded}€ remboursés au client.`,
          );
        }
      } catch (e) {
        this.logger.error(`Échec du remboursement pour le litige ${disputeId}: ${(e as any)?.message}`);
        throw new BadRequestException(
          'Résolution enregistrée impossible : le remboursement escrow a échoué (' + (e as any)?.message + ').',
        );
      }
    }

    const resolved = await this.prisma.dispute.update({
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

    return { ...resolved, refund };
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
