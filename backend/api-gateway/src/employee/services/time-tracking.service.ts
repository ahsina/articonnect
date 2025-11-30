import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Time Tracking Service (Pointeuse)
 *
 * Features:
 * - Clock in/out with GPS location
 * - Break management
 * - Automatic overtime calculation
 * - Weekly hour summaries
 * - Export for payroll
 */

export enum TimeEntryType {
  CLOCK_IN = 'CLOCK_IN',
  CLOCK_OUT = 'CLOCK_OUT',
  BREAK_START = 'BREAK_START',
  BREAK_END = 'BREAK_END',
}

export enum TimeEntryStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  INVALID = 'INVALID',
}

interface ClockInData {
  employeeId: string;
  location?: { lat: number; lng: number };
  notes?: string;
  missionId?: string;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  companyId: string;
  type: string;
  timestamp: Date;
  location?: any;
  notes?: string;
  missionId?: string;
  status: string;
}

export interface DailySummary {
  date: string;
  clockIn: Date | null;
  clockOut: Date | null;
  breakDuration: number; // in minutes
  workDuration: number; // in minutes
  overtime: number; // in minutes
  status: 'complete' | 'incomplete' | 'missing';
}

@Injectable()
export class TimeTrackingService {
  private readonly logger = new Logger(TimeTrackingService.name);

  // French legal working hours
  private readonly STANDARD_DAILY_HOURS = 7; // 35h / 5 days
  private readonly MAX_DAILY_HOURS = 10;
  private readonly MANDATORY_BREAK_THRESHOLD = 6 * 60; // 6 hours in minutes
  private readonly MANDATORY_BREAK_DURATION = 20; // 20 minutes

  constructor(private prisma: PrismaService) {}

  /**
   * Clock in an employee
   */
  async clockIn(data: ClockInData): Promise<TimeEntry> {
    const { employeeId, location, notes, missionId } = data;

    // Get employee and verify
    const employee = await this.prisma.companyEmployee.findUnique({
      where: { id: employeeId },
      include: { company: true },
    });

    if (!employee) {
      throw new NotFoundException('Employé non trouvé');
    }

    // Check if already clocked in today
    const todayStart = this.getStartOfDay(new Date());
    const todayEnd = this.getEndOfDay(new Date());

    const existingClockIn = await this.prisma.timeEntry.findFirst({
      where: {
        employeeId,
        type: TimeEntryType.CLOCK_IN,
        timestamp: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: { not: TimeEntryStatus.INVALID },
      },
    });

    if (existingClockIn) {
      // Check if there's a clock out after
      const clockOut = await this.prisma.timeEntry.findFirst({
        where: {
          employeeId,
          type: TimeEntryType.CLOCK_OUT,
          timestamp: { gt: existingClockIn.timestamp },
          status: { not: TimeEntryStatus.INVALID },
        },
      });

      if (!clockOut) {
        throw new BadRequestException('Vous êtes déjà pointé. Veuillez d\'abord pointer la sortie.');
      }
    }

    // Create clock in entry
    const entry = await this.prisma.timeEntry.create({
      data: {
        employeeId,
        companyId: employee.companyId,
        type: TimeEntryType.CLOCK_IN,
        timestamp: new Date(),
        location: location ? { lat: location.lat, lng: location.lng } : null,
        notes,
        missionId,
        status: TimeEntryStatus.ACTIVE,
      },
    });

    this.logger.log(`Employee ${employeeId} clocked in at ${entry.timestamp}`);

    return entry as TimeEntry;
  }

  /**
   * Clock out an employee
   */
  async clockOut(employeeId: string, location?: { lat: number; lng: number }, notes?: string): Promise<TimeEntry> {
    // Get employee
    const employee = await this.prisma.companyEmployee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employé non trouvé');
    }

    // Find active clock in
    const todayStart = this.getStartOfDay(new Date());

    const activeClockIn = await this.prisma.timeEntry.findFirst({
      where: {
        employeeId,
        type: TimeEntryType.CLOCK_IN,
        timestamp: { gte: todayStart },
        status: TimeEntryStatus.ACTIVE,
      },
      orderBy: { timestamp: 'desc' },
    });

    if (!activeClockIn) {
      throw new BadRequestException('Aucun pointage d\'entrée trouvé. Veuillez d\'abord pointer l\'entrée.');
    }

