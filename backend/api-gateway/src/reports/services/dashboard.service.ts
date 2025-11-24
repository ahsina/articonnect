import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getCompanyKPIs(companyId: string, requesterId: string) {
    await this.validateCompanyAccess(companyId, requesterId);

    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      company,
      totalEmployees,
      activeEmployees,
      totalMissions,
      activeMissions,
      completedLast30Days,
      revenueLast30Days,
      pendingEarnings,
      recentActivities,
    ] = await Promise.all([
      this.prisma.company.findUnique({ where: { id: companyId } }),
      this.prisma.companyEmployee.count({ where: { companyId } }),
      this.prisma.companyEmployee.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.mission.count({ where: { companyId } }),
      this.prisma.mission.count({ where: { companyId, status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
      this.prisma.mission.count({
        where: { companyId, status: 'COMPLETED', completedAt: { gte: last30Days } },
      }),
      this.prisma.mission.aggregate({
        where: { companyId, status: 'COMPLETED', completedAt: { gte: last30Days } },
        _sum: { finalPrice: true },
      }),
      this.prisma.employeeEarnings.aggregate({
        where: { employee: { companyId }, status: 'PENDING' },
        _sum: { employeeCommission: true },
        _count: { id: true },
      }),
      this.getRecentActivities(companyId, 10),
    ]);

    const previousPeriodRevenue = await this.prisma.mission.aggregate({
      where: {
        companyId,
        status: 'COMPLETED',
        completedAt: {
          gte: new Date(last30Days.getTime() - 30 * 24 * 60 * 60 * 1000),
          lt: last30Days,
        },
      },
      _sum: { finalPrice: true },
    });

    const currentRevenue = revenueLast30Days._sum.finalPrice?.toNumber() || 0;
    const previousRevenue = previousPeriodRevenue._sum.finalPrice?.toNumber() || 0;
    const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    return {
      company: {
        id: company?.id,
        name: company?.companyName,
        totalMissions: company?.totalMissions || 0,
        totalRevenue: company?.totalRevenue || 0,
      },
      kpis: {
        employees: {
          total: totalEmployees,
          active: activeEmployees,
          activePercentage: totalEmployees > 0 ? (activeEmployees / totalEmployees) * 100 : 0,
        },
        missions: {
          total: totalMissions,
          active: activeMissions,
          completedLast30Days,
          completionRate: totalMissions > 0 ? ((totalMissions - activeMissions) / totalMissions) * 100 : 0,
        },
        revenue: {
          last30Days: currentRevenue,
          previous30Days: previousRevenue,
          growth: revenueGrowth,
          averagePerMission: completedLast30Days > 0 ? currentRevenue / completedLast30Days : 0,
        },
        earnings: {
          pending: pendingEarnings._sum.employeeCommission?.toNumber() || 0,
          pendingCount: pendingEarnings._count.id,
        },
      },
      recentActivities,
      alerts: await this.getAlerts(companyId),
    };
  }

  async getEmployeeDashboard(employeeId: string, requesterId: string) {
    const employee = await this.prisma.companyEmployee.findUnique({
      where: { id: employeeId },
      include: {
        user: true,
        company: true,
      },
    });

    if (!employee || employee.userId !== requesterId) {
      throw new ForbiddenException('Access denied');
    }

    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [activeMissions, completedLast30Days, earnings, pendingEarnings] = await Promise.all([
      this.prisma.mission.count({
        where: { assignedToId: employeeId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      }),
      this.prisma.mission.count({
        where: { assignedToId: employeeId, status: 'COMPLETED', completedAt: { gte: last30Days } },
      }),
      this.prisma.employeeEarnings.aggregate({
        where: { employeeId, status: 'PAID', payoutDate: { gte: last30Days } },
        _sum: { employeeCommission: true },
      }),
      this.prisma.employeeEarnings.aggregate({
        where: { employeeId, status: 'PENDING' },
        _sum: { employeeCommission: true },
        _count: { id: true },
      }),
      ]);

    const recentMissions = await this.prisma.mission.findMany({
      where: { assignedToId: employeeId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: {
        client: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return {
      employee: {
        id: employee.id,
        name: `${employee.user.firstName} ${employee.user.lastName}`,
        email: employee.user.email,
        role: employee.role,
        status: employee.status,
        company: employee.company.companyName,
      },
      kpis: {
        activeMissions,
        completedLast30Days,
        earningsLast30Days: earnings._sum.employeeCommission?.toNumber() || 0,
        pendingEarnings: pendingEarnings._sum.employeeCommission?.toNumber() || 0,
        pendingEarningsCount: pendingEarnings._count.id,
        commissionRate: employee.commissionRate?.toNumber() || 0,
      },
      recentMissions: recentMissions.map((m) => ({
        id: m.id,
        title: m.title,
        status: m.status,
        category: m.category,
        client: `${m.client.firstName} ${m.client.lastName}`,
        finalPrice: m.finalPrice,
        scheduledFor: m.scheduledFor,
      })),
    };
  }

  async getPerformanceOverview(companyId: string, requesterId: string, days: number = 30) {
    await this.validateCompanyAccess(companyId, requesterId);

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const missions = await this.prisma.mission.findMany({
      where: {
        companyId,
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

    const dailyData = new Map<string, { missions: number; revenue: number; completed: number }>();

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split('T')[0];
      dailyData.set(key, { missions: 0, revenue: 0, completed: 0 });
    }

    missions.forEach((mission) => {
      const key = mission.createdAt.toISOString().split('T')[0];
      const data = dailyData.get(key);
      if (data) {
        data.missions += 1;
        if (mission.status === 'COMPLETED') {
          data.completed += 1;
          data.revenue += mission.finalPrice?.toNumber() || 0;
        }
      }
    });

    const chartData = Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date,
        missions: data.missions,
        completed: data.completed,
        revenue: data.revenue,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      period: { days, startDate, endDate: new Date() },
      chartData,
      totals: {
        missions: missions.length,
        completed: missions.filter((m) => m.status === 'COMPLETED').length,
        revenue: missions.reduce((sum, m) => sum + (m.finalPrice?.toNumber() || 0), 0),
      },
    };
  }

  private async getRecentActivities(companyId: string, limit: number = 10) {
    const [recentMissions, recentEarnings] = await Promise.all([
      this.prisma.mission.findMany({
        where: { companyId },
        orderBy: { updatedAt: 'desc' },
        take: limit / 2,
        include: {
          assignedTo: {
            select: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
          client: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.employeeEarnings.findMany({
        where: { employee: { companyId } },
        orderBy: { updatedAt: 'desc' },
        take: limit / 2,
        include: {
          employee: {
            select: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
          mission: {
            select: { title: true },
          },
        },
      }),
    ]);

    const activities: any[] = [];

    recentMissions.forEach((mission) => {
      activities.push({
        type: 'mission',
        id: mission.id,
        title: mission.title,
        status: mission.status,
        assignedTo: mission.assignedTo
          ? `${mission.assignedTo.user.firstName} ${mission.assignedTo.user.lastName}`
          : null,
        client: `${mission.client.firstName} ${mission.client.lastName}`,
        timestamp: mission.updatedAt,
      });
    });

    recentEarnings.forEach((earning) => {
      activities.push({
        type: 'earning',
        id: earning.id,
        mission: earning.mission.title,
        employee: `${earning.employee.user.firstName} ${earning.employee.user.lastName}`,
        amount: earning.employeeCommission,
        status: earning.status,
        timestamp: earning.updatedAt,
      });
    });

    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return activities.slice(0, limit);
  }

  private async getAlerts(companyId: string) {
    const alerts: any[] = [];

    const pendingMissionsCount = await this.prisma.mission.count({
      where: { companyId, status: 'PENDING', assignedToId: null },
    });

    if (pendingMissionsCount > 0) {
      alerts.push({
        type: 'warning',
        message: `${pendingMissionsCount} mission(s) waiting for assignment`,
        action: 'assign_missions',
      });
    }

    const overdueMissions = await this.prisma.mission.count({
      where: {
        companyId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        scheduledFor: { lt: new Date() },
      },
    });

    if (overdueMissions > 0) {
      alerts.push({
        type: 'error',
        message: `${overdueMissions} overdue mission(s)`,
        action: 'view_overdue',
      });
    }

    const pendingPayouts = await this.prisma.employeeEarnings.count({
      where: {
        employee: { companyId },
        status: 'PENDING',
        createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    if (pendingPayouts > 0) {
      alerts.push({
        type: 'info',
        message: `${pendingPayouts} payout(s) pending for more than 7 days`,
        action: 'process_payouts',
      });
    }

    return alerts;
  }

  private async validateCompanyAccess(companyId: string, userId: string) {
    const employee = await this.prisma.companyEmployee.findFirst({
      where: {
        companyId,
        userId,
        status: 'ACTIVE',
      },
    });

    if (!employee) {
      throw new ForbiddenException('You do not have access to this company');
    }

    return employee;
  }
}
