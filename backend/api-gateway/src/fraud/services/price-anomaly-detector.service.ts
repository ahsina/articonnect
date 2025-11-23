import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PriceAnomalyResult, PriceAnomalySignal } from '../dto/fraud.dto';

@Injectable()
export class PriceAnomalyDetectorService {
  constructor(private prisma: PrismaService) {}

  async detectPriceAnomaly(missionId: string): Promise<PriceAnomalyResult> {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        artisan: {
          include: {
            artisanProfile: true,
            artisanMissions: { where: { status: 'COMPLETED' }, take: 20 },
          },
        },
      },
    });

    if (!mission || !mission.agreedPrice) {
      throw new Error('Mission or price not found');
    }

    const actualPrice = Number(mission.agreedPrice);
    const signals: PriceAnomalySignal[] = [];

    // 1. Calculate expected price based on category average
    const categoryAvg = await this.getCategoryAveragePrice(mission.category);
    const deviation = ((actualPrice - categoryAvg) / categoryAvg) * 100;

    if (deviation < -50) {
      signals.push({
        type: 'BELOW_MARKET',
        severity: 'HIGH',
        description: `Prix ${Math.abs(deviation).toFixed(0)}% en dessous de la moyenne`,
        marketAverage: categoryAvg,
      });
    }

    // 2. Compare to artisan's normal rates
    if (mission.artisan?.artisanProfile?.hourlyRate) {
      const artisanRate = Number(mission.artisan.artisanProfile.hourlyRate);
      const estimatedHours = mission.estimatedDuration ? mission.estimatedDuration / 60 : 2;
      const expectedPrice = artisanRate * estimatedHours;

      if (actualPrice < expectedPrice * 0.5) {
        signals.push({
          type: 'BELOW_ARTISAN_RATE',
          severity: 'HIGH',
          description: `Prix bien en dessous du taux horaire habituel`,
        });
      }
    }

    const expectedPrice = categoryAvg;
    const isAnomalous = signals.length > 0 && deviation < -30;

    return {
      isAnomalous,
      expectedPrice,
      actualPrice,
      deviationPercentage: deviation,
      signals,
      recommendation: this.getRecommendation(deviation, signals.length),
    };
  }

  private async getCategoryAveragePrice(category: string): Promise<number> {
    const result = await this.prisma.mission.aggregate({
      where: {
        category,
        status: 'COMPLETED',
        agreedPrice: { not: null },
      },
      _avg: {
        agreedPrice: true,
      },
    });

    return Number(result._avg.agreedPrice) || 100; // Default fallback
  }

  private getRecommendation(
    deviation: number,
    signalCount: number,
  ): 'ALLOW' | 'FLAG' | 'ADJUST_COMMISSION' | 'MANUAL_REVIEW' {
    if (deviation < -70 || signalCount >= 3) return 'MANUAL_REVIEW';
    if (deviation < -50) return 'ADJUST_COMMISSION';
    if (deviation < -30) return 'FLAG';
    return 'ALLOW';
  }
}
