import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { MissionStatus, UserRole, TransactionStatus, DisputeStatus } from '@prisma/client';

export interface BusinessMetrics {
  revenue: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    growth: number;
  };
  missions: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    completionRate: number;
    averageValue: number;
  };
  users: {
    total: number;
    clients: number;
    artisans: number;
    newToday: number;
    newThisWeek: number;
    activeUsers: number;
  };
  payments: {
    successRate: number;
    totalTransactions: number;
    averageTransaction: number;
    failedTransactions: number;
  };
  disputes: {
    total: number;
    pending: number;
    resolved: number;
    resolutionRate: number;
    averageResolutionTime: number;
  };
  noShows: {
    total: number;
    validated: number;
    rejected: number;
    pending: number;
    validationRate: number;
  };
}

export interface TimeSeriesData {
  date: string;
  revenue: number;
  missions: number;
  newUsers: number;
}

@Injectable()
export class AnalyticsService {
  private readonly CACHE_TTL = 300;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getBusinessMetrics(): Promise<BusinessMetrics> {
    const cacheKey = 'analytics:business_metrics';
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalRevenue,
      todayRevenue,
      weekRevenue,
      monthRevenue,
      lastMonthRevenue,
    ] = await Promise.all([
      this.calculateRevenue(),
      this.calculateRevenue(todayStart),
      this.calculateRevenue(weekStart),
      this.calculateRevenue(monthStart),
      this.calculateRevenue(lastMonthStart, lastMonthEnd),
    ]);

    const revenueGrowth = lastMonthRevenue === 0
      ? 100
      : ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

    const [missions, pendingMissions, inProgressMissions, completedMissions] =
      await Promise.all([
        this.prisma.mission.count(),
        this.prisma.mission.count({ where: { status: MissionStatus.PENDING } }),
        this.prisma.mission.count({ where: { status: MissionStatus.IN_PROGRESS } }),
        this.prisma.mission.count({ where: { status: MissionStatus.COMPLETED } }),
      ]);

    const totalStarted = inProgressMissions + completedMissions;
    const completionRate = totalStarted === 0
      ? 0
      : (completedMissions / totalStarted) * 100;

    const avgMissionValue = await this.getAverageMissionValue();

