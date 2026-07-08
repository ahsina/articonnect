import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreatePerformanceReviewDto,
  UpdatePerformanceReviewDto,
  SubmitReviewDto,
  AcknowledgeReviewDto,
  CreateGoalDto,
  UpdateGoalDto,
  ReviewFilterDto,
  Feedback360RequestDto,
  Feedback360ResponseDto,
  ReviewTemplateDto,
  ReviewStatus,
} from '../dto/performance-review.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PerformanceReviewService {
  constructor(private prisma: PrismaService) {}

  private calculateOverallRating(ratings: {
    qualityOfWork: number;
    communication: number;
    reliability: number;
    technicalSkills: number;
    customerService: number;
    teamwork: number;
  }): number {
    const values = Object.values(ratings);
    const sum = values.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / values.length) * 100) / 100;
  }

  async createReview(reviewerId: string, companyId: string, dto: CreatePerformanceReviewDto) {
    // Verify reviewer has permission
    const reviewer = await this.prisma.companyEmployee.findFirst({
      where: {
        userId: reviewerId,
        companyId,
        role: { in: ['OWNER', 'MANAGER', 'SUPERVISOR'] },
        status: 'ACTIVE',
      },
    });

    if (!reviewer) {
      throw new ForbiddenException('You do not have permission to create reviews');
    }

    // Verify employee exists and belongs to company
    const employee = await this.prisma.companyEmployee.findFirst({
      where: {
        id: dto.employeeId,
        companyId,
        status: 'ACTIVE',
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Check for existing review in the same period
    const existingReview = await this.prisma.performanceReview.findFirst({
      where: {
        employeeId: dto.employeeId,
        reviewPeriodStart: new Date(dto.reviewPeriodStart),
        reviewPeriodEnd: new Date(dto.reviewPeriodEnd),
      },
    });

    if (existingReview) {
      throw new ConflictException('A review already exists for this period');
    }

    const overallRating = this.calculateOverallRating(dto.ratings);

    const review = await this.prisma.performanceReview.create({
      data: {
        employeeId: dto.employeeId,
        reviewerId: reviewer.id,
        reviewPeriodStart: new Date(dto.reviewPeriodStart),
        reviewPeriodEnd: new Date(dto.reviewPeriodEnd),
        qualityOfWork: dto.ratings.qualityOfWork,
        communication: dto.ratings.communication,
        reliability: dto.ratings.reliability,
        technicalSkills: dto.ratings.technicalSkills,
        customerService: dto.ratings.customerService,
        teamwork: dto.ratings.teamwork,
        overallRating: new Decimal(overallRating),
        strengths: dto.strengths,
        areasForImprovement: dto.areasForImprovement,
        goals: dto.goals ? JSON.stringify(dto.goals) : null,
        notes: dto.notes,
        status: dto.status || 'DRAFT',
      },
      include: {
        employee: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        reviewer: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    return review;
  }

  async findAllReviews(companyId: string, userId: string, filters: ReviewFilterDto) {
    const { employeeId, reviewerId, status, periodStart, periodEnd, page = 1, limit = 20 } = filters;

    // Get user's company employee record
    const userEmployee = await this.prisma.companyEmployee.findFirst({
      where: { userId, companyId, status: 'ACTIVE' },
    });

    if (!userEmployee) {
      throw new ForbiddenException('Not authorized');
    }

    const where: any = {
      employee: { companyId },
    };

    // If not manager/owner, can only see own reviews
    if (!['OWNER', 'MANAGER', 'SUPERVISOR'].includes(userEmployee.role)) {
      where.employeeId = userEmployee.id;
    } else {
      if (employeeId) where.employeeId = employeeId;
      if (reviewerId) where.reviewerId = reviewerId;
    }

    if (status) where.status = status;
    if (periodStart) where.reviewPeriodStart = { gte: new Date(periodStart) };
    if (periodEnd) where.reviewPeriodEnd = { lte: new Date(periodEnd) };

    const [reviews, total] = await Promise.all([
      this.prisma.performanceReview.findMany({
        where,
        include: {
          employee: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
          reviewer: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.performanceReview.count({ where }),
    ]);

    return {
      data: reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findReviewById(reviewId: string, userId: string, companyId: string) {
    const review = await this.prisma.performanceReview.findUnique({
      where: { id: reviewId },
      include: {
        employee: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
            },
            company: true,
          },
        },
        reviewer: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Verify access
    if (review.employee.companyId !== companyId) {
      throw new ForbiddenException('Not authorized');
    }

    const userEmployee = await this.prisma.companyEmployee.findFirst({
      where: { userId, companyId, status: 'ACTIVE' },
    });

    if (!userEmployee) {
      throw new ForbiddenException('Not authorized');
    }

    // Non-managers can only see their own reviews
    if (
      !['OWNER', 'MANAGER', 'SUPERVISOR'].includes(userEmployee.role) &&
      review.employeeId !== userEmployee.id
    ) {
      throw new ForbiddenException('Not authorized to view this review');
    }

    return review;
  }

  async updateReview(reviewId: string, reviewerId: string, dto: UpdatePerformanceReviewDto) {
    const review = await this.prisma.performanceReview.findUnique({
      where: { id: reviewId },
      include: { reviewer: true },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Only the reviewer or higher role can update
    const reviewerEmployee = await this.prisma.companyEmployee.findFirst({
      where: {
        userId: reviewerId,
        companyId: review.reviewer.companyId,
        status: 'ACTIVE',
      },
    });

    if (!reviewerEmployee) {
      throw new ForbiddenException('Not authorized');
    }

    if (
      review.reviewer.userId !== reviewerId &&
      !['OWNER', 'MANAGER'].includes(reviewerEmployee.role)
    ) {
      throw new ForbiddenException('Not authorized to update this review');
    }

    if (review.status === 'ACKNOWLEDGED') {
      throw new BadRequestException('Cannot update an acknowledged review');
    }

    const updateData: any = {};

    if (dto.ratings) {
      updateData.qualityOfWork = dto.ratings.qualityOfWork;
      updateData.communication = dto.ratings.communication;
      updateData.reliability = dto.ratings.reliability;
      updateData.technicalSkills = dto.ratings.technicalSkills;
      updateData.customerService = dto.ratings.customerService;
      updateData.teamwork = dto.ratings.teamwork;
      updateData.overallRating = new Decimal(this.calculateOverallRating(dto.ratings));
    }

    if (dto.strengths !== undefined) updateData.strengths = dto.strengths;
    if (dto.areasForImprovement !== undefined) updateData.areasForImprovement = dto.areasForImprovement;
    if (dto.goals !== undefined) updateData.goals = JSON.stringify(dto.goals);
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.status !== undefined) updateData.status = dto.status;

    return this.prisma.performanceReview.update({
      where: { id: reviewId },
      data: updateData,
      include: {
        employee: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        reviewer: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });
  }

  async submitReview(reviewId: string, reviewerId: string, dto: SubmitReviewDto) {
    const review = await this.prisma.performanceReview.findUnique({
      where: { id: reviewId },
      include: {
        reviewer: true,
        employee: {
          include: { user: true },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.reviewer.userId !== reviewerId) {
      throw new ForbiddenException('Only the reviewer can submit this review');
    }

    if (review.status !== 'DRAFT') {
      throw new BadRequestException('Review has already been submitted');
    }

    const updatedReview = await this.prisma.performanceReview.update({
      where: { id: reviewId },
      data: {
        status: 'SUBMITTED',
        notes: dto.finalNotes ? `${review.notes || ''}\n\nFinal Notes: ${dto.finalNotes}` : review.notes,
      },
    });

    // Create notification for employee
    await this.prisma.notification.create({
      data: {
        userId: review.employee.userId,
        type: 'SYSTEM',
        title: 'Performance Review Submitted',
        message: `Your performance review for the period ${review.reviewPeriodStart.toLocaleDateString()} - ${review.reviewPeriodEnd.toLocaleDateString()} has been submitted. Please review and acknowledge.`,
        link: `/employee/reviews/${reviewId}`,
      },
    });

    return updatedReview;
  }

  async acknowledgeReview(reviewId: string, employeeUserId: string, dto: AcknowledgeReviewDto) {
    const review = await this.prisma.performanceReview.findUnique({
      where: { id: reviewId },
      include: {
        employee: true,
        reviewer: { include: { user: true } },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.employee.userId !== employeeUserId) {
      throw new ForbiddenException('Only the reviewed employee can acknowledge');
    }

    if (review.status !== 'SUBMITTED') {
      throw new BadRequestException('Review must be submitted before acknowledgement');
    }

    const updatedReview = await this.prisma.performanceReview.update({
      where: { id: reviewId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedBy: employeeUserId,
        notes: dto.employeeFeedback
          ? `${review.notes || ''}\n\nEmployee Feedback: ${dto.employeeFeedback}`
          : review.notes,
      },
    });

    // Notify reviewer
    await this.prisma.notification.create({
      data: {
        userId: review.reviewer.userId,
        type: 'SYSTEM',
        title: 'Review Acknowledged',
        message: `The performance review has been acknowledged by the employee.`,
        link: `/manager/reviews/${reviewId}`,
      },
    });

    return updatedReview;
  }

  async deleteReview(reviewId: string, userId: string, companyId: string) {
    const review = await this.prisma.performanceReview.findUnique({
      where: { id: reviewId },
      include: { employee: true },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.employee.companyId !== companyId) {
      throw new ForbiddenException('Not authorized');
    }

    const userEmployee = await this.prisma.companyEmployee.findFirst({
      where: { userId, companyId, status: 'ACTIVE', role: { in: ['OWNER', 'MANAGER'] } },
    });

    if (!userEmployee) {
      throw new ForbiddenException('Only owners and managers can delete reviews');
    }

    if (review.status === 'ACKNOWLEDGED') {
      throw new BadRequestException('Cannot delete an acknowledged review');
    }

    await this.prisma.performanceReview.delete({ where: { id: reviewId } });

    return { success: true, message: 'Review deleted successfully' };
  }

  // Employee Goals Management
  async createGoal(managerId: string, companyId: string, dto: CreateGoalDto) {
    const manager = await this.prisma.companyEmployee.findFirst({
      where: {
        userId: managerId,
        companyId,
        role: { in: ['OWNER', 'MANAGER', 'SUPERVISOR'] },
        status: 'ACTIVE',
      },
    });

    if (!manager) {
      throw new ForbiddenException('Not authorized to create goals');
    }

    const employee = await this.prisma.companyEmployee.findFirst({
      where: { id: dto.employeeId, companyId, status: 'ACTIVE' },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Store goals in a separate collection (using JSON in employee skills or create dedicated table)
    // For now, we'll store in the employee's skill set as a goal tracking mechanism
    const goal = await this.prisma.employeeSkill.create({
      data: {
        employeeId: dto.employeeId,
        skillName: `GOAL: ${dto.title}`,
        skillCategory: dto.category || 'Performance Goal',
        proficiencyLevel: 'BEGINNER',
        documentUrl: JSON.stringify({
          type: 'goal',
          description: dto.description,
          targetDate: dto.targetDate,
          priority: dto.priority || 1,
          progress: 0,
          status: 'IN_PROGRESS',
          createdAt: new Date().toISOString(),
          createdBy: managerId,
        }),
      },
    });

    return {
      id: goal.id,
      employeeId: dto.employeeId,
      title: dto.title,
      description: dto.description,
      targetDate: dto.targetDate,
      category: dto.category,
      priority: dto.priority,
      progress: 0,
      status: 'IN_PROGRESS',
    };
  }

  async getEmployeeGoals(employeeId: string, userId: string, companyId: string) {
    const employee = await this.prisma.companyEmployee.findFirst({
      where: { id: employeeId, companyId },
      include: { skills: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Check authorization
    const userEmployee = await this.prisma.companyEmployee.findFirst({
      where: { userId, companyId, status: 'ACTIVE' },
    });

    if (!userEmployee) {
      throw new ForbiddenException('Not authorized');
    }

    if (
      userEmployee.id !== employeeId &&
      !['OWNER', 'MANAGER', 'SUPERVISOR'].includes(userEmployee.role)
    ) {
      throw new ForbiddenException('Not authorized to view these goals');
    }

    const goals = employee.skills
      .filter((skill) => skill.skillName.startsWith('GOAL:'))
      .map((skill) => {
        let goalData: any;
        try {
          goalData = skill.documentUrl ? JSON.parse(skill.documentUrl) : {};
        } catch {
          goalData = {};
        }
        return {
          id: skill.id,
          title: skill.skillName.replace('GOAL: ', ''),
          category: skill.skillCategory,
          ...goalData,
        };
      });

    return goals;
  }

  async updateGoal(goalId: string, userId: string, companyId: string, dto: UpdateGoalDto) {
    const skill = await this.prisma.employeeSkill.findUnique({
      where: { id: goalId },
      include: { employee: true },
    });

    if (!skill || !skill.skillName.startsWith('GOAL:')) {
      throw new NotFoundException('Goal not found');
    }

    if (skill.employee.companyId !== companyId) {
      throw new ForbiddenException('Not authorized');
    }

    let goalData: any;
    try {
      goalData = skill.documentUrl ? JSON.parse(skill.documentUrl) : {};
    } catch {
      goalData = {};
    }

    const updatedGoalData = {
      ...goalData,
      description: dto.description ?? goalData.description,
      targetDate: dto.targetDate ?? goalData.targetDate,
      progress: dto.progress ?? goalData.progress,
      status: dto.status ?? goalData.status,
      completionNotes: dto.completionNotes ?? goalData.completionNotes,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    if (dto.progress === 100 && !updatedGoalData.status) {
      updatedGoalData.status = 'COMPLETED';
      updatedGoalData.completedAt = new Date().toISOString();
    }

    const updated = await this.prisma.employeeSkill.update({
      where: { id: goalId },
      data: {
        skillName: dto.title ? `GOAL: ${dto.title}` : skill.skillName,
        documentUrl: JSON.stringify(updatedGoalData),
      },
    });

    return {
      id: updated.id,
      title: updated.skillName.replace('GOAL: ', ''),
      category: updated.skillCategory,
      ...updatedGoalData,
    };
  }

  async deleteGoal(goalId: string, userId: string, companyId: string) {
    const skill = await this.prisma.employeeSkill.findUnique({
      where: { id: goalId },
      include: { employee: true },
    });

    if (!skill || !skill.skillName.startsWith('GOAL:')) {
      throw new NotFoundException('Goal not found');
    }

    if (skill.employee.companyId !== companyId) {
      throw new ForbiddenException('Not authorized');
    }

    const userEmployee = await this.prisma.companyEmployee.findFirst({
      where: { userId, companyId, role: { in: ['OWNER', 'MANAGER', 'SUPERVISOR'] }, status: 'ACTIVE' },
    });

    if (!userEmployee) {
      throw new ForbiddenException('Not authorized to delete goals');
    }

    await this.prisma.employeeSkill.delete({ where: { id: goalId } });

    return { success: true, message: 'Goal deleted successfully' };
  }

  // 360 Feedback
  async create360FeedbackRequest(managerId: string, companyId: string, dto: Feedback360RequestDto) {
    const manager = await this.prisma.companyEmployee.findFirst({
      where: {
        userId: managerId,
        companyId,
        role: { in: ['OWNER', 'MANAGER'] },
        status: 'ACTIVE',
      },
    });

    if (!manager) {
      throw new ForbiddenException('Not authorized to create 360 feedback requests');
    }

    const employee = await this.prisma.companyEmployee.findFirst({
      where: { id: dto.employeeId, companyId, status: 'ACTIVE' },
      include: { user: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Create feedback requests for each reviewer
    const feedbackRequests = await Promise.all(
      dto.reviewerIds.map(async (reviewerUserId) => {
        const reviewer = await this.prisma.companyEmployee.findFirst({
          where: { userId: reviewerUserId, companyId, status: 'ACTIVE' },
        });

        if (!reviewer) return null;

        // Store as a special skill record (or could be separate table)
        const request = await this.prisma.employeeSkill.create({
          data: {
            employeeId: dto.employeeId,
            skillName: `360_FEEDBACK_REQUEST`,
            skillCategory: 'Feedback',
            proficiencyLevel: 'INTERMEDIATE',
            documentUrl: JSON.stringify({
              type: '360_feedback_request',
              reviewerId: reviewerUserId,
              deadline: dto.deadline,
              message: dto.message,
              status: 'PENDING',
              createdAt: new Date().toISOString(),
              createdBy: managerId,
            }),
          },
        });

        // Notify reviewer
        await this.prisma.notification.create({
          data: {
            userId: reviewerUserId,
            type: 'SYSTEM',
            title: '360 Feedback Request',
            message: `You have been asked to provide 360-degree feedback for ${employee.user.firstName} ${employee.user.lastName}. Deadline: ${new Date(dto.deadline).toLocaleDateString()}`,
            link: `/feedback/360/${request.id}`,
          },
        });

        return request;
      }),
    );

    return {
      success: true,
      requestCount: feedbackRequests.filter(Boolean).length,
      deadline: dto.deadline,
    };
  }

  async submit360Feedback(reviewerUserId: string, dto: Feedback360ResponseDto) {
    const request = await this.prisma.employeeSkill.findUnique({
      where: { id: dto.requestId },
      include: { employee: true },
    });

    if (!request || request.skillName !== '360_FEEDBACK_REQUEST') {
      throw new NotFoundException('Feedback request not found');
    }

    let requestData: any;
    try {
      requestData = JSON.parse(request.documentUrl || '{}');
    } catch {
      requestData = {};
    }

    if (requestData.reviewerId !== reviewerUserId) {
      throw new ForbiddenException('Not authorized to submit this feedback');
    }

    if (requestData.status === 'COMPLETED') {
      throw new BadRequestException('Feedback already submitted');
    }

    const overallRating = this.calculateOverallRating(dto.ratings);

    await this.prisma.employeeSkill.update({
      where: { id: dto.requestId },
      data: {
        documentUrl: JSON.stringify({
          ...requestData,
          status: 'COMPLETED',
          submittedAt: new Date().toISOString(),
          ratings: dto.ratings,
          overallRating,
          strengths: dto.strengths,
          areasForImprovement: dto.areasForImprovement,
          additionalComments: dto.additionalComments,
          anonymous: dto.anonymous ?? true,
        }),
      },
    });

    return { success: true, message: 'Feedback submitted successfully' };
  }

  async get360FeedbackSummary(employeeId: string, managerId: string, companyId: string) {
    const manager = await this.prisma.companyEmployee.findFirst({
      where: {
        userId: managerId,
        companyId,
        role: { in: ['OWNER', 'MANAGER'] },
        status: 'ACTIVE',
      },
    });

    if (!manager) {
      throw new ForbiddenException('Not authorized');
    }

    const feedbackRecords = await this.prisma.employeeSkill.findMany({
      where: {
        employeeId,
        skillName: '360_FEEDBACK_REQUEST',
      },
    });

    const completedFeedback = feedbackRecords
      .map((record) => {
        try {
          return JSON.parse(record.documentUrl || '{}');
        } catch {
          return null;
        }
      })
      .filter((data) => data && data.status === 'COMPLETED');

    if (completedFeedback.length === 0) {
      return {
        totalResponses: 0,
        averageRatings: null,
        strengths: [],
        areasForImprovement: [],
      };
    }

    // Aggregate ratings
    const ratingCategories = ['qualityOfWork', 'communication', 'reliability', 'technicalSkills', 'customerService', 'teamwork'];
    const averageRatings: Record<string, number> = {};

    for (const category of ratingCategories) {
      const values = completedFeedback
        .filter((f) => f.ratings && f.ratings[category])
        .map((f) => f.ratings[category]);
      averageRatings[category] = values.length > 0
        ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
        : 0;
    }

    const overallAverage = Object.values(averageRatings).reduce((a, b) => a + b, 0) / ratingCategories.length;

    return {
      totalResponses: completedFeedback.length,
      averageRatings,
      overallAverage: Math.round(overallAverage * 100) / 100,
      strengths: completedFeedback.map((f) => f.strengths).filter(Boolean),
      areasForImprovement: completedFeedback.map((f) => f.areasForImprovement).filter(Boolean),
      comments: completedFeedback.map((f) => f.additionalComments).filter(Boolean),
    };
  }

  // Review Templates
  async createReviewTemplate(userId: string, companyId: string, dto: ReviewTemplateDto) {
    const manager = await this.prisma.companyEmployee.findFirst({
      where: {
        userId,
        companyId,
        role: { in: ['OWNER', 'MANAGER'] },
        status: 'ACTIVE',
      },
    });

    if (!manager) {
      throw new ForbiddenException('Not authorized to create templates');
    }

    // Store template in platform config or as a company setting
    const template = await this.prisma.platformConfig.create({
      data: {
        key: `review_template_${companyId}_${Date.now()}`,
        value: JSON.stringify({
          ...dto,
          companyId,
          createdBy: userId,
          createdAt: new Date().toISOString(),
        }),
        dataType: 'JSON',
        category: 'GENERAL',
        description: `Review template: ${dto.name}`,
        isPublic: false,
        isActive: true,
      },
    });

    return {
      id: template.id,
      ...dto,
    };
  }

  async getReviewTemplates(companyId: string) {
    const templates = await this.prisma.platformConfig.findMany({
      where: {
        key: { startsWith: `review_template_${companyId}_` },
        isActive: true,
      },
    });

    return templates.map((t) => {
      let value: any;
      try {
        value = JSON.parse(t.value);
      } catch {
        value = {};
      }
      return {
        id: t.id,
        ...value,
      };
    });
  }

  async deleteReviewTemplate(templateId: string, userId: string, companyId: string) {
    const template = await this.prisma.platformConfig.findUnique({
      where: { id: templateId },
    });

    if (!template || !template.key.startsWith(`review_template_${companyId}_`)) {
      throw new NotFoundException('Template not found');
    }

    await this.prisma.platformConfig.update({
      where: { id: templateId },
      data: { isActive: false },
    });

    return { success: true, message: 'Template deleted successfully' };
  }

  // Analytics
  async getReviewAnalytics(companyId: string, userId: string, startDate?: Date, endDate?: Date) {
    const manager = await this.prisma.companyEmployee.findFirst({
      where: {
        userId,
        companyId,
        role: { in: ['OWNER', 'MANAGER'] },
        status: 'ACTIVE',
      },
    });

    if (!manager) {
      throw new ForbiddenException('Not authorized');
    }

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    const reviews = await this.prisma.performanceReview.findMany({
      where: {
        employee: { companyId },
        ...(startDate || endDate ? { createdAt: dateFilter } : {}),
      },
      include: {
        employee: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    const totalReviews = reviews.length;
    const statusCounts = {
      DRAFT: reviews.filter((r) => r.status === 'DRAFT').length,
      SUBMITTED: reviews.filter((r) => r.status === 'SUBMITTED').length,
      ACKNOWLEDGED: reviews.filter((r) => r.status === 'ACKNOWLEDGED').length,
    };

    const avgRatings = reviews.length > 0
      ? {
          qualityOfWork: reviews.reduce((sum, r) => sum + (r.qualityOfWork || 0), 0) / totalReviews,
          communication: reviews.reduce((sum, r) => sum + (r.communication || 0), 0) / totalReviews,
          reliability: reviews.reduce((sum, r) => sum + (r.reliability || 0), 0) / totalReviews,
          technicalSkills: reviews.reduce((sum, r) => sum + (r.technicalSkills || 0), 0) / totalReviews,
          customerService: reviews.reduce((sum, r) => sum + (r.customerService || 0), 0) / totalReviews,
          teamwork: reviews.reduce((sum, r) => sum + (r.teamwork || 0), 0) / totalReviews,
          overall: reviews.reduce((sum, r) => sum + parseFloat(r.overallRating?.toString() || '0'), 0) / totalReviews,
        }
      : null;

    const topPerformers = reviews
      .filter((r) => r.overallRating)
      .sort((a, b) => parseFloat(b.overallRating!.toString()) - parseFloat(a.overallRating!.toString()))
      .slice(0, 5)
      .map((r) => ({
        employeeId: r.employeeId,
        name: `${r.employee.user.firstName} ${r.employee.user.lastName}`,
        rating: parseFloat(r.overallRating!.toString()),
      }));

    return {
      totalReviews,
      statusCounts,
      averageRatings: avgRatings,
      topPerformers,
      completionRate: totalReviews > 0 ? (statusCounts.ACKNOWLEDGED / totalReviews) * 100 : 0,
    };
  }
}
