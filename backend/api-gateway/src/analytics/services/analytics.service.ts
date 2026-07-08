import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  MatchingQueryDto,
  ArtisanRecommendation,
  CreateRevenueGoalDto,
  UpdateRevenueGoalDto,
  TrendAnalysisDto,
  ForecastDto,
  ProfitabilityQueryDto,
  AnalyticsMetricType,
} from '../dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Intelligent artisan matching for a mission
   * Uses multiple factors: proximity, rating, experience, availability, price, specialty
   */
  async getArtisanRecommendations(
    query: MatchingQueryDto,
  ): Promise<ArtisanRecommendation[]> {
    const { category, latitude, longitude, limit = 10, estimatedBudget } = query;

    // Get all active artisans with profiles
    const artisans = await this.prisma.user.findMany({
      where: {
        role: 'ARTISAN',
        status: 'ACTIVE',
        artisanProfile: {
          available: true,
        },
      },
      include: {
        artisanProfile: {
          include: {
            specialties: true,
            certifications: true,
          },
        },
        receivedReviews: {
          select: {
            overallRating: true,
            createdAt: true,
          },
        },
        artisanMissions: {
          where: {
            status: 'COMPLETED',
          },
          select: {
            category: true,
            finalPrice: true,
            completedAt: true,
          },
        },
      },
    });

    const recommendations: ArtisanRecommendation[] = [];

    for (const artisan of artisans) {
      if (!artisan.artisanProfile) continue;

      const profile = artisan.artisanProfile;

      // Calculate proximity score (max 100km, score inversely proportional)
      const distance = this.calculateDistance(
        latitude,
        longitude,
        profile.latitude,
        profile.longitude,
      );

      if (distance > profile.serviceRadius) {
        continue; // Skip if outside service radius
      }

      const proximityScore = this.calculateProximityScore(distance);

      // Calculate rating score
      const ratingScore = this.calculateRatingScore(
        parseFloat(profile.rating.toString()),
        profile.reviewCount,
      );

      // Calculate experience score
      const experienceScore = this.calculateExperienceScore(
        artisan.completedMissions,
        artisan.createdAt,
      );

      // Calculate availability score
      const availabilityScore = await this.calculateAvailabilityScore(profile.id);

      // Calculate price compatibility score
      const priceScore = this.calculatePriceScore(
        estimatedBudget,
        profile.hourlyRate ? parseFloat(profile.hourlyRate.toString()) : null,
        artisan.artisanMissions,
      );

      // Calculate specialty match score
      const specialtyScore = this.calculateSpecialtyScore(
        category,
        profile.specialties.map((s) => s.name),
        artisan.artisanMissions,
      );

      // Calculate overall score (weighted average)
      const overallScore = this.calculateOverallScore({
        proximityScore,
        ratingScore,
        experienceScore,
        availabilityScore,
        priceScore,
        specialtyScore,
      });

      // Generate reasons for recommendation
      const reasons = this.generateReasons({
        proximityScore,
        ratingScore,
        experienceScore,
        availabilityScore,
        priceScore,
        specialtyScore,
        distance,
        rating: parseFloat(profile.rating.toString()),
        reviewCount: profile.reviewCount,
        completedMissions: artisan.completedMissions,
      });

      recommendations.push({
        artisanId: artisan.id,
        artisan: {
          id: artisan.id,
          firstName: artisan.firstName,
          lastName: artisan.lastName,
          avatar: artisan.avatar,
          profile: {
            companyName: profile.companyName,
            rating: profile.rating,
            reviewCount: profile.reviewCount,
            hourlyRate: profile.hourlyRate,
            specialties: profile.specialties,
            certifications: profile.certifications,
          },
          completedMissions: artisan.completedMissions,
        },
        score: overallScore,
        reasons,
        distance: Math.round(distance * 10) / 10, // Round to 1 decimal
        matchFactors: {
          proximityScore,
          ratingScore,
          experienceScore,
          availabilityScore,
          priceScore,
          specialtyScore,
        },
      });
    }

    // Sort by score and return top recommendations
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get platform analytics
   */
  async getPlatformAnalytics() {
    const [
      totalUsers,
      totalArtisans,
      totalClients,
      totalMissions,
      completedMissions,
      totalRevenue,
      avgMissionValue,
      topCategories,
      monthlyGrowth,
    ] = await Promise.all([
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({
        where: { role: 'ARTISAN', status: 'ACTIVE' },
      }),
      this.prisma.user.count({
        where: { role: 'CLIENT', status: 'ACTIVE' },
      }),
      this.prisma.mission.count(),
      this.prisma.mission.count({ where: { status: 'COMPLETED' } }),
      this.prisma.transaction.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      this.prisma.mission.aggregate({
        where: { status: 'COMPLETED' },
        _avg: { finalPrice: true },
      }),
      this.prisma.mission.groupBy({
        by: ['category'],
        _count: true,
        orderBy: { _count: { category: 'desc' } },
        take: 10,
      }),
      this.getMonthlyGrowth(),
    ]);

    return {
      users: {
        total: totalUsers,
        artisans: totalArtisans,
        clients: totalClients,
      },
      missions: {
        total: totalMissions,
        completed: completedMissions,
        completionRate:
          totalMissions > 0
            ? Math.round((completedMissions / totalMissions) * 100 * 100) / 100
            : 0,
      },
      revenue: {
        total: totalRevenue._sum.amount || 0,
        avgMissionValue: avgMissionValue._avg.finalPrice || 0,
      },
      topCategories: topCategories.map((cat) => ({
        category: cat.category,
        count: cat._count,
      })),
      growth: monthlyGrowth,
    };
  }

  /**
   * Get artisan performance analytics
   */
  async getArtisanAnalytics(artisanId: string) {
    const artisan = await this.prisma.user.findUnique({
      where: { id: artisanId },
      include: {
        artisanProfile: true,
        artisanMissions: true,
        receivedReviews: true,
      },
    });

    if (!artisan || !artisan.artisanProfile) {
      throw new NotFoundException('Artisan not found');
    }

    const completedMissions = artisan.artisanMissions.filter(
      (m) => m.status === 'COMPLETED',
    );

    const totalRevenue = completedMissions.reduce(
      (sum, m) => sum + (parseFloat(m.finalPrice?.toString() || '0')),
      0,
    );

    const avgMissionValue =
      completedMissions.length > 0 ? totalRevenue / completedMissions.length : 0;

    const categoryBreakdown = this.getCategoryBreakdown(artisan.artisanMissions);

    return {
      artisanId,
      missions: {
        total: artisan.artisanMissions.length,
        completed: completedMissions.length,
        completionRate:
          artisan.artisanMissions.length > 0
            ? Math.round(
                (completedMissions.length / artisan.artisanMissions.length) *
                  100 *
                  100,
              ) / 100
            : 0,
      },
      revenue: {
        total: totalRevenue,
        average: avgMissionValue,
      },
      rating: {
        average: parseFloat(artisan.artisanProfile.rating.toString()),
        reviewCount: artisan.artisanProfile.reviewCount,
      },
      reputation: {
        score: artisan.reputationScore,
        noShowCount: artisan.noShowCount,
        disputeCount: artisan.disputeCount,
      },
      categories: categoryBreakdown,
    };
  }

  // ================================
  // HELPER METHODS
  // ================================

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private calculateProximityScore(distance: number): number {
    // Score decreases linearly from 100 (0km) to 0 (50km+)
    if (distance <= 0) return 100;
    if (distance >= 50) return 0;
    return Math.max(0, 100 - distance * 2);
  }

  private calculateRatingScore(rating: number, reviewCount: number): number {
    // Consider both rating and number of reviews
    if (reviewCount === 0) return 50; // Neutral score for new artisans

    const ratingScore = (rating / 5) * 100; // Convert 0-5 to 0-100
    const reviewsWeight = Math.min(reviewCount / 20, 1); // Full weight at 20+ reviews

    return ratingScore * (0.7 + reviewsWeight * 0.3);
  }

  private calculateExperienceScore(
    completedMissions: number,
    accountCreatedAt: Date,
  ): number {
    const missionScore = Math.min(completedMissions / 100, 1) * 60; // Max 60 points

    const accountAgeMonths =
      (Date.now() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const ageScore = Math.min(accountAgeMonths / 12, 1) * 40; // Max 40 points

    return missionScore + ageScore;
  }

  private async calculateAvailabilityScore(artisanProfileId: string): Promise<number> {
    // Check if artisan has free slots in the next 7 days
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const freeSlots = await this.prisma.availabilitySlot.count({
      where: {
        artisanId: artisanProfileId,
        isBooked: false,
        startTime: {
          gte: now,
          lte: weekFromNow,
        },
      },
    });

    // More free slots = higher score
    return Math.min(freeSlots * 10, 100);
  }

  private calculatePriceScore(
    estimatedBudget: number | undefined,
    hourlyRate: number | null,
    missions: any[],
  ): number {
    if (!estimatedBudget) return 70; // Neutral score if no budget provided

    let avgPrice: number;

    if (missions.length > 0) {
      const totalPrice = missions.reduce(
        (sum, m) => sum + (parseFloat(m.finalPrice?.toString() || '0')),
        0,
      );
      avgPrice = totalPrice / missions.length;
    } else if (hourlyRate) {
      avgPrice = hourlyRate * 4; // Estimate 4 hours
    } else {
      return 50; // No data available
    }

    // Score based on how close the price is to budget
    const priceDiff = Math.abs(avgPrice - estimatedBudget);
    const percentDiff = (priceDiff / estimatedBudget) * 100;

    if (percentDiff <= 10) return 100; // Within 10%
    if (percentDiff <= 20) return 80; // Within 20%
    if (percentDiff <= 30) return 60; // Within 30%
    return Math.max(0, 50 - percentDiff);
  }

  private calculateSpecialtyScore(
    requestedCategory: string,
    specialties: string[],
    missions: any[],
  ): number {
    // Check if specialty matches
    const hasSpecialty = specialties.some((s) =>
      s.toLowerCase().includes(requestedCategory.toLowerCase()),
    );

    if (hasSpecialty) {
      // Check experience in this category
      const categoryMissions = missions.filter(
        (m) => m.category.toLowerCase() === requestedCategory.toLowerCase(),
      );

      const experienceBonus = Math.min(categoryMissions.length / 10, 1) * 30;
      return 70 + experienceBonus;
    }

    return 30; // Low score if no specialty match
  }

  private calculateOverallScore(factors: {
    proximityScore: number;
    ratingScore: number;
    experienceScore: number;
    availabilityScore: number;
    priceScore: number;
    specialtyScore: number;
  }): number {
    // Weighted average
    const weights = {
      proximity: 0.20,
      rating: 0.25,
      experience: 0.15,
      availability: 0.15,
      price: 0.10,
      specialty: 0.15,
    };

    return Math.round(
      factors.proximityScore * weights.proximity +
        factors.ratingScore * weights.rating +
        factors.experienceScore * weights.experience +
        factors.availabilityScore * weights.availability +
        factors.priceScore * weights.price +
        factors.specialtyScore * weights.specialty,
    );
  }

  private generateReasons(data: any): string[] {
    const reasons: string[] = [];

    if (data.distance < 5) {
      reasons.push(`Très proche (${data.distance}km)`);
    } else if (data.distance < 15) {
      reasons.push(`À proximité (${data.distance}km)`);
    }

    if (data.rating >= 4.8 && data.reviewCount >= 20) {
      reasons.push(`Excellente réputation (${data.rating}/5 avec ${data.reviewCount} avis)`);
    } else if (data.rating >= 4.5) {
      reasons.push(`Bien noté (${data.rating}/5)`);
    }

    if (data.completedMissions >= 100) {
      reasons.push(`Très expérimenté (${data.completedMissions} missions)`);
    } else if (data.completedMissions >= 50) {
      reasons.push(`Expérimenté (${data.completedMissions} missions)`);
    }

    if (data.availabilityScore >= 70) {
      reasons.push('Disponible rapidement');
    }

    if (data.specialtyScore >= 70) {
      reasons.push('Spécialisé dans cette catégorie');
    }

    return reasons.slice(0, 3); // Max 3 reasons
  }

  private async getMonthlyGrowth() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const missions = await this.prisma.mission.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: sixMonthsAgo,
        },
      },
      _count: true,
    });

    // Aggregate by month
    const monthlyData: Record<string, number> = {};
    missions.forEach((m) => {
      const month = m.createdAt.toISOString().substring(0, 7); // YYYY-MM
      monthlyData[month] = (monthlyData[month] || 0) + m._count;
    });

    return Object.entries(monthlyData)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private getCategoryBreakdown(missions: any[]) {
    const breakdown: Record<string, number> = {};
    missions.forEach((m) => {
      breakdown[m.category] = (breakdown[m.category] || 0) + 1;
    });

    return Object.entries(breakdown)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }

  // ================================
  // ADVANCED ANALYTICS METHODS
  // ================================

  /**
   * Create a revenue goal for an artisan
   */
  async createRevenueGoal(artisanId: string, dto: CreateRevenueGoalDto) {
    return this.prisma.revenueGoal.create({
      data: {
        artisanId,
        periodType: dto.period,
        targetRevenue: dto.targetAmount,
        periodStart: dto.startDate,
        periodEnd: dto.endDate,
        notes: dto.notes,
      },
    });
  }

  /**
   * Get revenue goals for an artisan
   */
  async getRevenueGoals(artisanId: string, activeOnly = true) {
    const where: any = { artisanId };
    if (activeOnly) {
      where.periodEnd = { gte: new Date() };
    }

    const goals = await this.prisma.revenueGoal.findMany({
      where,
      orderBy: { periodStart: 'desc' },
    });

    // Calculate current progress for each goal
    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => {
        const revenue = await this.prisma.mission.aggregate({
          where: {
            artisanId,
            status: 'COMPLETED',
            completedAt: {
              gte: goal.periodStart,
              lte: goal.periodEnd,
            },
          },
          _sum: { finalPrice: true },
        });

        const currentAmount = revenue._sum.finalPrice || 0;
        const targetAmount = Number(goal.targetRevenue);
        const progress = targetAmount > 0
          ? Math.round((Number(currentAmount) / targetAmount) * 100 * 100) / 100
          : 0;

        return {
          ...goal,
          currentAmount,
          progress,
          isAchieved: Number(currentAmount) >= targetAmount,
        };
      }),
    );

    return goalsWithProgress;
  }

  /**
   * Update a revenue goal
   */
  async updateRevenueGoal(id: string, artisanId: string, dto: UpdateRevenueGoalDto) {
    const goal = await this.prisma.revenueGoal.findUnique({ where: { id } });
    if (!goal || goal.artisanId !== artisanId) {
      throw new NotFoundException('Revenue goal not found');
    }

    const { targetAmount, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };
    if (targetAmount !== undefined) {
      data.targetRevenue = targetAmount;
    }

    return this.prisma.revenueGoal.update({
      where: { id },
      data: data as any,
    });
  }

  /**
   * Delete a revenue goal
   */
  async deleteRevenueGoal(id: string, artisanId: string) {
    const goal = await this.prisma.revenueGoal.findUnique({ where: { id } });
    if (!goal || goal.artisanId !== artisanId) {
      throw new NotFoundException('Revenue goal not found');
    }

    await this.prisma.revenueGoal.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Get trend analysis for a metric
   */
  async getTrendAnalysis(artisanId: string, dto: TrendAnalysisDto) {
    const { metric, startDate, endDate, groupBy = 'month' } = dto;

    switch (metric) {
      case AnalyticsMetricType.REVENUE:
        return this.getRevenueTrend(artisanId, startDate, endDate, groupBy);
      case AnalyticsMetricType.MISSIONS:
        return this.getMissionsTrend(artisanId, startDate, endDate, groupBy);
      case AnalyticsMetricType.QUOTES:
        return this.getQuotesTrend(artisanId, startDate, endDate, groupBy);
      case AnalyticsMetricType.CONVERSION:
        return this.getConversionTrend(artisanId, startDate, endDate, groupBy);
      default:
        throw new Error('Invalid metric type');
    }
  }

  private async getRevenueTrend(artisanId: string, startDate: Date, endDate: Date, groupBy: string) {
    const missions = await this.prisma.mission.findMany({
      where: {
        artisanId,
        status: 'COMPLETED',
        completedAt: { gte: startDate, lte: endDate },
      },
      select: { completedAt: true, finalPrice: true },
    });

    return this.aggregateByPeriod(missions, 'completedAt', 'finalPrice', groupBy);
  }

  private async getMissionsTrend(artisanId: string, startDate: Date, endDate: Date, groupBy: string) {
    const missions = await this.prisma.mission.findMany({
      where: {
        artisanId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true, status: true },
    });

    return this.aggregateByPeriod(missions, 'createdAt', null, groupBy);
  }

  private async getQuotesTrend(artisanId: string, startDate: Date, endDate: Date, groupBy: string) {
    const quotes = await this.prisma.quote.findMany({
      where: {
        artisanId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true, status: true, totalAmount: true },
    });

    return this.aggregateByPeriod(quotes, 'createdAt', 'totalAmount', groupBy);
  }

  private async getConversionTrend(artisanId: string, startDate: Date, endDate: Date, groupBy: string) {
    const quotes = await this.prisma.quote.findMany({
      where: {
        artisanId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true, status: true },
    });

    const grouped = this.groupByPeriod(quotes, 'createdAt', groupBy);

    return Object.entries(grouped).map(([period, items]: [string, any[]]) => {
      const total = items.length;
      const accepted = items.filter((q) => q.status === 'ACCEPTED').length;
      const rate = total > 0 ? Math.round((accepted / total) * 100 * 100) / 100 : 0;
      return { period, total, accepted, conversionRate: rate };
    });
  }

  private aggregateByPeriod(items: any[], dateField: string, valueField: string | null, groupBy: string) {
    const grouped = this.groupByPeriod(items, dateField, groupBy);

    return Object.entries(grouped).map(([period, periodItems]: [string, any[]]) => {
      const count = periodItems.length;
      const value = valueField
        ? periodItems.reduce((sum, item) => sum + (Number(item[valueField]) || 0), 0)
        : null;

      return { period, count, ...(value !== null && { value }) };
    }).sort((a, b) => a.period.localeCompare(b.period));
  }

  private groupByPeriod(items: any[], dateField: string, groupBy: string): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    items.forEach((item) => {
      const date = new Date(item[dateField]);
      let period: string;

      switch (groupBy) {
        case 'day':
          period = date.toISOString().substring(0, 10);
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          period = weekStart.toISOString().substring(0, 10);
          break;
        case 'month':
        default:
          period = date.toISOString().substring(0, 7);
      }

      if (!grouped[period]) grouped[period] = [];
      grouped[period].push(item);
    });

    return grouped;
  }

  /**
   * Get revenue forecast using simple linear regression
   */
  async getForecast(artisanId: string, dto: ForecastDto) {
    const { metric, monthsAhead } = dto;

    // Get last 12 months of data
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);

    let historicalData: { period: string; value: number }[];

    switch (metric) {
      case AnalyticsMetricType.REVENUE:
        const revenueTrend = await this.getRevenueTrend(artisanId, startDate, new Date(), 'month');
        historicalData = revenueTrend.map((d) => ({ period: d.period, value: d.value || 0 }));
        break;
      case AnalyticsMetricType.MISSIONS:
        const missionTrend = await this.getMissionsTrend(artisanId, startDate, new Date(), 'month');
        historicalData = missionTrend.map((d) => ({ period: d.period, value: d.count }));
        break;
      default:
        throw new Error('Forecasting not supported for this metric');
    }

    if (historicalData.length < 3) {
      return { error: 'Not enough historical data for forecasting', forecast: [] };
    }

    // Simple linear regression
    const n = historicalData.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = historicalData.map((d) => d.value);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate forecast
    const forecast = [];
    const lastDate = new Date();
    for (let i = 1; i <= monthsAhead; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setMonth(forecastDate.getMonth() + i);
      const forecastValue = Math.max(0, intercept + slope * (n + i - 1));

      forecast.push({
        period: forecastDate.toISOString().substring(0, 7),
        predictedValue: Math.round(forecastValue * 100) / 100,
        confidence: Math.max(0, 100 - (i * 10)), // Decreasing confidence over time
      });
    }

    return {
      historicalData,
      forecast,
      trend: slope > 0 ? 'growing' : slope < 0 ? 'declining' : 'stable',
      avgGrowthRate: n > 1 ? ((y[n - 1] - y[0]) / y[0] / (n - 1)) * 100 : 0,
    };
  }

  /**
   * Get profitability analysis
   */
  async getProfitabilityAnalysis(artisanId: string, dto: ProfitabilityQueryDto) {
    const startDate = dto.startDate || new Date(new Date().setMonth(new Date().getMonth() - 12));
    const endDate = dto.endDate || new Date();

    const missions = await this.prisma.mission.findMany({
      where: {
        artisanId,
        status: 'COMPLETED',
        completedAt: { gte: startDate, lte: endDate },
      },
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Overall stats
    const totalRevenue = missions.reduce((sum, m) => sum + (Number(m.finalPrice) || 0), 0);
    const avgMissionValue = missions.length > 0 ? totalRevenue / missions.length : 0;

    // By category
    const byCategory = this.groupProfitability(missions, 'category');

    // By client (top 10)
    const byClient = Object.entries(
      missions.reduce((acc: any, m) => {
        const clientKey = m.clientId;
        if (!acc[clientKey]) {
          acc[clientKey] = {
            client: m.client,
            missions: 0,
            revenue: 0,
          };
        }
        acc[clientKey].missions += 1;
        acc[clientKey].revenue += Number(m.finalPrice) || 0;
        return acc;
      }, {}),
    )
      .map(([_, data]: [string, any]) => data)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Monthly breakdown
    const byMonth = this.groupByPeriod(missions, 'completedAt', 'month');
    const monthlyData = Object.entries(byMonth)
      .map(([month, monthMissions]: [string, any[]]) => ({
        month,
        missions: monthMissions.length,
        revenue: monthMissions.reduce((sum, m) => sum + (Number(m.finalPrice) || 0), 0),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      summary: {
        totalMissions: missions.length,
        totalRevenue,
        avgMissionValue: Math.round(avgMissionValue * 100) / 100,
        period: { startDate, endDate },
      },
      byCategory,
      topClients: byClient,
      monthlyBreakdown: monthlyData,
    };
  }

  private groupProfitability(missions: any[], groupField: string) {
    const grouped: Record<string, { count: number; revenue: number }> = {};

    missions.forEach((m) => {
      const key = m[groupField];
      if (!grouped[key]) {
        grouped[key] = { count: 0, revenue: 0 };
      }
      grouped[key].count += 1;
      grouped[key].revenue += Number(m.finalPrice) || 0;
    });

    return Object.entries(grouped)
      .map(([name, data]) => ({
        name,
        missions: data.count,
        revenue: data.revenue,
        avgValue: Math.round((data.revenue / data.count) * 100) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  /**
   * Get dashboard summary with KPIs
   */
  async getDashboardSummary(artisanId: string) {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(thisMonth.getTime() - 1);

    // Current month stats
    const [currentRevenue, currentMissions, pendingQuotes] = await Promise.all([
      this.prisma.mission.aggregate({
        where: {
          artisanId,
          status: 'COMPLETED',
          completedAt: { gte: thisMonth },
        },
        _sum: { finalPrice: true },
      }),
      this.prisma.mission.count({
        where: {
          artisanId,
          createdAt: { gte: thisMonth },
        },
      }),
      this.prisma.quote.count({
        where: {
          artisanId,
          status: 'SENT',
        },
      }),
    ]);

    // Last month stats for comparison
    const [lastMonthRevenue, lastMonthMissions] = await Promise.all([
      this.prisma.mission.aggregate({
        where: {
          artisanId,
          status: 'COMPLETED',
          completedAt: { gte: lastMonth, lt: thisMonth },
        },
        _sum: { finalPrice: true },
      }),
      this.prisma.mission.count({
        where: {
          artisanId,
          createdAt: { gte: lastMonth, lt: thisMonth },
        },
      }),
    ]);

    // Calculate changes
    const currentRevenueAmount = Number(currentRevenue._sum.finalPrice) || 0;
    const lastRevenueAmount = Number(lastMonthRevenue._sum.finalPrice) || 0;
    const revenueChange = lastRevenueAmount > 0
      ? ((currentRevenueAmount - lastRevenueAmount) / lastRevenueAmount) * 100
      : 0;

    const missionChange = lastMonthMissions > 0
      ? ((currentMissions - lastMonthMissions) / lastMonthMissions) * 100
      : 0;

    // Active goals
    const activeGoals = await this.getRevenueGoals(artisanId, true);

    // Quote conversion this month
    const quotesThisMonth = await this.prisma.quote.findMany({
      where: {
        artisanId,
        createdAt: { gte: thisMonth },
      },
      select: { status: true },
    });
    const quoteConversion = quotesThisMonth.length > 0
      ? (quotesThisMonth.filter((q) => q.status === 'ACCEPTED').length / quotesThisMonth.length) * 100
      : 0;

    return {
      revenue: {
        current: currentRevenueAmount,
        change: Math.round(revenueChange * 100) / 100,
        trend: revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'stable',
      },
      missions: {
        current: currentMissions,
        change: Math.round(missionChange * 100) / 100,
        pending: await this.prisma.mission.count({
          where: { artisanId, status: { in: ['PENDING', 'ACCEPTED'] } },
        }),
      },
      quotes: {
        pending: pendingQuotes,
        conversionRate: Math.round(quoteConversion * 100) / 100,
      },
      goals: activeGoals.slice(0, 3), // Top 3 active goals
      upcomingMissions: await this.prisma.mission.findMany({
        where: {
          artisanId,
          status: 'ACCEPTED',
          scheduledFor: { gte: now },
        },
        orderBy: { scheduledFor: 'asc' },
        take: 5,
        include: {
          client: { select: { firstName: true, lastName: true } },
        },
      }),
    };
  }

  /**
   * Create analytics snapshot (for historical tracking)
   */
  async createSnapshot(artisanId: string) {
    const analytics = await this.getArtisanAnalytics(artisanId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    try {
      return await this.prisma.analyticsSnapshot.create({
        data: {
          artisanId,
          periodType: 'MONTHLY',
          periodStart: startOfMonth,
          periodEnd: endOfMonth,
          totalMissions: analytics.missions.total,
          completedMissions: analytics.missions.completed,
          grossRevenue: analytics.revenue.total,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A snapshot already exists for this period',
        );
      }
      throw error;
    }
  }

  /**
   * Get historical snapshots
   */
  async getSnapshots(artisanId: string, limit = 12) {
    return this.prisma.analyticsSnapshot.findMany({
      where: { artisanId },
      orderBy: { periodStart: 'desc' },
      take: limit,
    });
  }
}
