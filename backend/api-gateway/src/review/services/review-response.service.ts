import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../../notification/services/notification.service';

export interface ReviewResponse {
  id: string;
  reviewId: string;
  responderId: string;
  response: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ReviewResponseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Create a response to a review
   */
  async createResponse(
    reviewId: string,
    responderId: string,
    responseText: string,
  ): Promise<ReviewResponse> {
    // Get the review
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        reviewer: true,
        reviewed: true,
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Verify the responder is the person who was reviewed
    if (review.reviewedId !== responderId) {
      throw new BadRequestException(
        'You can only respond to reviews about you',
      );
    }

    // Check if response already exists
    const existingResponse = await this.prisma.reviewResponse.findUnique({
      where: { reviewId },
    });

    if (existingResponse) {
      throw new BadRequestException('You have already responded to this review');
    }

    // Create the response
    const response = await this.prisma.reviewResponse.create({
      data: {
        reviewId,
        responderId,
        response: responseText,
      },
    });

    // Notify the reviewer
    await this.notificationService.createNotification(
      review.reviewerId,
      'SYSTEM',
      'Réponse à votre avis',
      `${review.reviewed.firstName} a répondu à votre avis`,
      `/reviews/${reviewId}`,
      { reviewId, responseId: response.id },
    );

    return this.formatResponse(response);
  }

  /**
   * Update a review response
   */
  async updateResponse(
    responseId: string,
    responderId: string,
    responseText: string,
  ): Promise<ReviewResponse> {
    const response = await this.prisma.reviewResponse.findUnique({
      where: { id: responseId },
    });

    if (!response) {
      throw new NotFoundException('Response not found');
    }

    if (response.responderId !== responderId) {
      throw new BadRequestException('You can only update your own responses');
    }

    const updated = await this.prisma.reviewResponse.update({
      where: { id: responseId },
      data: { response: responseText },
    });

    return this.formatResponse(updated);
  }

  /**
   * Delete a review response
   */
  async deleteResponse(responseId: string, responderId: string): Promise<void> {
    const response = await this.prisma.reviewResponse.findUnique({
      where: { id: responseId },
    });

    if (!response) {
      throw new NotFoundException('Response not found');
    }

    if (response.responderId !== responderId) {
      throw new BadRequestException('You can only delete your own responses');
    }

    await this.prisma.reviewResponse.delete({
      where: { id: responseId },
    });
  }

  /**
   * Get response for a review
   */
  async getResponseByReviewId(reviewId: string): Promise<ReviewResponse | null> {
    const response = await this.prisma.reviewResponse.findUnique({
      where: { reviewId },
      include: {
        responder: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    return response ? this.formatResponse(response) : null;
  }

  /**
   * Get all responses by a user
   */
  async getResponsesByUser(userId: string): Promise<ReviewResponse[]> {
    const responses = await this.prisma.reviewResponse.findMany({
      where: { responderId: userId },
      include: {
        review: {
          include: {
            reviewer: {
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
      orderBy: { createdAt: 'desc' },
    });

    return responses.map(this.formatResponse);
  }

  /**
   * Check if user has responded to a review
   */
  async hasResponded(reviewId: string): Promise<boolean> {
    const response = await this.prisma.reviewResponse.findUnique({
      where: { reviewId },
    });

    return response !== null;
  }

  /**
   * Get reviews needing response for a user
   */
  async getReviewsNeedingResponse(userId: string): Promise<any[]> {
    // Get all reviews about this user
    const reviews = await this.prisma.review.findMany({
      where: {
        reviewedId: userId,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        mission: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter out reviews that already have responses
    const reviewsWithResponses = await this.prisma.reviewResponse.findMany({
      where: {
        reviewId: { in: reviews.map((r) => r.id) },
      },
      select: { reviewId: true },
    });

    const respondedReviewIds = new Set(
      reviewsWithResponses.map((r) => r.reviewId),
    );

    return reviews.filter((review) => !respondedReviewIds.has(review.id));
  }

  /**
   * Private: Format response
   */
  private formatResponse(response: any): ReviewResponse {
    return {
      id: response.id,
      reviewId: response.reviewId,
      responderId: response.responderId,
      response: response.response,
      createdAt: response.createdAt,
      updatedAt: response.updatedAt,
    };
  }
}
