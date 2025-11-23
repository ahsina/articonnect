import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ReviewFraudResult, ReviewFraudSignal } from '../dto/fraud.dto';

@Injectable()
export class ReviewFraudDetectorService {
  private readonly logger = new Logger(ReviewFraudDetectorService.name);

  constructor(private prisma: PrismaService) {}

  async detectFakeReview(reviewId: string): Promise<ReviewFraudResult> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        reviewer: true,
        mission: {
          include: {
            payments: true,
            transaction: true,
          },
        },
      },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    const signals: ReviewFraudSignal[] = [];

    // 1. Review velocity spike
    const recentReviews = await this.prisma.review.findMany({
      where: {
        reviewerId: review.reviewerId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    if (recentReviews.length > 5) {
      signals.push({
        type: 'VELOCITY_SPIKE',
        severity: 'HIGH',
        description: `${recentReviews.length} avis publiés en 24h`,
      });
    }

    // 2. Text duplicate detection
    const similarReviews = await this.findSimilarReviews(review.comment || '');
    if (similarReviews.length > 0) {
      signals.push({
        type: 'TEXT_DUPLICATE',
        severity: 'HIGH',
        description: 'Texte similaire à d\'autres avis détecté',
      });
    }

    // 3. Rating anomaly (all 5-stars)
    const reviewerHistory = await this.prisma.review.findMany({
      where: { reviewerId: review.reviewerId },
    });

    const allFiveStars = reviewerHistory.every((r) => r.overallRating === 5);
    if (reviewerHistory.length >= 5 && allFiveStars) {
      signals.push({
        type: 'RATING_ANOMALY',
        severity: 'MEDIUM',
        description: 'Tous les avis sont 5 étoiles',
      });
    }

    // 4. Payment validation
    const paymentCompleted = review.mission?.transaction?.status === 'COMPLETED';
    if (!paymentCompleted) {
      signals.push({
        type: 'NO_PAYMENT',
        severity: 'CRITICAL',
        description: 'Avis publié sans paiement complété',
      });
    }

    // 5. Premature review
    const missionCompleted = review.mission?.completedAt;
    const reviewCreated = review.createdAt;
    if (missionCompleted && reviewCreated < missionCompleted) {
      signals.push({
        type: 'PREMATURE_REVIEW',
        severity: 'HIGH',
        description: 'Avis publié avant la fin de la mission',
      });
    }

    // 6. AI-generated text detection
    const isAiGenerated = await this.detectAiGeneratedText(review.comment || '');
    if (isAiGenerated) {
      signals.push({
        type: 'AI_GENERATED',
        severity: 'MEDIUM',
        description: 'Texte potentiellement généré par IA',
      });
    }

    const fraudScore = this.calculateFraudScore(signals);

    return {
      isFraudulent: fraudScore >= 70,
      fraudScore,
      signals,
      recommendation: this.getRecommendation(fraudScore),
      aiGenerated: isAiGenerated,
    };
  }

  private async findSimilarReviews(text: string) {
    // Simple similarity check - in production use Levenshtein distance or cosine similarity
    return [];
  }

  private async detectAiGeneratedText(text: string): Promise<boolean> {
    // In production, use GPTZero API or similar
    // For now, simple heuristics
    const aiPhrases = [
      'as an ai',
      'in conclusion',
      'furthermore',
      'moreover',
      'it is important to note',
    ];

    return aiPhrases.some((phrase) => text.toLowerCase().includes(phrase));
  }

  private calculateFraudScore(signals: ReviewFraudSignal[]): number {
    const weights = { LOW: 20, MEDIUM: 40, HIGH: 60, CRITICAL: 100 };
    if (signals.length === 0) return 0;

    const total = signals.reduce((sum, s) => sum + (weights[s.severity] || 0), 0);
    return Math.min(total / signals.length, 100);
  }

  private getRecommendation(score: number): 'ALLOW' | 'HIDE' | 'DELETE' | 'MANUAL_REVIEW' {
    if (score >= 90) return 'DELETE';
    if (score >= 70) return 'HIDE';
    if (score >= 50) return 'MANUAL_REVIEW';
    return 'ALLOW';
  }
}
