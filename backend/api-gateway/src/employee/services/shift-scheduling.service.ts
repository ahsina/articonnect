import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface CreateShiftDto {
  employeeId: string;
  startTime: Date;
  endTime: Date;
  shiftType: 'REGULAR' | 'OVERTIME' | 'ONCALL' | 'BREAK';
  notes?: string;
}

export interface UpdateShiftDto {
  startTime?: Date;
  endTime?: Date;
  shiftType?: 'REGULAR' | 'OVERTIME' | 'ONCALL' | 'BREAK';
  status?: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

export interface BulkScheduleDto {
  employeeIds: string[];
  startTime: Date;
  endTime: Date;
  shiftType: 'REGULAR' | 'OVERTIME' | 'ONCALL' | 'BREAK';
  repeatPattern?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  repeatCount?: number;
}

@Injectable()
export class ShiftSchedulingService {
  constructor(private prisma: PrismaService) {}

  async createShift(companyId: string, requesterId: string, createDto: CreateShiftDto) {
    await this.validateSchedulingPermission(companyId, requesterId);

    const employee = await this.prisma.companyEmployee.findUnique({
      where: { id: createDto.employeeId },
      include: { company: true },
    });

    if (!employee || employee.companyId !== companyId) {
      throw new NotFoundException('Employee not found in this company');
    }

    if (createDto.startTime >= createDto.endTime) {
      throw new BadRequestException('Shift end time must be after start time');
    }

    const conflictingShift = await this.prisma.employeeShift.findFirst({
      where: {
        employeeId: createDto.employeeId,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        OR: [
          {
            AND: [
              { startTime: { lte: createDto.startTime } },
              { endTime: { gt: createDto.startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: createDto.endTime } },
              { endTime: { gte: createDto.endTime } },
            ],
          },
        ],
      },
    });

    if (conflictingShift) {
      throw new BadRequestException('Shift conflicts with existing schedule');
    }

    const shift = await this.prisma.employeeShift.create({
      data: {
        employeeId: createDto.employeeId,
        startTime: createDto.startTime,
        endTime: createDto.endTime,
        shiftType: createDto.shiftType,
        status: 'SCHEDULED',
        notes: createDto.notes,
        createdById: requesterId,
      },
      include: {
        employee: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    return shift;
  }

  async updateShift(shiftId: string, requesterId: string, updateDto: UpdateShiftDto) {
    const shift = await this.prisma.employeeShift.findUnique({
      where: { id: shiftId },
      include: { employee: { include: { company: true } } },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    await this.validateSchedulingPermission(shift.employee.companyId, requesterId);

    if (updateDto.startTime && updateDto.endTime && updateDto.startTime >= updateDto.endTime) {
      throw new BadRequestException('Shift end time must be after start time');
    }

    const updatedShift = await this.prisma.employeeShift.update({
      where: { id: shiftId },
      data: {
        ...updateDto,
        updatedById: requesterId,
      },
      include: {
        employee: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return updatedShift;
  }

  async deleteShift(shiftId: string, requesterId: string) {
    const shift = await this.prisma.employeeShift.findUnique({
      where: { id: shiftId },
      include: { employee: { include: { company: true } } },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    await this.validateSchedulingPermission(shift.employee.companyId, requesterId);

    await this.prisma.employeeShift.delete({ where: { id: shiftId } });

    return { message: 'Shift deleted successfully' };
  }

  async getCompanySchedule(companyId: string, requesterId: string, startDate: Date, endDate: Date) {
    await this.validateCompanyAccess(companyId, requesterId);

    const shifts = await this.prisma.employeeShift.findMany({
      where: {
        employee: { companyId },
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
      include: {
        employee: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return {
      period: { startDate, endDate },
      shifts: shifts.map((shift) => ({
        id: shift.id,
        employee: {
          id: shift.employee.id,
          name: `${shift.employee.user.firstName} ${shift.employee.user.lastName}`,
          email: shift.employee.user.email,
          role: shift.employee.role,
        },
        startTime: shift.startTime,
        endTime: shift.endTime,
        duration: (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60),
        shiftType: shift.shiftType,
        status: shift.status,
        notes: shift.notes,
      })),
    };
  }

  async getEmployeeSchedule(employeeId: string, requesterId: string, startDate: Date, endDate: Date) {
    const employee = await this.prisma.companyEmployee.findUnique({
      where: { id: employeeId },
      include: { user: true, company: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (employee.userId !== requesterId) {
      // Viewing another employee's schedule (and their PII) requires
      // scheduling-management rights, not just company membership.
      await this.validateSchedulingPermission(employee.companyId, requesterId);
    }

    const shifts = await this.prisma.employeeShift.findMany({
      where: {
        employeeId,
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
      orderBy: { startTime: 'asc' },
    });

    const totalHours = shifts.reduce((sum, shift) => {
      const duration = (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60);
      return sum + duration;
    }, 0);

    const shiftsByType = shifts.reduce((acc, shift) => {
      const duration = (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60);
      acc[shift.shiftType] = (acc[shift.shiftType] || 0) + duration;
      return acc;
    }, {} as Record<string, number>);

    return {
      employee: {
        id: employee.id,
        name: `${employee.user.firstName} ${employee.user.lastName}`,
        email: employee.user.email,
        role: employee.role,
      },
      period: { startDate, endDate },
      summary: {
        totalHours,
        totalShifts: shifts.length,
        byType: shiftsByType,
      },
      shifts: shifts.map((shift) => ({
        id: shift.id,
        startTime: shift.startTime,
        endTime: shift.endTime,
        duration: (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60),
        shiftType: shift.shiftType,
        status: shift.status,
        notes: shift.notes,
      })),
    };
  }

  async bulkScheduleShifts(companyId: string, requesterId: string, bulkDto: BulkScheduleDto) {
    await this.validateSchedulingPermission(companyId, requesterId);

    const employees = await this.prisma.companyEmployee.findMany({
      where: {
        id: { in: bulkDto.employeeIds },
        companyId,
        status: 'ACTIVE',
      },
    });

    if (employees.length !== bulkDto.employeeIds.length) {
      throw new NotFoundException('Some employees not found or not active');
    }

    const shifts = [];
    const repeatCount = bulkDto.repeatCount || 1;

    for (let i = 0; i < repeatCount; i++) {
      const shiftStartTime = new Date(bulkDto.startTime);
      const shiftEndTime = new Date(bulkDto.endTime);

      switch (bulkDto.repeatPattern) {
        case 'DAILY':
          shiftStartTime.setDate(shiftStartTime.getDate() + i);
          shiftEndTime.setDate(shiftEndTime.getDate() + i);
          break;
        case 'WEEKLY':
          shiftStartTime.setDate(shiftStartTime.getDate() + i * 7);
          shiftEndTime.setDate(shiftEndTime.getDate() + i * 7);
          break;
        case 'BIWEEKLY':
          shiftStartTime.setDate(shiftStartTime.getDate() + i * 14);
          shiftEndTime.setDate(shiftEndTime.getDate() + i * 14);
          break;
        case 'MONTHLY':
          shiftStartTime.setMonth(shiftStartTime.getMonth() + i);
          shiftEndTime.setMonth(shiftEndTime.getMonth() + i);
          break;
      }

      for (const employee of employees) {
        shifts.push({
          employeeId: employee.id,
          startTime: shiftStartTime,
          endTime: shiftEndTime,
          shiftType: bulkDto.shiftType,
          status: 'SCHEDULED' as const,
          createdById: requesterId,
        });
      }
    }

    const createdShifts = await this.prisma.employeeShift.createMany({
      data: shifts,
      skipDuplicates: true,
    });

    return {
      message: 'Shifts scheduled successfully',
      count: createdShifts.count,
    };
  }

  async getAvailableEmployees(companyId: string, requesterId: string, startTime: Date, endTime: Date) {
    await this.validateCompanyAccess(companyId, requesterId);

    const allEmployees = await this.prisma.companyEmployee.findMany({
      where: { companyId, status: 'ACTIVE' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        shifts: {
          where: {
            status: { in: ['SCHEDULED', 'CONFIRMED'] },
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
            ],
          },
        },
      },
    });

    const availableEmployees = allEmployees
      .filter((emp) => emp.shifts.length === 0)
      .map((emp) => ({
        id: emp.id,
        name: `${emp.user.firstName} ${emp.user.lastName}`,
        email: emp.user.email,
        role: emp.role,
        available: true,
      }));

    const busyEmployees = allEmployees
      .filter((emp) => emp.shifts.length > 0)
      .map((emp) => ({
        id: emp.id,
        name: `${emp.user.firstName} ${emp.user.lastName}`,
        email: emp.user.email,
        role: emp.role,
        available: false,
        conflictingShifts: emp.shifts.length,
      }));

    return {
      period: { startTime, endTime },
      available: availableEmployees,
      busy: busyEmployees,
    };
  }

  private async validateSchedulingPermission(companyId: string, userId: string) {
    const employee = await this.prisma.companyEmployee.findFirst({
      where: {
        companyId,
        userId,
        status: 'ACTIVE',
      },
    });

    if (!employee) {
      throw new ForbiddenException('You do not have access to this company');
    }

    const permissions = employee.permissions as any;
    if (employee.role !== 'OWNER' && employee.role !== 'MANAGER' && !permissions?.canManageEmployees) {
      throw new ForbiddenException('You do not have permission to manage schedules');
    }

    return employee;
  }

  private async validateCompanyAccess(companyId: string, userId: string) {
    const employee = await this.prisma.companyEmployee.findFirst({
      where: {
        companyId,
        userId,
        status: 'ACTIVE',
      },
    });

    if (!employee) {
      throw new ForbiddenException('You do not have access to this company');
    }

    return employee;
  }
}
