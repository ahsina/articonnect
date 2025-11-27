import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRecurringServiceDto,
  UpdateRecurringServiceDto,
  RecurringServiceFilterDto,
  RecurringFrequency,
  RecurringServiceStatus,
} from '../dto/recurring.dto';

@Injectable()
export class RecurringService {
  constructor(private prisma: PrismaService) {}

  private calculateNextServiceDate(
    frequency: RecurringFrequency,
    startDate: Date,
    scheduledDayOfWeek?: number,
    scheduledDayOfMonth?: number,
    scheduledMonth?: number,
  ): Date {
    const now = new Date();
    let nextDate = new Date(startDate);

    if (nextDate < now) {
      nextDate = new Date(now);
    }

    switch (frequency) {
      case RecurringFrequency.WEEKLY:
        if (scheduledDayOfWeek !== undefined) {
          const daysUntilNext = (scheduledDayOfWeek - nextDate.getDay() + 7) % 7 || 7;
          nextDate.setDate(nextDate.getDate() + daysUntilNext);
        } else {
          nextDate.setDate(nextDate.getDate() + 7);
        }
        break;

      case RecurringFrequency.BIWEEKLY:
        if (scheduledDayOfWeek !== undefined) {
          const daysUntilNext = (scheduledDayOfWeek - nextDate.getDay() + 7) % 7 || 14;
          nextDate.setDate(nextDate.getDate() + daysUntilNext);
        } else {
          nextDate.setDate(nextDate.getDate() + 14);
        }
        break;

      case RecurringFrequency.MONTHLY:
        if (scheduledDayOfMonth !== undefined) {
          nextDate.setDate(scheduledDayOfMonth);
          if (nextDate <= now) {
            nextDate.setMonth(nextDate.getMonth() + 1);
          }
        } else {
          nextDate.setMonth(nextDate.getMonth() + 1);
        }
        break;

      case RecurringFrequency.QUARTERLY:
        nextDate.setMonth(nextDate.getMonth() + 3);
        if (scheduledDayOfMonth) {
          nextDate.setDate(scheduledDayOfMonth);
        }
        break;

      case RecurringFrequency.BIANNUALLY:
        nextDate.setMonth(nextDate.getMonth() + 6);
        if (scheduledMonth) {
          nextDate.setMonth(scheduledMonth - 1);
        }
        break;

      case RecurringFrequency.ANNUALLY:
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        if (scheduledMonth) {
          nextDate.setMonth(scheduledMonth - 1);
        }
        if (scheduledDayOfMonth) {
          nextDate.setDate(scheduledDayOfMonth);
        }
        break;
    }

    return nextDate;
  }