    // Create clock out entry
    const entry = await this.prisma.timeEntry.create({
      data: {
        employeeId,
        companyId: employee.companyId,
        type: TimeEntryType.CLOCK_OUT,
        timestamp: new Date(),
        location: location ? { lat: location.lat, lng: location.lng } : null,
        notes,
        status: TimeEntryStatus.COMPLETED,
      },
    });

    // Update clock in status
    await this.prisma.timeEntry.update({
      where: { id: activeClockIn.id },
      data: { status: TimeEntryStatus.COMPLETED },
    });

    // Check for missing break if worked > 6 hours
    const workDuration = this.getMinutesBetween(activeClockIn.timestamp, entry.timestamp);
    if (workDuration > this.MANDATORY_BREAK_THRESHOLD) {
      // Check if break was taken
      const breaksTaken = await this.prisma.timeEntry.count({
        where: {
          employeeId,
          type: { in: [TimeEntryType.BREAK_START, TimeEntryType.BREAK_END] },
          timestamp: {
            gte: activeClockIn.timestamp,
            lte: entry.timestamp,
          },
        },
      });

      if (breaksTaken === 0) {
        this.logger.warn(`Employee ${employeeId} worked ${workDuration} minutes without break`);
      }
    }

    this.logger.log(`Employee ${employeeId} clocked out at ${entry.timestamp}. Worked: ${workDuration} minutes`);

