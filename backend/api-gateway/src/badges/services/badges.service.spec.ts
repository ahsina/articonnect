import { Test, TestingModule } from '@nestjs/testing';
import { BadgesService } from './badges.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

describe('BadgesService', () => {
  let service: BadgesService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    badge: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    userBadge: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    mission: {
      findMany: jest.fn(),
    },
  };

  const mockBadge = {
    id: 'badge-123',
    key: 'expert_artisan',
    name: 'Expert Artisan',
    description: 'Completed 100 missions with 4.5+ rating',
    icon: 'medal',
    type: 'ACHIEVEMENT',
    tier: 'GOLD',
    criteria: {
      missions_completed: 100,
      avg_rating: 4.5,
      min_reviews: 20,
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserBadge = {
    id: 'user-badge-123',
    userId: 'artisan-123',
    badgeId: 'badge-123',
    earnedAt: new Date(),
    badge: mockBadge,
  };

  const mockArtisan = {
    id: 'artisan-123',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.ARTISAN,
    status: 'ACTIVE',
    completedMissions: 150,
    disputeCount: 1,
    createdAt: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000), // 2 years ago
    artisanProfile: {
      id: 'profile-123',
      rating: { toString: () => '4.8' },
      reviewCount: 50,
    },
    artisanMissions: [
      { status: 'COMPLETED' },
      { status: 'COMPLETED' },
      { status: 'CANCELLED' },
    ],
    badges: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BadgesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BadgesService>(BadgesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('awardBadge', () => {
    it('should award badge to user', async () => {
      mockPrismaService.userBadge.findUnique.mockResolvedValue(null);
      mockPrismaService.userBadge.create.mockResolvedValue(mockUserBadge);

      const result = await service.awardBadge('artisan-123', 'badge-123');

      expect(result.badge.name).toBe('Expert Artisan');
      expect(mockPrismaService.userBadge.create).toHaveBeenCalledWith({
        data: {
          userId: 'artisan-123',
          badgeId: 'badge-123',
          triggerData: undefined,
        },
        include: { badge: true },
      });
    });

    it('should not award duplicate badge', async () => {
      mockPrismaService.userBadge.findUnique.mockResolvedValue(mockUserBadge);

      const result = await service.awardBadge('artisan-123', 'badge-123');

      expect(result).toEqual(mockUserBadge);
      expect(mockPrismaService.userBadge.create).not.toHaveBeenCalled();
    });

    it('should include trigger data when provided', async () => {
      mockPrismaService.userBadge.findUnique.mockResolvedValue(null);
      mockPrismaService.userBadge.create.mockResolvedValue(mockUserBadge);

      await service.awardBadge('artisan-123', 'badge-123', { milestone: 100 });

      expect(mockPrismaService.userBadge.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          triggerData: { milestone: 100 },
        }),
        include: { badge: true },
      });
    });
  });

  describe('getAllBadges', () => {
    it('should return only active badges by default', async () => {
      mockPrismaService.badge.findMany.mockResolvedValue([mockBadge]);

      const result = await service.getAllBadges();

      expect(result).toHaveLength(1);
      expect(mockPrismaService.badge.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [{ type: 'asc' }, { tier: 'asc' }],
      });
    });

    it('should include inactive badges when requested', async () => {
      mockPrismaService.badge.findMany.mockResolvedValue([mockBadge]);

      await service.getAllBadges(true);

      expect(mockPrismaService.badge.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ type: 'asc' }, { tier: 'asc' }],
      });
    });
  });

  describe('getBadgeById', () => {
    it('should return badge with users who earned it', async () => {
      mockPrismaService.badge.findUnique.mockResolvedValue({
        ...mockBadge,
        userBadges: [mockUserBadge],
      });

      const result = await service.getBadgeById('badge-123');

      expect(result.name).toBe('Expert Artisan');
      expect(result.userBadges).toHaveLength(1);
    });

    it('should throw NotFoundException if badge not found', async () => {
      mockPrismaService.badge.findUnique.mockResolvedValue(null);

      await expect(service.getBadgeById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserBadges', () => {
    it('should return badges earned by user', async () => {
      mockPrismaService.userBadge.findMany.mockResolvedValue([mockUserBadge]);

      const result = await service.getUserBadges('artisan-123');

      expect(result).toHaveLength(1);
      expect(result[0].badge.name).toBe('Expert Artisan');
    });

    it('should order by earned date descending', async () => {
      mockPrismaService.userBadge.findMany.mockResolvedValue([]);

      await service.getUserBadges('artisan-123');

      expect(mockPrismaService.userBadge.findMany).toHaveBeenCalledWith({
        where: { userId: 'artisan-123' },
        include: { badge: true },
        orderBy: { earnedAt: 'desc' },
      });
    });
  });

  describe('createBadge', () => {
    it('should create a new badge', async () => {
      mockPrismaService.badge.create.mockResolvedValue(mockBadge);

      const dto = {
        key: 'expert_artisan',
        name: 'Expert Artisan',
        description: 'Completed 100 missions',
        icon: 'medal',
        type: 'ACHIEVEMENT',
        tier: 'GOLD',
        criteria: { missions_completed: 100 },
      };

      const result = await service.createBadge(dto as any);

      expect(result.name).toBe('Expert Artisan');
      expect(mockPrismaService.badge.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          key: 'expert_artisan',
          name: 'Expert Artisan',
          isActive: true,
        }),
      });
    });
  });

  describe('updateBadge', () => {
    it('should update badge', async () => {
      mockPrismaService.badge.findUnique.mockResolvedValue(mockBadge);
      mockPrismaService.badge.update.mockResolvedValue({
        ...mockBadge,
        name: 'Updated Badge',
      });

      const result = await service.updateBadge('badge-123', {
        name: 'Updated Badge',
      } as any);

      expect(result.name).toBe('Updated Badge');
    });

    it('should throw NotFoundException if badge not found', async () => {
      mockPrismaService.badge.findUnique.mockResolvedValue(null);

      await expect(
        service.updateBadge('nonexistent', { name: 'Test' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteBadge', () => {
    it('should delete badge', async () => {
      mockPrismaService.badge.findUnique.mockResolvedValue(mockBadge);
      mockPrismaService.badge.delete.mockResolvedValue(mockBadge);

      const result = await service.deleteBadge('badge-123');

      expect(result.id).toBe('badge-123');
    });

    it('should throw NotFoundException if badge not found', async () => {
      mockPrismaService.badge.findUnique.mockResolvedValue(null);

      await expect(service.deleteBadge('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getBadgeStatistics', () => {
    it('should return badge statistics', async () => {
      mockPrismaService.badge.count.mockResolvedValue(10);
      mockPrismaService.userBadge.count.mockResolvedValue(500);
      mockPrismaService.badge.groupBy
        .mockResolvedValueOnce([
          { type: 'ACHIEVEMENT', _count: 5 },
          { type: 'MILESTONE', _count: 5 },
        ])
        .mockResolvedValueOnce([
          { tier: 'GOLD', _count: 3 },
          { tier: 'SILVER', _count: 4 },
          { tier: 'BRONZE', _count: 3 },
        ]);
      mockPrismaService.badge.findMany.mockResolvedValue([
        { id: 'badge-1', name: 'Top Badge', type: 'ACHIEVEMENT', tier: 'GOLD', _count: { userBadges: 100 } },
      ]);

      const result = await service.getBadgeStatistics();

      expect(result.totalBadges).toBe(10);
      expect(result.totalUserBadges).toBe(500);
      expect(result.byType).toHaveProperty('ACHIEVEMENT', 5);
      expect(result.byTier).toHaveProperty('GOLD', 3);
      expect(result.topBadges).toHaveLength(1);
    });
  });

  describe('awardBadgesAutomatically', () => {
    it('should check and award badges to eligible artisans', async () => {
      mockPrismaService.badge.findMany.mockResolvedValue([
        {
          ...mockBadge,
          criteria: { missions_completed: 100 },
        },
      ]);
      mockPrismaService.user.findMany.mockResolvedValue([mockArtisan]);
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockArtisan,
        receivedReviews: [],
      });
      mockPrismaService.userBadge.findUnique.mockResolvedValue(null);
      mockPrismaService.userBadge.create.mockResolvedValue(mockUserBadge);

      await service.awardBadgesAutomatically();

      expect(mockPrismaService.badge.findMany).toHaveBeenCalled();
      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
    });

    it('should skip artisans who already have the badge', async () => {
      mockPrismaService.badge.findMany.mockResolvedValue([mockBadge]);
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          ...mockArtisan,
          badges: [{ badgeId: 'badge-123' }],
        },
      ]);

      await service.awardBadgesAutomatically();

      expect(mockPrismaService.userBadge.create).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockPrismaService.badge.findMany.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(service.awardBadgesAutomatically()).resolves.not.toThrow();
    });
  });

  describe('badge criteria checking', () => {
    it('should check missions_completed criteria', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockArtisan,
        completedMissions: 50, // Less than required 100
      });

      const meetsRequirements = await (service as any).checkBadgeCriteria(
        'artisan-123',
        { missions_completed: 100 },
      );

      expect(meetsRequirements).toBe(false);
    });

    it('should check avg_rating criteria', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockArtisan,
        artisanProfile: {
          rating: { toString: () => '4.2' }, // Less than 4.5
          reviewCount: 30,
        },
      });

      const meetsRequirements = await (service as any).checkBadgeCriteria(
        'artisan-123',
        { avg_rating: 4.5, min_reviews: 20 },
      );

      expect(meetsRequirements).toBe(false);
    });

    it('should check completion_rate criteria', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockArtisan,
        artisanMissions: [
          { status: 'COMPLETED' },
          { status: 'CANCELLED' },
        ],
        completedMissions: 1,
      });

      const meetsRequirements = await (service as any).checkBadgeCriteria(
        'artisan-123',
        { completion_rate: 80 }, // 50% completion rate
      );

      expect(meetsRequirements).toBe(false);
    });

    it('should check years_active criteria', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockArtisan,
        createdAt: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000), // 6 months ago
      });

      const meetsRequirements = await (service as any).checkBadgeCriteria(
        'artisan-123',
        { years_active: 1 },
      );

      expect(meetsRequirements).toBe(false);
    });

    it('should check max_dispute_count criteria', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockArtisan,
        disputeCount: 5, // More than allowed
      });

      const meetsRequirements = await (service as any).checkBadgeCriteria(
        'artisan-123',
        { max_dispute_count: 2 },
      );

      expect(meetsRequirements).toBe(false);
    });
  });
});
