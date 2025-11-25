import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from './review.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ReviewType } from '@prisma/client';

describe('ReviewService', () => {
  let service: ReviewService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    review: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    mission: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    reviewResponse: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const reviewData = {
      missionId: 'mission-123',
      overallRating: 5,
      qualityRating: 5,
      communicationRating: 5,
      timelinessRating: 5,
      comment: 'Excellent work!',
      reviewType: ReviewType.CLIENT_TO_ARTISAN,
    };

    const mockMission = {
      id: 'mission-123',
      clientId: 'client-123',
      artisanId: 'artisan-123',
      status: 'COMPLETED',
    };

    it('should create a review successfully', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.review.findFirst.mockResolvedValue(null);
      mockPrismaService.review.create.mockResolvedValue({
        id: 'review-123',
        ...reviewData,
        reviewerId: 'client-123',
        reviewedId: 'artisan-123',
      });
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: { overallRating: 5 },
      });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.create(reviewData, 'client-123');

      expect(result).toHaveProperty('id');
      expect(mockPrismaService.review.create).toHaveBeenCalled();
    });

    it('should throw error if mission not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      await expect(service.create(reviewData, 'client-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error if mission not completed', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        status: 'IN_PROGRESS',
      });

      await expect(service.create(reviewData, 'client-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if review already exists', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.review.findFirst.mockResolvedValue({
        id: 'existing-review',
      });

      await expect(service.create(reviewData, 'client-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if user is not part of mission', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);

      await expect(
        service.create(reviewData, 'different-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    const reviewId = 'review-123';

    it('should return review with relations', async () => {
      const mockReview = {
        id: reviewId,
        overallRating: 5,
        reviewer: { id: 'user-1', firstName: 'John' },
        reviewed: { id: 'user-2', firstName: 'Jane' },
        mission: { id: 'mission-123', title: 'Fix leak' },
      };

      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);

      const result = await service.findOne(reviewId);

      expect(result).toEqual(mockReview);
    });

    it('should throw NotFoundException if review not found', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(null);

      await expect(service.findOne(reviewId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUser', () => {
    const userId = 'user-123';

    it('should return reviews received by user', async () => {
      const mockReviews = [
        { id: 'review-1', overallRating: 5 },
        { id: 'review-2', overallRating: 4 },
      ];

      mockPrismaService.review.findMany.mockResolvedValue(mockReviews);

      const result = await service.findByUser(userId, 'received');

      expect(result).toEqual(mockReviews);
      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { reviewedId: userId },
        }),
      );
    });

    it('should return reviews given by user', async () => {
      const mockReviews = [{ id: 'review-1', overallRating: 5 }];

      mockPrismaService.review.findMany.mockResolvedValue(mockReviews);

      const result = await service.findByUser(userId, 'given');

      expect(result).toEqual(mockReviews);
      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { reviewerId: userId },
        }),
      );
    });
  });

  describe('getUserRating', () => {
    const userId = 'user-123';

    it('should return average rating and count', async () => {
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: { overallRating: 4.5 },
        _count: { id: 10 },
      });

      const result = await service.getUserRating(userId);

      expect(result).toEqual({
        averageRating: 4.5,
        totalReviews: 10,
      });
    });

    it('should return 0 for users with no reviews', async () => {
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: { overallRating: null },
        _count: { id: 0 },
      });

      const result = await service.getUserRating(userId);

      expect(result).toEqual({
        averageRating: 0,
        totalReviews: 0,
      });
    });
  });

  describe('addResponse', () => {
    const reviewId = 'review-123';
    const userId = 'artisan-123';
    const responseText = 'Thank you for your feedback!';

    it('should add response to review', async () => {
      const mockReview = {
        id: reviewId,
        reviewedId: userId,
        response: null,
      };

      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.reviewResponse.create.mockResolvedValue({
        id: 'response-123',
        reviewId,
        content: responseText,
      });

      const result = await service.addResponse(reviewId, userId, responseText);

      expect(result).toHaveProperty('id');
      expect(mockPrismaService.reviewResponse.create).toHaveBeenCalled();
    });

    it('should throw error if user is not the reviewed person', async () => {
      const mockReview = {
        id: reviewId,
        reviewedId: 'different-user',
      };

      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);

      await expect(
        service.addResponse(reviewId, userId, responseText),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw error if review already has response', async () => {
      const mockReview = {
        id: reviewId,
        reviewedId: userId,
        response: { id: 'existing-response' },
      };

      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);

      await expect(
        service.addResponse(reviewId, userId, responseText),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reportReview', () => {
    const reviewId = 'review-123';
    const userId = 'user-123';
    const reason = 'Inappropriate content';

    it('should report a review for moderation', async () => {
      const mockReview = {
        id: reviewId,
        hidden: false,
      };

      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.review.update.mockResolvedValue({
        ...mockReview,
        reported: true,
        reportedBy: userId,
        reportReason: reason,
      });

      const result = await service.reportReview(reviewId, userId, reason);

      expect(result.reported).toBe(true);
    });

    it('should throw error if review not found', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(null);

      await expect(
        service.reportReview(reviewId, userId, reason),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('hideReview (admin)', () => {
    const reviewId = 'review-123';
    const adminId = 'admin-123';
    const reason = 'Violates community guidelines';

    it('should hide a review', async () => {
      const mockReview = {
        id: reviewId,
        hidden: false,
      };

      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.review.update.mockResolvedValue({
        ...mockReview,
        hidden: true,
        hiddenReason: reason,
        fraudReviewedBy: adminId,
      });

      const result = await service.hideReview(reviewId, adminId, reason);

      expect(result.hidden).toBe(true);
    });
  });

  describe('getReviewStats', () => {
    const userId = 'user-123';

    it('should return review statistics', async () => {
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: {
          overallRating: 4.5,
          qualityRating: 4.7,
          communicationRating: 4.3,
          timelinessRating: 4.6,
        },
        _count: { id: 25 },
      });

      mockPrismaService.review.count
        .mockResolvedValueOnce(20) // 5 stars
        .mockResolvedValueOnce(3)  // 4 stars
        .mockResolvedValueOnce(1)  // 3 stars
        .mockResolvedValueOnce(1)  // 2 stars
        .mockResolvedValueOnce(0); // 1 star

      const result = await service.getReviewStats(userId);

      expect(result).toHaveProperty('averageRating');
      expect(result).toHaveProperty('totalReviews');
      expect(result).toHaveProperty('ratingDistribution');
    });
  });
});