    const [
      totalUsers,
      clients,
      artisans,
      newToday,
      newThisWeek,
      activeUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: UserRole.CLIENT } }),
      this.prisma.user.count({ where: { role: UserRole.ARTISAN } }),
      this.prisma.user.count({
        where: { createdAt: { gte: todayStart } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: weekStart } },
      }),
      this.prisma.user.count({
        where: { lastLoginAt: { gte: weekStart } },
      }),
    ]);

    const [totalTransactions, failedTransactions] = await Promise.all([
      this.prisma.transaction.count(),
      this.prisma.transaction.count({
        where: { status: { in: [TransactionStatus.FAILED, TransactionStatus.REFUNDED] } },
      }),
    ]);

    const successRate = totalTransactions === 0
      ? 0
      : ((totalTransactions - failedTransactions) / totalTransactions) * 100;

    const avgTransaction = totalTransactions === 0
      ? 0
      : totalRevenue / totalTransactions;

    const [totalDisputes, pendingDisputes, resolvedDisputes] =
      await Promise.all([
        this.prisma.dispute.count(),
        this.prisma.dispute.count({ where: { status: DisputeStatus.OPEN } }),
        this.prisma.dispute.count({ where: { status: DisputeStatus.RESOLVED } }),
      ]);

    const resolutionRate = totalDisputes === 0
      ? 0
      : (resolvedDisputes / totalDisputes) * 100;

    const avgResolutionTime = await this.getAverageResolutionTime();

    const [totalNoShows, validatedNoShows, rejectedNoShows, pendingNoShows] =
      await Promise.all([
        this.prisma.noShowEvent.count(),
        this.prisma.noShowEvent.count({ where: { status: 'VALIDATED' } }),
        this.prisma.noShowEvent.count({ where: { status: 'REJECTED' } }),
        this.prisma.noShowEvent.count({
          where: { status: 'PENDING_REVIEW' },
        }),
      ]);

    const validationRate = totalNoShows === 0
      ? 0
      : (validatedNoShows / totalNoShows) * 100;

    const metrics: BusinessMetrics = {
      revenue: {
        total: totalRevenue,
        today: todayRevenue,
        thisWeek: weekRevenue,
        thisMonth: monthRevenue,
        growth: Math.round(revenueGrowth * 100) / 100,
      },
      missions: {
        total: missions,
        pending: pendingMissions,
        inProgress: inProgressMissions,
        completed: completedMissions,
        completionRate: Math.round(completionRate * 100) / 100,
        averageValue: Math.round(avgMissionValue * 100) / 100,
      },
      users: {
        total: totalUsers,
        clients,
        artisans,
        newToday,
        newThisWeek,
        activeUsers,
      },
      payments: {
        successRate: Math.round(successRate * 100) / 100,
        totalTransactions,
        averageTransaction: Math.round(avgTransaction * 100) / 100,
        failedTransactions,
      },
      disputes: {
        total: totalDisputes,
        pending: pendingDisputes,
        resolved: resolvedDisputes,
        resolutionRate: Math.round(resolutionRate * 100) / 100,
        averageResolutionTime: Math.round(avgResolutionTime * 100) / 100,
      },
      noShows: {
        total: totalNoShows,
        validated: validatedNoShows,
        rejected: rejectedNoShows,
        pending: pendingNoShows,
        validationRate: Math.round(validationRate * 100) / 100,
      },
    };

    await this.redis.set(cacheKey, JSON.stringify(metrics), this.CACHE_TTL);

    return metrics;
  }

  async getTimeSeriesData(days: number = 30): Promise<TimeSeriesData[]> {
    const cacheKey = `analytics:time_series:${days}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const data: TimeSeriesData[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [revenue, missions, newUsers] = await Promise.all([
        this.calculateRevenue(date, nextDate),
        this.prisma.mission.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate,
            },
          },
        }),
        this.prisma.user.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate,
            },
          },
        }),
      ]);

      data.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.round(revenue * 100) / 100,
        missions,
        newUsers,
      });
    }

    await this.redis.set(cacheKey, JSON.stringify(data), this.CACHE_TTL);

    return data;
  }

  async getTopArtisans(limit: number = 10) {
    const cacheKey = `analytics:top_artisans:${limit}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const artisans = await this.prisma.user.findMany({
      where: {
        role: UserRole.ARTISAN,
      },
      include: {
        artisanProfile: true,
        _count: {
          select: {
            artisanMissions: {
              where: {
                status: MissionStatus.COMPLETED,
              },
            },
          },
        },
      },
      take: limit * 3,
    });

    const result = artisans
      .map((artisan) => ({
        id: artisan.id,
        name: artisan.artisanProfile?.companyName ||
          `${artisan.firstName} ${artisan.lastName}`,
        completedMissions: artisan._count.artisanMissions,
        rating: Number(artisan.artisanProfile?.rating || 0),
      }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);

    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);

    return result;
  }

  private async calculateRevenue(startDate?: Date, endDate?: Date): Promise<number> {
    const where = startDate
      ? {
          createdAt: endDate
            ? { gte: startDate, lt: endDate }
            : { gte: startDate },
        }
      : {};

    const payments = await this.prisma.payment.aggregate({
      where,
      _sum: {
        amount: true,
      },
    });

    return Number(payments._sum.amount || 0);
  }

  private async getAverageMissionValue(): Promise<number> {
    const missions = await this.prisma.mission.aggregate({
      where: {
        status: MissionStatus.COMPLETED,
      },
      _avg: {
        agreedPrice: true,
      },
    });

    return Number(missions._avg.agreedPrice || 0);
  }

  private async getAverageResolutionTime(): Promise<number> {
    const disputes = await this.prisma.dispute.findMany({
      where: {
        status: DisputeStatus.RESOLVED,
        resolvedAt: { not: null },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    });

    if (disputes.length === 0) {
      return 0;
    }

    const totalHours = disputes.reduce((sum, dispute) => {
      if (dispute.resolvedAt) {
        const hours = (dispute.resolvedAt.getTime() - dispute.createdAt.getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }
      return sum;
    }, 0);

    return totalHours / disputes.length;
  }

  async clearCache(): Promise<void> {
    const cacheKeys = [
      'analytics:business_metrics',
      'analytics:time_series:7',
      'analytics:time_series:30',
      'analytics:top_artisans:10',
    ];
    await Promise.all(cacheKeys.map((key) => this.redis.del(key)));
  }
}
