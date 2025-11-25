import { Test, TestingModule } from '@nestjs/testing';
import { AvailabilityService, TimeSlot, RecurringAvailability } from './availability.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let prismaService: PrismaService;
  let redisService: RedisService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    artisanProfile: {
      update: jest.fn(),
    },
  };

  const mockRedisClient = {
    scan: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    getClient: jest.fn(() => mockRedisClient),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setDailyAvailability', () => {
    const artisanId = 'artisan-123';
    const date = '2024-03-15';
    const slots: TimeSlot[] = [
      { start: '2024-03-15T09:00:00', end: '2024-03-15T12:00:00', available: true },
      { start: '2024-03-15T14:00:00', end: '2024-03-15T18:00:00', available: true },
    ];

    it('should set daily availability for artisan', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: artisanId,
        artisanProfile: { id: 'profile-123' },
      });
      mockRedisService.set.mockResolvedValue('OK');

      await service.setDailyAvailability(artisanId, date, slots);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `availability:${artisanId}:${date}`,
        JSON.stringify(slots),
        86400,
      );
    });

    it('should throw NotFoundException if artisan not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.setDailyAvailability(artisanId, date, slots),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if artisan has no profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: artisanId,
        artisanProfile: null,
      });

      await expect(
        service.setDailyAvailability(artisanId, date, slots),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for overlapping slots', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: artisanId,
        artisanProfile: { id: 'profile-123' },
      });

      const overlappingSlots: TimeSlot[] = [
        { start: '2024-03-15T09:00:00', end: '2024-03-15T12:00:00', available: true },
        { start: '2024-03-15T11:00:00', end: '2024-03-15T14:00:00', available: true },
      ];

      await expect(
        service.setDailyAvailability(artisanId, date, overlappingSlots),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getDailyAvailability', () => {
    const artisanId = 'artisan-123';
    const date = '2024-03-15';

    it('should return cached availability', async () => {
      const cachedSlots: TimeSlot[] = [
        { start: '2024-03-15T09:00:00', end: '2024-03-15T12:00:00', available: true },
      ];
      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedSlots));

      const result = await service.getDailyAvailability(artisanId, date);

      expect(result).toEqual(cachedSlots);
    });

    it('should generate slots from recurring schedule if not cached', async () => {
      mockRedisService.get
        .mockResolvedValueOnce(null) // Daily availability
        .mockResolvedValueOnce(JSON.stringify([
          { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' }, // Friday
        ]));

      // March 15, 2024 is a Friday
      const result = await service.getDailyAvailability(artisanId, date);

      expect(result).toHaveLength(1);
      expect(result[0].available).toBe(true);
    });

    it('should return empty array if no availability set', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.getDailyAvailability(artisanId, date);

      expect(result).toEqual([]);
    });
  });

  describe('getAvailabilityRange', () => {
    const artisanId = 'artisan-123';

    it('should return availability for date range', async () => {
      const slot: TimeSlot = {
        start: '2024-03-15T09:00:00',
        end: '2024-03-15T12:00:00',
        available: true,
      };
      mockRedisService.get.mockResolvedValue(JSON.stringify([slot]));

      const result = await service.getAvailabilityRange(
        artisanId,
        '2024-03-15',
        '2024-03-17',
      );

      expect(result.length).toBe(3);
      expect(result[0].artisanId).toBe(artisanId);
    });

    it('should skip days with no availability', async () => {
      mockRedisService.get
        .mockResolvedValueOnce(JSON.stringify([{ available: true }]))
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify([{ available: true }]));

      const result = await service.getAvailabilityRange(
        artisanId,
        '2024-03-15',
        '2024-03-17',
      );

      expect(result.length).toBe(2);
    });
  });

  describe('bookSlot', () => {
    const artisanId = 'artisan-123';
    const date = '2024-03-15';
    const slotStart = '2024-03-15T09:00:00';
    const missionId = 'mission-123';

    it('should book available slot', async () => {
      const slots: TimeSlot[] = [
        { start: slotStart, end: '2024-03-15T12:00:00', available: true },
      ];
      mockRedisService.get.mockResolvedValue(JSON.stringify(slots));
      mockRedisService.set.mockResolvedValue('OK');

      await service.bookSlot(artisanId, date, slotStart, missionId);

      const setCall = mockRedisService.set.mock.calls[0];
      const updatedSlots = JSON.parse(setCall[1]);
      expect(updatedSlots[0].available).toBe(false);
      expect(updatedSlots[0].bookingId).toBe(missionId);
    });

    it('should throw BadRequestException if slot not available', async () => {
      const slots: TimeSlot[] = [
        { start: slotStart, end: '2024-03-15T12:00:00', available: false },
      ];
      mockRedisService.get.mockResolvedValue(JSON.stringify(slots));

      await expect(
        service.bookSlot(artisanId, date, slotStart, missionId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if slot not found', async () => {
      mockRedisService.get.mockResolvedValue(JSON.stringify([]));

      await expect(
        service.bookSlot(artisanId, date, slotStart, missionId),
      ).rejects.toThrow('Slot not available');
    });
  });

  describe('releaseSlot', () => {
    const artisanId = 'artisan-123';
    const missionId = 'mission-123';

    it('should release booked slot', async () => {
      mockRedisClient.scan
        .mockResolvedValueOnce(['0', [`availability:${artisanId}:2024-03-15`]]);

      const slots: TimeSlot[] = [
        {
          start: '2024-03-15T09:00:00',
          end: '2024-03-15T12:00:00',
          available: false,
          bookingId: missionId,
        },
      ];
      mockRedisService.get.mockResolvedValue(JSON.stringify(slots));
      mockRedisService.set.mockResolvedValue('OK');

      await service.releaseSlot(artisanId, missionId);

      const setCall = mockRedisService.set.mock.calls[0];
      const updatedSlots = JSON.parse(setCall[1]);
      expect(updatedSlots[0].available).toBe(true);
      expect(updatedSlots[0].bookingId).toBeUndefined();
    });
  });

  describe('setRecurringAvailability', () => {
    const artisanId = 'artisan-123';
    const schedule: RecurringAvailability[] = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
    ];

    it('should set recurring availability', async () => {
      mockRedisService.set.mockResolvedValue('OK');

      await service.setRecurringAvailability(artisanId, schedule);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `availability:recurring:${artisanId}`,
        JSON.stringify(schedule),
        0,
      );
    });
  });

  describe('getRecurringAvailability', () => {
    const artisanId = 'artisan-123';

    it('should return recurring availability', async () => {
      const schedule: RecurringAvailability[] = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
      ];
      mockRedisService.get.mockResolvedValue(JSON.stringify(schedule));

      const result = await service.getRecurringAvailability(artisanId);

      expect(result).toEqual(schedule);
    });

    it('should return empty array if no recurring schedule', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.getRecurringAvailability(artisanId);

      expect(result).toEqual([]);
    });
  });

  describe('isAvailableAt', () => {
    const artisanId = 'artisan-123';

    it('should return true if available at time', async () => {
      const slots: TimeSlot[] = [
        { start: '2024-03-15T09:00:00', end: '2024-03-15T12:00:00', available: true },
      ];
      mockRedisService.get.mockResolvedValue(JSON.stringify(slots));

      const result = await service.isAvailableAt(artisanId, '2024-03-15T10:00:00');

      expect(result).toBe(true);
    });

    it('should return false if not available', async () => {
      const slots: TimeSlot[] = [
        { start: '2024-03-15T09:00:00', end: '2024-03-15T12:00:00', available: false },
      ];
      mockRedisService.get.mockResolvedValue(JSON.stringify(slots));

      const result = await service.isAvailableAt(artisanId, '2024-03-15T10:00:00');

      expect(result).toBe(false);
    });

    it('should return false if outside slot times', async () => {
      const slots: TimeSlot[] = [
        { start: '2024-03-15T09:00:00', end: '2024-03-15T12:00:00', available: true },
      ];
      mockRedisService.get.mockResolvedValue(JSON.stringify(slots));

      const result = await service.isAvailableAt(artisanId, '2024-03-15T13:00:00');

      expect(result).toBe(false);
    });
  });

  describe('getNextAvailableSlot', () => {
    const artisanId = 'artisan-123';

    it('should return next available slot', async () => {
      const slot: TimeSlot = {
        start: '2024-03-15T09:00:00',
        end: '2024-03-15T12:00:00',
        available: true,
      };
      mockRedisService.get.mockResolvedValue(JSON.stringify([slot]));

      const result = await service.getNextAvailableSlot(artisanId, '2024-03-15');

      expect(result).toEqual(slot);
    });

    it('should return null if no available slots in 30 days', async () => {
      mockRedisService.get.mockResolvedValue(JSON.stringify([]));

      const result = await service.getNextAvailableSlot(artisanId, '2024-03-15');

      expect(result).toBeNull();
    });

    it('should skip booked slots', async () => {
      const bookedSlot: TimeSlot = {
        start: '2024-03-15T09:00:00',
        end: '2024-03-15T12:00:00',
        available: false,
      };
      const availableSlot: TimeSlot = {
        start: '2024-03-15T14:00:00',
        end: '2024-03-15T17:00:00',
        available: true,
      };
      mockRedisService.get.mockResolvedValue(JSON.stringify([bookedSlot, availableSlot]));

      const result = await service.getNextAvailableSlot(artisanId, '2024-03-15');

      expect(result).toEqual(availableSlot);
    });
  });

  describe('setGeneralAvailability', () => {
    it('should update artisan general availability', async () => {
      mockPrismaService.artisanProfile.update.mockResolvedValue({});

      await service.setGeneralAvailability('artisan-123', true);

      expect(mockPrismaService.artisanProfile.update).toHaveBeenCalledWith({
        where: { userId: 'artisan-123' },
        data: { available: true },
      });
    });
  });

  describe('clearAllAvailability', () => {
    it('should clear all availability keys for artisan', async () => {
      mockRedisClient.scan.mockResolvedValue(['0', ['key1', 'key2']]);
      mockRedisService.del.mockResolvedValue(1);

      await service.clearAllAvailability('artisan-123');

      expect(mockRedisService.del).toHaveBeenCalledTimes(2);
    });
  });
});
