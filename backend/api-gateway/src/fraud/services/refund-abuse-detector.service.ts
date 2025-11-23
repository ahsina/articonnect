import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RefundAbuseResult, RefundAbuseSignal } from '../dto/fraud.dto';

@Injectable()
export class RefundAbuseDetectorService {
  constructor(private prisma: PrismaService) {}

  async detectRefundAbuse(userId: string, missionId: string): Promise<RefundAbuseResult> {
    const signals: RefundAbuseSignal[] = [];
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        clientMissions: { take: 50, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!user) throw new Error('User not found');

    // 1. High refund rate
    const totalMissions = user.clientMissions.length;
    const refundedMissions = user.clientMissions.filter((m) =>
      ['CANCELLED', 'DISPUTED'].includes(m.status),
    ).length;

    const refundRate = totalMissions > 0 ? (refundedMissions / totalMissions) * 100 : 0;

    if (refundRate > 30 && totalMissions >= 5) {
      signals.push({
        type: 'HIGH_REFUND_RATE',
        severity: 'HIGH',
        description: `Taux de remboursement: ${refundRate.toFixed(0)}%`,
        historicalData: { refundRate, totalMissions, refundedMissions },
      });
    }

    // 2. Serial disputer
    const disputes = await this.prisma.dispute.count({
      where: {
        missionId: { in: user.clientMissions.map((m) => m.id) },
      },
    });

    if (disputes > 3) {
      signals.push({
        type: 'SERIAL_DISPUTER',
        severity: 'HIGH',
        description: `${disputes} litiges ouverts`,
      });
    }

    const abuseScore = this.calculateAbuseScore(signals, refundRate);

    return {
      isAbusive: abuseScore >= 60,
      abuseScore,
      signals,
      recommendation: this.getRecommendation(abuseScore),
    };
  }

  private calculateAbuseScore(signals: RefundAbuseSignal[], refundRate: number): number {
    const weights = { LOW: 20, MEDIUM: 40, HIGH: 60 };
    const signalScore = signals.reduce((sum, s) => sum + (weights[s.severity] || 0), 0);
    return Math.min(signalScore + refundRate, 100);
  }

  private getRecommendation(
    score: number,
  ): 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW' | 'REQUIRE_DEPOSIT' {
    if (score >= 80) return 'REJECT';
    if (score >= 60) return 'REQUIRE_DEPOSIT';
    if (score >= 40) return 'MANUAL_REVIEW';
    return 'APPROVE';
  }
}
