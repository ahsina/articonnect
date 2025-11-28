import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
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
}

@Injectable()
export class SubcontractorPortalService {
  constructor(private prisma: PrismaService) {}

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
    if (!subcontractor) throw new ForbiddenException('Not a subcontractor');

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
    if (!subcontractor) throw new ForbiddenException('Not a subcontractor');

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

    // Add progress note to description
    const timestamp = new Date().toISOString();
    const progressNote = `[${timestamp}]: ${dto.notes || 'Progress update'}`;
    const newDescription = `${assignment.description || ''}\n${progressNote}`;

    return this.prisma.subcontractorAssignment.update({
      where: { id: assignmentId },
      data: {
        description: newDescription,
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
    if (!subcontractor) throw new ForbiddenException('Not a subcontractor');

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
    return this.prisma.subcontractor.findFirst({
      where: {
        subcontractorUserId: userId,
        status: 'ACTIVE',
      },
    });
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
      console.error('Failed to create notification:', error);
    }
  }
}
