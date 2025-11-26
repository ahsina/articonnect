import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from './review.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ReviewFraudDetectorService } from '../../fraud/services/review-fraud-detector.service';
import { FeatureToggleService } from '../../fraud/services/feature-toggle.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

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
    artisanProfile: {
      updateMany: jest.fn(),
    },
  };

  const mockReviewFraudDetectorService = {
    detectFakeReview: jest.fn(),
  };

  const mockFeatureToggleService = {
    isReviewFraudDetectionEnabled: jest.fn(),
    isReviewAutoHideEnabled: jest.fn(),
    getReviewFraudThreshold: jest.fn(),
  };

  beforeEach(async () => {
    // Reset feature toggle to disabled by default for most tests
    mockFeatureToggleService.isReviewFraudDetectionEnabled.mockResolvedValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ReviewFraudDetectorService, useValue: mockReviewFraudDetectorService },
        { provide: FeatureToggleService, useValue: mockFeatureToggleService },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      missionId: 'mission-123',
      overallRating: 5,
      qualityRating: 5,
      communicationRating: 5,
      punctualityRating: 5,
      valueRating: 5,
      comment: 'Excellent work!',
    };

    const mockMission = {
      id: 'mission-123',
      clientId: 'client-123',
      artisanId: 'artisan-123',
      status: 'COMPLETED',
      artisan: { id: 'artisan-123' },
    };

    it('should create a review successfully', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.review.findFirst.mockResolvedValue(null);
      mockPrismaService.review.create.mockResolvedValue({
        id: 'review-123',
        ...createDto,
        reviewerId: 'client-123',
        reviewedId: 'artisan-123',
        reviewType: 'CLIENT_TO_ARTISAN',
        reviewer: { firstName: 'John', lastName: 'Client', avatar: null },
      });
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: { overallRating: 5 },
        _count: { overallRating: 1 },
      });
      mockPrismaService.artisanProfile.updateMany.mockResolvedValue({});

      const result = await service.create('client-123', createDto);

      expect(result).toHaveProperty('id');
      expect(mockPrismaService.review.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if mission not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      await expect(service.create('client-123', createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not the client', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);

      await expect(
        service.create('different-user', createDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if mission not completed', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        clientId: 'client-123',
        status: 'IN_PROGRESS',
      });

      await expect(service.create('client-123', createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if review already exists', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.review.findFirst.mockResolvedValue({
        id: 'existing-review',
      });

      await expect(service.create('client-123', createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if mission has no artisan', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        artisanId: null,
      });

      await expect(service.create('client-123', createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findByArtisan', () => {
    const artisanId = 'artisan-123';

    it('should return reviews for an artisan', async () => {
      const mockReviews = [
        { id: 'review-1', overallRating: 5 },
        { id: 'review-2', overallRating: 4 },
      ];

      mockPrismaService.review.findMany.mockResolvedValue(mockReviews);

      const result = await service.findByArtisan(artisanId);

      expect(result).toEqual(mockReviews);
      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { reviewedId: artisanId },
        }),
      );
    });

    it('should return empty array if no reviews', async () => {
      mockPrismaService.review.findMany.mockResolvedValue([]);

      const result = await service.findByArtisan(artisanId);

      expect(result).toEqual([]);
    });
  });

  describe('findByMission', () => {
    const missionId = 'mission-123';

    it('should return review for a mission', async () => {
      const mockReview = {
        id: 'review-123',
        missionId,
        overallRating: 5,
        reviewer: { firstName: 'John', lastName: 'Client', avatar: null },
      };

      mockPrismaService.review.findFirst.mockResolvedValue(mockReview);

      const result = await service.findByMission(missionId);

      expect(result).toEqual(mockReview);
    });

    it('should return null if no review exists', async () => {
      mockPrismaService.review.findFirst.mockResolvedValue(null);

      const result = await service.findByMission(missionId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const reviewId = 'review-123';
    const userId = 'client-123';
    const updateDto = {
      overallRating: 4,
      comment: 'Updated comment',
    };

    it('should update a review successfully', async () => {
      const mockReview = {
        id: reviewId,
        reviewerId: userId,
        reviewedId: 'artisan-123',
      };

      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.review.update.mockResolvedValue({
        ...mockReview,
        ...updateDto,
        reviewer: { firstName: 'John', lastName: 'Client', avatar: null },
      });
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: { overallRating: 4 },
        _count: { overallRating: 1 },
      });
      mockPrismaService.artisanProfile.updateMany.mockResolvedValue({});

      const result = await service.update(reviewId, userId, updateDto);

      expect(result.overallRating).toBe(4);
    });

    it('should throw NotFoundException if review not found', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(null);

      await expect(service.update(reviewId, userId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not the reviewer', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue({
        id: reviewId,
        reviewerId: 'different-user',
      });

      await expect(service.update(reviewId, userId, updateDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('delete', () => {
    const reviewId = 'review-123';
    const userId = 'client-123';

    it('should delete a review successfully', async () => {
      const mockReview = {
        id: reviewId,
        reviewerId: userId,
        reviewedId: 'artisan-123',
      };

      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.review.delete.mockResolvedValue(mockReview);
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: { overallRating: null },
        _count: { overallRating: 0 },
      });
      mockPrismaService.artisanProfile.updateMany.mockResolvedValue({});

      const result = await service.delete(reviewId, userId);

      expect(result.message).toContain('supprimé');
    });

    it('should throw NotFoundException if review not found', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(null);

      await expect(service.delete(reviewId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not the reviewer', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue({
        id: reviewId,
        reviewerId: 'different-user',
      });

      await expect(service.delete(reviewId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('createArtisanReview', () => {
    const createDto = {
      missionId: 'mission-123',
      overallRating: 4,
      qualityRating: 4,
      punctualityRating: 4,
      communicationRating: 4,
      valueRating: 4,
      paymentPromptness: 5,
      respectRating: 5,
      safetyRating: 5,
      comment: 'Good client!',
    };

    const mockMission = {
      id: 'mission-123',
      clientId: 'client-123',
      artisanId: 'artisan-123',
      status: 'COMPLETED',
      client: { id: 'client-123' },
    };

    it('should create an artisan review successfully', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.review.findFirst.mockResolvedValue(null);
      mockPrismaService.review.create.mockResolvedValue({
        id: 'review-123',
        ...createDto,
        reviewerId: 'artisan-123',
        reviewedId: 'client-123',
        reviewType: 'ARTISAN_TO_CLIENT',
        reviewer: { firstName: 'Pierre', lastName: 'Artisan', avatar: null },
      });
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: {
          overallRating: 4,
          paymentPromptness: 5,
          respectRating: 5,
          communicationRating: 4,
          safetyRating: 5,
        },
        _count: { overallRating: 1 },
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'client-123',
        reputationScore: 100,
      });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.createArtisanReview('artisan-123', createDto);

      expect(result).toHaveProperty('id');
      expect(result.reviewType).toBe('ARTISAN_TO_CLIENT');
    });

    it('should throw NotFoundException if mission not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      await expect(
        service.createArtisanReview('artisan-123', createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the artisan', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);

      await expect(
        service.createArtisanReview('different-user', createDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByClient', () => {
    const clientId = 'client-123';

    it('should return reviews for a client', async () => {
      const mockReviews = [
        { id: 'review-1', overallRating: 4, reviewType: 'ARTISAN_TO_CLIENT' },
      ];

      mockPrismaService.review.findMany.mockResolvedValue(mockReviews);

      const result = await service.findByClient(clientId);

      expect(result).toEqual(mockReviews);
      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            reviewedId: clientId,
            reviewType: 'ARTISAN_TO_CLIENT',
          },
        }),
      );
    });
  });

  describe('getClientReputationStats', () => {
    const clientId = 'client-123';

    it('should return client reputation stats', async () => {
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: {
          overallRating: 4.5,
          paymentPromptness: 4.8,
          respectRating: 4.7,
          communicationRating: 4.3,
          safetyRating: 4.9,
        },
        _count: { overallRating: 10 },
      });

      const result = await service.getClientReputationStats(clientId);

      expect(result.averageRating).toBe(4.5);
      expect(result.totalReviews).toBe(10);
      expect(result.paymentPromptness).toBe(4.8);
    });

    it('should return 0 for clients with no reviews', async () => {
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: {
          overallRating: null,
          paymentPromptness: null,
          respectRating: null,
          communicationRating: null,
          safetyRating: null,
        },
        _count: { overallRating: 0 },
      });

      const result = await service.getClientReputationStats(clientId);

      expect(result.averageRating).toBe(0);
      expect(result.totalReviews).toBe(0);
    });
  });

  describe('canArtisanReviewClient', () => {
    it('should return true if artisan can review client', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        id: 'mission-123',
        artisanId: 'artisan-123',
        status: 'COMPLETED',
      });
      mockPrismaService.review.findFirst.mockResolvedValue(null);

      const result = await service.canArtisanReviewClient('artisan-123', 'mission-123');

      expect(result).toBe(true);
    });

    it('should return false if mission not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      const result = await service.canArtisanReviewClient('artisan-123', 'mission-123');

      expect(result).toBe(false);
    });

    it('should return false if not the artisan for mission', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        id: 'mission-123',
        artisanId: 'different-artisan',
        status: 'COMPLETED',
      });

      const result = await service.canArtisanReviewClient('artisan-123', 'mission-123');

      expect(result).toBe(false);
    });

    it('should return false if mission not completed', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        id: 'mission-123',
        artisanId: 'artisan-123',
        status: 'IN_PROGRESS',
      });

      const result = await service.canArtisanReviewClient('artisan-123', 'mission-123');

      expect(result).toBe(false);
    });

    it('should return false if review already exists', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        id: 'mission-123',
        artisanId: 'artisan-123',
        status: 'COMPLETED',
      });
      mockPrismaService.review.findFirst.mockResolvedValue({
        id: 'existing-review',
      });

      const result = await service.canArtisanReviewClient('artisan-123', 'mission-123');

      expect(result).toBe(false);
    });
  });

  describe('findAllByMission', () => {
    const missionId = 'mission-123';

    it('should return all reviews for a mission', async () => {
      const mockReviews = [
        { id: 'review-1', reviewType: 'CLIENT_TO_ARTISAN' },
        { id: 'review-2', reviewType: 'ARTISAN_TO_CLIENT' },
      ];

      mockPrismaService.review.findMany.mockResolvedValue(mockReviews);

      const result = await service.findAllByMission(missionId);

      expect(result.clientToArtisan).toEqual(mockReviews[0]);
      expect(result.artisanToClient).toEqual(mockReviews[1]);
    });

    it('should return undefined for missing review types', async () => {
      mockPrismaService.review.findMany.mockResolvedValue([]);

      const result = await service.findAllByMission(missionId);

      expect(result.clientToArtisan).toBeUndefined();
      expect(result.artisanToClient).toBeUndefined();
    });
  });
});
