import { Test, TestingModule } from '@nestjs/testing';
import { GeoService } from './geo.service';
import { RedisService } from '../../common/redis/redis.service';

describe('GeoService', () => {
  let service: GeoService;
  let redisService: RedisService;

  const mockRedisClient = {
    geoadd: jest.fn(),
    georadius: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn().mockReturnValue(mockRedisClient),
  };

  beforeEach(async () => {
    // Reset Redis mock before each test
    mockRedisService.getClient.mockReturnValue(mockRedisClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeoService,
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<GeoService>(GeoService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateArtisanLocation', () => {
    it('should update artisan location in Redis', async () => {
      const artisanId = 'artisan-123';
      const lat = 49.6116;
      const lng = 6.1319;

      mockRedisClient.geoadd.mockResolvedValue(1);

      const result = await service.updateArtisanLocation(artisanId, lat, lng);

      expect(mockRedisClient.geoadd).toHaveBeenCalledWith(
        'artisans:locations',
        lng,
        lat,
        artisanId,
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('fuzzCoordinates', () => {
    it('should return fuzzed coordinates within radius', () => {
      const lat = 49.6116;
      const lng = 6.1319;

      const result = service.fuzzCoordinates(lat, lng);

      expect(result).toHaveProperty('latitude');
      expect(result).toHaveProperty('longitude');
      expect(typeof result.latitude).toBe('number');
      expect(typeof result.longitude).toBe('number');

      // Check the fuzzed coordinates are within reasonable range
      expect(Math.abs(result.latitude - lat)).toBeLessThan(0.01); // ~1km max
      expect(Math.abs(result.longitude - lng)).toBeLessThan(0.01);
    });

    it('should return different coordinates each time (randomness)', () => {
      const lat = 49.6116;
      const lng = 6.1319;

      const results = new Set();
      for (let i = 0; i < 10; i++) {
        const result = service.fuzzCoordinates(lat, lng);
        results.add(`${result.latitude},${result.longitude}`);
      }

      // With randomness, we should get different values
      expect(results.size).toBeGreaterThan(1);
    });

    it('should round to 5 decimal places', () => {
      const lat = 49.6116;
      const lng = 6.1319;

      const result = service.fuzzCoordinates(lat, lng);

      const latDecimals = result.latitude.toString().split('.')[1]?.length || 0;
      const lngDecimals = result.longitude.toString().split('.')[1]?.length || 0;

      expect(latDecimals).toBeLessThanOrEqual(5);
      expect(lngDecimals).toBeLessThanOrEqual(5);
    });
  });

  describe('getPublicLocation', () => {
    it('should return fuzzed location with isFuzzed flag', async () => {
      const userId = 'user-123';
      const lat = 49.6116;
      const lng = 6.1319;

      const result = await service.getPublicLocation(userId, lat, lng);

      expect(result).toHaveProperty('latitude');
      expect(result).toHaveProperty('longitude');
      expect(result.isFuzzed).toBe(true);
    });
  });

  describe('findNearbyArtisans', () => {
    it('should find artisans within radius', async () => {
      const lat = 49.6116;
      const lng = 6.1319;
      const radiusKm = 20;

      mockRedisClient.georadius.mockResolvedValue([
        ['artisan-1', '2.5'],
        ['artisan-2', '5.8'],
        ['artisan-3', '15.2'],
      ]);

      const result = await service.findNearbyArtisans(lat, lng, radiusKm);

      expect(mockRedisClient.georadius).toHaveBeenCalledWith(
        'artisans:locations',
        lng,
        lat,
        radiusKm,
        'km',
        'WITHDIST',
        'ASC',
      );

      expect(result).toEqual([
        { artisanId: 'artisan-1', distance: 2.5 },
        { artisanId: 'artisan-2', distance: 5.8 },
        { artisanId: 'artisan-3', distance: 15.2 },
      ]);
    });

    it('should use default radius of 20km', async () => {
      const lat = 49.6116;
      const lng = 6.1319;

      mockRedisClient.georadius.mockResolvedValue([]);

      await service.findNearbyArtisans(lat, lng);

      expect(mockRedisClient.georadius).toHaveBeenCalledWith(
        'artisans:locations',
        lng,
        lat,
        20,
        'km',
        'WITHDIST',
        'ASC',
      );
    });

    it('should return empty array when no artisans found', async () => {
      mockRedisClient.georadius.mockResolvedValue([]);

      const result = await service.findNearbyArtisans(49.6116, 6.1319, 5);

      expect(result).toEqual([]);
    });
  });

  describe('geocodeAddress', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      global.fetch = jest.fn();
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return default Luxembourg coordinates when API key not configured', async () => {
      delete process.env.GOOGLE_MAPS_API_KEY;

      const result = await service.geocodeAddress('123 Main St', 'Luxembourg', '1234', 'LU');

      expect(result).toEqual({
        latitude: 49.6116,
        longitude: 6.1319,
        formattedAddress: '123 Main St',
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should geocode address successfully', async () => {
      process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';

      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({
          status: 'OK',
          results: [
            {
              geometry: {
                location: { lat: 49.611, lng: 6.132 },
              },
              formatted_address: '123 Main St, Luxembourg',
            },
          ],
        }),
      });

      const result = await service.geocodeAddress('123 Main St', 'Luxembourg', '1234', 'LU');

      expect(result).toEqual({
        latitude: 49.611,
        longitude: 6.132,
        formattedAddress: '123 Main St, Luxembourg',
      });
    });

    it('should return default coordinates when geocoding fails', async () => {
      process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';

      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({
          status: 'ZERO_RESULTS',
          results: [],
        }),
      });

      const result = await service.geocodeAddress('Invalid Address');

      expect(result.latitude).toBe(49.6116);
      expect(result.longitude).toBe(6.1319);
    });

    it('should handle fetch errors gracefully', async () => {
      process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await service.geocodeAddress('123 Main St');

      expect(result.latitude).toBe(49.6116);
      expect(result.longitude).toBe(6.1319);
    });
  });

  describe('reverseGeocode', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      global.fetch = jest.fn();
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return default values when API key not configured', async () => {
      delete process.env.GOOGLE_MAPS_API_KEY;

      const result = await service.reverseGeocode(49.6116, 6.1319);

      expect(result).toEqual({
        address: '',
        city: 'Luxembourg',
        postalCode: '',
        country: 'LU',
      });
    });

    it('should reverse geocode successfully', async () => {
      process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';

      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({
          status: 'OK',
          results: [
            {
              formatted_address: '123 Main St, Luxembourg',
              address_components: [
                { types: ['locality'], long_name: 'Luxembourg City' },
                { types: ['postal_code'], long_name: '1234' },
                { types: ['country'], short_name: 'LU' },
              ],
            },
          ],
        }),
      });

      const result = await service.reverseGeocode(49.6116, 6.1319);

      expect(result).toEqual({
        address: '123 Main St, Luxembourg',
        city: 'Luxembourg City',
        postalCode: '1234',
        country: 'LU',
      });
    });

    it('should return default values when reverse geocoding fails', async () => {
      process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';

      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({
          status: 'ZERO_RESULTS',
          results: [],
        }),
      });

      const result = await service.reverseGeocode(0, 0);

      expect(result.city).toBe('Luxembourg');
      expect(result.country).toBe('LU');
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two coordinates', () => {
      // Luxembourg City to Esch-sur-Alzette (approximately 16km)
      const lat1 = 49.6116;
      const lon1 = 6.1319;
      const lat2 = 49.4969;
      const lon2 = 5.9806;

      const distance = service.calculateDistance(lat1, lon1, lat2, lon2);

      // Should be approximately 16-17km
      expect(distance).toBeGreaterThan(15);
      expect(distance).toBeLessThan(20);
    });

    it('should return 0 for same coordinates', () => {
      const lat = 49.6116;
      const lon = 6.1319;

      const distance = service.calculateDistance(lat, lon, lat, lon);

      expect(distance).toBe(0);
    });

    it('should calculate distance accurately for known distances', () => {
      // Paris to London (approximately 343km)
      const distance = service.calculateDistance(
        48.8566,
        2.3522,
        51.5074,
        -0.1278,
      );

      // Should be approximately 340-350km
      expect(distance).toBeGreaterThan(330);
      expect(distance).toBeLessThan(360);
    });
  });
});
