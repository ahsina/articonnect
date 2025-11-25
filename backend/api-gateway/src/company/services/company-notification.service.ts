import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface CompanyNotification {
  type: 'MISSION_ASSIGNED' | 'MISSION_COMPLETED' | 'EMPLOYEE_JOINED' | 'PAYOUT_PROCESSED' | 'SHIFT_SCHEDULED' | 'REVIEW_SUBMITTED';
  companyId: string;
  userId: string;
  title: string;
  message: string;
  data?: any;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  channels: ('IN_APP' | 'EMAIL' | 'SMS' | 'PUSH')[];
}

@Injectable()
export class CompanyNotificationService {
  private readonly logger = new Logger(CompanyNotificationService.name);

  constructor(private prisma: PrismaService) {}

  async notifyMissionAssignment(missionId: string, employeeId: string, assignedBy: string) {
    const [mission, employee] = await Promise.all([
      this.prisma.mission.findUnique({
        where: { id: missionId },
        include: {
          client: { select: { firstName: true, lastName: true } },
          company: true,
        },
      }),
      this.prisma.companyEmployee.findUnique({
        where: { id: employeeId },
        include: { user: true },
      }),
    ]);

    if (!mission || !employee) return;

    const notification: CompanyNotification = {
      type: 'MISSION_ASSIGNED',
      companyId: mission.companyId!,
      userId: employee.userId,
      title: 'New Mission Assigned',
      message: `You have been assigned to mission: ${mission.title} for ${mission.client.firstName} ${mission.client.lastName}`,
      data: {
        missionId: mission.id,
        missionTitle: mission.title,
        scheduledFor: mission.scheduledFor,
        location: mission.address,
      },
      priority: 'HIGH',
      channels: ['IN_APP', 'EMAIL', 'PUSH'],
    };

    await this.createNotification(notification);

    const settings = await this.prisma.companySettings.findUnique({
      where: { companyId: mission.companyId! },
    });

    if (settings?.notifyManagerOnNewMission) {
      await this.notifyManagers(mission.companyId!, 'MISSION_ASSIGNED', {
        title: 'Mission Assigned',
        message: `${employee.user.firstName} ${employee.user.lastName} was assigned to: ${mission.title}`,
        data: { missionId: mission.id, employeeId: employee.id },
      });
    }
  }

