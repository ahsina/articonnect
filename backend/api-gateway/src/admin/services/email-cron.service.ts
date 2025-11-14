import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../../email/services/email.service';
import { MissionStatus, UserRole } from '@prisma/client';

@Injectable()
export class EmailCronService {
  private readonly logger = new Logger(EmailCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_WEEK, {
    name: 'weekly-client-summaries',
    timeZone: 'Europe/Paris',
  })
  async sendWeeklyClientSummaries() {
    this.logger.log('Starting weekly client summary emails...');

    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const clients = await this.prisma.user.findMany({
        where: {
          role: UserRole.CLIENT,
          emailVerified: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      let successCount = 0;
      let errorCount = 0;

      for (const client of clients) {
        try {
          const [activeMissions, completedMissions, payments, upcomingMissions] = await Promise.all([
            this.prisma.mission.count({
              where: {
                clientId: client.id,
                status: {
                  in: [MissionStatus.PENDING, MissionStatus.ACCEPTED, MissionStatus.IN_PROGRESS],
                },
              },
            }),

            this.prisma.mission.count({
              where: {
                clientId: client.id,
                status: MissionStatus.COMPLETED,
                updatedAt: { gte: oneWeekAgo },
              },
            }),

            this.prisma.payment.aggregate({
              where: {
                mission: { clientId: client.id },
                createdAt: { gte: oneWeekAgo },
              },
              _sum: { amount: true },
            }),

            this.prisma.mission.findMany({
              where: {
                clientId: client.id,
                status: {
                  in: [MissionStatus.ACCEPTED, MissionStatus.IN_PROGRESS],
                },
                scheduledFor: { gte: new Date() },
              },
              take: 5,
              orderBy: { scheduledFor: 'asc' },
              include: {
                artisan: {
                  include: {
                    artisanProfile: true,
                  },
                },
              },
            }),
          ]);

          const totalSpent = Number(payments._sum.amount || 0);

          const upcomingFormatted = upcomingMissions.map((mission) => ({
            title: mission.title,
            date: mission.scheduledFor
              ? new Intl.DateTimeFormat('fr-FR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                }).format(mission.scheduledFor)
              : 'À planifier',
            artisanName: mission.artisan.artisanProfile?.companyName ||
              `${mission.artisan.firstName} ${mission.artisan.lastName}`,
          }));

          await this.emailService.sendWeeklyClientSummaryEmail(
            client.email,
            client.firstName,
            activeMissions,
            completedMissions,
            totalSpent,
            upcomingFormatted,
          );

          successCount++;
        } catch (error) {
          this.logger.error(`Failed to send weekly summary to client ${client.email}`, error);
          errorCount++;
        }
      }

      this.logger.log(
        `Weekly client summaries sent: ${successCount} success, ${errorCount} errors`,
      );
    } catch (error) {
      this.logger.error('Failed to send weekly client summaries', error);
    }
  }

  @Cron(CronExpression.EVERY_WEEK, {
    name: 'weekly-artisan-summaries',
    timeZone: 'Europe/Paris',
  })
  async sendWeeklyArtisanSummaries() {
    this.logger.log('Starting weekly artisan summary emails...');

    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const artisans = await this.prisma.user.findMany({
        where: {
          role: UserRole.ARTISAN,
          emailVerified: true,
        },
        include: {
          artisanProfile: true,
        },
      });

      let successCount = 0;
      let errorCount = 0;

      for (const artisan of artisans) {
        try {
          const [activeMissions, completedMissions, payments, reviews] = await Promise.all([
            this.prisma.mission.count({
              where: {
                artisanId: artisan.id,
                status: {
                  in: [MissionStatus.ACCEPTED, MissionStatus.IN_PROGRESS],
                },
              },
            }),

            this.prisma.mission.count({
              where: {
                artisanId: artisan.id,
                status: MissionStatus.COMPLETED,
                updatedAt: { gte: oneWeekAgo },
              },
            }),

            this.prisma.payment.aggregate({
              where: {
                mission: { artisanId: artisan.id },
                createdAt: { gte: oneWeekAgo },
              },
              _sum: { amount: true },
            }),

            this.prisma.review.aggregate({
              where: {
                reviewedId: artisan.id,
              },
              _avg: { overallRating: true },
              _count: { id: true },
            }),
          ]);

          const newReviewsCount = await this.prisma.review.count({
            where: {
              reviewedId: artisan.id,
              createdAt: { gte: oneWeekAgo },
            },
          });

          const totalEarned = Number(payments._sum.amount || 0);
          const averageRating = Number(reviews._avg.overallRating || 0);

          const artisanName = artisan.artisanProfile?.companyName ||
            `${artisan.firstName} ${artisan.lastName}`;

          await this.emailService.sendWeeklyArtisanSummaryEmail(
            artisan.email,
            artisanName,
            activeMissions,
            completedMissions,
            totalEarned,
            averageRating,
            newReviewsCount,
          );

          successCount++;
        } catch (error) {
          this.logger.error(`Failed to send weekly summary to artisan ${artisan.email}`, error);
          errorCount++;
        }
      }

      this.logger.log(
        `Weekly artisan summaries sent: ${successCount} success, ${errorCount} errors`,
      );
    } catch (error) {
      this.logger.error('Failed to send weekly artisan summaries', error);
    }
  }

  async sendMissionCreatedNotificationEmails(missionId: string) {
    try {
      const mission = await this.prisma.mission.findUnique({
        where: { id: missionId },
        include: {
          client: true,
        },
      });

      if (!mission) {
        this.logger.warn(`Mission ${missionId} not found for email notification`);
        return;
      }

      const clientName = `${mission.client.firstName} ${mission.client.lastName}`;
      const budget = Number(mission.clientBudget || mission.agreedPrice || 0);

      await this.emailService.sendMissionCreatedEmail(
        mission.client.email,
        clientName,
        mission.title,
        mission.id,
        budget,
        mission.category,
      );

      this.logger.log(`Mission created email sent to ${mission.client.email}`);
    } catch (error) {
      this.logger.error(`Failed to send mission created email for ${missionId}`, error);
    }
  }

  async sendMissionAcceptedNotificationEmail(missionId: string) {
    try {
      const mission = await this.prisma.mission.findUnique({
        where: { id: missionId },
        include: {
          client: true,
          artisan: {
            include: {
              artisanProfile: true,
            },
          },
        },
      });

      if (!mission || !mission.artisan) {
        this.logger.warn(`Mission ${missionId} not found or has no artisan`);
        return;
      }

      const clientName = `${mission.client.firstName} ${mission.client.lastName}`;
      const artisanName = mission.artisan.artisanProfile?.companyName ||
        `${mission.artisan.firstName} ${mission.artisan.lastName}`;

      const scheduledDate = mission.scheduledFor
        ? new Intl.DateTimeFormat('fr-FR', {
            dateStyle: 'long',
            timeStyle: 'short',
          }).format(mission.scheduledFor)
        : 'À planifier';

      await this.emailService.sendMissionAcceptedEmail(
        mission.client.email,
        clientName,
        artisanName,
        mission.title,
        mission.id,
        scheduledDate,
      );

      this.logger.log(`Mission accepted email sent to ${mission.client.email}`);
    } catch (error) {
      this.logger.error(`Failed to send mission accepted email for ${missionId}`, error);
    }
  }

  async sendMissionCompletedNotificationEmail(missionId: string) {
    try {
      const mission = await this.prisma.mission.findUnique({
        where: { id: missionId },
        include: {
          client: true,
          artisan: {
            include: {
              artisanProfile: true,
            },
          },
        },
      });

      if (!mission || !mission.artisan) {
        this.logger.warn(`Mission ${missionId} not found or has no artisan`);
        return;
      }

      const clientName = `${mission.client.firstName} ${mission.client.lastName}`;
      const artisanName = mission.artisan.artisanProfile?.companyName ||
        `${mission.artisan.firstName} ${mission.artisan.lastName}`;

      await this.emailService.sendMissionCompletedEmail(
        mission.client.email,
        clientName,
        artisanName,
        mission.title,
        mission.id,
      );

      this.logger.log(`Mission completed email sent to ${mission.client.email}`);
    } catch (error) {
      this.logger.error(`Failed to send mission completed email for ${missionId}`, error);
    }
  }

  async sendPaymentReceivedNotificationEmail(paymentId: string) {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          mission: {
            include: {
              artisan: {
                include: {
                  artisanProfile: true,
                },
              },
            },
          },
        },
      });

      if (!payment || !payment.mission.artisan) {
        this.logger.warn(`Payment ${paymentId} not found or has no artisan`);
        return;
      }

      const artisanName = payment.mission.artisan.artisanProfile?.companyName ||
        `${payment.mission.artisan.firstName} ${payment.mission.artisan.lastName}`;

      const amount = Number(payment.amount);

      await this.emailService.sendPaymentReceivedEmail(
        payment.mission.artisan.email,
        artisanName,
        amount,
        payment.mission.title,
        payment.mission.id,
      );

      this.logger.log(`Payment received email sent to ${payment.mission.artisan.email}`);
    } catch (error) {
      this.logger.error(`Failed to send payment received email for ${paymentId}`, error);
    }
  }
}
