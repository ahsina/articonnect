import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class EmployeeReportsService {
  constructor(private prisma: PrismaService) {}

  async getEmployeeEarningsHistory(employeeId: string, requesterId: string, startDate?: Date, endDate?: Date) {
    await this.validateEmployeeAccess(employeeId, requesterId);

    const earnings = await this.prisma.employeeEarnings.findMany({
      where: {
        employeeId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        mission: {
          select: {
            id: true,
            title: true,
            category: true,
            finalPrice: true,
            completedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalGross = earnings.reduce((sum, e) => sum + e.employeeCommission.toNumber(), 0);
    const totalPlatformFees = earnings.reduce((sum, e) => sum + (e.platformCommission?.toNumber() || 0), 0);
    // Fix copier-coller bug: totalNet doit deduire les frais plateforme du brut (auparavant identique a totalGross).
    // NB: arithmetique monetaire laissee en Number/.toNumber() (Decimal) comme demande — non modifiee.
    const totalNet = totalGross - totalPlatformFees;
    const totalPaid = earnings.filter((e) => e.status === 'PAID').reduce((sum, e) => sum + e.employeeCommission.toNumber(), 0);
    const totalPending = earnings.filter((e) => e.status === 'PENDING').reduce((sum, e) => sum + e.employeeCommission.toNumber(), 0);

    return {
      period: { startDate, endDate },
      summary: {
        totalEarnings: totalGross,
        totalNet,
        totalPlatformFees,
        totalPaid,
        totalPending,
        earningsCount: earnings.length,
      },
      earnings: earnings.map((e) => ({
        id: e.id,
        mission: {
          id: e.mission.id,
          title: e.mission.title,
          category: e.mission.category,
          revenue: e.mission.finalPrice,
          completedAt: e.mission.completedAt,
        },
        employeeCommission: e.employeeCommission,
        platformCommission: e.platformCommission,
        status: e.status,
        payoutDate: e.payoutDate,
        createdAt: e.createdAt,
      })),
    };
  }

  async getEmployeePerformance(employeeId: string, requesterId: string, startDate?: Date, endDate?: Date) {
    await this.validateEmployeeAccess(employeeId, requesterId);

    const employee = await this.prisma.companyEmployee.findUnique({
      where: { id: employeeId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        company: {
          select: {
            id: true,
            companyName: true,
          },
        },
        assignedMissions: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            id: true,
            title: true,
            status: true,
            category: true,
            finalPrice: true,
            createdAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const completedMissions = employee.assignedMissions.filter((m) => m.status === 'COMPLETED');
    const inProgressMissions = employee.assignedMissions.filter((m) => m.status === 'IN_PROGRESS');
    const pendingMissions = employee.assignedMissions.filter((m) => m.status === 'PENDING');

    const totalRevenue = completedMissions.reduce((sum, m) => sum + (m.finalPrice?.toNumber() || 0), 0);

    const completionTimes = completedMissions
      .filter((m) => m.completedAt)
      .map((m) => m.completedAt!.getTime() - m.createdAt.getTime());

    const avgCompletionTime = completionTimes.length > 0
      ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
      : 0;

    const categoryBreakdown = completedMissions.reduce((acc, mission) => {
      acc[mission.category] = (acc[mission.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      period: { startDate, endDate },
      employee: {
        id: employee.id,
        name: `${employee.user.firstName} ${employee.user.lastName}`,
        email: employee.user.email,
        role: employee.role,
        status: employee.status,
        company: employee.company.companyName,
      },
      metrics: {
        totalMissions: employee.assignedMissions.length,
        completedMissions: completedMissions.length,
        inProgressMissions: inProgressMissions.length,
        pendingMissions: pendingMissions.length,
        completionRate: employee.assignedMissions.length > 0
          ? (completedMissions.length / employee.assignedMissions.length) * 100
          : 0,
        totalRevenue,
        averageRevenuePerMission: completedMissions.length > 0 ? totalRevenue / completedMissions.length : 0,
        averageCompletionTimeMs: avgCompletionTime,
        averageCompletionTimeDays: avgCompletionTime / (1000 * 60 * 60 * 24),
      },
      categoryBreakdown: Object.entries(categoryBreakdown)
        .map(([category, count]) => ({ category, count: count as number }))
        .sort((a, b) => b.count - a.count),
      recentMissions: employee.assignedMissions.slice(0, 10),
    };
  }

  async getEmployeeProductivityTrends(employeeId: string, requesterId: string, months: number = 6) {
    await this.validateEmployeeAccess(employeeId, requesterId);

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const missions = await this.prisma.mission.findMany({
      where: {
        assignedToId: employeeId,
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        status: true,
        finalPrice: true,
        createdAt: true,
        completedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const monthlyData = new Map<string, { completed: number; revenue: number; total: number }>();

    missions.forEach((mission) => {
      const monthKey = `${mission.createdAt.getFullYear()}-${String(mission.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const data = monthlyData.get(monthKey) || { completed: 0, revenue: 0, total: 0 };

      data.total += 1;
      if (mission.status === 'COMPLETED') {
        data.completed += 1;
        data.revenue += mission.finalPrice?.toNumber() || 0;
      }

      monthlyData.set(monthKey, data);
    });

    const trends = Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        totalMissions: data.total,
        completedMissions: data.completed,
        revenue: data.revenue,
        completionRate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
        averageRevenue: data.completed > 0 ? data.revenue / data.completed : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      period: {
        startDate,
        endDate: new Date(),
        months,
      },
      trends,
    };
  }

  async getEmployeeComparison(companyId: string, requesterId: string, startDate?: Date, endDate?: Date) {
    const requester = await this.prisma.companyEmployee.findFirst({
      where: {
        companyId,
        userId: requesterId,
        status: 'ACTIVE',
      },
    });

    if (!requester) {
      throw new ForbiddenException('You do not have access to this company');
    }

    const permissions = requester.permissions as any;
    if (requester.role !== 'OWNER' && requester.role !== 'MANAGER' && !permissions?.canViewFinancials) {
      throw new ForbiddenException('You do not have permission to view employee comparisons');
    }

    const employees = await this.prisma.companyEmployee.findMany({
      where: { companyId, status: 'ACTIVE' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        assignedMissions: {
          where: {
            status: 'COMPLETED',
            completedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            finalPrice: true,
          },
        },
        earnings: {
          where: {
            status: 'PAID',
            payoutDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            employeeCommission: true,
          },
        },
      },
    });

    const comparison = employees.map((emp) => {
      const totalRevenue = emp.assignedMissions.reduce((sum, m) => sum + (m.finalPrice?.toNumber() || 0), 0);
      const totalEarnings = emp.earnings.reduce((sum, e) => sum + e.employeeCommission.toNumber(), 0);

      return {
        employeeId: emp.id,
        name: `${emp.user.firstName} ${emp.user.lastName}`,
        role: emp.role,
        completedMissions: emp.assignedMissions.length,
        totalRevenue,
        totalEarnings,
        averageRevenuePerMission: emp.assignedMissions.length > 0 ? totalRevenue / emp.assignedMissions.length : 0,
        commissionRate: emp.commissionRate?.toNumber() || 0,
      };
    });

    comparison.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      period: { startDate, endDate },
      totalEmployees: employees.length,
      comparison,
      topPerformer: comparison[0] || null,
      averages: {
        missionsPerEmployee: comparison.reduce((sum, e) => sum + e.completedMissions, 0) / employees.length || 0,
        revenuePerEmployee: comparison.reduce((sum, e) => sum + e.totalRevenue, 0) / employees.length || 0,
        earningsPerEmployee: comparison.reduce((sum, e) => sum + e.totalEarnings, 0) / employees.length || 0,
      },
    };
  }

  private async validateEmployeeAccess(employeeId: string, requesterId: string) {
    const employee = await this.prisma.companyEmployee.findUnique({
      where: { id: employeeId },
      include: {
        company: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (employee.userId === requesterId) {
      return employee;
    }

    const requester = await this.prisma.companyEmployee.findFirst({
      where: {
        companyId: employee.companyId,
        userId: requesterId,
        status: 'ACTIVE',
      },
    });

    if (!requester) {
      throw new ForbiddenException('You do not have access to this employee data');
    }

    if (requester.role !== 'OWNER' && requester.role !== 'MANAGER') {
      const permissions = requester.permissions as any;
      if (!permissions?.canViewFinancials) {
        throw new ForbiddenException('You do not have permission to view employee reports');
      }
    }

    return employee;
  }
}
