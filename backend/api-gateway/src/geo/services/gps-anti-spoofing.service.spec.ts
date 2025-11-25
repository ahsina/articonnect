import { Test, TestingModule } from '@nestjs/testing';
import { GpsAntiSpoofingService, LocationSubmission } from './gps-anti-spoofing.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';

// Mock axios
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GpsAntiSpoofingService', () => {
  let service: GpsAntiSpoofingService;
  let redisService: RedisService;

  const mockPrismaService = {};

  const mockRedisService = {
    lpush: jest.fn(),
    ltrim: jest.fn(),
    expire: jest.fn(),
    lrange: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        IP_GEOLOCATION_API_URL: 'http://ip-api.com/json',
      };
      return config[key];
    }),
  };

  const validLocation: LocationSubmission = {
    latitude: 49.6116,
    longitude: 6.1319,
    accuracy: 10,
    altitude: 300,
    timestamp: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GpsAntiSpoofingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<GpsAntiSpoofingService>(GpsAntiSpoofingService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateLocation', () => {
    it('should validate legitimate location', async () => {
      mockRedisService.lrange.mockResolvedValue([]);

      const result = await service.validateLocation('user-123', validLocation);

      expect(result.valid).toBe(true);
      expect(result.score).toBeLessThan(50);
    });

    it('should reject invalid latitude', async () => {
      const result = await service.validateLocation('user-123', {
        ...validLocation,
        latitude: 100, // Invalid: > 90
      });

      expect(result.valid).toBe(false);
      expect(result.reasons).toContainEqual(
        expect.stringContaining('Latitude invalide'),
      );
    });

    it('should reject invalid longitude', async () => {
      const result = await service.validateLocation('user-123', {
        ...validLocation,
        longitude: 200, // Invalid: > 180
      });

      expect(result.valid).toBe(false);
      expect(result.reasons).toContainEqual(
        expect.stringContaining('Longitude invalide'),
      );
    });

    it('should reject Null Island coordinates (0, 0)', async () => {
      const result = await service.validateLocation('user-123', {
        latitude: 0,
        longitude: 0,
      });

      expect(result.valid).toBe(false);
      expect(result.reasons).toContainEqual(
        expect.stringContaining('Null Island'),
      );
    });

    it('should reject obvious fake coordinates (1, 1)', async () => {
      mockRedisService.lrange.mockResolvedValue([]);

      const result = await service.validateLocation('user-123', {
        latitude: 1,
        longitude: 1,
      });

      expect(result.valid).toBe(false);
      expect(result.reasons).toContainEqual(
        expect.stringContaining('factices'),
      );
    });

    it('should flag suspiciously perfect GPS accuracy', async () => {
      mockRedisService.lrange.mockResolvedValue([]);

      const result = await service.validateLocation('user-123', {
        ...validLocation,
        accuracy: 0.5, // Too perfect
      });

      expect(result.warnings).toContainEqual(
        expect.stringContaining('Précision GPS parfaite'),
      );
      expect(result.score).toBeGreaterThan(0);
    });

    it('should flag low GPS accuracy', async () => {
      mockRedisService.lrange.mockResolvedValue([]);

      const result = await service.validateLocation('user-123', {
        ...validLocation,
        accuracy: 100, // Poor accuracy
      });

      expect(result.warnings).toContainEqual(
        expect.stringContaining('Précision GPS faible'),
      );
    });

    it('should flag rounded coordinates', async () => {
      mockRedisService.lrange.mockResolvedValue([]);

      const result = await service.validateLocation('user-123', {
        latitude: 49.6, // Only 1 decimal
        longitude: 6.1,
      });

      expect(result.warnings).toContainEqual(
        expect.stringContaining('arrondies'),
      );
    });

    it('should detect impossible speed (teleportation)', async () => {
      const now = Date.now();
      const lastLocation = {
        userId: 'user-123',
        latitude: 49.6116,
        longitude: 6.1319,
        timestamp: new Date(now - 60000), // 1 minute ago
        source: 'validation',
      };
      mockRedisService.lrange.mockResolvedValue([JSON.stringify(lastLocation)]);

      // Paris is ~290km from Luxembourg
      const result = await service.validateLocation('user-123', {
        latitude: 48.8566, // Paris
        longitude: 2.3522,
        timestamp: new Date(now),
      });

      expect(result.reasons).toContainEqual(
        expect.stringContaining('Vitesse impossible'),
      );
    });

    it('should detect teleportation', async () => {
      const now = Date.now();
      const lastLocation = {
        userId: 'user-123',
        latitude: 49.6116,
        longitude: 6.1319,
        timestamp: new Date(now - 60000), // 1 minute ago
        source: 'validation',
      };
      mockRedisService.lrange.mockResolvedValue([JSON.stringify(lastLocation)]);

      // 100km away in 1 minute
      const result = await service.validateLocation('user-123', {
        latitude: 50.5,
        longitude: 6.5,
        timestamp: new Date(now),
      });

      expect(result.reasons).toContainEqual(
        expect.stringContaining('Téléportation'),
      );
    });

    it('should flag too frequent location updates', async () => {
      const now = Date.now();
      const lastLocation = {
        userId: 'user-123',
        latitude: 49.6116,
        longitude: 6.1319,
        timestamp: new Date(now - 5000), // 5 seconds ago
        source: 'validation',
      };
      mockRedisService.lrange.mockResolvedValue([JSON.stringify(lastLocation)]);

      const result = await service.validateLocation('user-123', {
        ...validLocation,
        timestamp: new Date(now),
      });

      expect(result.reasons).toContainEqual(
        expect.stringContaining('trop fréquentes'),
      );
    });

    it('should flag known fake GPS default locations', async () => {
      mockRedisService.lrange.mockResolvedValue([]);

      // San Francisco - common fake GPS default
      const result = await service.validateLocation('user-123', {
        latitude: 37.7749,
        longitude: -122.4194,
      });

      expect(result.warnings).toContainEqual(
        expect.stringContaining('San Francisco'),
      );
    });

    it('should flag unrealistic altitude', async () => {
      mockRedisService.lrange.mockResolvedValue([]);

      const result = await service.validateLocation('user-123', {
        ...validLocation,
        altitude: 10000, // 10km altitude
      });

      expect(result.warnings).toContainEqual(
        expect.stringContaining('Altitude irréaliste'),
      );
    });

    it('should flag rounded altitude', async () => {
      mockRedisService.lrange.mockResolvedValue([]);

      const result = await service.validateLocation('user-123', {
        ...validLocation,
        altitude: 500, // Multiple of 100
      });

      expect(result.warnings).toContainEqual(
        expect.stringContaining('Altitude arrondie'),
      );
    });

    it('should check IP geolocation when provided', async () => {
      mockRedisService.lrange.mockResolvedValue([]);
      mockedAxios.get.mockResolvedValue({
        data: {
          status: 'success',
          lat: 49.6116,
          lon: 6.1319,
        },
      });

      const result = await service.validateLocation('user-123', {
        ...validLocation,
        ipAddress: '203.0.113.1',
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://ip-api.com/json/203.0.113.1',
        { timeout: 3000 },
      );
      expect(result.valid).toBe(true);
    });

    it('should flag GPS far from IP location', async () => {
      mockRedisService.lrange.mockResolvedValue([]);
      mockedAxios.get.mockResolvedValue({
        data: {
          status: 'success',
          lat: 40.7128, // New York
          lon: -74.006,
        },
      });

      const result = await service.validateLocation('user-123', {
        ...validLocation, // Luxembourg
        ipAddress: '203.0.113.1',
      });

      expect(result.warnings).toContainEqual(
        expect.stringContaining('VPN ou spoofing'),
      );
    });

    it('should handle IP geolocation API failure gracefully', async () => {
      mockRedisService.lrange.mockResolvedValue([]);
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await service.validateLocation('user-123', {
        ...validLocation,
        ipAddress: '203.0.113.1',
      });

      // Should not fail, just skip IP check
      expect(result.valid).toBe(true);
    });

    it('should store location in history', async () => {
      mockRedisService.lrange.mockResolvedValue([]);

      await service.validateLocation('user-123', validLocation);

      expect(mockRedisService.lpush).toHaveBeenCalledWith(
        'gps:history:user-123',
        expect.any(String),
      );
      expect(mockRedisService.ltrim).toHaveBeenCalledWith(
        'gps:history:user-123',
        0,
        99,
      );
    });
  });

  describe('getLocationHistory', () => {
    it('should return location history', async () => {
      const history = [
        {
          userId: 'user-123',
          latitude: 49.6116,
          longitude: 6.1319,
          timestamp: new Date().toISOString(),
          source: 'validation',
        },
      ];
      mockRedisService.lrange.mockResolvedValue(
        history.map((h) => JSON.stringify(h)),
      );

      const result = await service.getLocationHistory('user-123', 10);

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-123');
    });

    it('should return empty array for new user', async () => {
      mockRedisService.lrange.mockResolvedValue([]);

      const result = await service.getLocationHistory('new-user');

      expect(result).toEqual([]);
    });
  });

  describe('validateOrThrow', () => {
    it('should not throw for valid location', async () => {
      mockRedisService.lrange.mockResolvedValue([]);

      await expect(
        service.validateOrThrow('user-123', validLocation),
      ).resolves.not.toThrow();
    });

    it('should throw BadRequestException for invalid location', async () => {
      await expect(
        service.validateOrThrow('user-123', {
          latitude: 0,
          longitude: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include reasons in error message', async () => {
      await expect(
        service.validateOrThrow('user-123', {
          latitude: 100, // Invalid
          longitude: 0,
        }),
      ).rejects.toThrow(/Latitude invalide/);
    });
  });

  describe('getStatistics', () => {
    it('should return statistics structure', async () => {
      const result = await service.getStatistics(7);

      expect(result).toHaveProperty('totalValidations');
      expect(result).toHaveProperty('rejectedCount');
      expect(result).toHaveProperty('suspiciousCount');
      expect(result).toHaveProperty('averageScore');
      expect(result).toHaveProperty('topReasons');
    });
  });

  describe('coordinate precision detection', () => {
    it('should detect repeating decimal patterns', async () => {
      mockRedisService.lrange.mockResolvedValue([]);

      const result = await service.validateLocation('user-123', {
        latitude: 49.8888,
        longitude: 6.3333,
      });

      // Should flag repeating patterns
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe('known spoofing patterns', () => {
    it('should detect Paris fake GPS default', async () => {
      mockRedisService.lrange.mockResolvedValue([]);

      const result = await service.validateLocation('user-123', {
        latitude: 48.8566,
        longitude: 2.3522,
      });

      expect(result.warnings).toContainEqual(
        expect.stringContaining('Paris'),
      );
    });

    it('should detect London fake GPS default', async () => {
      mockRedisService.lrange.mockResolvedValue([]);

      const result = await service.validateLocation('user-123', {
        latitude: 51.5074,
        longitude: -0.1278,
      });

      expect(result.warnings).toContainEqual(
        expect.stringContaining('London'),
      );
    });
  });

  describe('velocity validation edge cases', () => {
    it('should allow normal walking speed', async () => {
      const now = Date.now();
      const lastLocation = {
        userId: 'user-123',
        latitude: 49.6116,
        longitude: 6.1319,
        timestamp: new Date(now - 3600000), // 1 hour ago
        source: 'validation',
      };
      mockRedisService.lrange.mockResolvedValue([JSON.stringify(lastLocation)]);

      // Move 5km in 1 hour (walking speed)
      const result = await service.validateLocation('user-123', {
        latitude: 49.65,
        longitude: 6.15,
        timestamp: new Date(now),
      });

      expect(result.valid).toBe(true);
    });

    it('should allow car highway speed', async () => {
      const now = Date.now();
      const lastLocation = {
        userId: 'user-123',
        latitude: 49.6116,
        longitude: 6.1319,
        timestamp: new Date(now - 3600000), // 1 hour ago
        source: 'validation',
      };
      mockRedisService.lrange.mockResolvedValue([JSON.stringify(lastLocation)]);

      // Move 150km in 1 hour (highway speed)
      const result = await service.validateLocation('user-123', {
        latitude: 50.85, // ~140km away
        longitude: 4.35,
        timestamp: new Date(now),
      });

      expect(result.valid).toBe(true);
    });
  });
});
