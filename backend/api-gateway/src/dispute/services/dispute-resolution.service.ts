import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DisputeStatus, DisputePriority } from '@prisma/client';
import { NotificationService } from '../../notification/services/notification.service';
import { PaymentService } from '../../payment/services/payment.service';

export interface ResolutionEvidence {
  type: 'PHOTO' | 'DOCUMENT' | 'MESSAGE' | 'OTHER';
  url: string;
  description: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface ResolutionStep {
  step: 'OPENED' | 'EVIDENCE_COLLECTION' | 'MEDIATION' | 'ADMIN_REVIEW' | 'RESOLVED';
  timestamp: Date;
  performedBy: string;
  notes?: string;
}

export interface ResolutionOutcome {
  winner: 'CLIENT' | 'ARTISAN' | 'SPLIT' | 'NONE';
  refundAmount?: number;
  compensationAmount?: number;
  reputationImpact?: {
    userId: string;
    points: number;
  }[];
}

@Injectable()
export class DisputeResolutionService {
  private readonly logger = new Logger(DisputeResolutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * Escalate dispute to next level
   */
  async escalateDispute(disputeId: string, adminId: string, reason: string): Promise<void> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { mission: true },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Update priority based on age and status
    let newPriority = dispute.priority;
    const ageInDays = Math.floor(
      (Date.now() - dispute.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (ageInDays > 7) {
      newPriority = DisputePriority.URGENT;
    } else if (ageInDays > 3) {
      newPriority = DisputePriority.HIGH;
    }

    await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        priority: newPriority,
        status: DisputeStatus.IN_REVIEW,
        resolution: `Escalated by admin ${adminId}: ${reason}`,
      },
    });

    // Notify both parties
    await Promise.all([
      this.notificationService.createNotification(
        dispute.mission.clientId,
        'SYSTEM',
        'Litige escaladé',
        `Votre litige a été escaladé pour examen prioritaire`,
        `/disputes/${disputeId}`,
        { disputeId },
      ),
      this.notificationService.createNotification(
        dispute.mission.artisanId || '',
        'SYSTEM',
        'Litige escaladé',
        `Le litige a été escaladé pour examen prioritaire`,
        `/disputes/${disputeId}`,
        { disputeId },
      ),
    ]);
  }

  /**
   * Add evidence to dispute
   */
  async addEvidence(
    disputeId: string,
    userId: string,
    evidence: Omit<ResolutionEvidence, 'uploadedAt' | 'uploadedBy'>,
  ): Promise<void> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { mission: true },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Verify user is part of the dispute
    const isParticipant =
      dispute.createdById === userId ||
      dispute.mission.clientId === userId ||
      dispute.mission.artisanId === userId;

    if (!isParticipant) {
      throw new BadRequestException('Not authorized to add evidence');
    }

    // Store evidence in dispute description (for now, until we have dedicated evidence table)
    const fullEvidence: ResolutionEvidence = {
      ...evidence,
      uploadedBy: userId,
      uploadedAt: new Date(),
    };

    const currentEvidence = JSON.parse(dispute.description || '{}');
    const evidenceList = currentEvidence.evidence || [];
    evidenceList.push(fullEvidence);

