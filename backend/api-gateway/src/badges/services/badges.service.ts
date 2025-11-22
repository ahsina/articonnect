import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateBadgeDto, UpdateBadgeDto } from '../dto/badge.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class BadgesService {
  private readonly logger = new Logger(BadgesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * CRON Job: Check and award badges daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async awardBadgesAutomatically() {
    this.logger.log('Starting automatic badge award process...');

    try {
      // Get all active badges
      const badges = await this.prisma.badge.findMany({
        where: { isActive: true },
      });

      // Get all artisans (badges are primarily for artisans)
      const artisans = await this.prisma.user.findMany({
        where: {
          role: UserRole.ARTISAN,
          status: 'ACTIVE',
        },
        include: {
          artisanProfile: true,
          badges: {
            include: {
              badge: true,
            },
          },
        },
      });

      let badgesAwarded = 0;

      for (const artisan of artisans) {
        const earnedBadgeIds = artisan.badges.map((ub) => ub.badgeId);

        for (const badge of badges) {
          // Skip if user already has this badge
          if (earnedBadgeIds.includes(badge.id)) {
            continue;
          }

          // Check if user meets criteria
          const meetsRequirements = await this.checkBadgeCriteria(
            artisan.id,
            badge.criteria as any,
          );

          if (meetsRequirements) {
            await this.awardBadge(artisan.id, badge.id);
            badgesAwarded++;
            this.logger.log(
              `Awarded badge "${badge.name}" to user ${artisan.firstName} ${artisan.lastName}`,
            );
          }
        }
      }

      this.logger.log(
        `Badge award process completed. ${badgesAwarded} badges awarded.`,
      );
    } catch (error) {
      this.logger.error('Error in automatic badge award process:', error);
    }
  }

  /**
   * Check if user meets badge criteria
   */
  private async checkBadgeCriteria(
    userId: string,
    criteria: any,
  ): Promise<boolean> {
    try {
      // Get user stats
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          artisanProfile: true,
          artisanMissions: {
            where: { status: 'COMPLETED' },
          },
          receivedReviews: true,
        },
      });

      if (!user || !user.artisanProfile) {
        return false;
      }

      // Check missions completed
      if (criteria.missions_completed !== undefined) {
        if (user.completedMissions < criteria.missions_completed) {
          return false;
        }
      }

      // Check average rating
      if (criteria.avg_rating !== undefined && criteria.min_reviews !== undefined) {
        const rating = parseFloat(user.artisanProfile.rating.toString());
        const reviewCount = user.artisanProfile.reviewCount;

        if (rating < criteria.avg_rating || reviewCount < criteria.min_reviews) {
          return false;
        }
      }

      // Check completion rate
      if (criteria.completion_rate !== undefined) {
        const totalMissions = user.artisanMissions.length;
        const completedMissions = user.completedMissions;

        if (totalMissions === 0) {
          return false;
        }

        const completionRate = (completedMissions / totalMissions) * 100;
        if (completionRate < criteria.completion_rate) {
          return false;
        }
      }

      // Check years active
      if (criteria.years_active !== undefined) {
        const accountAgeYears =
          (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 365);

        if (accountAgeYears < criteria.years_active) {
          return false;
        }
      }

      // Check dispute count
      if (criteria.max_dispute_count !== undefined) {
        if (user.disputeCount > criteria.max_dispute_count) {
          return false;
        }
      }

      // Check response time (if criteria exists)
      if (criteria.avg_response_time_hours !== undefined || criteria.avg_response_time_minutes !== undefined) {
        // This would require tracking response times in the database
        // For now, we'll skip this check
        // TODO: Implement response time tracking
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Error checking badge criteria for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Award a badge to a user
   */
  async awardBadge(userId: string, badgeId: string, triggerData?: any) {
    // Check if user already has this badge
    const existing = await this.prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId,
          badgeId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.userBadge.create({
      data: {
        userId,
        badgeId,
        triggerData,
      },
      include: {
        badge: true,
      },
    });
  }

  /**
   * Get all badges
   */
  async getAllBadges(includeInactive = false) {
    return this.prisma.badge.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ type: 'asc' }, { tier: 'asc' }],
    });
  }

  /**
   * Get badge by ID
   */
  async getBadgeById(badgeId: string) {
    const badge = await this.prisma.badge.findUnique({
      where: { id: badgeId },
      include: {
        userBadges: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!badge) {
      throw new NotFoundException('Badge not found');
    }

    return badge;
  }

  /**
   * Get user's badges
   */
  async getUserBadges(userId: string) {
    return this.prisma.userBadge.findMany({
      where: { userId },
      include: {
        badge: true,
      },
      orderBy: {
        earnedAt: 'desc',
      },
    });
  }

  /**
   * Create new badge (admin only)
   */
  async createBadge(dto: CreateBadgeDto) {
    return this.prisma.badge.create({
      data: {
        key: dto.key,
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        type: dto.type,
        tier: dto.tier,
        criteria: dto.criteria,
        isActive: dto.isActive ?? true,
      },
    });
  }

  /**
   * Update badge (admin only)
   */
  async updateBadge(badgeId: string, dto: UpdateBadgeDto) {
    const badge = await this.prisma.badge.findUnique({
      where: { id: badgeId },
    });

    if (!badge) {
      throw new NotFoundException('Badge not found');
    }

    return this.prisma.badge.update({
      where: { id: badgeId },
      data: dto,
    });
  }

  /**
   * Delete badge (admin only)
   */
  async deleteBadge(badgeId: string) {
    const badge = await this.prisma.badge.findUnique({
      where: { id: badgeId },
    });

    if (!badge) {
      throw new NotFoundException('Badge not found');
    }

    return this.prisma.badge.delete({
      where: { id: badgeId },
    });
  }

  /**
   * Get badge statistics
   */
  async getBadgeStatistics() {
    const [
      totalBadges,
      totalUserBadges,
      badgesByType,
      badgesByTier,
      topBadges,
    ] = await Promise.all([
      this.prisma.badge.count({ where: { isActive: true } }),
      this.prisma.userBadge.count(),
      this.prisma.badge.groupBy({
        by: ['type'],
        _count: true,
        where: { isActive: true },
      }),
      this.prisma.badge.groupBy({
        by: ['tier'],
        _count: true,
        where: { isActive: true },
      }),
      this.prisma.badge.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: { userBadges: true },
          },
        },
        orderBy: {
          userBadges: {
            _count: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    return {
      totalBadges,
      totalUserBadges,
      byType: badgesByType.reduce((acc, curr) => {
        acc[curr.type] = curr._count;
        return acc;
      }, {}),
      byTier: badgesByTier.reduce((acc, curr) => {
        acc[curr.tier] = curr._count;
        return acc;
      }, {}),
      topBadges: topBadges.map((badge) => ({
        id: badge.id,
        name: badge.name,
        type: badge.type,
        tier: badge.tier,
        awardedCount: badge._count.userBadges,
      })),
    };
  }
}
