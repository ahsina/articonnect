import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PayoutFraudResult, PayoutFraudSignal } from '../dto/fraud.dto';

@Injectable()
export class PayoutFraudDetectorService {
  constructor(private prisma: PrismaService) {}

  async screenPayout(artisanId: string, amount: number): Promise<PayoutFraudResult> {
    const signals: PayoutFraudSignal[] = [];
    const artisan = await this.prisma.user.findUnique({
      where: { id: artisanId },
      include: {
        artisanProfile: true,
        artisanMissions: { take: 50, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!artisan) throw new Error('Artisan not found');

    // 1. First payout high value
    const isFirstPayout = artisan.artisanMissions.every((m) => m.status !== 'COMPLETED');
    if (isFirstPayout && amount > 500) {
      signals.push({
        type: 'FIRST_PAYOUT_HIGH_VALUE',
        severity: 'CRITICAL',
        description: `Premier retrait de ${amount}€`,
      });
    }

    // 2. Rapid mission completion
    const completedMissions = artisan.artisanMissions.filter((m) => m.completedAt);
    if (completedMissions.length >= 3) {
      const avgCompletionTime =
        completedMissions.reduce((sum, m) => {
          const start = m.acceptedAt || m.createdAt;
          const end = m.completedAt!;
          return sum + (end.getTime() - start.getTime());
        }, 0) / completedMissions.length;

      if (avgCompletionTime < 60 * 60 * 1000) {
        // < 1 hour avg
        signals.push({
          type: 'RAPID_COMPLETION',
          severity: 'HIGH',
          description: 'Missions complétées trop rapidement',
        });
      }
    }

    // 3. Same client repeatedly
    const clientCounts = new Map<string, number>();
    artisan.artisanMissions.forEach((m) => {
      clientCounts.set(m.clientId, (clientCounts.get(m.clientId) || 0) + 1);
    });

    const maxSameClient = Math.max(...Array.from(clientCounts.values()));
    if (maxSameClient > 5) {
      signals.push({
        type: 'SAME_CLIENT_REPEATEDLY',
        severity: 'MEDIUM',
        description: `${maxSameClient} missions avec le même client`,
      });
    }

    // 4. No mission history
    if (artisan.artisanMissions.length === 0) {
      signals.push({
        type: 'NO_HISTORY',
        severity: 'HIGH',
        description: 'Aucun historique de missions',
      });
    }

    const riskScore = this.calculateRiskScore(signals);

    return {
      isRisky: riskScore >= 60,
      riskScore,
      signals,
      recommendation: this.getRecommendation(riskScore),
    };
  }

  private calculateRiskScore(signals: PayoutFraudSignal[]): number {
    const weights = { LOW: 15, MEDIUM: 30, HIGH: 60, CRITICAL: 100 };
    if (signals.length === 0) return 0;
    return Math.min(
      signals.reduce((sum, s) => sum + (weights[s.severity] || 0), 0) / signals.length,
      100,
    );
  }

  private getRecommendation(
    score: number,
  ): 'APPROVE' | 'HOLD_24H' | 'HOLD_48H' | 'MANUAL_REVIEW' | 'BLOCK' {
    if (score >= 90) return 'BLOCK';
    if (score >= 75) return 'MANUAL_REVIEW';
    if (score >= 60) return 'HOLD_48H';
    if (score >= 40) return 'HOLD_24H';
    return 'APPROVE';
  }
}
