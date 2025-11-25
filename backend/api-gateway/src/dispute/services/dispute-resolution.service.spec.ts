import { Test, TestingModule } from '@nestjs/testing';
import { DisputeResolutionService } from './dispute-resolution.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../../notification/services/notification.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DisputeStatus, DisputePriority } from '@prisma/client';

describe('DisputeResolutionService', () => {
  let service: DisputeResolutionService;
  let prismaService: PrismaService;
  let notificationService: NotificationService;

  const mockPrismaService = {
    dispute: {
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  };

  const mockNotificationService = {
    createNotification: jest.fn(),
  };

  const mockDispute = {
    id: 'dispute-123',
    missionId: 'mission-123',
    createdById: 'user-123',
    status: DisputeStatus.OPEN,
    priority: DisputePriority.MEDIUM,
    reason: 'Service not completed',
    description: JSON.stringify({ evidence: [] }),
    createdAt: new Date(),
    resolvedAt: null,
    resolvedById: null,
    resolution: null,
    mission: {
      id: 'mission-123',
      clientId: 'client-123',
      artisanId: 'artisan-123',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputeResolutionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<DisputeResolutionService>(DisputeResolutionService);
    prismaService = module.get<PrismaService>(PrismaService);
    notificationService = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('escalateDispute', () => {
    it('should escalate dispute', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(mockDispute);
      mockPrismaService.dispute.update.mockResolvedValue(mockDispute);

      await service.escalateDispute('dispute-123', 'admin-123', 'Requires urgent review');

      expect(mockPrismaService.dispute.update).toHaveBeenCalledWith({
        where: { id: 'dispute-123' },
        data: expect.objectContaining({
          status: DisputeStatus.IN_REVIEW,
        }),
      });
    });

    it('should set URGENT priority for disputes older than 7 days', async () => {
      const oldDispute = {
        ...mockDispute,
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      };
      mockPrismaService.dispute.findUnique.mockResolvedValue(oldDispute);
      mockPrismaService.dispute.update.mockResolvedValue(oldDispute);

      await service.escalateDispute('dispute-123', 'admin-123', 'Old dispute');

      expect(mockPrismaService.dispute.update).toHaveBeenCalledWith({
        where: { id: 'dispute-123' },
        data: expect.objectContaining({
          priority: DisputePriority.URGENT,
        }),
      });
    });

    it('should notify both parties', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(mockDispute);
      mockPrismaService.dispute.update.mockResolvedValue(mockDispute);

      await service.escalateDispute('dispute-123', 'admin-123', 'Escalated');

      expect(mockNotificationService.createNotification).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if dispute not found', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(null);

      await expect(
        service.escalateDispute('nonexistent', 'admin-123', 'reason'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addEvidence', () => {
    it('should add evidence to dispute', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(mockDispute);
      mockPrismaService.dispute.update.mockResolvedValue(mockDispute);

      await service.addEvidence('dispute-123', 'client-123', {
        type: 'PHOTO',
        url: 'http://example.com/photo.jpg',
        description: 'Damaged item',
      });

      expect(mockPrismaService.dispute.update).toHaveBeenCalledWith({
        where: { id: 'dispute-123' },
        data: {
          description: expect.stringContaining('PHOTO'),
        },
      });
    });

    it('should throw NotFoundException if dispute not found', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(null);

      await expect(
        service.addEvidence('nonexistent', 'user-123', {
          type: 'PHOTO',
          url: 'http://example.com/photo.jpg',
          description: 'Evidence',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user not participant', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(mockDispute);

      await expect(
        service.addEvidence('dispute-123', 'other-user', {
          type: 'PHOTO',
          url: 'http://example.com/photo.jpg',
          description: 'Evidence',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('proposeSettlement', () => {
    it('should propose settlement', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(mockDispute);
      mockPrismaService.dispute.update.mockResolvedValue(mockDispute);

      await service.proposeSettlement('dispute-123', 'client-123', {
        refundAmount: 50,
        description: 'Partial refund proposal',
      });

      expect(mockPrismaService.dispute.update).toHaveBeenCalled();
      expect(mockNotificationService.createNotification).toHaveBeenCalled();
    });

    it('should notify other party', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(mockDispute);
      mockPrismaService.dispute.update.mockResolvedValue(mockDispute);

      await service.proposeSettlement('dispute-123', 'client-123', {
        refundAmount: 100,
        description: 'Full refund',
      });

      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        'artisan-123', // Other party
        'SYSTEM',
        'Proposition de règlement',
        expect.any(String),
        `/disputes/dispute-123`,
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if dispute not found', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(null);

      await expect(
        service.proposeSettlement('nonexistent', 'user-123', {
          description: 'Settlement',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('acceptSettlement', () => {
    it('should accept settlement', async () => {
      const disputeWithSettlement = {
        ...mockDispute,
        description: JSON.stringify({
          settlements: [
            { terms: { refundAmount: 50 }, status: 'PENDING' },
          ],
        }),
      };
      mockPrismaService.dispute.findUnique.mockResolvedValue(disputeWithSettlement);
      mockPrismaService.dispute.update.mockResolvedValue(disputeWithSettlement);

      await service.acceptSettlement('dispute-123', 0, 'artisan-123');

      expect(mockPrismaService.dispute.update).toHaveBeenCalledWith({
        where: { id: 'dispute-123' },
        data: expect.objectContaining({
          status: DisputeStatus.RESOLVED,
          resolvedAt: expect.any(Date),
        }),
      });
    });

    it('should throw NotFoundException if settlement not found', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(mockDispute);

      await expect(
        service.acceptSettlement('dispute-123', 5, 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('resolveDispute', () => {
    it('should resolve dispute with admin decision', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(mockDispute);
      mockPrismaService.dispute.update.mockResolvedValue(mockDispute);

      await service.resolveDispute('dispute-123', 'admin-123', {
        winner: 'CLIENT',
        refundAmount: 100,
      }, 'Client was right');

      expect(mockPrismaService.dispute.update).toHaveBeenCalledWith({
        where: { id: 'dispute-123' },
        data: expect.objectContaining({
          status: DisputeStatus.RESOLVED,
          resolvedById: 'admin-123',
          resolution: 'Client was right',
        }),
      });
    });

    it('should apply reputation impacts', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(mockDispute);
      mockPrismaService.dispute.update.mockResolvedValue(mockDispute);

      await service.resolveDispute('dispute-123', 'admin-123', {
        winner: 'CLIENT',
        reputationImpact: [
          { userId: 'artisan-123', points: -10 },
        ],
      }, 'Artisan at fault');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'artisan-123' },
        data: { reputationScore: { increment: -10 } },
      });
    });

    it('should notify both parties', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(mockDispute);
      mockPrismaService.dispute.update.mockResolvedValue(mockDispute);

      await service.resolveDispute('dispute-123', 'admin-123', {
        winner: 'SPLIT',
      }, 'Shared responsibility');

      expect(mockNotificationService.createNotification).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if dispute not found', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(null);

      await expect(
        service.resolveDispute('nonexistent', 'admin-123', { winner: 'NONE' }, 'notes'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('requestMediation', () => {
    it('should request mediation', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(mockDispute);
      mockPrismaService.dispute.update.mockResolvedValue(mockDispute);

      await service.requestMediation('dispute-123', 'user-123');

      expect(mockPrismaService.dispute.update).toHaveBeenCalledWith({
        where: { id: 'dispute-123' },
        data: expect.objectContaining({
          status: DisputeStatus.IN_REVIEW,
          priority: DisputePriority.HIGH,
        }),
      });
    });

    it('should throw NotFoundException if dispute not found', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(null);

      await expect(
        service.requestMediation('nonexistent', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDisputeTimeline', () => {
    it('should return dispute timeline', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(mockDispute);

      const timeline = await service.getDisputeTimeline('dispute-123');

      expect(timeline).toHaveLength(1);
      expect(timeline[0].step).toBe('OPENED');
    });

    it('should include ADMIN_REVIEW step when in review', async () => {
      const disputeInReview = {
        ...mockDispute,
        status: DisputeStatus.IN_REVIEW,
      };
      mockPrismaService.dispute.findUnique.mockResolvedValue(disputeInReview);

      const timeline = await service.getDisputeTimeline('dispute-123');

      expect(timeline.some((s) => s.step === 'ADMIN_REVIEW')).toBe(true);
    });

    it('should include RESOLVED step when resolved', async () => {
      const resolvedDispute = {
        ...mockDispute,
        status: DisputeStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedById: 'admin-123',
        resolution: 'Resolved successfully',
      };
      mockPrismaService.dispute.findUnique.mockResolvedValue(resolvedDispute);

      const timeline = await service.getDisputeTimeline('dispute-123');

      expect(timeline.some((s) => s.step === 'RESOLVED')).toBe(true);
    });

    it('should throw NotFoundException if dispute not found', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(null);

      await expect(
        service.getDisputeTimeline('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDisputeStatistics', () => {
    it('should return dispute statistics', async () => {
      mockPrismaService.dispute.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(30) // open
        .mockResolvedValueOnce(20) // inReview
        .mockResolvedValueOnce(50); // resolved
      mockPrismaService.dispute.findMany.mockResolvedValue([
        {
          createdAt: new Date('2025-01-01'),
          resolvedAt: new Date('2025-01-02'),
        },
      ]);
      mockPrismaService.dispute.groupBy.mockResolvedValue([
        { priority: 'HIGH', _count: 20 },
        { priority: 'MEDIUM', _count: 50 },
        { priority: 'LOW', _count: 30 },
      ]);

      const stats = await service.getDisputeStatistics();

      expect(stats.total).toBe(100);
      expect(stats.open).toBe(30);
      expect(stats.inReview).toBe(20);
      expect(stats.resolved).toBe(50);
      expect(stats.averageResolutionTime).toBeDefined();
      expect(stats.byPriority).toHaveProperty('HIGH', 20);
    });

    it('should calculate average resolution time correctly', async () => {
      mockPrismaService.dispute.count.mockResolvedValue(0);
      mockPrismaService.dispute.findMany.mockResolvedValue([
        {
          createdAt: new Date('2025-01-01T00:00:00Z'),
          resolvedAt: new Date('2025-01-02T00:00:00Z'), // 24 hours
        },
        {
          createdAt: new Date('2025-01-01T00:00:00Z'),
          resolvedAt: new Date('2025-01-03T00:00:00Z'), // 48 hours
        },
      ]);
      mockPrismaService.dispute.groupBy.mockResolvedValue([]);

      const stats = await service.getDisputeStatistics();

      // Average: (24 + 48) / 2 = 36 hours
      expect(stats.averageResolutionTime).toBe(36);
    });

    it('should handle zero disputes', async () => {
      mockPrismaService.dispute.count.mockResolvedValue(0);
      mockPrismaService.dispute.findMany.mockResolvedValue([]);
      mockPrismaService.dispute.groupBy.mockResolvedValue([]);

      const stats = await service.getDisputeStatistics();

      expect(stats.averageResolutionTime).toBe(0);
    });
  });
});
