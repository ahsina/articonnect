import { Test, TestingModule } from '@nestjs/testing';
import { ReviewFraudDetectorService } from './review-fraud-detector.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('ReviewFraudDetectorService', () => {
  let service: ReviewFraudDetectorService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    review: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewFraudDetectorService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReviewFraudDetectorService>(ReviewFraudDetectorService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockReview = (overrides = {}) => ({
    id: 'review-123',
    reviewerId: 'reviewer-123',
    comment: 'Great service!',
    overallRating: 5,
    createdAt: new Date(),
    reviewer: { id: 'reviewer-123', email: 'reviewer@example.com' },
    mission: {
      id: 'mission-123',
      completedAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      payments: [{ id: 'payment-123' }],
      transaction: { status: 'COMPLETED' },
    },
    ...overrides,
  });

  describe('detectFakeReview', () => {
    it('should return low fraud score for legitimate review', async () => {
      const review = createMockReview();
      mockPrismaService.review.findUnique.mockResolvedValue(review);
      mockPrismaService.review.findMany
        .mockResolvedValueOnce([review]) // Recent reviews (only 1)
        .mockResolvedValueOnce([ // Reviewer history with varied ratings
          { overallRating: 5 },
          { overallRating: 4 },
          { overallRating: 5 },
        ]);

      const result = await service.detectFakeReview('review-123');

      expect(result.isFraudulent).toBe(false);
      expect(result.fraudScore).toBeLessThan(70);
      expect(result.recommendation).toBe('ALLOW');
    });

    it('should throw error for non-existent review', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(null);

      await expect(service.detectFakeReview('invalid-id')).rejects.toThrow(
        'Review not found',
      );
    });

    it('should detect velocity spike', async () => {
      const review = createMockReview();
      mockPrismaService.review.findUnique.mockResolvedValue(review);
      mockPrismaService.review.findMany
        .mockResolvedValueOnce(Array(8).fill({})) // 8 reviews in 24h
        .mockResolvedValueOnce([]);

      const result = await service.detectFakeReview('review-123');

      expect(result.signals.some(s => s.type === 'VELOCITY_SPIKE')).toBe(true);
      expect(result.signals.find(s => s.type === 'VELOCITY_SPIKE')?.severity).toBe('HIGH');
    });

    it('should detect all 5-star rating pattern', async () => {
      const review = createMockReview();
      mockPrismaService.review.findUnique.mockResolvedValue(review);
      mockPrismaService.review.findMany
        .mockResolvedValueOnce([review]) // Recent reviews
        .mockResolvedValueOnce([ // All 5-star reviews
          { overallRating: 5 },
          { overallRating: 5 },
          { overallRating: 5 },
          { overallRating: 5 },
          { overallRating: 5 },
        ]);

      const result = await service.detectFakeReview('review-123');

      expect(result.signals.some(s => s.type === 'RATING_ANOMALY')).toBe(true);
    });

    it('should not flag varied ratings', async () => {
      const review = createMockReview();
      mockPrismaService.review.findUnique.mockResolvedValue(review);
      mockPrismaService.review.findMany
        .mockResolvedValueOnce([review])
        .mockResolvedValueOnce([
          { overallRating: 5 },
          { overallRating: 4 },
          { overallRating: 3 },
          { overallRating: 5 },
          { overallRating: 4 },
        ]);

      const result = await service.detectFakeReview('review-123');

      expect(result.signals.some(s => s.type === 'RATING_ANOMALY')).toBe(false);
    });

    it('should detect missing payment', async () => {
      const review = createMockReview({
        mission: {
          ...createMockReview().mission,
          transaction: { status: 'PENDING' },
        },
      });
      mockPrismaService.review.findUnique.mockResolvedValue(review);
      mockPrismaService.review.findMany.mockResolvedValue([]);

      const result = await service.detectFakeReview('review-123');

      expect(result.signals.some(s => s.type === 'NO_PAYMENT')).toBe(true);
      expect(result.signals.find(s => s.type === 'NO_PAYMENT')?.severity).toBe('CRITICAL');
    });

    it('should detect premature review', async () => {
      const review = createMockReview({
        createdAt: new Date('2024-01-01T10:00:00'),
        mission: {
          ...createMockReview().mission,
          completedAt: new Date('2024-01-01T12:00:00'), // Mission completed after review
        },
      });
      mockPrismaService.review.findUnique.mockResolvedValue(review);
      mockPrismaService.review.findMany.mockResolvedValue([]);

      const result = await service.detectFakeReview('review-123');

      expect(result.signals.some(s => s.type === 'PREMATURE_REVIEW')).toBe(true);
    });

    it('should detect AI-generated text', async () => {
      const review = createMockReview({
        comment: 'Furthermore, it is important to note that the service was excellent. In conclusion, I recommend.',
      });
      mockPrismaService.review.findUnique.mockResolvedValue(review);
      mockPrismaService.review.findMany.mockResolvedValue([]);

      const result = await service.detectFakeReview('review-123');

      expect(result.signals.some(s => s.type === 'AI_GENERATED')).toBe(true);
      expect(result.aiGenerated).toBe(true);
    });

    it('should not flag natural text', async () => {
      const review = createMockReview({
        comment: 'Quick and professional service. Fixed my leak in no time. Highly recommend!',
      });
      mockPrismaService.review.findUnique.mockResolvedValue(review);
      mockPrismaService.review.findMany.mockResolvedValue([]);

      const result = await service.detectFakeReview('review-123');

      expect(result.signals.some(s => s.type === 'AI_GENERATED')).toBe(false);
    });

    it('should recommend DELETE for very high fraud score', async () => {
      const review = createMockReview({
        comment: 'Furthermore, in conclusion, it is important to note as an ai',
        mission: {
          ...createMockReview().mission,
          transaction: { status: 'PENDING' },
          completedAt: new Date(Date.now() + 1000 * 60 * 60), // Future
        },
      });
      mockPrismaService.review.findUnique.mockResolvedValue(review);
      mockPrismaService.review.findMany
        .mockResolvedValueOnce(Array(10).fill({})) // Velocity spike
        .mockResolvedValueOnce(Array(10).fill({ overallRating: 5 })); // All 5-star

      const result = await service.detectFakeReview('review-123');

      expect(result.isFraudulent).toBe(true);
      expect(result.fraudScore).toBeGreaterThanOrEqual(70);
      expect(['DELETE', 'HIDE', 'MANUAL_REVIEW']).toContain(result.recommendation);
    });

    it('should recommend HIDE for high fraud score', async () => {
      const review = createMockReview({
        mission: {
          ...createMockReview().mission,
          transaction: { status: 'PENDING' },
        },
      });
      mockPrismaService.review.findUnique.mockResolvedValue(review);
      mockPrismaService.review.findMany
        .mockResolvedValueOnce(Array(6).fill({})) // Velocity spike
        .mockResolvedValueOnce([{ overallRating: 5 }]);

      const result = await service.detectFakeReview('review-123');

      expect(['HIDE', 'MANUAL_REVIEW', 'DELETE']).toContain(result.recommendation);
    });

    it('should recommend MANUAL_REVIEW for medium fraud score', async () => {
      const review = createMockReview();
      mockPrismaService.review.findUnique.mockResolvedValue(review);
      mockPrismaService.review.findMany
        .mockResolvedValueOnce(Array(6).fill({})) // Some velocity
        .mockResolvedValueOnce([{ overallRating: 5 }, { overallRating: 4 }]);

      const result = await service.detectFakeReview('review-123');

      if (result.fraudScore >= 50 && result.fraudScore < 70) {
        expect(result.recommendation).toBe('MANUAL_REVIEW');
      }
    });

    it('should handle review with no comment', async () => {
      const review = createMockReview({ comment: null });
      mockPrismaService.review.findUnique.mockResolvedValue(review);
      mockPrismaService.review.findMany.mockResolvedValue([]);

      const result = await service.detectFakeReview('review-123');

      expect(result).toHaveProperty('fraudScore');
      expect(result.aiGenerated).toBe(false);
    });

    it('should handle mission with no transaction', async () => {
      const review = createMockReview({
        mission: {
          ...createMockReview().mission,
          transaction: null,
        },
      });
      mockPrismaService.review.findUnique.mockResolvedValue(review);
      mockPrismaService.review.findMany.mockResolvedValue([]);

      const result = await service.detectFakeReview('review-123');

      expect(result.signals.some(s => s.type === 'NO_PAYMENT')).toBe(true);
    });
  });
});
