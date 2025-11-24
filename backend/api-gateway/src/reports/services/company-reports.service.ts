import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CompanyReportsService {
  constructor(private prisma: PrismaService) {}

  async getCompanyDashboard(companyId: string, requesterId: string) {
    await this.validateCompanyAccess(companyId, requesterId);

    const [company, totalEmployees, activeMissions, completedMissions, totalRevenue, recentMissions] = await Promise.all([
      this.prisma.company.findUnique({ where: { id: companyId } }),
      this.prisma.companyEmployee.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.mission.count({ where: { companyId, status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
      this.prisma.mission.count({ where: { companyId, status: 'COMPLETED' } }),
      this.prisma.employeeEarnings.aggregate({
        where: { employee: { companyId } },
        _sum: { employeeCommission: true },
      }),
      this.prisma.mission.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { assignedTo: { include: { user: true } }, client: true },
      }),
    ]);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const pendingPayouts = await this.prisma.employeeEarnings.count({
      where: { employee: { companyId }, status: 'PENDING' },
    });

    return {
      company: {
        id: company.id,
        name: company.companyName,
        totalMissions: company.totalMissions,
        totalRevenue: company.totalRevenue,
      },
      metrics: {
        totalEmployees,
        activeMissions,
        completedMissions,
        totalRevenue: totalRevenue._sum.employeeCommission || 0,
        pendingPayouts,
      },
      recentMissions: recentMissions.map((mission) => ({
        id: mission.id,
        title: mission.title,
        status: mission.status,
        assignedTo: mission.assignedTo ? `${mission.assignedTo.user.firstName} ${mission.assignedTo.user.lastName}` : null,
        client: `${mission.client.firstName} ${mission.client.lastName}`,
        finalPrice: mission.finalPrice,
        createdAt: mission.createdAt,
      })),
    };
  }

  async getRevenueReport(companyId: string, requesterId: string, startDate?: Date, endDate?: Date, groupBy: 'day' | 'week' | 'month' = 'month') {
    await this.validateCompanyAccess(companyId, requesterId);

    const dateFilter: Prisma.MissionWhereInput = {
      companyId,
      status: 'COMPLETED',
      completedAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    const missions = await this.prisma.mission.findMany({
      where: dateFilter,
      select: {
        id: true,
        finalPrice: true,
        completedAt: true,
        assignedTo: {
          select: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { completedAt: 'asc' },
    });

    const groupedData = this.groupRevenueData(missions, groupBy);

    const totalRevenue = missions.reduce((sum, m) => sum + (m.finalPrice?.toNumber() || 0), 0);
    const averageRevenue = missions.length > 0 ? totalRevenue / missions.length : 0;

    return {
      period: {
        startDate,
        endDate,
        groupBy,
      },
      summary: {
        totalRevenue,
        totalMissions: missions.length,
        averageRevenue,
      },
      data: groupedData,
    };
  }

  async getEmployeePerformanceReport(companyId: string, requesterId: string, startDate?: Date, endDate?: Date) {
    await this.validateCompanyAccess(companyId, requesterId);

    const employees = await this.prisma.companyEmployee.findMany({
      where: { companyId, status: 'ACTIVE' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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
            id: true,
            finalPrice: true,
            completedAt: true,
          },
        },
        earnings: {
          where: {
            createdAt: {
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

    const performanceData = employees.map((employee) => {
      const completedMissions = employee.assignedMissions.length;
      const totalRevenue = employee.assignedMissions.reduce((sum, m) => sum + (m.finalPrice?.toNumber() || 0), 0);
      const totalEarnings = employee.earnings.reduce((sum, e) => sum + e.employeeCommission.toNumber(), 0);
      const totalNet = employee.earnings.reduce((sum, e) => sum + e.employeeCommission.toNumber(), 0);

      return {
        employeeId: employee.id,
        name: `${employee.user.firstName} ${employee.user.lastName}`,
        email: employee.user.email,
        role: employee.role,
        metrics: {
          completedMissions,
          totalRevenue,
          averageRevenuePerMission: completedMissions > 0 ? totalRevenue / completedMissions : 0,
          totalEarnings,
          totalNet,
          commissionRate: employee.commissionRate?.toNumber() || 0,
        },
      };
    });

    performanceData.sort((a, b) => b.metrics.totalRevenue - a.metrics.totalRevenue);

    return {
      period: { startDate, endDate },
      totalEmployees: employees.length,
      topPerformers: performanceData.slice(0, 5),
      allEmployees: performanceData,
    };
  }

  async getMissionStatistics(companyId: string, requesterId: string, startDate?: Date, endDate?: Date) {
    await this.validateCompanyAccess(companyId, requesterId);

    const dateFilter = {
      gte: startDate,
      lte: endDate,
    };

    const [missions, statusCounts, categoryCounts] = await Promise.all([
      this.prisma.mission.findMany({
        where: {
          companyId,
          createdAt: dateFilter,
        },
        select: {
          id: true,
          status: true,
          category: true,
          finalPrice: true,
          createdAt: true,
          completedAt: true,
        },
      }),
      this.prisma.mission.groupBy({
        by: ['status'],
        where: {
          companyId,
          createdAt: dateFilter,
        },
        _count: { id: true },
      }),
      this.prisma.mission.groupBy({
        by: ['category'],
        where: {
          companyId,
          createdAt: dateFilter,
        },
        _count: { id: true },
      }),
    ]);

    const completedMissions = missions.filter((m) => m.status === 'COMPLETED' && m.completedAt);
    const averageCompletionTime = completedMissions.length > 0
      ? completedMissions.reduce((sum, m) => {
          const duration = m.completedAt!.getTime() - m.createdAt.getTime();
          return sum + duration;
        }, 0) / completedMissions.length
      : 0;

    const statusDistribution = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    const categoryDistribution = categoryCounts.reduce((acc, item) => {
      acc[item.category] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      period: { startDate, endDate },
      summary: {
        totalMissions: missions.length,
        completedMissions: completedMissions.length,
        averageCompletionTimeMs: averageCompletionTime,
        averageCompletionTimeDays: averageCompletionTime / (1000 * 60 * 60 * 24),
      },
      statusDistribution,
      categoryDistribution,
      topCategories: Object.entries(categoryDistribution)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([category, count]) => ({ category, count })),
    };
  }

  async getFinancialSummary(companyId: string, requesterId: string, startDate?: Date, endDate?: Date) {
    await this.validateCompanyAccess(companyId, requesterId);

    const dateFilter = {
      gte: startDate,
      lte: endDate,
    };

    const [earnings, payouts, missions] = await Promise.all([
      this.prisma.employeeEarnings.findMany({
        where: {
          employee: { companyId },
          createdAt: dateFilter,
        },
        select: {
          employeeCommission: true,
          platformCommission: true,
          status: true,
          employee: {
            select: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      this.prisma.employeeEarnings.findMany({
        where: {
          employee: { companyId },
          status: 'PAID',
          payoutDate: dateFilter,
        },
        select: {
          employeeCommission: true,
          payoutDate: true,
        },
      }),
      this.prisma.mission.findMany({
        where: {
          companyId,
          status: 'COMPLETED',
          completedAt: dateFilter,
        },
        select: {
          finalPrice: true,
        },
      }),
    ]);

    const totalRevenue = missions.reduce((sum, m) => sum + (m.finalPrice?.toNumber() || 0), 0);
    const totalGrossEarnings = earnings.reduce((sum, e) => sum + e.employeeCommission.toNumber(), 0);
    const totalNetEarnings = earnings.reduce((sum, e) => sum + e.employeeCommission.toNumber(), 0);
    const totalPlatformFees = earnings.reduce((sum, e) => sum + (e.platformCommission?.toNumber() || 0), 0);
    const totalPaidOut = payouts.reduce((sum, p) => sum + p.employeeCommission.toNumber(), 0);
    const pendingEarnings = earnings.filter((e) => e.status === 'PENDING');
    const totalPending = pendingEarnings.reduce((sum, e) => sum + e.employeeCommission.toNumber(), 0);

    return {
      period: { startDate, endDate },
      revenue: {
        total: totalRevenue,
        afterPlatformFees: totalRevenue - totalPlatformFees,
      },
      earnings: {
        totalGross: totalGrossEarnings,
        totalNet: totalNetEarnings,
        totalPlatformFees,
      },
      payouts: {
        totalPaid: totalPaidOut,
        totalPending,
        pendingCount: pendingEarnings.length,
      },
      companyShare: totalRevenue - totalGrossEarnings,
    };
  }

  private groupRevenueData(missions: any[], groupBy: 'day' | 'week' | 'month') {
    const grouped = new Map<string, { revenue: number; count: number }>();

    missions.forEach((mission) => {
      if (!mission.completedAt) return;

      const date = new Date(mission.completedAt);
      let key: string;

      switch (groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      const existing = grouped.get(key) || { revenue: 0, count: 0 };
      existing.revenue += mission.finalPrice?.toNumber() || 0;
      existing.count += 1;
      grouped.set(key, existing);
    });

    return Array.from(grouped.entries())
      .map(([period, data]) => ({
        period,
        revenue: data.revenue,
        missions: data.count,
        averageRevenue: data.revenue / data.count,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  private async validateCompanyAccess(companyId: string, userId: string) {
    const employee = await this.prisma.companyEmployee.findFirst({
      where: {
        companyId,
        userId,
        status: 'ACTIVE',
      },
      include: { company: true },
    });

    if (!employee) {
      throw new ForbiddenException('You do not have access to this company');
    }

    const permissions = employee.permissions as any;
    if (!permissions?.canViewFinancials && employee.role !== 'OWNER' && employee.role !== 'MANAGER') {
      throw new ForbiddenException('You do not have permission to view company reports');
    }

    return employee;
  }
}
