import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalUsers,
      totalMissions,
      totalArtisans,
      totalClients,
      activeMissions,
      completedMissions,
      pendingMissions,
      totalRevenue,
      totalTransactions,
      activeDisputes,
      totalProducts,
      totalReviews,
      avgRating,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.mission.count(),
      this.prisma.user.count({ where: { role: 'ARTISAN' } }),
      this.prisma.user.count({ where: { role: 'CLIENT' } }),
      this.prisma.mission.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.mission.count({ where: { status: 'COMPLETED' } }),
      this.prisma.mission.count({ where: { status: 'PENDING' } }),
      this.prisma.transaction.aggregate({
        _sum: { commission: true },
        where: { status: 'COMPLETED' },
      }),
      this.prisma.transaction.count({ where: { status: 'COMPLETED' } }),
      this.prisma.dispute.count({ where: { status: { in: ['OPEN', 'IN_REVIEW'] } } }),
      this.prisma.product.count(),
      this.prisma.review.count(),
      this.prisma.review.aggregate({ _avg: { overallRating: true } }),
    ]);

    return {
      users: {
        total: totalUsers,
        artisans: totalArtisans,
        clients: totalClients,
      },
      missions: {
        total: totalMissions,
        active: activeMissions,
        completed: completedMissions,
        pending: pendingMissions,
      },
      revenue: {
        totalCommission: totalRevenue._sum.commission || 0,
        totalTransactions,
      },
      disputes: {
        active: activeDisputes,
      },
      marketplace: {
        totalProducts,
      },
      reviews: {
        total: totalReviews,
        averageRating: avgRating._avg.overallRating || 0,
      },
    };
  }

  async getRevenueStats(period: 'day' | 'week' | 'month' | 'year' = 'month') {
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const transactions = await this.prisma.transaction.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startDate },
      },
      select: {
        commission: true,
        amount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalCommission = transactions.reduce((sum, t) => sum + Number(t.commission), 0);
    const totalVolume = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      period,
      startDate,
      endDate: now,
      totalCommission,
      totalVolume,
      transactionCount: transactions.length,
      transactions,
    };
  }

  async getUserGrowthStats() {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const usersByDay = await this.prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: last30Days },
      },
      _count: true,
    });

    return {
      period: 'last30Days',
      data: usersByDay,
    };
  }

  async getAllUsers(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async suspendUser(userId: string) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: { status: 'SUSPENDED' },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  async activateUser(userId: string) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: { status: 'ACTIVE' },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  /**
   * Déblocage sécurité (multi-comptes / bot / remboursements) par un admin.
   * Réinitialise les flags et scores de fraude sur l'utilisateur cible afin
   * de rétablir un login/usage normal après revue manuelle.
   */
  async unblockSecurity(userId: string) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          multiAccountFlagged: false,
          multiAccountRiskScore: 0,
          multiAccountReviewedAt: new Date(),
          botFlagged: false,
          refundBlocked: false,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }
}
