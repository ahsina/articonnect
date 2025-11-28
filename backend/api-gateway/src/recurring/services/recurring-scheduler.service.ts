import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class RecurringSchedulerService {
  private readonly logger = new Logger(RecurringSchedulerService.name);

  constructor(private prisma: PrismaService) {}

  // Run every day at 6 AM
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async processUpcomingServices() {
    this.logger.log('Processing upcoming recurring services...');

    try {
      // Get services due in the next 24 hours
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      const dueServices = await this.prisma.recurringService.findMany({
        where: {
          status: 'ACTIVE',
          nextServiceDate: {
            lte: tomorrow,
          },
        },
        include: {
          artisan: { select: { id: true, email: true, firstName: true } },
          client: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      });

      this.logger.log(`Found ${dueServices.length} services due for processing`);

      for (const service of dueServices) {
        try {
          await this.generateServiceMission(service);
        } catch (error) {
          this.logger.error(`Failed to process service ${service.id}: ${error}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error processing recurring services: ${error}`);
    }
  }

  // Run every day at 8 AM - Send reminders for upcoming services
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendUpcomingReminders() {
    this.logger.log('Sending reminders for upcoming services...');

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);

      const upcomingServices = await this.prisma.recurringService.findMany({
        where: {
          status: 'ACTIVE',
          nextServiceDate: {
            gte: tomorrow,
            lt: dayAfter,
          },
        },
        include: {
          artisan: { select: { id: true, email: true, firstName: true } },
          client: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        },
      });

      for (const service of upcomingServices) {
        // Notify artisan
        await this.createNotification(
          service.artisanId,
          NotificationType.SYSTEM,
          'Service récurrent demain',
          `Rappel: ${service.name} pour ${service.client.firstName} ${service.client.lastName} est prévu demain.`,
        );

        // Notify client
        await this.createNotification(
          service.clientId,
          NotificationType.SYSTEM,
          'Service prévu demain',
          `Rappel: Votre ${service.name} est prévu demain.`,
        );
      }

      this.logger.log(`Sent reminders for ${upcomingServices.length} services`);
    } catch (error) {
      this.logger.error(`Error sending reminders: ${error}`);
    }
  }

  // Run every day at 7 AM - Send renewal notifications
  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async sendRenewalNotifications() {
    this.logger.log('Checking for services needing renewal notification...');

    try {
      const services = await this.prisma.recurringService.findMany({
        where: {
          status: 'ACTIVE',
          autoRenew: true,
          endDate: { not: null },
        },
        include: {
          artisan: { select: { id: true, email: true, firstName: true } },
          client: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      });

      const now = new Date();

      for (const service of services) {
        if (!service.endDate) continue;

        const daysUntilEnd = Math.ceil(
          (service.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Notify at configured days before renewal
        if (daysUntilEnd === service.renewalNotifyDays) {
          await this.createNotification(
            service.artisanId,
            NotificationType.SYSTEM,
            'Renouvellement de service',
            `Le service ${service.name} pour ${service.client.firstName} ${service.client.lastName} expire dans ${daysUntilEnd} jours.`,
          );

          await this.createNotification(
            service.clientId,
            NotificationType.SYSTEM,
            'Renouvellement de service',
            `Votre abonnement ${service.name} expire dans ${daysUntilEnd} jours.`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error sending renewal notifications: ${error}`);
    }
  }

  private async generateServiceMission(service: any) {
    // Check if mission already exists for this date
    const existingMission = await this.prisma.recurringServiceMission.findFirst({
      where: {
        recurringServiceId: service.id,
        scheduledDate: service.nextServiceDate,
      },
    });

    if (existingMission) {
      this.logger.log(`Mission already exists for service ${service.id}`);
      return;
    }

    // Create the mission
    const mission = await this.prisma.mission.create({
      data: {
        clientId: service.clientId,
        artisanId: service.artisanId,
        type: 'SCHEDULED',
        title: service.name,
        description: service.description || `Service récurrent: ${service.name}`,
        category: service.category,
        address: service.address,
        city: service.city,
        postalCode: service.postalCode,
        country: service.country,
        latitude: service.latitude || 0,
        longitude: service.longitude || 0,
        scheduledFor: service.nextServiceDate,
        agreedPrice: service.servicePrice,
        vatRate: 20,
      },
    });

    // Link to recurring service
    await this.prisma.recurringServiceMission.create({
      data: {
        recurringServiceId: service.id,
        missionId: mission.id,
        scheduledDate: service.nextServiceDate,
      },
    });

    // Calculate next service date
    const nextDate = this.calculateNextDate(service);

    // Update the recurring service
    await this.prisma.recurringService.update({
      where: { id: service.id },
      data: {
        nextServiceDate: nextDate,
        totalServices: { increment: 1 },
      },
    });

    // Send notification to artisan
    await this.createNotification(
      service.artisanId,
      NotificationType.NEW_MISSION,
      'Nouvelle mission créée',
      `Une mission a été créée pour ${service.name} - ${service.client.firstName} ${service.client.lastName}`,
    );

    this.logger.log(`Created mission ${mission.id} for recurring service ${service.id}`);
    return mission;
  }

  private calculateNextDate(service: any): Date {
    const current = new Date(service.nextServiceDate);
    const frequency = service.frequency;

    switch (frequency) {
      case 'WEEKLY':
        current.setDate(current.getDate() + 7);
        break;
      case 'BIWEEKLY':
        current.setDate(current.getDate() + 14);
        break;
      case 'MONTHLY':
        current.setMonth(current.getMonth() + 1);
        break;
      case 'QUARTERLY':
        current.setMonth(current.getMonth() + 3);
        break;
      case 'BIANNUALLY':
        current.setMonth(current.getMonth() + 6);
        break;
      case 'ANNUALLY':
        current.setFullYear(current.getFullYear() + 1);
        break;
    }

    // Adjust for scheduled day if specified
    if (service.scheduledDayOfMonth && frequency !== 'WEEKLY' && frequency !== 'BIWEEKLY') {
      current.setDate(service.scheduledDayOfMonth);
    }

    return current;
  }

  private async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
  ) {
    try {
      await this.prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error}`);
    }
  }

  // Manual trigger for testing
  async triggerDailyProcessing() {
    await this.processUpcomingServices();
    await this.sendUpcomingReminders();
    return { success: true, message: 'Daily processing triggered' };
  }
}
