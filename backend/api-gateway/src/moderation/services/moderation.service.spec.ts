import { Test, TestingModule } from '@nestjs/testing';
import { ModerationService } from './moderation.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ReportType, ReportStatus } from '@prisma/client';

describe('ModerationService', () => {
  let service: ModerationService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    report: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    review: {
      findUnique: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    mission: {
      findUnique: jest.fn(),
    },
  };

  const mockReport = {
    id: 'report-123',
    reporterId: 'reporter-123',
    type: ReportType.REVIEW,
    reason: 'INAPPROPRIATE',
    description: 'Fake review',
    reviewId: 'review-123',
    productId: null,
    reportedUserId: null,
    missionId: null,
    status: ReportStatus.PENDING,
    reporter: {
      id: 'reporter-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    },
    review: { id: 'review-123' },
    product: null,
    reportedUser: null,
    mission: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ModerationService>(ModerationService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createReport', () => {
    const createDto = {
      type: ReportType.REVIEW,
      reason: 'INAPPROPRIATE',
      description: 'This review contains fake information',
      reviewId: 'review-123',
    };

    it('should create a report successfully', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue({ id: 'review-123' });
      mockPrismaService.report.findFirst.mockResolvedValue(null);
      mockPrismaService.report.create.mockResolvedValue(mockReport);

      const result = await service.createReport('reporter-123', createDto);

      expect(result).toEqual(mockReport);
      expect(mockPrismaService.report.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if review not found', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(null);

      await expect(
        service.createReport('reporter-123', createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user already reported entity', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue({ id: 'review-123' });
      mockPrismaService.report.findFirst.mockResolvedValue(mockReport);

      await expect(
        service.createReport('reporter-123', createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if multiple entities provided', async () => {
      const invalidDto = {
        ...createDto,
        productId: 'product-123',
      };

      await expect(
        service.createReport('reporter-123', invalidDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate product report correctly', async () => {
      const productReportDto = {
        type: ReportType.PRODUCT,
        reason: 'SPAM',
        description: 'Spam product',
        productId: 'product-123',
      };

      mockPrismaService.product.findUnique.mockResolvedValue({ id: 'product-123' });
      mockPrismaService.report.findFirst.mockResolvedValue(null);
      mockPrismaService.report.create.mockResolvedValue({
        ...mockReport,
        type: ReportType.PRODUCT,
        productId: 'product-123',
        reviewId: null,
      });

      await service.createReport('reporter-123', productReportDto);

      expect(mockPrismaService.product.findUnique).toHaveBeenCalled();
    });

    it('should validate user report correctly', async () => {
      const userReportDto = {
        type: ReportType.USER,
        reason: 'SCAM',
        description: 'Scammer',
        reportedUserId: 'user-456',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-456' });
      mockPrismaService.report.findFirst.mockResolvedValue(null);
      mockPrismaService.report.create.mockResolvedValue({
        ...mockReport,
        type: ReportType.USER,
        reportedUserId: 'user-456',
        reviewId: null,
      });

      await service.createReport('reporter-123', userReportDto);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalled();
    });
  });

  describe('getAllReports', () => {
    it('should return paginated reports', async () => {
      mockPrismaService.report.findMany.mockResolvedValue([mockReport]);
      mockPrismaService.report.count.mockResolvedValue(1);

      const result = await service.getAllReports({ page: 1, limit: 20 });

      expect(result.reports).toEqual([mockReport]);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1,
      });
    });

    it('should filter by type', async () => {
      mockPrismaService.report.findMany.mockResolvedValue([]);
      mockPrismaService.report.count.mockResolvedValue(0);

      await service.getAllReports({ type: ReportType.REVIEW });

      expect(mockPrismaService.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: ReportType.REVIEW }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrismaService.report.findMany.mockResolvedValue([]);
      mockPrismaService.report.count.mockResolvedValue(0);

      await service.getAllReports({ status: ReportStatus.PENDING });

      expect(mockPrismaService.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: ReportStatus.PENDING }),
        }),
      );
    });
  });

  describe('getReportById', () => {
    it('should return report by id', async () => {
      mockPrismaService.report.findUnique.mockResolvedValue(mockReport);

      const result = await service.getReportById('report-123');

      expect(result).toEqual(mockReport);
    });

    it('should throw NotFoundException if report not found', async () => {
      mockPrismaService.report.findUnique.mockResolvedValue(null);

      await expect(service.getReportById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getReportsByUser', () => {
    it('should return user reports', async () => {
      mockPrismaService.report.findMany.mockResolvedValue([mockReport]);

      const result = await service.getReportsByUser('reporter-123');

      expect(result).toEqual([mockReport]);
      expect(mockPrismaService.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { reporterId: 'reporter-123' },
        }),
      );
    });
  });

  describe('resolveReport', () => {
    const resolveDto = {
      status: ReportStatus.RESOLVED,
      resolution: 'Content removed',
      actionTaken: 'CONTENT_REMOVED',
    };

    it('should resolve report successfully', async () => {
      mockPrismaService.report.findUnique.mockResolvedValue(mockReport);
      mockPrismaService.report.update.mockResolvedValue({
        ...mockReport,
        status: ReportStatus.RESOLVED,
        resolution: resolveDto.resolution,
      });

      const result = await service.resolveReport('report-123', 'admin-123', resolveDto);

      expect(result.status).toBe(ReportStatus.RESOLVED);
    });

    it('should throw BadRequestException if already resolved', async () => {
      mockPrismaService.report.findUnique.mockResolvedValue({
        ...mockReport,
        status: ReportStatus.RESOLVED,
      });

      await expect(
        service.resolveReport('report-123', 'admin-123', resolveDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should apply CONTENT_REMOVED action for products', async () => {
      const productReport = {
        ...mockReport,
        type: ReportType.PRODUCT,
        productId: 'product-123',
        reviewId: null,
        product: { id: 'product-123' },
      };
      mockPrismaService.report.findUnique.mockResolvedValue(productReport);
      mockPrismaService.report.update.mockResolvedValue({
        ...productReport,
        status: ReportStatus.RESOLVED,
      });

      await service.resolveReport('report-123', 'admin-123', resolveDto);

      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: 'product-123' },
        data: { status: 'INACTIVE' },
      });
    });
  });

  describe('updateReportStatus', () => {
    it('should update report status', async () => {
      mockPrismaService.report.update.mockResolvedValue({
        ...mockReport,
        status: ReportStatus.UNDER_REVIEW,
      });

      const result = await service.updateReportStatus('report-123', ReportStatus.UNDER_REVIEW);

      expect(result.status).toBe(ReportStatus.UNDER_REVIEW);
    });
  });

  describe('getModerationStats', () => {
    it('should return moderation statistics', async () => {
      mockPrismaService.report.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(30) // pending
        .mockResolvedValueOnce(20) // under review
        .mockResolvedValueOnce(40) // resolved
        .mockResolvedValueOnce(10); // dismissed

      mockPrismaService.report.groupBy
        .mockResolvedValueOnce([
          { type: ReportType.REVIEW, _count: 50 },
          { type: ReportType.PRODUCT, _count: 30 },
          { type: ReportType.USER, _count: 20 },
        ])
        .mockResolvedValueOnce([
          { reason: 'SPAM', _count: 40 },
          { reason: 'INAPPROPRIATE', _count: 60 },
        ]);

      const result = await service.getModerationStats();

      expect(result).toEqual({
        total: 100,
        byStatus: {
          pending: 30,
          underReview: 20,
          resolved: 40,
          dismissed: 10,
        },
        byType: {
          REVIEW: 50,
          PRODUCT: 30,
          USER: 20,
        },
        byReason: {
          SPAM: 40,
          INAPPROPRIATE: 60,
        },
      });
    });
  });
});
