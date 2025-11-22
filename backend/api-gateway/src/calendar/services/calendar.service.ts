import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateWorkingHoursDto, UpdateWorkingHoursDto } from '../dto/working-hours.dto';
import { CreateAvailabilitySlotDto, BookAvailabilitySlotDto, QueryAvailabilityDto } from '../dto/availability-slot.dto';
import { CreateTimeOffDto, ApproveTimeOffDto } from '../dto/time-off.dto';
import { CreateRecurringUnavailabilityDto, UpdateRecurringUnavailabilityDto } from '../dto/recurring-unavailability.dto';
import { DayOfWeek, TimeOffStatus } from '@prisma/client';

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  // ================================
  // WORKING HOURS
  // ================================

  /**
   * Set or update working hours for a specific day
   */
  async setWorkingHours(artisanId: string, dto: CreateWorkingHoursDto) {
    // Validate artisan exists
    await this.validateArtisan(artisanId);

    // Validate time range
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Check if working hours already exist for this day
    const existing = await this.prisma.workingHours.findUnique({
      where: {
        artisanId_dayOfWeek: {
          artisanId,
          dayOfWeek: dto.dayOfWeek,
        },
      },
    });

    if (existing) {
      // Update existing
      return this.prisma.workingHours.update({
        where: { id: existing.id },
        data: {
          startTime: dto.startTime,
          endTime: dto.endTime,
          isActive: dto.isActive ?? true,
        },
      });
    }

    // Create new
    return this.prisma.workingHours.create({
      data: {
        artisanId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        isActive: dto.isActive ?? true,
      },
    });
  }

  /**
   * Get all working hours for an artisan
   */
  async getWorkingHours(artisanId: string) {
    return this.prisma.workingHours.findMany({
      where: { artisanId },
      orderBy: {
        dayOfWeek: 'asc',
      },
    });
  }

  /**
   * Update working hours
   */
  async updateWorkingHours(artisanId: string, workingHoursId: string, dto: UpdateWorkingHoursDto) {
    const workingHours = await this.prisma.workingHours.findUnique({
      where: { id: workingHoursId },
    });

    if (!workingHours) {
      throw new NotFoundException('Working hours not found');
    }

    if (workingHours.artisanId !== artisanId) {
      throw new ForbiddenException('Not authorized to update these working hours');
    }

    return this.prisma.workingHours.update({
      where: { id: workingHoursId },
      data: dto,
    });
  }

  /**
   * Delete working hours
   */
  async deleteWorkingHours(artisanId: string, workingHoursId: string) {
    const workingHours = await this.prisma.workingHours.findUnique({
      where: { id: workingHoursId },
    });

    if (!workingHours) {
      throw new NotFoundException('Working hours not found');
    }

    if (workingHours.artisanId !== artisanId) {
      throw new ForbiddenException('Not authorized to delete these working hours');
    }

    return this.prisma.workingHours.delete({
      where: { id: workingHoursId },
    });
  }

  // ================================
  // AVAILABILITY SLOTS
  // ================================

  /**
   * Create availability slot
   */
  async createAvailabilitySlot(artisanId: string, dto: CreateAvailabilitySlotDto) {
    await this.validateArtisan(artisanId);

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Check for overlapping slots
    const overlapping = await this.prisma.availabilitySlot.findFirst({
      where: {
        artisanId,
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException('This slot overlaps with an existing slot');
    }

    return this.prisma.availabilitySlot.create({
      data: {
        artisanId,
        startTime,
        endTime,
      },
    });
  }

  /**
   * Get availability slots for an artisan in a date range
   */
  async getAvailabilitySlots(query: QueryAvailabilityDto) {
    const where: any = {
      startTime: {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      },
    };

    if (query.artisanId) {
      where.artisanId = query.artisanId;
    }

    return this.prisma.availabilitySlot.findMany({
      where,
      include: {
        artisan: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        mission: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  /**
   * Book an availability slot
   */
  async bookAvailabilitySlot(slotId: string, dto: BookAvailabilitySlotDto) {
    const slot = await this.prisma.availabilitySlot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      throw new NotFoundException('Availability slot not found');
    }

    if (slot.isBooked) {
      throw new BadRequestException('This slot is already booked');
    }

    return this.prisma.availabilitySlot.update({
      where: { id: slotId },
      data: {
        isBooked: true,
        missionId: dto.missionId,
      },
    });
  }

  /**
   * Cancel a booked slot
   */
  async cancelAvailabilitySlot(artisanId: string, slotId: string) {
    const slot = await this.prisma.availabilitySlot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      throw new NotFoundException('Availability slot not found');
    }

    if (slot.artisanId !== artisanId) {
      throw new ForbiddenException('Not authorized');
    }

    return this.prisma.availabilitySlot.update({
      where: { id: slotId },
      data: {
        isBooked: false,
        missionId: null,
      },
    });
  }

  /**
   * Delete availability slot
   */
  async deleteAvailabilitySlot(artisanId: string, slotId: string) {
    const slot = await this.prisma.availabilitySlot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      throw new NotFoundException('Availability slot not found');
    }

    if (slot.artisanId !== artisanId) {
      throw new ForbiddenException('Not authorized');
    }

    if (slot.isBooked) {
      throw new BadRequestException('Cannot delete a booked slot');
    }

    return this.prisma.availabilitySlot.delete({
      where: { id: slotId },
    });
  }

  // ================================
  // TIME OFF
  // ================================

  /**
   * Request time off
   */
  async requestTimeOff(artisanId: string, dto: CreateTimeOffDto) {
    await this.validateArtisan(artisanId);

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    return this.prisma.timeOff.create({
      data: {
        artisanId,
        type: dto.type,
        startDate,
        endDate,
        reason: dto.reason,
      },
    });
  }

  /**
   * Get all time off requests for an artisan
   */
  async getTimeOffs(artisanId: string) {
    return this.prisma.timeOff.findMany({
      where: { artisanId },
      orderBy: {
        startDate: 'desc',
      },
    });
  }

  /**
   * Approve or reject time off (admin only)
   */
  async approveTimeOff(timeOffId: string, approvedBy: string, dto: ApproveTimeOffDto) {
    const timeOff = await this.prisma.timeOff.findUnique({
      where: { id: timeOffId },
    });

    if (!timeOff) {
      throw new NotFoundException('Time off request not found');
    }

    if (timeOff.status !== TimeOffStatus.PENDING) {
      throw new BadRequestException('This request has already been processed');
    }

    return this.prisma.timeOff.update({
      where: { id: timeOffId },
      data: {
        status: dto.status,
        approvedBy,
        approvedAt: new Date(),
      },
    });
  }

  /**
   * Cancel time off request
   */
  async cancelTimeOff(artisanId: string, timeOffId: string) {
    const timeOff = await this.prisma.timeOff.findUnique({
      where: { id: timeOffId },
    });

    if (!timeOff) {
      throw new NotFoundException('Time off request not found');
    }

    if (timeOff.artisanId !== artisanId) {
      throw new ForbiddenException('Not authorized');
    }

    return this.prisma.timeOff.delete({
      where: { id: timeOffId },
    });
  }

  // ================================
  // RECURRING UNAVAILABILITY
  // ================================

  /**
   * Create recurring unavailability
   */
  async createRecurringUnavailability(artisanId: string, dto: CreateRecurringUnavailabilityDto) {
    await this.validateArtisan(artisanId);

    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('End time must be after start time');
    }

    return this.prisma.recurringUnavailability.create({
      data: {
        artisanId,
        title: dto.title,
        pattern: dto.pattern,
        dayOfWeek: dto.dayOfWeek,
        dayOfMonth: dto.dayOfMonth,
        startTime: dto.startTime,
        endTime: dto.endTime,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
  }

  /**
   * Get all recurring unavailability for an artisan
   */
  async getRecurringUnavailabilities(artisanId: string) {
    return this.prisma.recurringUnavailability.findMany({
      where: {
        artisanId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Update recurring unavailability
   */
  async updateRecurringUnavailability(
    artisanId: string,
    recurringId: string,
    dto: UpdateRecurringUnavailabilityDto,
  ) {
    const recurring = await this.prisma.recurringUnavailability.findUnique({
      where: { id: recurringId },
    });

    if (!recurring) {
      throw new NotFoundException('Recurring unavailability not found');
    }

    if (recurring.artisanId !== artisanId) {
      throw new ForbiddenException('Not authorized');
    }

    return this.prisma.recurringUnavailability.update({
      where: { id: recurringId },
      data: {
        title: dto.title,
        isActive: dto.isActive,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
  }

  /**
   * Delete recurring unavailability
   */
  async deleteRecurringUnavailability(artisanId: string, recurringId: string) {
    const recurring = await this.prisma.recurringUnavailability.findUnique({
      where: { id: recurringId },
    });

    if (!recurring) {
      throw new NotFoundException('Recurring unavailability not found');
    }

    if (recurring.artisanId !== artisanId) {
      throw new ForbiddenException('Not authorized');
    }

    return this.prisma.recurringUnavailability.delete({
      where: { id: recurringId },
    });
  }

  // ================================
  // HELPERS
  // ================================

  /**
   * Validate that an artisan profile exists
   */
  private async validateArtisan(artisanId: string) {
    const artisan = await this.prisma.artisanProfile.findUnique({
      where: { id: artisanId },
    });

    if (!artisan) {
      throw new NotFoundException('Artisan profile not found');
    }

    return artisan;
  }

  /**
   * Check if artisan is available at a specific time
   */
  async isArtisanAvailable(artisanId: string, startTime: Date, endTime: Date): Promise<boolean> {
    // Check time off
    const timeOff = await this.prisma.timeOff.findFirst({
      where: {
        artisanId,
        status: TimeOffStatus.APPROVED,
        startDate: { lte: endTime },
        endDate: { gte: startTime },
      },
    });

    if (timeOff) {
      return false;
    }

    // Check booked slots
    const bookedSlot = await this.prisma.availabilitySlot.findFirst({
      where: {
        artisanId,
        isBooked: true,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    if (bookedSlot) {
      return false;
    }

    return true;
  }
}
