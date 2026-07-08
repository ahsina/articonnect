import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
      throw new NotFoundException('Review not found');
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
    const similarReviews = await this.findSimilarReviews(
      review.comment || '',
      review.id,
    );
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

  /**
   * Detect near-duplicate review texts. Real implementation: normalise the
   * candidate text and compare it (token Jaccard similarity) against other
   * recent reviews. Returns the reviews that exceed the similarity threshold.
   * (A more advanced impl could use Levenshtein/cosine, but a normalised
   * token-set overlap already catches copy-paste / template reviews.)
   */
  private async findSimilarReviews(text: string, excludeReviewId: string) {
    const normalized = this.normalizeText(text);
    // Ignore trivially short comments (too little signal to compare).
    if (normalized.length < 15) {
      return [];
    }

    const candidateTokens = new Set(normalized.split(' ').filter(Boolean));
    if (candidateTokens.size === 0) {
      return [];
    }

    // Compare against other non-empty reviews from the last 90 days.
    const others = await this.prisma.review.findMany({
      where: {
        id: { not: excludeReviewId },
        comment: { not: null },
        createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
      select: { id: true, comment: true, reviewerId: true },
      take: 500,
      orderBy: { createdAt: 'desc' },
    });

    const matches: { id: string; similarity: number }[] = [];
    for (const other of others) {
      const otherNorm = this.normalizeText(other.comment || '');
      if (otherNorm.length < 15) continue;

      const otherTokens = new Set(otherNorm.split(' ').filter(Boolean));
      const similarity = this.jaccardSimilarity(candidateTokens, otherTokens);

      // 0.8 = highly likely duplicate / templated text.
      if (similarity >= 0.8) {
        matches.push({ id: other.id, similarity });
      }
    }

    return matches;
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // strip accents
      .replace(/[^a-z0-9\s]/g, ' ') // strip punctuation
      .replace(/\s+/g, ' ')
      .trim();
  }

  private jaccardSimilarity(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 0;
    let intersection = 0;
    for (const token of a) {
      if (b.has(token)) intersection++;
    }
    const union = a.size + b.size - intersection;
    return union === 0 ? 0 : intersection / union;
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
