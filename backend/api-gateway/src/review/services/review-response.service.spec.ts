import { Test, TestingModule } from '@nestjs/testing';
import { ReviewResponseService } from './review-response.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../../notification/services/notification.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ReviewResponseService', () => {
  let service: ReviewResponseService;
  let prismaService: PrismaService;
  let notificationService: NotificationService;

  const mockPrismaService = {
    review: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    reviewResponse: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockNotificationService = {
    createNotification: jest.fn(),
  };

  const mockReview = {
    id: 'review-123',
    reviewerId: 'reviewer-123',
    reviewedId: 'reviewed-123',
    rating: 4,
    comment: 'Great work!',
    createdAt: new Date(),
    reviewer: {
      id: 'reviewer-123',
      firstName: 'John',
      lastName: 'Client',
    },
    reviewed: {
      id: 'reviewed-123',
      firstName: 'Pierre',
      lastName: 'Artisan',
    },
    mission: {
      id: 'mission-123',
      title: 'Fix plumbing',
    },
  };

  const mockResponse = {
    id: 'response-123',
    reviewId: 'review-123',
    responderId: 'reviewed-123',
    response: 'Thank you for your feedback!',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewResponseService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<ReviewResponseService>(ReviewResponseService);
    prismaService = module.get<PrismaService>(PrismaService);
    notificationService = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createResponse', () => {
    it('should create a response successfully', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.reviewResponse.findUnique.mockResolvedValue(null);
      mockPrismaService.reviewResponse.create.mockResolvedValue(mockResponse);
      mockNotificationService.createNotification.mockResolvedValue({});

      const result = await service.createResponse(
        'review-123',
        'reviewed-123',
        'Thank you for your feedback!',
      );

      expect(result.response).toBe('Thank you for your feedback!');
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        'reviewer-123',
        'SYSTEM',
        'Réponse à votre avis',
        'Pierre a répondu à votre avis',
        '/reviews/review-123',
        { reviewId: 'review-123', responseId: 'response-123' },
      );
    });

    it('should throw NotFoundException if review not found', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(null);

      await expect(
        service.createResponse('nonexistent', 'user-123', 'Response'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if not the reviewed person', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);

      await expect(
        service.createResponse('review-123', 'wrong-user', 'Response'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if already responded', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.reviewResponse.findUnique.mockResolvedValue(mockResponse);

      await expect(
        service.createResponse('review-123', 'reviewed-123', 'Another response'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateResponse', () => {
    it('should update a response successfully', async () => {
      mockPrismaService.reviewResponse.findUnique.mockResolvedValue(mockResponse);
      mockPrismaService.reviewResponse.update.mockResolvedValue({
        ...mockResponse,
        response: 'Updated response',
      });

      const result = await service.updateResponse(
        'response-123',
        'reviewed-123',
        'Updated response',
      );

      expect(result.response).toBe('Updated response');
    });

    it('should throw NotFoundException if response not found', async () => {
      mockPrismaService.reviewResponse.findUnique.mockResolvedValue(null);

      await expect(
        service.updateResponse('nonexistent', 'user-123', 'Update'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if not the responder', async () => {
      mockPrismaService.reviewResponse.findUnique.mockResolvedValue(mockResponse);

      await expect(
        service.updateResponse('response-123', 'wrong-user', 'Update'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteResponse', () => {
    it('should delete a response successfully', async () => {
      mockPrismaService.reviewResponse.findUnique.mockResolvedValue(mockResponse);
      mockPrismaService.reviewResponse.delete.mockResolvedValue(mockResponse);

      await service.deleteResponse('response-123', 'reviewed-123');

      expect(mockPrismaService.reviewResponse.delete).toHaveBeenCalledWith({
        where: { id: 'response-123' },
      });
    });

    it('should throw NotFoundException if response not found', async () => {
      mockPrismaService.reviewResponse.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteResponse('nonexistent', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if not the responder', async () => {
      mockPrismaService.reviewResponse.findUnique.mockResolvedValue(mockResponse);

      await expect(
        service.deleteResponse('response-123', 'wrong-user'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getResponseByReviewId', () => {
    it('should return response for a review', async () => {
      mockPrismaService.reviewResponse.findUnique.mockResolvedValue({
        ...mockResponse,
        responder: {
          id: 'reviewed-123',
          firstName: 'Pierre',
          lastName: 'Artisan',
          avatar: null,
        },
      });

      const result = await service.getResponseByReviewId('review-123');

      expect(result).not.toBeNull();
      expect(result!.reviewId).toBe('review-123');
    });

    it('should return null if no response exists', async () => {
      mockPrismaService.reviewResponse.findUnique.mockResolvedValue(null);

      const result = await service.getResponseByReviewId('review-123');

      expect(result).toBeNull();
    });
  });

  describe('getResponsesByUser', () => {
    it('should return all responses by a user', async () => {
      mockPrismaService.reviewResponse.findMany.mockResolvedValue([
        {
          ...mockResponse,
          review: {
            ...mockReview,
            reviewer: {
              id: 'reviewer-123',
              firstName: 'John',
              lastName: 'Client',
              avatar: null,
            },
          },
        },
      ]);

      const result = await service.getResponsesByUser('reviewed-123');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.reviewResponse.findMany).toHaveBeenCalledWith({
        where: { responderId: 'reviewed-123' },
        include: expect.objectContaining({
          review: expect.any(Object),
        }),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if no responses', async () => {
      mockPrismaService.reviewResponse.findMany.mockResolvedValue([]);

      const result = await service.getResponsesByUser('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('hasResponded', () => {
    it('should return true if response exists', async () => {
      mockPrismaService.reviewResponse.findUnique.mockResolvedValue(mockResponse);

      const result = await service.hasResponded('review-123');

      expect(result).toBe(true);
    });

    it('should return false if no response exists', async () => {
      mockPrismaService.reviewResponse.findUnique.mockResolvedValue(null);

      const result = await service.hasResponded('review-123');

      expect(result).toBe(false);
    });
  });

  describe('getReviewsNeedingResponse', () => {
    it('should return reviews without responses', async () => {
      const reviewsAboutUser = [
        { ...mockReview, id: 'review-1' },
        { ...mockReview, id: 'review-2' },
        { ...mockReview, id: 'review-3' },
      ];

      mockPrismaService.review.findMany.mockResolvedValue(reviewsAboutUser);
      mockPrismaService.reviewResponse.findMany.mockResolvedValue([
        { reviewId: 'review-1' },
      ]);

      const result = await service.getReviewsNeedingResponse('reviewed-123');

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual(['review-2', 'review-3']);
    });

    it('should return all reviews if none have responses', async () => {
      const reviewsAboutUser = [
        { ...mockReview, id: 'review-1' },
        { ...mockReview, id: 'review-2' },
      ];

      mockPrismaService.review.findMany.mockResolvedValue(reviewsAboutUser);
      mockPrismaService.reviewResponse.findMany.mockResolvedValue([]);

      const result = await service.getReviewsNeedingResponse('reviewed-123');

      expect(result).toHaveLength(2);
    });

    it('should return empty array if all reviews have responses', async () => {
      const reviewsAboutUser = [{ ...mockReview, id: 'review-1' }];

      mockPrismaService.review.findMany.mockResolvedValue(reviewsAboutUser);
      mockPrismaService.reviewResponse.findMany.mockResolvedValue([
        { reviewId: 'review-1' },
      ]);

      const result = await service.getReviewsNeedingResponse('reviewed-123');

      expect(result).toHaveLength(0);
    });

    it('should return empty array if no reviews about user', async () => {
      mockPrismaService.review.findMany.mockResolvedValue([]);
      mockPrismaService.reviewResponse.findMany.mockResolvedValue([]);

      const result = await service.getReviewsNeedingResponse('user-123');

      expect(result).toEqual([]);
    });
  });
});
