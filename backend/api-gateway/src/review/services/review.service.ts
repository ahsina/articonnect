import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateReviewDto, UpdateReviewDto } from '../dto/review.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

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

    // Create review
    const review = await this.prisma.review.create({
      data: {
        missionId: createDto.missionId,
        reviewerId: userId,
        reviewedId: mission.artisanId,
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
    // Calculate average rating
    const result = await this.prisma.review.aggregate({
      where: { reviewedId: artisanId },
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
}
