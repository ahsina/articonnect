import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface TimeSlot {
  start: string; // ISO 8601 format
  end: string;   // ISO 8601 format
  available: boolean;
  bookingId?: string; // If booked, reference to mission
}

export interface AvailabilitySchedule {
  artisanId: string;
  date: string; // YYYY-MM-DD
  slots: TimeSlot[];
}

export interface RecurringAvailability {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
}

@Injectable()
export class AvailabilityService {
  private readonly CACHE_TTL = 86400; // 24 hours

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Set artisan's availability for a specific date
   */
  async setDailyAvailability(
    artisanId: string,
    date: string,
    slots: TimeSlot[],
  ): Promise<void> {
    // Validate artisan exists
    const artisan = await this.prisma.user.findUnique({
      where: { id: artisanId },
      include: { artisanProfile: true },
    });

    if (!artisan || !artisan.artisanProfile) {
      throw new NotFoundException('Artisan not found');
    }

    // Validate slots don't overlap
    this.validateNoOverlap(slots);

    // Store in Redis
    const key = `availability:${artisanId}:${date}`;
    await this.redis.set(key, JSON.stringify(slots), this.CACHE_TTL);
  }

  /**
   * Get artisan's availability for a specific date
   */
  async getDailyAvailability(artisanId: string, date: string): Promise<TimeSlot[]> {
    const key = `availability:${artisanId}:${date}`;
    const cached = await this.redis.get(key);

    if (cached) {
      return JSON.parse(cached);
    }

    // Check if artisan has recurring schedule for this day
    const dayOfWeek = new Date(date).getDay();
    const recurring = await this.getRecurringAvailability(artisanId);
    const daySchedule = recurring.filter(r => r.dayOfWeek === dayOfWeek);

    if (daySchedule.length > 0) {
      // Generate slots from recurring schedule
      const slots: TimeSlot[] = daySchedule.map(schedule => ({
        start: `${date}T${schedule.startTime}:00`,
        end: `${date}T${schedule.endTime}:00`,
        available: true,
      }));

      return slots;
    }

    return [];
  }

  /**
   * Get availability for a date range
   */
  async getAvailabilityRange(
    artisanId: string,
    startDate: string,
    endDate: string,
  ): Promise<AvailabilitySchedule[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const schedules: AvailabilitySchedule[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const slots = await this.getDailyAvailability(artisanId, dateStr);

      if (slots.length > 0) {
        schedules.push({
          artisanId,
          date: dateStr,
          slots,
        });
      }
    }

    return schedules;
  }

  /**
   * Book a time slot
   */
  async bookSlot(
    artisanId: string,
    date: string,
    slotStart: string,
    missionId: string,
  ): Promise<void> {
    const slots = await this.getDailyAvailability(artisanId, date);

    const slotIndex = slots.findIndex(
      s => s.start === slotStart && s.available
    );

    if (slotIndex === -1) {
      throw new BadRequestException('Slot not available');
    }

    // Mark as booked
    slots[slotIndex].available = false;
    slots[slotIndex].bookingId = missionId;

    // Save updated slots
    const key = `availability:${artisanId}:${date}`;
    await this.redis.set(key, JSON.stringify(slots), this.CACHE_TTL);
  }

  /**
   * Release a booked slot (e.g., mission cancelled)
   */
  async releaseSlot(artisanId: string, missionId: string): Promise<void> {
    // Find all dates with bookings
    const keys = await this.getAllAvailabilityKeys(artisanId);

    for (const key of keys) {
      const cached = await this.redis.get(key);
      if (!cached) continue;

      const slots: TimeSlot[] = JSON.parse(cached);
      let modified = false;

      slots.forEach(slot => {
        if (slot.bookingId === missionId) {
          slot.available = true;
          slot.bookingId = undefined;
          modified = true;
        }
      });

      if (modified) {
        await this.redis.set(key, JSON.stringify(slots), this.CACHE_TTL);
      }
    }
  }

  /**
   * Set recurring weekly availability
   */
  async setRecurringAvailability(
    artisanId: string,
    schedule: RecurringAvailability[],
  ): Promise<void> {
    const key = `availability:recurring:${artisanId}`;
    await this.redis.set(key, JSON.stringify(schedule), 0); // No expiry
  }

  /**
   * Get recurring weekly availability
   */
  async getRecurringAvailability(artisanId: string): Promise<RecurringAvailability[]> {
    const key = `availability:recurring:${artisanId}`;
    const cached = await this.redis.get(key);

    if (cached) {
      return JSON.parse(cached);
    }

    return [];
  }

  /**
   * Check if artisan is available at a specific time
   */
  async isAvailableAt(
    artisanId: string,
    dateTime: string,
  ): Promise<boolean> {
    const date = dateTime.split('T')[0];
    const slots = await this.getDailyAvailability(artisanId, date);

    const requestTime = new Date(dateTime);

    return slots.some(slot => {
      const slotStart = new Date(slot.start);
      const slotEnd = new Date(slot.end);
      return (
        slot.available &&
        requestTime >= slotStart &&
        requestTime < slotEnd
      );
    });
  }

  /**
   * Get next available slot for artisan
   */
  async getNextAvailableSlot(artisanId: string, fromDate?: string): Promise<TimeSlot | null> {
    const start = fromDate ? new Date(fromDate) : new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + 30); // Look ahead 30 days

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const slots = await this.getDailyAvailability(artisanId, dateStr);

      const availableSlot = slots.find(s => s.available);
      if (availableSlot) {
        return availableSlot;
      }
    }

    return null;
  }

  /**
   * Batch update artisan general availability status
   */
  async setGeneralAvailability(artisanId: string, available: boolean): Promise<void> {
    await this.prisma.artisanProfile.update({
      where: { userId: artisanId },
      data: { available },
    });
  }

  /**
   * Clear all availability for an artisan
   */
  async clearAllAvailability(artisanId: string): Promise<void> {
    const keys = await this.getAllAvailabilityKeys(artisanId);
    for (const key of keys) {
      await this.redis.del(key);
    }
  }

  /**
   * Helper: Validate time slots don't overlap
   */
  private validateNoOverlap(slots: TimeSlot[]): void {
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const slot1Start = new Date(slots[i].start);
        const slot1End = new Date(slots[i].end);
        const slot2Start = new Date(slots[j].start);
        const slot2End = new Date(slots[j].end);

        const overlaps =
          (slot1Start < slot2End && slot1End > slot2Start) ||
          (slot2Start < slot1End && slot2End > slot1Start);

        if (overlaps) {
          throw new BadRequestException('Time slots cannot overlap');
        }
      }
    }
  }

  /**
   * Helper: Get all availability keys for an artisan
   */
  private async getAllAvailabilityKeys(artisanId: string): Promise<string[]> {
    const client = this.redis.getClient();
    const pattern = `availability:${artisanId}:*`;

    // Get all matching keys
    const keys: string[] = [];
    let cursor = '0';

    do {
      const result = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');

    return keys;
  }
}
