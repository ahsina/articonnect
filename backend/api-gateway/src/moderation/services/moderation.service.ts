import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateReportDto } from '../dto/create-report.dto';
import { ResolveReportDto } from '../dto/resolve-report.dto';
import { QueryReportDto } from '../dto/query-report.dto';
import { ReportType, ReportStatus, UserRole, Prisma } from '@prisma/client';

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new report
   */
  async createReport(reporterId: string, dto: CreateReportDto) {
    // Validate that the reported entity exists and matches the type
    await this.validateReportedEntity(dto);

    // Validate that exactly one entity ID is provided
    const entityIds = [dto.reviewId, dto.productId, dto.reportedUserId, dto.missionId].filter(Boolean);
    if (entityIds.length !== 1) {
      throw new BadRequestException('Exactly one entity must be reported');
    }

    // Check if user already reported this entity
    const existingReport = await this.prisma.report.findFirst({
      where: {
        reporterId,
        type: dto.type,
        reviewId: dto.reviewId,
        productId: dto.productId,
        reportedUserId: dto.reportedUserId,
        missionId: dto.missionId,
        status: {
          in: [ReportStatus.PENDING, ReportStatus.UNDER_REVIEW, ReportStatus.REVIEWED],
        },
      },
    });

    if (existingReport) {
      throw new BadRequestException('You have already reported this entity');
    }

    return this.prisma.report.create({
      data: {
        reporterId,
        type: dto.type,
        reason: dto.reason,
        description: dto.description,
        reviewId: dto.reviewId,
        productId: dto.productId,
        reportedUserId: dto.reportedUserId,
        missionId: dto.missionId,
      },
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        review: true,
        product: true,
        reportedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        mission: true,
      },
    });
  }

  /**
   * Get all reports (admin only) with filters
   */
  async getAllReports(queryDto: QueryReportDto) {
    const { type, reason, status, page = 1, limit = 20 } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;
    if (reason) where.reason = reason;
    if (status) where.status = status;

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        include: {
          reporter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          review: true,
          product: true,
          reportedUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          mission: true,
          resolver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single report by ID
   */
  async getReportById(reportId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        review: true,
        product: true,
        reportedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        mission: true,
        resolver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  /**
   * Get reports made by a user
   */
  async getReportsByUser(userId: string) {
    return this.prisma.report.findMany({
      where: { reporterId: userId },
      include: {
        review: true,
        product: true,
        reportedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        mission: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Resolve a report (admin only)
   */
  async resolveReport(reportId: string, adminId: string, dto: ResolveReportDto) {
    const report = await this.getReportById(reportId);

    if (report.status === ReportStatus.RESOLVED || report.status === ReportStatus.DISMISSED) {
      throw new BadRequestException('Report has already been resolved');
    }

    const updatedReport = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: dto.status,
        resolution: dto.resolution,
        actionTaken: dto.actionTaken,
        resolvedBy: adminId,
        resolvedAt: new Date(),
      },
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        review: true,
        product: true,
        reportedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        mission: true,
        resolver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Apply actions based on actionTaken
    if (dto.actionTaken) {
      await this.applyModerationAction(report, dto.actionTaken);
    }

    return updatedReport;
  }

  /**
   * Update report status (admin only)
   */
  async updateReportStatus(reportId: string, status: ReportStatus) {
    try {
      return await this.prisma.report.update({
        where: { id: reportId },
        data: { status },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Report not found');
      }
      throw error;
    }
  }

  /**
   * Get moderation statistics (admin only)
   */
  async getModerationStats() {
    const [
      totalReports,
      pendingReports,
      underReviewReports,
      resolvedReports,
      dismissedReports,
      reportsByType,
      reportsByReason,
    ] = await Promise.all([
      this.prisma.report.count(),
      this.prisma.report.count({ where: { status: ReportStatus.PENDING } }),
      this.prisma.report.count({ where: { status: ReportStatus.UNDER_REVIEW } }),
      this.prisma.report.count({ where: { status: ReportStatus.RESOLVED } }),
      this.prisma.report.count({ where: { status: ReportStatus.DISMISSED } }),
      this.prisma.report.groupBy({
        by: ['type'],
        _count: true,
      }),
      this.prisma.report.groupBy({
        by: ['reason'],
        _count: true,
      }),
    ]);

    return {
      total: totalReports,
      byStatus: {
        pending: pendingReports,
        underReview: underReviewReports,
        resolved: resolvedReports,
        dismissed: dismissedReports,
      },
      byType: reportsByType.reduce((acc, curr) => {
        acc[curr.type] = curr._count;
        return acc;
      }, {}),
      byReason: reportsByReason.reduce((acc, curr) => {
        acc[curr.reason] = curr._count;
        return acc;
      }, {}),
    };
  }

  /**
   * Validate that the reported entity exists
   */
  private async validateReportedEntity(dto: CreateReportDto) {
    if (dto.type === ReportType.REVIEW && dto.reviewId) {
      const review = await this.prisma.review.findUnique({ where: { id: dto.reviewId } });
      if (!review) {
        throw new NotFoundException('Review not found');
      }
    } else if (dto.type === ReportType.PRODUCT && dto.productId) {
      const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
      if (!product) {
        throw new NotFoundException('Product not found');
      }
    } else if (dto.type === ReportType.USER && dto.reportedUserId) {
      const user = await this.prisma.user.findUnique({ where: { id: dto.reportedUserId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }
    } else if (dto.type === ReportType.MISSION && dto.missionId) {
      const mission = await this.prisma.mission.findUnique({ where: { id: dto.missionId } });
      if (!mission) {
        throw new NotFoundException('Mission not found');
      }
    } else {
      throw new BadRequestException('Invalid report type or missing entity ID');
    }
  }

  /**
   * Apply moderation actions based on actionTaken
   */
  private async applyModerationAction(report: any, actionTaken: string) {
    switch (actionTaken) {
      case 'CONTENT_REMOVED':
        if (report.reviewId) {
          // Masquer l'avis signalé (soft-hide, pas de suppression destructive).
          await this.prisma.review.update({
            where: { id: report.reviewId },
            data: { hidden: true, hiddenReason: 'Masqué suite à modération' },
          });
        } else if (report.productId) {
          await this.prisma.product.update({
            where: { id: report.productId },
            data: { status: 'INACTIVE' },
          });
        }
        break;

      case 'USER_WARNED':
        // Avertissement soft : tracé (notification non bloquante).
        this.logger.warn(`Utilisateur ${report.reportedUserId} averti (modération, report ${report.id}).`);
        break;

      case 'USER_SUSPENDED':
        if (report.reportedUserId) {
          // Suspension RÉELLE : bloque la connexion (cf. login qui refuse les comptes SUSPENDED).
          await this.prisma.user.update({
            where: { id: report.reportedUserId },
            data: { status: 'SUSPENDED' },
          });
        }
        break;

      case 'USER_BANNED':
        if (report.reportedUserId) {
          // Bannissement : compte SUSPENDED (statut bloquant ; l'enum ne comporte pas BANNED).
          await this.prisma.user.update({
            where: { id: report.reportedUserId },
            data: { status: 'SUSPENDED' },
          });
        }
        break;

      default:
        // No action
        break;
    }
  }
}
