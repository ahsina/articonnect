import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateReviewDto, CreateArtisanReviewDto, UpdateReviewDto } from '../dto/review.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { ReviewFraudDetectorService } from '../../fraud/services/review-fraud-detector.service';
import { FeatureToggleService } from '../../fraud/services/feature-toggle.service';

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewFraudDetector: ReviewFraudDetectorService,
    private readonly featureToggle: FeatureToggleService,
  ) {}

  async create(userId: string, createDto: CreateReviewDto) {
    // Verify mission exists and user is the client
    const mission = await this.prisma.mission.findUnique({
      where: { id: createDto.missionId },
      include: {
        artisan: true,
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    if (mission.clientId !== userId) {
      throw new ForbiddenException('Vous ne pouvez pas évaluer cette mission');
    }

    if (!mission.artisanId) {
      throw new BadRequestException('Cette mission n\'a pas encore d\'artisan assigné');
    }

    if (mission.status !== 'COMPLETED') {
      throw new BadRequestException('Vous ne pouvez évaluer qu\'une mission terminée');
    }

    // Check if review already exists
    const existingReview = await this.prisma.review.findFirst({
      where: {
        missionId: createDto.missionId,
        reviewerId: userId,
      },
    });

    if (existingReview) {
      throw new BadRequestException('Vous avez déjà évalué cette mission');
    }

    // Create client→artisan review
    const review = await this.prisma.review.create({
      data: {
        missionId: createDto.missionId,
        reviewerId: userId,
        reviewedId: mission.artisanId,
        reviewType: 'CLIENT_TO_ARTISAN',
        overallRating: createDto.overallRating,
        qualityRating: createDto.qualityRating,
        punctualityRating: createDto.punctualityRating,
        communicationRating: createDto.communicationRating,
        valueRating: createDto.valueRating,
        comment: createDto.comment,
      },
      include: {
        reviewer: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Review Fraud Detection (if enabled)
    const isReviewFraudDetectionEnabled = await this.featureToggle.isReviewFraudDetectionEnabled();
    if (isReviewFraudDetectionEnabled) {
      try {
        const fraudResult = await this.reviewFraudDetector.detectFakeReview(review.id);

        // Update review with fraud detection results
        await this.prisma.review.update({
          where: { id: review.id },
          data: {
            fraudScore: fraudResult.fraudScore,
            fraudSignals: fraudResult.signals.map((s) => s.type),
            aiGenerated: fraudResult.aiGenerated,
          },
        });

        // Auto-hide review if fraud score exceeds threshold
        const autoHideEnabled = await this.featureToggle.isReviewAutoHideEnabled();
        const fraudThreshold = await this.featureToggle.getReviewFraudThreshold();

        if (autoHideEnabled && fraudResult.fraudScore >= fraudThreshold) {
          await this.prisma.review.update({
            where: { id: review.id },
            data: {
              hidden: true,
              hiddenReason: `Auto-hidden: fraud score ${fraudResult.fraudScore.toFixed(0)} (threshold: ${fraudThreshold})`,
            },
          });

          this.logger.warn(
            `Review ${review.id} auto-hidden due to fraud score ${fraudResult.fraudScore.toFixed(0)}`,
          );
        }

        // Log high-risk reviews for admin review
        if (fraudResult.recommendation === 'DELETE' || fraudResult.recommendation === 'MANUAL_REVIEW') {
          this.logger.warn(
            `High-risk review detected: ${review.id} (score: ${fraudResult.fraudScore.toFixed(0)}, recommendation: ${fraudResult.recommendation})`,
          );
        }
      } catch (error) {
        this.logger.error(`Failed to run fraud detection on review ${review.id}:`, error);
        // Don't block review creation if fraud detection fails
      }
    }

    // Update artisan rating
    await this.updateArtisanRating(mission.artisanId);

    return review;
  }

  async findByArtisan(artisanId: string) {
    return this.prisma.review.findMany({
      where: { reviewedId: artisanId },
      include: {
        reviewer: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        mission: {
          select: {
            title: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByMission(missionId: string) {
    return this.prisma.review.findFirst({
      where: { missionId },
      include: {
        reviewer: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });
  }

  async update(reviewId: string, userId: string, updateDto: UpdateReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Avis introuvable');
    }

    if (review.reviewerId !== userId) {
      throw new ForbiddenException('Vous ne pouvez pas modifier cet avis');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: updateDto,
      include: {
        reviewer: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Update artisan rating
    await this.updateArtisanRating(review.reviewedId);

    return updated;
  }

  async delete(reviewId: string, userId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Avis introuvable');
    }

    if (review.reviewerId !== userId) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer cet avis');
    }

    await this.prisma.review.delete({
      where: { id: reviewId },
    });

    // Update artisan rating
    await this.updateArtisanRating(review.reviewedId);

    return { message: 'Avis supprimé avec succès' };
  }

  private async updateArtisanRating(artisanId: string) {
    // Calculate average rating from client→artisan reviews
    const result = await this.prisma.review.aggregate({
      where: {
        reviewedId: artisanId,
        reviewType: 'CLIENT_TO_ARTISAN',
      },
      _avg: { overallRating: true },
      _count: { overallRating: true },
    });

    const avgRating = result._avg.overallRating || 0;
    const reviewCount = result._count.overallRating || 0;

    // Update artisan profile
    await this.prisma.artisanProfile.updateMany({
      where: { userId: artisanId },
      data: {
        rating: new Decimal(avgRating.toFixed(2)),
        reviewCount,
      },
    });
  }

  // ================================================================
  // ARTISAN→CLIENT REVIEWS (Reverse Evaluation)
  // ================================================================

  /**
   * Create artisan→client review
   * Allows artisans to evaluate clients after mission completion
   */
  async createArtisanReview(userId: string, createDto: CreateArtisanReviewDto) {
    // Verify mission exists and user is the artisan
    const mission = await this.prisma.mission.findUnique({
      where: { id: createDto.missionId },
      include: {
        client: true,
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    if (mission.artisanId !== userId) {
      throw new ForbiddenException('Vous ne pouvez évaluer que vos propres clients');
    }

    if (!mission.clientId) {
      throw new BadRequestException('Cette mission n\'a pas de client assigné');
    }

    if (mission.status !== 'COMPLETED' && mission.status !== 'AUTO_VALIDATED') {
      throw new BadRequestException('Vous ne pouvez évaluer qu\'une mission terminée');
    }

    // Check if artisan review already exists for this mission
    const existingReview = await this.prisma.review.findFirst({
      where: {
        missionId: createDto.missionId,
        reviewerId: userId,
        reviewType: 'ARTISAN_TO_CLIENT',
      },
    });

    if (existingReview) {
      throw new BadRequestException('Vous avez déjà évalué ce client');
    }

    // Create artisan→client review
    const review = await this.prisma.review.create({
      data: {
        missionId: createDto.missionId,
        reviewerId: userId,
        reviewedId: mission.clientId,
        reviewType: 'ARTISAN_TO_CLIENT',
        overallRating: createDto.overallRating,
        qualityRating: createDto.qualityRating,
        punctualityRating: createDto.punctualityRating,
        communicationRating: createDto.communicationRating,
        valueRating: createDto.valueRating,
        paymentPromptness: createDto.paymentPromptness,
        respectRating: createDto.respectRating,
        safetyRating: createDto.safetyRating,
        comment: createDto.comment,
      },
      include: {
        reviewer: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Review Fraud Detection (if enabled)
    const isReviewFraudDetectionEnabled = await this.featureToggle.isReviewFraudDetectionEnabled();
    if (isReviewFraudDetectionEnabled) {
      try {
        const fraudResult = await this.reviewFraudDetector.detectFakeReview(review.id);

        // Update review with fraud detection results
        await this.prisma.review.update({
          where: { id: review.id },
          data: {
            fraudScore: fraudResult.fraudScore,
            fraudSignals: fraudResult.signals.map((s) => s.type),
            aiGenerated: fraudResult.aiGenerated,
          },
        });

        // Auto-hide review if fraud score exceeds threshold
        const autoHideEnabled = await this.featureToggle.isReviewAutoHideEnabled();
        const fraudThreshold = await this.featureToggle.getReviewFraudThreshold();

        if (autoHideEnabled && fraudResult.fraudScore >= fraudThreshold) {
          await this.prisma.review.update({
            where: { id: review.id },
            data: {
              hidden: true,
              hiddenReason: `Auto-hidden: fraud score ${fraudResult.fraudScore.toFixed(0)} (threshold: ${fraudThreshold})`,
            },
          });

          this.logger.warn(
            `Artisan review ${review.id} auto-hidden due to fraud score ${fraudResult.fraudScore.toFixed(0)}`,
          );
        }

        // Log high-risk reviews for admin review
        if (fraudResult.recommendation === 'DELETE' || fraudResult.recommendation === 'MANUAL_REVIEW') {
          this.logger.warn(
            `High-risk artisan review detected: ${review.id} (score: ${fraudResult.fraudScore.toFixed(0)}, recommendation: ${fraudResult.recommendation})`,
          );
        }
      } catch (error) {
        this.logger.error(`Failed to run fraud detection on artisan review ${review.id}:`, error);
        // Don't block review creation if fraud detection fails
      }
    }

    // Update client reputation score based on review
    await this.updateClientReputation(mission.clientId);

    return review;
  }

  /**
   * Find reviews FOR a client (received from artisans)
   */
  async findByClient(clientId: string) {
    return this.prisma.review.findMany({
      where: {
        reviewedId: clientId,
        reviewType: 'ARTISAN_TO_CLIENT',
      },
      include: {
        reviewer: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        mission: {
          select: {
            title: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get aggregated client reputation stats
   */
  async getClientReputationStats(clientId: string) {
    const result = await this.prisma.review.aggregate({
      where: {
        reviewedId: clientId,
        reviewType: 'ARTISAN_TO_CLIENT',
      },
      _avg: {
        overallRating: true,
        paymentPromptness: true,
        respectRating: true,
        communicationRating: true,
        safetyRating: true,
      },
      _count: {
        overallRating: true,
      },
    });

    return {
      averageRating: result._avg.overallRating || 0,
      totalReviews: result._count.overallRating || 0,
      paymentPromptness: result._avg.paymentPromptness || 0,
      respectRating: result._avg.respectRating || 0,
      communicationRating: result._avg.communicationRating || 0,
      safetyRating: result._avg.safetyRating || 0,
    };
  }

  /**
   * Update client reputation score based on artisan reviews
   * Good client reviews increase reputation, bad ones decrease it
   */
  private async updateClientReputation(clientId: string) {
    const stats = await this.getClientReputationStats(clientId);

    if (stats.totalReviews === 0) {
      return; // No reviews yet
    }

    // Calculate reputation adjustment
    // Base: 100 (neutral)
    // +1 point per review with rating >= 4
    // -2 points per review with rating < 3
    const avgRating = stats.averageRating;
    let reputationAdjustment = 0;

    if (avgRating >= 4) {
      reputationAdjustment = stats.totalReviews; // +1 per good review
    } else if (avgRating < 3) {
      reputationAdjustment = -stats.totalReviews * 2; // -2 per bad review
    }

    // Update user reputation score
    const user = await this.prisma.user.findUnique({
      where: { id: clientId },
      select: { reputationScore: true },
    });

    if (user) {
      const newScore = Math.max(0, Math.min(200, user.reputationScore + reputationAdjustment));
      await this.prisma.user.update({
        where: { id: clientId },
        data: { reputationScore: newScore },
      });
    }
  }

  /**
   * Check if artisan can review client for a mission
   */
  async canArtisanReviewClient(artisanId: string, missionId: string): Promise<boolean> {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
    });

    if (!mission || mission.artisanId !== artisanId) {
      return false;
    }

    if (mission.status !== 'COMPLETED' && mission.status !== 'AUTO_VALIDATED') {
      return false;
    }

    // Check if review already exists
    const existingReview = await this.prisma.review.findFirst({
      where: {
        missionId,
        reviewerId: artisanId,
        reviewType: 'ARTISAN_TO_CLIENT',
      },
    });

    return !existingReview;
  }

  /**
   * Get all reviews for a mission (both directions)
   */
  async findAllByMission(missionId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { missionId },
      include: {
        reviewer: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
        reviewed: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    return {
      clientToArtisan: reviews.find((r) => r.reviewType === 'CLIENT_TO_ARTISAN'),
      artisanToClient: reviews.find((r) => r.reviewType === 'ARTISAN_TO_CLIENT'),
    };
  }
}
