import { Test, TestingModule } from '@nestjs/testing';
import { AdvancedGeoService } from './advanced-geo.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { UserRole } from '@prisma/client';

describe('AdvancedGeoService', () => {
  let service: AdvancedGeoService;
  let prismaService: PrismaService;
  let redisService: RedisService;

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
    },
    artisanProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    mission: {
      findMany: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const luxembourgCenter = { latitude: 49.6116, longitude: 6.1319 };
  const parisCenter = { latitude: 48.8566, longitude: 2.3522 };

  const mockArtisan = {
    id: 'artisan-123',
    firstName: 'Pierre',
    lastName: 'Artisan',
    role: UserRole.ARTISAN,
    artisanProfile: {
      latitude: 49.62,
      longitude: 6.14,
      companyName: 'Pierre Plomberie',
      rating: 4.5,
      missionCount: 50,
      available: true,
      specialties: [{ name: 'plumbing' }],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvancedGeoService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<AdvancedGeoService>(AdvancedGeoService);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const distance = service.calculateDistance(luxembourgCenter, parisCenter);

      // Luxembourg to Paris is approximately 290 km
      expect(distance).toBeGreaterThan(280);
      expect(distance).toBeLessThan(300);
    });

    it('should return 0 for same location', () => {
      const distance = service.calculateDistance(luxembourgCenter, luxembourgCenter);

      expect(distance).toBe(0);
    });

    it('should handle antipodal points', () => {
      const point1 = { latitude: 0, longitude: 0 };
      const point2 = { latitude: 0, longitude: 180 };

      const distance = service.calculateDistance(point1, point2);

      // Half the Earth's circumference is about 20,000 km
      expect(distance).toBeGreaterThan(19000);
      expect(distance).toBeLessThan(21000);
    });
  });

  describe('generateGeohash', () => {
    it('should generate geohash of specified precision', () => {
      const geohash = service.generateGeohash(luxembourgCenter, 6);

      expect(geohash).toHaveLength(6);
    });

    it('should generate consistent geohash for same location', () => {
      const hash1 = service.generateGeohash(luxembourgCenter, 8);
      const hash2 = service.generateGeohash(luxembourgCenter, 8);

      expect(hash1).toBe(hash2);
    });

    it('should generate different geohashes for distant locations', () => {
      const hash1 = service.generateGeohash(luxembourgCenter, 6);
      const hash2 = service.generateGeohash(parisCenter, 6);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('getBoundingBox', () => {
    it('should calculate bounding box for radius', () => {
      const bbox = service.getBoundingBox(luxembourgCenter, 10);

      expect(bbox.minLat).toBeLessThan(luxembourgCenter.latitude);
      expect(bbox.maxLat).toBeGreaterThan(luxembourgCenter.latitude);
      expect(bbox.minLon).toBeLessThan(luxembourgCenter.longitude);
      expect(bbox.maxLon).toBeGreaterThan(luxembourgCenter.longitude);
    });

    it('should expand correctly with larger radius', () => {
      const smallBox = service.getBoundingBox(luxembourgCenter, 5);
      const largeBox = service.getBoundingBox(luxembourgCenter, 20);

      expect(largeBox.maxLat - largeBox.minLat).toBeGreaterThan(
        smallBox.maxLat - smallBox.minLat,
      );
    });
  });

  describe('findNearbyArtisans', () => {
    it('should return cached results if available', async () => {
      mockRedisService.get.mockResolvedValue(JSON.stringify([mockArtisan]));

      const result = await service.findNearbyArtisans({
        center: luxembourgCenter,
        radiusKm: 10,
      });

      expect(result).toHaveLength(1);
      expect(mockPrismaService.user.findMany).not.toHaveBeenCalled();
    });

    it('should query database if cache miss', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue([mockArtisan]);

      const result = await service.findNearbyArtisans({
        center: luxembourgCenter,
        radiusKm: 10,
      });

      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should filter by minimum rating', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue([mockArtisan]);

      await service.findNearbyArtisans({
        center: luxembourgCenter,
        radiusKm: 10,
        minRating: 4.0,
      });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            artisanProfile: expect.objectContaining({
              rating: { gte: 4.0 },
            }),
          }),
        }),
      );
    });

    it('should filter artisans outside radius', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          ...mockArtisan,
          artisanProfile: {
            ...mockArtisan.artisanProfile,
            latitude: 50.0, // Far from Luxembourg
            longitude: 8.0,
          },
        },
      ]);

      const result = await service.findNearbyArtisans({
        center: luxembourgCenter,
        radiusKm: 5,
      });

      expect(result).toHaveLength(0);
    });

    it('should filter by categories', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue([mockArtisan]);

      const result = await service.findNearbyArtisans({
        center: luxembourgCenter,
        radiusKm: 10,
        categories: ['electrical'],
      });

      // Should exclude plumbing specialist
      expect(result).toHaveLength(0);
    });

    it('should sort results by distance', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          ...mockArtisan,
          id: 'far',
          artisanProfile: {
            ...mockArtisan.artisanProfile,
            latitude: 49.65,
            longitude: 6.2,
          },
        },
        {
          ...mockArtisan,
          id: 'near',
          artisanProfile: {
            ...mockArtisan.artisanProfile,
            latitude: 49.612,
            longitude: 6.132,
          },
        },
      ]);

      const result = await service.findNearbyArtisans({
        center: luxembourgCenter,
        radiusKm: 10,
      });

      expect(result[0].id).toBe('near');
    });
  });

  describe('findNearbyMissions', () => {
    const mockMission = {
      id: 'mission-123',
      title: 'Fix sink',
      category: 'plumbing',
      latitude: 49.62,
      longitude: 6.14,
      clientBudget: 150,
      agreedPrice: null,
    };

    it('should return cached results if available', async () => {
      mockRedisService.get.mockResolvedValue(JSON.stringify([mockMission]));

      const result = await service.findNearbyMissions(luxembourgCenter, 10);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.mission.findMany).not.toHaveBeenCalled();
    });

    it('should query database if cache miss', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.mission.findMany.mockResolvedValue([mockMission]);

      const result = await service.findNearbyMissions(luxembourgCenter, 10);

      expect(mockPrismaService.mission.findMany).toHaveBeenCalled();
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should filter by categories', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.mission.findMany.mockResolvedValue([mockMission]);

      await service.findNearbyMissions(luxembourgCenter, 10, ['electrical']);

      expect(mockPrismaService.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: { in: ['electrical'] },
          }),
        }),
      );
    });
  });

  describe('updateArtisanLocation', () => {
    it('should update location in database', async () => {
      await service.updateArtisanLocation('artisan-123', luxembourgCenter);

      expect(mockPrismaService.artisanProfile.update).toHaveBeenCalledWith({
        where: { userId: 'artisan-123' },
        data: expect.objectContaining({
          currentLat: luxembourgCenter.latitude,
          currentLng: luxembourgCenter.longitude,
        }),
      });
    });

    it('should cache location in Redis', async () => {
      await service.updateArtisanLocation('artisan-123', luxembourgCenter);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        'geo:artisan:artisan-123:location',
        expect.any(String),
        3600,
      );
    });
  });

  describe('getArtisanLocation', () => {
    it('should return cached location if available', async () => {
      const cachedLocation = { ...luxembourgCenter, geohash: 'u0kj5n' };
      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedLocation));

      const result = await service.getArtisanLocation('artisan-123');

      expect(result).toEqual(cachedLocation);
      expect(mockPrismaService.artisanProfile.findUnique).not.toHaveBeenCalled();
    });

    it('should query database if cache miss', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.artisanProfile.findUnique.mockResolvedValue({
        currentLat: luxembourgCenter.latitude,
        currentLng: luxembourgCenter.longitude,
      });

      const result = await service.getArtisanLocation('artisan-123');

      expect(result).toBeDefined();
      expect(result?.latitude).toBe(luxembourgCenter.latitude);
      expect(result?.geohash).toBeDefined();
    });

    it('should return null if location not found', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.artisanProfile.findUnique.mockResolvedValue(null);

      const result = await service.getArtisanLocation('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getOptimalRoute', () => {
    it('should return empty for no waypoints', async () => {
      const result = await service.getOptimalRoute(luxembourgCenter, []);

      expect(result.totalDistance).toBe(0);
      expect(result.orderedWaypoints).toHaveLength(0);
    });

    it('should return single waypoint unchanged', async () => {
      const waypoint = { latitude: 49.62, longitude: 6.14 };
      const result = await service.getOptimalRoute(luxembourgCenter, [waypoint]);

      expect(result.orderedWaypoints).toHaveLength(1);
      expect(result.totalDistance).toBeGreaterThan(0);
    });

    it('should optimize route for multiple waypoints', async () => {
      const waypoints = [
        { latitude: 49.65, longitude: 6.2 }, // Far
        { latitude: 49.612, longitude: 6.132 }, // Near
        { latitude: 49.63, longitude: 6.15 }, // Medium
      ];

      const result = await service.getOptimalRoute(luxembourgCenter, waypoints);

      expect(result.orderedWaypoints).toHaveLength(3);
      // First waypoint should be nearest
      expect(result.orderedWaypoints[0].latitude).toBe(49.612);
    });

    it('should calculate total distance', async () => {
      const waypoints = [
        { latitude: 49.62, longitude: 6.14 },
        { latitude: 49.63, longitude: 6.15 },
      ];

      const result = await service.getOptimalRoute(luxembourgCenter, waypoints);

      expect(result.totalDistance).toBeGreaterThan(0);
    });
  });

  describe('clearLocationCache', () => {
    it('should clear specific artisan cache', async () => {
      await service.clearLocationCache('artisan-123');

      expect(mockRedisService.del).toHaveBeenCalledWith(
        'geo:artisan:artisan-123:location',
      );
    });

    it('should not delete if no artisanId provided', async () => {
      await service.clearLocationCache();

      expect(mockRedisService.del).not.toHaveBeenCalled();
    });
  });
});
