import { Test, TestingModule } from '@nestjs/testing';
import { CalendarService } from './calendar.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DayOfWeek, TimeOffStatus } from '@prisma/client';

describe('CalendarService', () => {
  let service: CalendarService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    artisanProfile: {
      findUnique: jest.fn(),
    },
    workingHours: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    availabilitySlot: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    timeOff: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    recurringUnavailability: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockArtisan = {
    id: 'artisan-123',
    userId: 'user-123',
    companyName: 'Test Artisan',
  };

  const mockWorkingHours = {
    id: 'wh-123',
    artisanId: 'artisan-123',
    dayOfWeek: DayOfWeek.MONDAY,
    startTime: '09:00',
    endTime: '17:00',
    isActive: true,
  };

  const mockAvailabilitySlot = {
    id: 'slot-123',
    artisanId: 'artisan-123',
    startTime: new Date('2025-01-15T10:00:00Z'),
    endTime: new Date('2025-01-15T12:00:00Z'),
    isBooked: false,
    missionId: null,
  };

  const mockTimeOff = {
    id: 'timeoff-123',
    artisanId: 'artisan-123',
    type: 'VACATION',
    startDate: new Date('2025-02-01'),
    endDate: new Date('2025-02-15'),
    reason: 'Annual leave',
    status: TimeOffStatus.PENDING,
  };

  const mockRecurringUnavailability = {
    id: 'recurring-123',
    artisanId: 'artisan-123',
    title: 'Weekly meeting',
    pattern: 'WEEKLY',
    dayOfWeek: DayOfWeek.FRIDAY,
    startTime: '14:00',
    endTime: '15:00',
    startDate: new Date('2025-01-01'),
    endDate: null,
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setWorkingHours', () => {
    const createDto = {
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '09:00',
      endTime: '17:00',
      isActive: true,
    };

    it('should create new working hours', async () => {
      mockPrismaService.artisanProfile.findUnique.mockResolvedValue(mockArtisan);
      mockPrismaService.workingHours.findUnique.mockResolvedValue(null);
      mockPrismaService.workingHours.create.mockResolvedValue(mockWorkingHours);

      const result = await service.setWorkingHours('artisan-123', createDto);

      expect(result).toEqual(mockWorkingHours);
      expect(mockPrismaService.workingHours.create).toHaveBeenCalled();
    });

    it('should update existing working hours', async () => {
      mockPrismaService.artisanProfile.findUnique.mockResolvedValue(mockArtisan);
      mockPrismaService.workingHours.findUnique.mockResolvedValue(mockWorkingHours);
      mockPrismaService.workingHours.update.mockResolvedValue(mockWorkingHours);

      const result = await service.setWorkingHours('artisan-123', createDto);

      expect(result).toEqual(mockWorkingHours);
      expect(mockPrismaService.workingHours.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if artisan not found', async () => {
      mockPrismaService.artisanProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.setWorkingHours('nonexistent', createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if end time before start time', async () => {
      mockPrismaService.artisanProfile.findUnique.mockResolvedValue(mockArtisan);

      await expect(
        service.setWorkingHours('artisan-123', {
          ...createDto,
          startTime: '17:00',
          endTime: '09:00',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getWorkingHours', () => {
    it('should return all working hours for artisan', async () => {
      mockPrismaService.workingHours.findMany.mockResolvedValue([mockWorkingHours]);

      const result = await service.getWorkingHours('artisan-123');

      expect(result).toEqual([mockWorkingHours]);
      expect(mockPrismaService.workingHours.findMany).toHaveBeenCalledWith({
        where: { artisanId: 'artisan-123' },
        orderBy: { dayOfWeek: 'asc' },
      });
    });
  });

  describe('updateWorkingHours', () => {
    it('should update working hours', async () => {
      mockPrismaService.workingHours.findUnique.mockResolvedValue(mockWorkingHours);
      mockPrismaService.workingHours.update.mockResolvedValue({
        ...mockWorkingHours,
        startTime: '10:00',
      });

      const result = await service.updateWorkingHours('artisan-123', 'wh-123', {
        startTime: '10:00',
      });

      expect(result.startTime).toBe('10:00');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.workingHours.findUnique.mockResolvedValue(null);

      await expect(
        service.updateWorkingHours('artisan-123', 'nonexistent', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.workingHours.findUnique.mockResolvedValue({
        ...mockWorkingHours,
        artisanId: 'other-artisan',
      });

      await expect(
        service.updateWorkingHours('artisan-123', 'wh-123', {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteWorkingHours', () => {
    it('should delete working hours', async () => {
      mockPrismaService.workingHours.findUnique.mockResolvedValue(mockWorkingHours);
      mockPrismaService.workingHours.delete.mockResolvedValue(mockWorkingHours);

      const result = await service.deleteWorkingHours('artisan-123', 'wh-123');

      expect(result).toEqual(mockWorkingHours);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.workingHours.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteWorkingHours('artisan-123', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.workingHours.findUnique.mockResolvedValue({
        ...mockWorkingHours,
        artisanId: 'other-artisan',
      });

      await expect(
        service.deleteWorkingHours('artisan-123', 'wh-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createAvailabilitySlot', () => {
    const createDto = {
      startTime: '2025-01-15T10:00:00Z',
      endTime: '2025-01-15T12:00:00Z',
    };

    it('should create availability slot', async () => {
      mockPrismaService.artisanProfile.findUnique.mockResolvedValue(mockArtisan);
      mockPrismaService.availabilitySlot.findFirst.mockResolvedValue(null);
      mockPrismaService.availabilitySlot.create.mockResolvedValue(mockAvailabilitySlot);

      const result = await service.createAvailabilitySlot('artisan-123', createDto);

      expect(result).toEqual(mockAvailabilitySlot);
    });

    it('should throw BadRequestException if end before start', async () => {
      mockPrismaService.artisanProfile.findUnique.mockResolvedValue(mockArtisan);

      await expect(
        service.createAvailabilitySlot('artisan-123', {
          startTime: '2025-01-15T12:00:00Z',
          endTime: '2025-01-15T10:00:00Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if overlapping slot exists', async () => {
      mockPrismaService.artisanProfile.findUnique.mockResolvedValue(mockArtisan);
      mockPrismaService.availabilitySlot.findFirst.mockResolvedValue(mockAvailabilitySlot);

      await expect(
        service.createAvailabilitySlot('artisan-123', createDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAvailabilitySlots', () => {
    it('should return slots for date range', async () => {
      mockPrismaService.availabilitySlot.findMany.mockResolvedValue([mockAvailabilitySlot]);

      const result = await service.getAvailabilitySlots({
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        artisanId: 'artisan-123',
      });

      expect(result).toEqual([mockAvailabilitySlot]);
    });
  });

  describe('bookAvailabilitySlot', () => {
    it('should book a slot', async () => {
      mockPrismaService.availabilitySlot.findUnique.mockResolvedValue(mockAvailabilitySlot);
      mockPrismaService.availabilitySlot.update.mockResolvedValue({
        ...mockAvailabilitySlot,
        isBooked: true,
        missionId: 'mission-123',
      });

      const result = await service.bookAvailabilitySlot('slot-123', {
        missionId: 'mission-123',
      });

      expect(result.isBooked).toBe(true);
    });

    it('should throw NotFoundException if slot not found', async () => {
      mockPrismaService.availabilitySlot.findUnique.mockResolvedValue(null);

      await expect(
        service.bookAvailabilitySlot('nonexistent', { missionId: 'mission-123' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already booked', async () => {
      mockPrismaService.availabilitySlot.findUnique.mockResolvedValue({
        ...mockAvailabilitySlot,
        isBooked: true,
      });

      await expect(
        service.bookAvailabilitySlot('slot-123', { missionId: 'mission-123' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelAvailabilitySlot', () => {
    it('should cancel a booked slot', async () => {
      mockPrismaService.availabilitySlot.findUnique.mockResolvedValue({
        ...mockAvailabilitySlot,
        isBooked: true,
      });
      mockPrismaService.availabilitySlot.update.mockResolvedValue(mockAvailabilitySlot);

      const result = await service.cancelAvailabilitySlot('artisan-123', 'slot-123');

      expect(result.isBooked).toBe(false);
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.availabilitySlot.findUnique.mockResolvedValue({
        ...mockAvailabilitySlot,
        artisanId: 'other-artisan',
      });

      await expect(
        service.cancelAvailabilitySlot('artisan-123', 'slot-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteAvailabilitySlot', () => {
    it('should delete unbooked slot', async () => {
      mockPrismaService.availabilitySlot.findUnique.mockResolvedValue(mockAvailabilitySlot);
      mockPrismaService.availabilitySlot.delete.mockResolvedValue(mockAvailabilitySlot);

      const result = await service.deleteAvailabilitySlot('artisan-123', 'slot-123');

      expect(result).toEqual(mockAvailabilitySlot);
    });

    it('should throw BadRequestException if slot is booked', async () => {
      mockPrismaService.availabilitySlot.findUnique.mockResolvedValue({
        ...mockAvailabilitySlot,
        isBooked: true,
      });

      await expect(
        service.deleteAvailabilitySlot('artisan-123', 'slot-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('requestTimeOff', () => {
    const createDto = {
      type: 'VACATION',
      startDate: '2025-02-01',
      endDate: '2025-02-15',
      reason: 'Annual leave',
    };

    it('should create time off request', async () => {
      mockPrismaService.artisanProfile.findUnique.mockResolvedValue(mockArtisan);
      mockPrismaService.timeOff.create.mockResolvedValue(mockTimeOff);

      const result = await service.requestTimeOff('artisan-123', createDto);

      expect(result).toEqual(mockTimeOff);
    });

    it('should throw BadRequestException if end before start', async () => {
      mockPrismaService.artisanProfile.findUnique.mockResolvedValue(mockArtisan);

      await expect(
        service.requestTimeOff('artisan-123', {
          ...createDto,
          startDate: '2025-02-15',
          endDate: '2025-02-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTimeOffs', () => {
    it('should return all time off requests', async () => {
      mockPrismaService.timeOff.findMany.mockResolvedValue([mockTimeOff]);

      const result = await service.getTimeOffs('artisan-123');

      expect(result).toEqual([mockTimeOff]);
    });
  });

  describe('approveTimeOff', () => {
    it('should approve time off request', async () => {
      mockPrismaService.timeOff.findUnique.mockResolvedValue(mockTimeOff);
      mockPrismaService.timeOff.update.mockResolvedValue({
        ...mockTimeOff,
        status: TimeOffStatus.APPROVED,
      });

      const result = await service.approveTimeOff('timeoff-123', 'admin-123', {
        status: TimeOffStatus.APPROVED,
      });

      expect(result.status).toBe(TimeOffStatus.APPROVED);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.timeOff.findUnique.mockResolvedValue(null);

      await expect(
        service.approveTimeOff('nonexistent', 'admin-123', {
          status: TimeOffStatus.APPROVED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already processed', async () => {
      mockPrismaService.timeOff.findUnique.mockResolvedValue({
        ...mockTimeOff,
        status: TimeOffStatus.APPROVED,
      });

      await expect(
        service.approveTimeOff('timeoff-123', 'admin-123', {
          status: TimeOffStatus.APPROVED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelTimeOff', () => {
    it('should cancel time off request', async () => {
      mockPrismaService.timeOff.findUnique.mockResolvedValue(mockTimeOff);
      mockPrismaService.timeOff.delete.mockResolvedValue(mockTimeOff);

      const result = await service.cancelTimeOff('artisan-123', 'timeoff-123');

      expect(result).toEqual(mockTimeOff);
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.timeOff.findUnique.mockResolvedValue({
        ...mockTimeOff,
        artisanId: 'other-artisan',
      });

      await expect(
        service.cancelTimeOff('artisan-123', 'timeoff-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createRecurringUnavailability', () => {
    const createDto = {
      title: 'Weekly meeting',
      pattern: 'WEEKLY',
      dayOfWeek: DayOfWeek.FRIDAY,
      startTime: '14:00',
      endTime: '15:00',
      startDate: '2025-01-01',
    };

    it('should create recurring unavailability', async () => {
      mockPrismaService.artisanProfile.findUnique.mockResolvedValue(mockArtisan);
      mockPrismaService.recurringUnavailability.create.mockResolvedValue(
        mockRecurringUnavailability,
      );

      const result = await service.createRecurringUnavailability('artisan-123', createDto);

      expect(result).toEqual(mockRecurringUnavailability);
    });

    it('should throw BadRequestException if end time before start time', async () => {
      mockPrismaService.artisanProfile.findUnique.mockResolvedValue(mockArtisan);

      await expect(
        service.createRecurringUnavailability('artisan-123', {
          ...createDto,
          startTime: '15:00',
          endTime: '14:00',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getRecurringUnavailabilities', () => {
    it('should return active recurring unavailabilities', async () => {
      mockPrismaService.recurringUnavailability.findMany.mockResolvedValue([
        mockRecurringUnavailability,
      ]);

      const result = await service.getRecurringUnavailabilities('artisan-123');

      expect(result).toEqual([mockRecurringUnavailability]);
    });
  });

  describe('updateRecurringUnavailability', () => {
    it('should update recurring unavailability', async () => {
      mockPrismaService.recurringUnavailability.findUnique.mockResolvedValue(
        mockRecurringUnavailability,
      );
      mockPrismaService.recurringUnavailability.update.mockResolvedValue({
        ...mockRecurringUnavailability,
        title: 'Updated meeting',
      });

      const result = await service.updateRecurringUnavailability(
        'artisan-123',
        'recurring-123',
        { title: 'Updated meeting' },
      );

      expect(result.title).toBe('Updated meeting');
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.recurringUnavailability.findUnique.mockResolvedValue({
        ...mockRecurringUnavailability,
        artisanId: 'other-artisan',
      });

      await expect(
        service.updateRecurringUnavailability('artisan-123', 'recurring-123', {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteRecurringUnavailability', () => {
    it('should delete recurring unavailability', async () => {
      mockPrismaService.recurringUnavailability.findUnique.mockResolvedValue(
        mockRecurringUnavailability,
      );
      mockPrismaService.recurringUnavailability.delete.mockResolvedValue(
        mockRecurringUnavailability,
      );

      const result = await service.deleteRecurringUnavailability(
        'artisan-123',
        'recurring-123',
      );

      expect(result).toEqual(mockRecurringUnavailability);
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.recurringUnavailability.findUnique.mockResolvedValue({
        ...mockRecurringUnavailability,
        artisanId: 'other-artisan',
      });

      await expect(
        service.deleteRecurringUnavailability('artisan-123', 'recurring-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('isArtisanAvailable', () => {
    const startTime = new Date('2025-01-15T10:00:00Z');
    const endTime = new Date('2025-01-15T12:00:00Z');

    it('should return true if artisan is available', async () => {
      mockPrismaService.timeOff.findFirst.mockResolvedValue(null);
      mockPrismaService.availabilitySlot.findFirst.mockResolvedValue(null);

      const result = await service.isArtisanAvailable('artisan-123', startTime, endTime);

      expect(result).toBe(true);
    });

    it('should return false if artisan has approved time off', async () => {
      mockPrismaService.timeOff.findFirst.mockResolvedValue({
        ...mockTimeOff,
        status: TimeOffStatus.APPROVED,
      });

      const result = await service.isArtisanAvailable('artisan-123', startTime, endTime);

      expect(result).toBe(false);
    });

    it('should return false if artisan has booked slot', async () => {
      mockPrismaService.timeOff.findFirst.mockResolvedValue(null);
      mockPrismaService.availabilitySlot.findFirst.mockResolvedValue({
        ...mockAvailabilitySlot,
        isBooked: true,
      });

      const result = await service.isArtisanAvailable('artisan-123', startTime, endTime);

      expect(result).toBe(false);
    });
  });
});