    await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        description: JSON.stringify({
          ...currentEvidence,
          evidence: evidenceList,
        }),
      },
    });
  }

  /**
   * Propose settlement
   */
  async proposeSettlement(
    disputeId: string,
    proposerId: string,
    terms: {
      refundAmount?: number;
      compensationAmount?: number;
      description: string;
    },
  ): Promise<void> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { mission: true },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Store settlement proposal
    const currentData = JSON.parse(dispute.description || '{}');
    const settlements = currentData.settlements || [];

    settlements.push({
      proposerId,
      proposedAt: new Date(),
      terms,
      status: 'PENDING',
    });

    await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        description: JSON.stringify({
          ...currentData,
          settlements,
        }),
      },
    });

    // Notify the other party
    const otherPartyId =
      proposerId === dispute.mission.clientId
        ? dispute.mission.artisanId
        : dispute.mission.clientId;

    if (otherPartyId) {
      await this.notificationService.createNotification(
        otherPartyId,
        'SYSTEM',
        'Proposition de règlement',
        `Une proposition de règlement a été faite pour le litige`,
        `/disputes/${disputeId}`,
        { disputeId, terms },
      );
    }
  }

  /**
   * Accept settlement
   */
  async acceptSettlement(disputeId: string, settlementIndex: number, userId: string): Promise<void> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { mission: true },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const currentData = JSON.parse(dispute.description || '{}');
    const settlements = currentData.settlements || [];

    if (!settlements[settlementIndex]) {
      throw new NotFoundException('Settlement not found');
    }

    settlements[settlementIndex].status = 'ACCEPTED';
    settlements[settlementIndex].acceptedBy = userId;
    settlements[settlementIndex].acceptedAt = new Date();

    await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: DisputeStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedById: userId,
        description: JSON.stringify({
          ...currentData,
          settlements,
        }),
      },
    });

    // Execute settlement terms (refunds, compensation, etc.)
    await this.executeSettlement(dispute.id, settlements[settlementIndex].terms);
  }

  /**
   * Resolve dispute with admin decision
   */
  async resolveDispute(
    disputeId: string,
    adminId: string,
    outcome: ResolutionOutcome,
    notes: string,
  ): Promise<void> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { mission: true },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Update dispute status
    await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: DisputeStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedById: adminId,
        resolution: notes,
      },
    });

    // Apply outcome — REMBOURSEMENT RÉEL du client via l'escrow (Stripe).
    if (outcome.refundAmount && outcome.refundAmount > 0 && dispute.missionId) {
      try {
        const res = await this.paymentService.refundForCancellation(
          dispute.missionId,
          outcome.refundAmount,
        );
        this.logger.log(
          `Litige ${disputeId} résolu : remboursement client ${res.refunded}€ (demandé ${outcome.refundAmount}€).`,
        );
      } catch (e) {
        this.logger.error(`Échec du remboursement de litige ${disputeId}`, e as any);
        throw e; // ne pas marquer résolu si l'argent ne bouge pas
      }
    }

    if (outcome.compensationAmount && outcome.compensationAmount > 0) {
      // Compensation artisan = virement Connect (nécessite comptes Connect onboardés / clés live).
      // Tracé pour exécution une fois Stripe Connect configuré.
      this.logger.warn(
        `Litige ${disputeId} : compensation artisan de ${outcome.compensationAmount}€ à verser (Stripe Connect requis).`,
      );
    }

    // Apply reputation impacts
    if (outcome.reputationImpact) {
      for (const impact of outcome.reputationImpact) {
        await this.prisma.user.update({
          where: { id: impact.userId },
          data: {
            reputationScore: { increment: impact.points },
          },
        });
      }
    }

    // Notify parties
    await Promise.all([
      this.notificationService.createNotification(
        dispute.mission.clientId,
        'SYSTEM',
        'Litige résolu',
        `Le litige a été résolu par un administrateur`,
        `/disputes/${disputeId}`,
        { disputeId, outcome },
      ),
      this.notificationService.createNotification(
        dispute.mission.artisanId || '',
        'SYSTEM',
        'Litige résolu',
        `Le litige a été résolu par un administrateur`,
        `/disputes/${disputeId}`,
        { disputeId, outcome },
      ),
    ]);
  }

  /**
   * Request mediation
   */
  async requestMediation(disputeId: string, requesterId: string): Promise<void> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: DisputeStatus.IN_REVIEW,
        priority: DisputePriority.HIGH,
        resolution: `Mediation requested by user ${requesterId}`,
      },
    });
  }

  /**
   * Get dispute timeline
   */
  async getDisputeTimeline(disputeId: string): Promise<ResolutionStep[]> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const timeline: ResolutionStep[] = [
      {
        step: 'OPENED',
        timestamp: dispute.createdAt,
        performedBy: dispute.createdById,
        notes: dispute.reason,
      },
    ];

    if (dispute.status === DisputeStatus.IN_REVIEW) {
      timeline.push({
        step: 'ADMIN_REVIEW',
        timestamp: new Date(),
        performedBy: 'system',
      });
    }

    if (dispute.resolvedAt) {
      timeline.push({
        step: 'RESOLVED',
        timestamp: dispute.resolvedAt,
        performedBy: dispute.resolvedById || 'system',
        notes: dispute.resolution || undefined,
      });
    }

    return timeline;
  }

  /**
   * Private: Execute settlement terms
   */
  private async executeSettlement(disputeId: string, terms: any): Promise<void> {
    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
    if (dispute?.missionId && terms?.refundAmount > 0) {
      try {
        const res = await this.paymentService.refundForCancellation(dispute.missionId, terms.refundAmount);
        this.logger.log(`Règlement litige ${disputeId} : remboursé ${res.refunded}€.`);
      } catch (e) {
        this.logger.error(`Échec du règlement de litige ${disputeId}`, e as any);
        throw e;
      }
    }
    if (terms?.compensationAmount > 0) {
      this.logger.warn(
        `Règlement litige ${disputeId} : compensation artisan ${terms.compensationAmount}€ (Stripe Connect requis).`,
      );
    }
  }

  /**
   * Get dispute statistics for admin dashboard
   */
  async getDisputeStatistics(): Promise<{
    total: number;
    open: number;
    inReview: number;
    resolved: number;
    averageResolutionTime: number;
    byPriority: Record<string, number>;
  }> {
    const [total, open, inReview, resolved, allDisputes] = await Promise.all([
      this.prisma.dispute.count(),
      this.prisma.dispute.count({ where: { status: DisputeStatus.OPEN } }),
      this.prisma.dispute.count({ where: { status: DisputeStatus.IN_REVIEW } }),
      this.prisma.dispute.count({ where: { status: DisputeStatus.RESOLVED } }),
      this.prisma.dispute.findMany({
        where: { status: DisputeStatus.RESOLVED, resolvedAt: { not: null } },
        select: { createdAt: true, resolvedAt: true },
      }),
    ]);

    const totalResolutionTime = allDisputes.reduce((sum, dispute) => {
      if (dispute.resolvedAt) {
        return sum + (dispute.resolvedAt.getTime() - dispute.createdAt.getTime());
      }
      return sum;
    }, 0);

    const averageResolutionTime =
      allDisputes.length > 0
        ? totalResolutionTime / allDisputes.length / (1000 * 60 * 60) // Convert to hours
        : 0;

    const byPriority = await this.prisma.dispute.groupBy({
      by: ['priority'],
      _count: true,
    });

    const priorityMap = byPriority.reduce((map, item) => {
      map[item.priority] = item._count;
      return map;
    }, {} as Record<string, number>);

    return {
      total,
      open,
      inReview,
      resolved,
      averageResolutionTime: Math.round(averageResolutionTime * 100) / 100,
      byPriority: priorityMap,
    };
  }
}