  async notifyMissionCompleted(missionId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        assignedTo: { include: { user: true } },
        completedBy: { include: { user: true } },
        company: true,
      },
    });

    if (!mission || !mission.assignedTo) return;

    const notification: CompanyNotification = {
      type: 'MISSION_COMPLETED',
      companyId: mission.companyId!,
      userId: mission.assignedTo.userId,
      title: 'Mission Completed',
      message: `Your mission "${mission.title}" has been marked as completed`,
      data: {
        missionId: mission.id,
        finalPrice: mission.finalPrice,
        completedAt: mission.completedAt,
      },
      priority: 'MEDIUM',
      channels: ['IN_APP', 'EMAIL'],
    };

    await this.createNotification(notification);

    await this.notifyOwnerAndManagers(mission.companyId!, 'MISSION_COMPLETED', {
      title: 'Mission Completed',
      message: `${mission.completedBy?.user.firstName || 'Employee'} completed: ${mission.title}`,
      data: { missionId: mission.id, revenue: mission.finalPrice },
    });
  }

  async notifyEmployeeJoined(employeeId: string) {
    const employee = await this.prisma.companyEmployee.findUnique({
      where: { id: employeeId },
      include: {
        user: true,
        company: true,
      },
    });

    if (!employee) return;

    const welcomeNotification: CompanyNotification = {
      type: 'EMPLOYEE_JOINED',
      companyId: employee.companyId,
      userId: employee.userId,
      title: `Welcome to ${employee.company.companyName}!`,
      message: `Your account has been activated. You can now view your dashboard, schedule, and assigned missions.`,
      data: {
        companyId: employee.companyId,
        role: employee.role,
      },
      priority: 'MEDIUM',
      channels: ['IN_APP', 'EMAIL'],
    };

    await this.createNotification(welcomeNotification);

    await this.notifyOwnerAndManagers(employee.companyId, 'EMPLOYEE_JOINED', {
      title: 'New Employee Joined',
      message: `${employee.user.firstName} ${employee.user.lastName} has joined as ${employee.role}`,
      data: { employeeId: employee.id },
    });
  }

  async notifyPayoutProcessed(earningsId: string) {
    const earnings = await this.prisma.employeeEarnings.findUnique({
      where: { id: earningsId },
      include: {
        employee: { include: { user: true, company: true } },
        mission: { select: { title: true } },
      },
    });

    if (!earnings) return;

    const notification: CompanyNotification = {
      type: 'PAYOUT_PROCESSED',
      companyId: earnings.employee.companyId,
      userId: earnings.employee.userId,
      title: 'Payout Processed',
      message: `Your payout of €${earnings.employeeCommission.toNumber().toFixed(2)} for "${earnings.mission.title}" has been processed`,
      data: {
        earningsId: earnings.id,
        amount: earnings.employeeCommission,
        missionId: earnings.missionId,
        payoutDate: earnings.payoutDate,
      },
      priority: 'HIGH',
      channels: ['IN_APP', 'EMAIL', 'PUSH'],
    };

    await this.createNotification(notification);
  }

  async notifyShiftScheduled(shiftId: string) {
    const shift = await this.prisma.employeeShift.findUnique({
      where: { id: shiftId },
      include: {
        employee: { include: { user: true, company: true } },
      },
    });

    if (!shift) return;

    const notification: CompanyNotification = {
      type: 'SHIFT_SCHEDULED',
      companyId: shift.employee.companyId,
      userId: shift.employee.userId,
      title: 'New Shift Scheduled',
      message: `You have been scheduled for a ${shift.shiftType} shift on ${shift.startTime.toLocaleDateString()}`,
      data: {
        shiftId: shift.id,
        startTime: shift.startTime,
        endTime: shift.endTime,
        shiftType: shift.shiftType,
      },
      priority: 'MEDIUM',
      channels: ['IN_APP', 'EMAIL', 'PUSH'],
    };

    await this.createNotification(notification);
  }

  async notifyPerformanceReview(reviewId: string) {
    const review = await this.prisma.performanceReview.findUnique({
      where: { id: reviewId },
      include: {
        employee: { include: { user: true, company: true } },
        reviewer: { include: { user: true } },
      },
    });

    if (!review) return;

    const notification: CompanyNotification = {
      type: 'REVIEW_SUBMITTED',
      companyId: review.employee.companyId,
      userId: review.employee.userId,
      title: 'Performance Review Available',
      message: `${review.reviewer.user.firstName} ${review.reviewer.user.lastName} has submitted your performance review`,
      data: {
        reviewId: review.id,
        reviewPeriodStart: review.reviewPeriodStart,
        reviewPeriodEnd: review.reviewPeriodEnd,
        overallRating: review.overallRating,
      },
      priority: 'HIGH',
      channels: ['IN_APP', 'EMAIL'],
    };

    await this.createNotification(notification);
  }

  async notifyBulkShiftsScheduled(companyId: string, employeeIds: string[], shiftCount: number) {
    const employees = await this.prisma.companyEmployee.findMany({
      where: { id: { in: employeeIds } },
      include: { user: true },
    });

    for (const employee of employees) {
      const notification: CompanyNotification = {
        type: 'SHIFT_SCHEDULED',
        companyId,
        userId: employee.userId,
        title: 'Bulk Shifts Scheduled',
        message: `${shiftCount} new shifts have been scheduled for you. Check your schedule for details.`,
        data: { shiftCount },
        priority: 'MEDIUM',
        channels: ['IN_APP', 'EMAIL'],
      };

      await this.createNotification(notification);
    }
  }

  async notifyOverduePayouts(companyId: string) {
    const overdueEarnings = await this.prisma.employeeEarnings.findMany({
      where: {
        employee: { companyId },
        status: 'PENDING',
        createdAt: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        employee: { include: { user: true } },
      },
    });

    await this.notifyOwnerAndManagers(companyId, 'PAYOUT_PROCESSED', {
      title: 'Overdue Payouts Alert',
      message: `${overdueEarnings.length} payout(s) have been pending for more than 7 days`,
      data: { count: overdueEarnings.length },
    });
  }

  private async createNotification(notification: CompanyNotification) {
    this.logger.debug(`Creating notification: ${notification.type} for user ${notification.userId}`);
    return notification;
  }

  private async notifyOwnerAndManagers(companyId: string, type: string, payload: any) {
    const ownerAndManagers = await this.prisma.companyEmployee.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        role: { in: ['OWNER', 'MANAGER'] },
      },
      include: { user: true },
    });

    for (const member of ownerAndManagers) {
      const notification: CompanyNotification = {
        type: type as any,
        companyId,
        userId: member.userId,
        title: payload.title,
        message: payload.message,
        data: payload.data,
        priority: 'MEDIUM',
        channels: ['IN_APP', 'EMAIL'],
      };

      await this.createNotification(notification);
    }
  }

  private async notifyManagers(companyId: string, type: string, payload: any) {
    const managers = await this.prisma.companyEmployee.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        role: 'MANAGER',
      },
      include: { user: true },
    });

    for (const manager of managers) {
      const notification: CompanyNotification = {
        type: type as any,
        companyId,
        userId: manager.userId,
        title: payload.title,
        message: payload.message,
        data: payload.data,
        priority: 'MEDIUM',
        channels: ['IN_APP', 'EMAIL'],
      };

      await this.createNotification(notification);
    }
  }
}