  async create(artisanId: string, dto: CreateRecurringServiceDto) {
    const startDate = new Date(dto.startDate);
    const nextServiceDate = this.calculateNextServiceDate(
      dto.frequency,
      startDate,
      dto.scheduledDayOfWeek,
      dto.scheduledDayOfMonth,
      dto.scheduledMonth,
    );

    return this.prisma.recurringService.create({
      data: {
        artisanId,
        clientId: dto.clientId,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        trade: dto.trade,
        address: dto.address,
        city: dto.city,
        postalCode: dto.postalCode,
        country: dto.country,
        latitude: dto.latitude,
        longitude: dto.longitude,
        frequency: dto.frequency,
        scheduledDayOfWeek: dto.scheduledDayOfWeek,
        scheduledDayOfMonth: dto.scheduledDayOfMonth,
        scheduledMonth: dto.scheduledMonth,
        preferredTimeSlot: dto.preferredTimeSlot,
        startDate,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        nextServiceDate,
        servicePrice: dto.servicePrice,
        currency: dto.currency || 'EUR',
        discountPercent: dto.discountPercent,
        autoRenew: dto.autoRenew ?? true,
        renewalNotifyDays: dto.renewalNotifyDays ?? 30,
        autoCharge: dto.autoCharge ?? false,
        paymentMethodId: dto.paymentMethodId,
        serviceNotes: dto.serviceNotes,
        accessInstructions: dto.accessInstructions,
        internalNotes: dto.internalNotes,
      },
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async findAll(artisanId: string, filters: RecurringServiceFilterDto) {
    const { status, clientId, category, page = 1, limit = 20 } = filters;

    const where: any = { artisanId };

    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (category) where.category = category;

    const [services, total] = await Promise.all([
      this.prisma.recurringService.findMany({
        where,
        include: {
          client: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { nextServiceDate: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.recurringService.count({ where }),
    ]);

    return {
      data: services,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, artisanId: string) {
    const service = await this.prisma.recurringService.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        missions: {
          orderBy: { scheduledDate: 'desc' },
          take: 10,
          include: {
            mission: {
              select: { id: true, title: true, status: true, finalPrice: true, completedAt: true },
            },
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException('Recurring service not found');
    }

    if (service.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    return service;
  }

  async update(id: string, artisanId: string, dto: UpdateRecurringServiceDto) {
    const service = await this.prisma.recurringService.findUnique({
      where: { id },
    });

    if (!service) {
      throw new NotFoundException('Recurring service not found');
    }

    if (service.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.recurringService.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        preferredTimeSlot: dto.preferredTimeSlot,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        servicePrice: dto.servicePrice,
        discountPercent: dto.discountPercent,
        status: dto.status,
        autoRenew: dto.autoRenew,
        autoCharge: dto.autoCharge,
        serviceNotes: dto.serviceNotes,
        accessInstructions: dto.accessInstructions,
        internalNotes: dto.internalNotes,
      },
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async pause(id: string, artisanId: string) {
    const service = await this.findOne(id, artisanId);

    return this.prisma.recurringService.update({
      where: { id },
      data: { status: RecurringServiceStatus.PAUSED },
    });
  }

  async resume(id: string, artisanId: string) {
    const service = await this.findOne(id, artisanId);

    const nextServiceDate = this.calculateNextServiceDate(
      service.frequency as RecurringFrequency,
      new Date(),
      service.scheduledDayOfWeek || undefined,
      service.scheduledDayOfMonth || undefined,
      service.scheduledMonth || undefined,
    );

    return this.prisma.recurringService.update({
      where: { id },
      data: {
        status: RecurringServiceStatus.ACTIVE,
        nextServiceDate,
      },
    });
  }

  async cancel(id: string, artisanId: string) {
    const service = await this.findOne(id, artisanId);

    return this.prisma.recurringService.update({
      where: { id },
      data: { status: RecurringServiceStatus.CANCELLED },
    });
  }

  async generateMission(id: string, artisanId: string) {
    const service = await this.findOne(id, artisanId);

    if (service.status !== RecurringServiceStatus.ACTIVE) {
      throw new ForbiddenException('Service is not active');
    }

    // Create mission for this service occurrence
    const mission = await this.prisma.mission.create({
      data: {
        clientId: service.clientId,
        artisanId,
        type: 'SCHEDULED',
        title: service.name,
        description: service.description || `Recurring service: ${service.name}`,
        category: service.category,
        address: service.address,
        city: service.city,
        postalCode: service.postalCode,
        country: service.country,
        latitude: service.latitude || 0,
        longitude: service.longitude || 0,
        scheduledFor: service.nextServiceDate,
        agreedPrice: service.servicePrice,
        vatRate: 20, // Default VAT rate
      },
    });

    // Create recurring service mission record
    await this.prisma.recurringServiceMission.create({
      data: {
        recurringServiceId: id,
        missionId: mission.id,
        scheduledDate: service.nextServiceDate!,
      },
    });

    // Update next service date
    const nextServiceDate = this.calculateNextServiceDate(
      service.frequency as RecurringFrequency,
      service.nextServiceDate!,
      service.scheduledDayOfWeek || undefined,
      service.scheduledDayOfMonth || undefined,
      service.scheduledMonth || undefined,
    );

    await this.prisma.recurringService.update({
      where: { id },
      data: {
        nextServiceDate,
        totalServices: { increment: 1 },
      },
    });

    return mission;
  }

  async getUpcoming(artisanId: string, days: number = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.prisma.recurringService.findMany({
      where: {
        artisanId,
        status: RecurringServiceStatus.ACTIVE,
        nextServiceDate: {
          lte: futureDate,
        },
      },
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { nextServiceDate: 'asc' },
    });
  }

  async getStats(artisanId: string) {
    const [total, active, paused, cancelled] = await Promise.all([
      this.prisma.recurringService.count({ where: { artisanId } }),
      this.prisma.recurringService.count({ where: { artisanId, status: RecurringServiceStatus.ACTIVE } }),
      this.prisma.recurringService.count({ where: { artisanId, status: RecurringServiceStatus.PAUSED } }),
      this.prisma.recurringService.count({ where: { artisanId, status: RecurringServiceStatus.CANCELLED } }),
    ]);

    const totalRevenue = await this.prisma.recurringService.aggregate({
      where: { artisanId },
      _sum: { totalRevenue: true },
    });

    const monthlyRevenue = await this.prisma.recurringService.aggregate({
      where: { artisanId, status: RecurringServiceStatus.ACTIVE },
      _sum: { servicePrice: true },
    });

    return {
      total,
      active,
      paused,
      cancelled,
      totalRevenue: totalRevenue._sum.totalRevenue || 0,
      estimatedMonthlyRevenue: monthlyRevenue._sum.servicePrice || 0,
    };
  }
}
