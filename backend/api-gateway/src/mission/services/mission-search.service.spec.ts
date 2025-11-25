import { Test, TestingModule } from '@nestjs/testing';
import { MissionSearchService } from './mission-search.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MissionStatus } from '@prisma/client';

describe('MissionSearchService', () => {
  let service: MissionSearchService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    mission: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockMission = {
    id: 'mission-123',
    title: 'Fix plumbing',
    description: 'Fix kitchen sink leak',
    category: 'plumbing',
    city: 'Luxembourg',
    status: MissionStatus.PENDING,
    clientBudget: 200,
    scheduledFor: new Date('2025-02-01T10:00:00Z'),
    createdAt: new Date(),
    clientId: 'client-123',
    artisanId: null,
    client: {
      id: 'client-123',
      firstName: 'John',
      lastName: 'Client',
      email: 'client@example.com',
      avatar: null,
    },
    artisan: null,
    address: {
      latitude: 49.6116,
      longitude: 6.1319,
    },
  };

  const mockArtisan = {
    id: 'artisan-123',
    firstName: 'Pierre',
    lastName: 'Artisan',
    artisanProfile: {
      id: 'profile-123',
      specialties: [
        { category: 'plumbing' },
        { category: 'electrical' },
      ],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionSearchService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MissionSearchService>(MissionSearchService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchMissions', () => {
    it('should return paginated missions', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([mockMission]);
      mockPrismaService.mission.count.mockResolvedValue(1);

      const result = await service.searchMissions({});

      expect(result.missions).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by text query', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([mockMission]);
      mockPrismaService.mission.count.mockResolvedValue(1);

      await service.searchMissions({ query: 'plumbing' });

      expect(mockPrismaService.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'plumbing', mode: 'insensitive' } },
              { description: { contains: 'plumbing', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should filter by category', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([mockMission]);
      mockPrismaService.mission.count.mockResolvedValue(1);

      await service.searchMissions({ category: 'plumbing' });

      expect(mockPrismaService.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'plumbing',
          }),
        }),
      );
    });

    it('should filter by multiple categories', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([mockMission]);
      mockPrismaService.mission.count.mockResolvedValue(1);

      await service.searchMissions({ categories: ['plumbing', 'electrical'] });

      expect(mockPrismaService.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: { in: ['plumbing', 'electrical'] },
          }),
        }),
      );
    });

    it('should filter by city', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([mockMission]);
      mockPrismaService.mission.count.mockResolvedValue(1);

      await service.searchMissions({ city: 'Luxembourg' });

      expect(mockPrismaService.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            city: 'Luxembourg',
          }),
        }),
      );
    });

    it('should filter by budget range', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([mockMission]);
      mockPrismaService.mission.count.mockResolvedValue(1);

      await service.searchMissions({ minBudget: 100, maxBudget: 300 });

      expect(mockPrismaService.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clientBudget: { gte: 100, lte: 300 },
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([mockMission]);
      mockPrismaService.mission.count.mockResolvedValue(1);

      await service.searchMissions({ status: MissionStatus.PENDING });

      expect(mockPrismaService.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: MissionStatus.PENDING,
          }),
        }),
      );
    });

    it('should filter by multiple statuses', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([mockMission]);
      mockPrismaService.mission.count.mockResolvedValue(1);

      await service.searchMissions({
        statuses: [MissionStatus.PENDING, MissionStatus.ACCEPTED],
      });

      expect(mockPrismaService.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [MissionStatus.PENDING, MissionStatus.ACCEPTED] },
          }),
        }),
      );
    });

    it('should filter by scheduled date range', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([mockMission]);
      mockPrismaService.mission.count.mockResolvedValue(1);

      const from = new Date('2025-01-01');
      const to = new Date('2025-12-31');

      await service.searchMissions({ scheduledFrom: from, scheduledTo: to });

      expect(mockPrismaService.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            scheduledFor: { gte: from, lte: to },
          }),
        }),
      );
    });

    it('should filter by clientId', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([mockMission]);
      mockPrismaService.mission.count.mockResolvedValue(1);

      await service.searchMissions({ clientId: 'client-123' });

      expect(mockPrismaService.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clientId: 'client-123',
          }),
        }),
      );
    });

    it('should filter by artisanId', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([mockMission]);
      mockPrismaService.mission.count.mockResolvedValue(1);

      await service.searchMissions({ artisanId: 'artisan-123' });

      expect(mockPrismaService.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            artisanId: 'artisan-123',
          }),
        }),
      );
    });

    it('should sort by createdAt', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([mockMission]);
      mockPrismaService.mission.count.mockResolvedValue(1);

      await service.searchMissions({ sortBy: 'createdAt', sortOrder: 'asc' });

      expect(mockPrismaService.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        }),
      );
    });

    it('should sort by clientBudget', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([mockMission]);
      mockPrismaService.mission.count.mockResolvedValue(1);

      await service.searchMissions({ sortBy: 'clientBudget', sortOrder: 'desc' });

      expect(mockPrismaService.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { clientBudget: 'desc' },
        }),
      );
    });

    it('should calculate distances when coordinates provided', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([mockMission]);
      mockPrismaService.mission.count.mockResolvedValue(1);

      const result = await service.searchMissions({
        latitude: 49.6,
        longitude: 6.1,
      });

      // Distance should be calculated
      expect(result.missions[0]).toBeDefined();
    });

    it('should sort by distance when requested', async () => {
      const missions = [
        { ...mockMission, id: 'far', address: { latitude: 50.0, longitude: 7.0 } },
        { ...mockMission, id: 'near', address: { latitude: 49.62, longitude: 6.14 } },
      ];
      mockPrismaService.mission.findMany.mockResolvedValue(missions);
      mockPrismaService.mission.count.mockResolvedValue(2);

      const result = await service.searchMissions({
        latitude: 49.6,
        longitude: 6.1,
        sortBy: 'distance',
        sortOrder: 'asc',
      });

      // Nearer mission should come first
      expect(result.missions[0].id).toBe('near');
    });

    it('should handle pagination correctly', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([mockMission]);
      mockPrismaService.mission.count.mockResolvedValue(100);

      const result = await service.searchMissions({ page: 3, limit: 10 });

      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(10);
      expect(mockPrismaService.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });
  });

  describe('getRecommendationsForArtisan', () => {
    it('should return empty array if artisan not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.getRecommendationsForArtisan('nonexistent');

      expect(result).toEqual([]);
    });

    it('should return empty array if no artisan profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'artisan-123',
        artisanProfile: null,
      });

      const result = await service.getRecommendationsForArtisan('artisan-123');

      expect(result).toEqual([]);
    });

    it('should return missions matching artisan specialties', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockArtisan);
      mockPrismaService.mission.findMany.mockResolvedValue([mockMission]);

      const result = await service.getRecommendationsForArtisan('artisan-123', 5);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: MissionStatus.PENDING,
            category: { in: ['plumbing', 'electrical'] },
          }),
          take: 5,
        }),
      );
    });

    it('should use default limit of 10', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockArtisan);
      mockPrismaService.mission.findMany.mockResolvedValue([]);

      await service.getRecommendationsForArtisan('artisan-123');

      expect(mockPrismaService.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });
  });

  describe('getSimilarMissions', () => {
    it('should return empty array if mission not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      const result = await service.getSimilarMissions('nonexistent');

      expect(result).toEqual([]);
    });

    it('should return similar missions by category or city', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.mission.findMany.mockResolvedValue([
        { ...mockMission, id: 'similar-1' },
        { ...mockMission, id: 'similar-2' },
      ]);

      const result = await service.getSimilarMissions('mission-123', 5);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: { not: 'mission-123' },
            status: MissionStatus.PENDING,
            OR: [
              { category: 'plumbing' },
              { city: 'Luxembourg' },
            ],
          },
          take: 5,
        }),
      );
    });

    it('should exclude the reference mission', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.mission.findMany.mockResolvedValue([]);

      await service.getSimilarMissions('mission-123');

      expect(mockPrismaService.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { not: 'mission-123' },
          }),
        }),
      );
    });

    it('should use default limit of 5', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.mission.findMany.mockResolvedValue([]);

      await service.getSimilarMissions('mission-123');

      expect(mockPrismaService.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });
  });
});