    return entry as TimeEntry;
  }

  /**
   * Start a break
   */
  async startBreak(employeeId: string, notes?: string): Promise<TimeEntry> {
    const employee = await this.prisma.companyEmployee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employé non trouvé');
    }

    // Verify employee is clocked in
    const isWorking = await this.isEmployeeWorking(employeeId);
    if (!isWorking) {
      throw new BadRequestException('Vous devez être pointé pour prendre une pause');
    }

    // Check if already on break
    const activeBreak = await this.prisma.timeEntry.findFirst({
      where: {
        employeeId,
        type: TimeEntryType.BREAK_START,
        status: TimeEntryStatus.ACTIVE,
      },
    });

    if (activeBreak) {
      throw new BadRequestException('Vous êtes déjà en pause');
    }

    const entry = await this.prisma.timeEntry.create({
      data: {
        employeeId,
        companyId: employee.companyId,
        type: TimeEntryType.BREAK_START,
        timestamp: new Date(),
        notes,
        status: TimeEntryStatus.ACTIVE,
      },
    });

    this.logger.log(`Employee ${employeeId} started break at ${entry.timestamp}`);

    return entry as TimeEntry;
  }

  /**
   * End a break
   */
  async endBreak(employeeId: string): Promise<TimeEntry> {
    const employee = await this.prisma.companyEmployee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employé non trouvé');
    }

    // Find active break
    const activeBreak = await this.prisma.timeEntry.findFirst({
      where: {
        employeeId,
        type: TimeEntryType.BREAK_START,
        status: TimeEntryStatus.ACTIVE,
      },
      orderBy: { timestamp: 'desc' },
    });

    if (!activeBreak) {
      throw new BadRequestException('Aucune pause active trouvée');
    }

    // Create break end entry
    const entry = await this.prisma.timeEntry.create({
      data: {
        employeeId,
        companyId: employee.companyId,
        type: TimeEntryType.BREAK_END,
        timestamp: new Date(),
        status: TimeEntryStatus.COMPLETED,
      },
    });

    // Update break start status
    await this.prisma.timeEntry.update({
      where: { id: activeBreak.id },
      data: { status: TimeEntryStatus.COMPLETED },
    });

    const breakDuration = this.getMinutesBetween(activeBreak.timestamp, entry.timestamp);
    this.logger.log(`Employee ${employeeId} ended break. Duration: ${breakDuration} minutes`);

    return entry as TimeEntry;
  }

  /**
   * Get current status of an employee
   */
  async getCurrentStatus(employeeId: string): Promise<{
    isWorking: boolean;
    isOnBreak: boolean;
    clockedInAt: Date | null;
    currentBreakStart: Date | null;
    todayWorkedMinutes: number;
    todayBreakMinutes: number;
  }> {
    const todayStart = this.getStartOfDay(new Date());

    const todayEntries = await this.prisma.timeEntry.findMany({
      where: {
        employeeId,
        timestamp: { gte: todayStart },
        status: { not: TimeEntryStatus.INVALID },
      },
      orderBy: { timestamp: 'asc' },
    });

    let isWorking = false;
    let isOnBreak = false;
    let clockedInAt: Date | null = null;
    let currentBreakStart: Date | null = null;
    let totalWorkMinutes = 0;
    let totalBreakMinutes = 0;
    let lastClockIn: Date | null = null;
    let lastBreakStart: Date | null = null;

    for (const entry of todayEntries) {
      switch (entry.type) {
        case TimeEntryType.CLOCK_IN:
          isWorking = true;
          lastClockIn = entry.timestamp;
          if (!clockedInAt) clockedInAt = entry.timestamp;
          break;
        case TimeEntryType.CLOCK_OUT:
          if (lastClockIn) {
            totalWorkMinutes += this.getMinutesBetween(lastClockIn, entry.timestamp);
          }
          isWorking = false;
          lastClockIn = null;
          break;
        case TimeEntryType.BREAK_START:
          isOnBreak = true;
          lastBreakStart = entry.timestamp;
          currentBreakStart = entry.timestamp;
          break;
        case TimeEntryType.BREAK_END:
          if (lastBreakStart) {
            totalBreakMinutes += this.getMinutesBetween(lastBreakStart, entry.timestamp);
          }
          isOnBreak = false;
          lastBreakStart = null;
          currentBreakStart = null;
          break;
      }
    }

    // If still working, add current work duration
    if (isWorking && lastClockIn) {
      totalWorkMinutes += this.getMinutesBetween(lastClockIn, new Date());
    }

    // Subtract break time from work time
    totalWorkMinutes -= totalBreakMinutes;

    return {
      isWorking,
      isOnBreak,
      clockedInAt,
      currentBreakStart,
      todayWorkedMinutes: Math.max(0, totalWorkMinutes),
      todayBreakMinutes: totalBreakMinutes,
    };
  }

  /**
   * Get daily summary for an employee
   */
  async getDailySummary(employeeId: string, date: Date): Promise<DailySummary> {
    const dayStart = this.getStartOfDay(date);
    const dayEnd = this.getEndOfDay(date);

    const entries = await this.prisma.timeEntry.findMany({
      where: {
        employeeId,
        timestamp: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: { not: TimeEntryStatus.INVALID },
      },
      orderBy: { timestamp: 'asc' },
    });

    let clockIn: Date | null = null;
    let clockOut: Date | null = null;
    let totalBreakMinutes = 0;
    let lastBreakStart: Date | null = null;

    for (const entry of entries) {
      switch (entry.type) {
        case TimeEntryType.CLOCK_IN:
          if (!clockIn) clockIn = entry.timestamp;
          break;
        case TimeEntryType.CLOCK_OUT:
          clockOut = entry.timestamp;
          break;
        case TimeEntryType.BREAK_START:
          lastBreakStart = entry.timestamp;
          break;
        case TimeEntryType.BREAK_END:
          if (lastBreakStart) {
            totalBreakMinutes += this.getMinutesBetween(lastBreakStart, entry.timestamp);
            lastBreakStart = null;
          }
          break;
      }
    }

    let workDuration = 0;
    if (clockIn && clockOut) {
      workDuration = this.getMinutesBetween(clockIn, clockOut) - totalBreakMinutes;
    }

    const overtime = Math.max(0, workDuration - this.STANDARD_DAILY_HOURS * 60);

    let status: DailySummary['status'] = 'missing';
    if (clockIn && clockOut) {
      status = 'complete';
    } else if (clockIn) {
      status = 'incomplete';
    }

    return {
      date: date.toISOString().split('T')[0],
      clockIn,
      clockOut,
      breakDuration: totalBreakMinutes,
      workDuration: Math.max(0, workDuration),
      overtime,
      status,
    };
  }

  /**
   * Get weekly summary for an employee
   */
  async getWeeklySummary(employeeId: string, weekStart: Date): Promise<{
    weekStart: string;
    weekEnd: string;
    days: DailySummary[];
    totalWorkedMinutes: number;
    totalBreakMinutes: number;
    totalOvertimeMinutes: number;
    expectedMinutes: number;
  }> {
    const days: DailySummary[] = [];
    let totalWorked = 0;
    let totalBreak = 0;
    let totalOvertime = 0;

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);

      const summary = await this.getDailySummary(employeeId, date);
      days.push(summary);

      totalWorked += summary.workDuration;
      totalBreak += summary.breakDuration;
      totalOvertime += summary.overtime;
    }

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return {
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      days,
      totalWorkedMinutes: totalWorked,
      totalBreakMinutes: totalBreak,
      totalOvertimeMinutes: totalOvertime,
      expectedMinutes: 35 * 60, // 35 hours
    };
  }

  /**
   * Get all time entries for a company in a period
   */
  async getCompanyTimeEntries(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ entries: TimeEntry[]; summary: any }> {
    const entries = await this.prisma.timeEntry.findMany({
      where: {
        companyId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        employee: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Group by employee
    const byEmployee = entries.reduce((acc, entry) => {
      if (!acc[entry.employeeId]) {
        acc[entry.employeeId] = {
          employeeId: entry.employeeId,
          employeeName: `${entry.employee.user.firstName} ${entry.employee.user.lastName}`,
          entries: [],
          totalMinutes: 0,
        };
      }
      acc[entry.employeeId].entries.push(entry);
      return acc;
    }, {} as Record<string, any>);

    return {
      entries: entries as TimeEntry[],
      summary: Object.values(byEmployee),
    };
  }

  /**
   * Admin: Correct a time entry
   */
  async correctTimeEntry(
    entryId: string,
    adminId: string,
    newTimestamp: Date,
    reason: string,
  ): Promise<TimeEntry> {
    const entry = await this.prisma.timeEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      throw new NotFoundException('Entrée de temps non trouvée');
    }

    // Create correction record
    await this.prisma.timeEntryCorrection.create({
      data: {
        timeEntryId: entryId,
        correctedBy: adminId,
        originalTimestamp: entry.timestamp,
        newTimestamp,
        reason,
      },
    });

    // Update entry
    const updated = await this.prisma.timeEntry.update({
      where: { id: entryId },
      data: {
        timestamp: newTimestamp,
        corrected: true,
      },
    });

    this.logger.log(`Time entry ${entryId} corrected by ${adminId}: ${entry.timestamp} -> ${newTimestamp}`);

    return updated as TimeEntry;
  }

  /**
   * Check if employee is currently working
   */
  private async isEmployeeWorking(employeeId: string): Promise<boolean> {
    const todayStart = this.getStartOfDay(new Date());

    const lastEntry = await this.prisma.timeEntry.findFirst({
      where: {
        employeeId,
        timestamp: { gte: todayStart },
        type: { in: [TimeEntryType.CLOCK_IN, TimeEntryType.CLOCK_OUT] },
        status: { not: TimeEntryStatus.INVALID },
      },
      orderBy: { timestamp: 'desc' },
    });

    return lastEntry?.type === TimeEntryType.CLOCK_IN;
  }

  /**
   * Auto clock-out employees who forgot
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async autoClockOutForgotten() {
    const todayStart = this.getStartOfDay(new Date());
    const yesterday = new Date(todayStart);
    yesterday.setDate(yesterday.getDate() - 1);

    // Find all clock-ins from yesterday without clock-outs
    const forgottenClockIns = await this.prisma.timeEntry.findMany({
      where: {
        type: TimeEntryType.CLOCK_IN,
        status: TimeEntryStatus.ACTIVE,
        timestamp: {
          gte: yesterday,
          lt: todayStart,
        },
      },
    });

    for (const clockIn of forgottenClockIns) {
      // Auto clock-out at 23:59:59 of the same day
      const autoClockOut = new Date(clockIn.timestamp);
      autoClockOut.setHours(23, 59, 59, 999);

      await this.prisma.timeEntry.create({
        data: {
          employeeId: clockIn.employeeId,
          companyId: clockIn.companyId,
          type: TimeEntryType.CLOCK_OUT,
          timestamp: autoClockOut,
          notes: 'Auto clock-out (oubli de pointage)',
          status: TimeEntryStatus.COMPLETED,
        },
      });

      await this.prisma.timeEntry.update({
        where: { id: clockIn.id },
        data: { status: TimeEntryStatus.COMPLETED },
      });

      this.logger.warn(`Auto clock-out for employee ${clockIn.employeeId} at ${autoClockOut}`);
    }
  }

  // Helper methods
  private getStartOfDay(date: Date): Date {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private getEndOfDay(date: Date): Date {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  private getMinutesBetween(start: Date, end: Date): number {
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
  }
}
