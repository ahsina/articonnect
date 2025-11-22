import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MatchingQueryDto, ArtisanRecommendation } from '../dto/analytics.dto';

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
      throw new Error('Artisan not found');
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
}
