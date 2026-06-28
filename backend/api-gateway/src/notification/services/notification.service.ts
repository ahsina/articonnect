import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FcmService } from '../../fcm/services/fcm.service';
import { NotificationGateway } from '../gateways/notification.gateway';
import { Cron, CronExpression } from '@nestjs/schedule';

// Notification channel types
export enum NotificationChannel {
  IN_APP = 'IN_APP',
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

// Notification priority
export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// Template types
export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  titleTemplate: string;
  messageTemplate: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  variables: string[];
}

// Notification preferences interface
export interface NotificationPreferences {
  inApp: boolean;
  push: boolean;
  email: boolean;
  sms: boolean;
  quietHoursStart?: string; // HH:mm format
  quietHoursEnd?: string;
  emailDigest: 'INSTANT' | 'DAILY' | 'WEEKLY' | 'NONE';
  disabledTypes: NotificationType[];
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  // Default notification templates
  private readonly templates: Map<string, NotificationTemplate> = new Map([
    ['mission_created', {
      id: 'mission_created',
      name: 'New Mission Available',
      type: NotificationType.NEW_MISSION,
      titleTemplate: 'Nouvelle mission disponible',
      messageTemplate: 'Une nouvelle mission "{{missionTitle}}" est disponible pres de vous',
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      priority: NotificationPriority.HIGH,
      variables: ['missionTitle', 'missionId'],
    }],
    ['mission_accepted', {
      id: 'mission_accepted',
      name: 'Mission Accepted',
      type: NotificationType.MISSION_ACCEPTED,
      titleTemplate: 'Mission acceptee',
      messageTemplate: '{{artisanName}} a accepte votre mission',
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH, NotificationChannel.EMAIL],
      priority: NotificationPriority.HIGH,
      variables: ['artisanName', 'missionId'],
    }],
    ['mission_completed', {
      id: 'mission_completed',
      name: 'Mission Completed',
      type: NotificationType.MISSION_COMPLETED,
      titleTemplate: 'Mission terminee',
      messageTemplate: 'Votre mission est terminee. Vous pouvez laisser un avis.',
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH, NotificationChannel.EMAIL],
      priority: NotificationPriority.NORMAL,
      variables: ['missionId'],
    }],
    ['payment_received', {
      id: 'payment_received',
      name: 'Payment Received',
      type: NotificationType.PAYMENT_RECEIVED,
      titleTemplate: 'Paiement recu',
      messageTemplate: 'Vous avez recu un paiement de {{amount}}€',
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH, NotificationChannel.EMAIL],
      priority: NotificationPriority.HIGH,
      variables: ['amount', 'missionId'],
    }],
    ['review_new', {
      id: 'review_new',
      name: 'New Review',
      type: NotificationType.REVIEW_NEW,
      titleTemplate: 'Nouvel avis',
      messageTemplate: '{{clientName}} vous a laisse un avis de {{rating}} etoiles',
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      priority: NotificationPriority.NORMAL,
      variables: ['clientName', 'rating'],
    }],
    ['message_new', {
      id: 'message_new',
      name: 'New Message',
      type: NotificationType.MESSAGE_NEW,
      titleTemplate: 'Nouveau message',
      messageTemplate: '{{senderName}} vous a envoye un message',
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      priority: NotificationPriority.NORMAL,
      variables: ['senderName', 'conversationId'],
    }],
    ['negotiation_new', {
      id: 'negotiation_new',
      name: 'New Negotiation',
      type: NotificationType.NEGOTIATION_NEW,
      titleTemplate: 'Nouvelle proposition de prix',
      messageTemplate: 'Vous avez recu une proposition de {{proposedPrice}}€',
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      priority: NotificationPriority.HIGH,
      variables: ['proposedPrice', 'missionId'],
    }],
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fcmService: FcmService,
    @Inject(forwardRef(() => NotificationGateway))
    private readonly notificationGateway: NotificationGateway,
  ) {}

  // ==================== CORE NOTIFICATION METHODS ====================

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
    metadata?: Record<string, unknown>,
    options?: {
      channels?: NotificationChannel[];
      priority?: NotificationPriority;
      scheduledFor?: Date;
    },
  ) {
    // Check user preferences
    const preferences = await this.getUserPreferences(userId);

    // Check if notification type is disabled
    if (preferences.disabledTypes?.includes(type)) {
      return null;
    }

    // Check quiet hours
    if (this.isInQuietHours(preferences)) {
      // Schedule for after quiet hours if urgent, otherwise skip push/sms
      if (options?.priority !== NotificationPriority.URGENT) {
        options = {
          ...options,
          channels: options?.channels?.filter(c =>
            c !== NotificationChannel.PUSH && c !== NotificationChannel.SMS
          ),
        };
      }
    }

    // Handle scheduled notifications
    if (options?.scheduledFor && options.scheduledFor > new Date()) {
      return this.scheduleNotification(userId, type, title, message, link, metadata, options.scheduledFor);
    }

    // Create in-app notification
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
        metadata: metadata as never || {},
        read: false,
        priority: options?.priority || NotificationPriority.NORMAL,
      },
    });

    const channels = options?.channels || [NotificationChannel.IN_APP, NotificationChannel.PUSH];

    // Send to each enabled channel
    await this.sendToChannels(userId, notification, channels, preferences);

    return notification;
  }

  private async sendToChannels(
    userId: string,
    notification: any,
    channels: NotificationChannel[],
    preferences: NotificationPreferences,
  ) {
    const sendPromises: Promise<void>[] = [];

    // In-App (WebSocket)
    if (channels.includes(NotificationChannel.IN_APP) && preferences.inApp) {
      sendPromises.push(this.sendWebSocket(userId, notification));
    }

    // Push (FCM)
    if (channels.includes(NotificationChannel.PUSH) && preferences.push) {
      const isOnline = this.notificationGateway.isUserOnline(userId);
      if (!isOnline) {
        sendPromises.push(this.sendPush(userId, notification));
      }
    }

    // Email
    if (channels.includes(NotificationChannel.EMAIL) && preferences.email) {
      if (preferences.emailDigest === 'INSTANT') {
        sendPromises.push(this.sendEmail(userId, notification));
      } else if (preferences.emailDigest !== 'NONE') {
        // Queue for digest
        sendPromises.push(this.queueEmailDigest(userId, notification));
      }
    }

    // SMS
    if (channels.includes(NotificationChannel.SMS) && preferences.sms) {
      sendPromises.push(this.sendSms(userId, notification));
    }

    await Promise.allSettled(sendPromises);
  }

  private async sendWebSocket(userId: string, notification: any): Promise<void> {
    try {
      await this.notificationGateway.sendNotification(userId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        data: notification.metadata,
        createdAt: notification.createdAt,
      });
    } catch (error) {
      this.logger.error(`WebSocket notification failed for user ${userId}:`, error);
    }
  }

  private async sendPush(userId: string, notification: any): Promise<void> {
    try {
      await this.fcmService.sendToUser(userId, {
        title: notification.title,
        body: notification.message,
        data: {
          type: notification.type,
          notificationId: notification.id,
          ...(notification.link && { link: notification.link }),
          ...(notification.metadata && {
            metadata: JSON.stringify(notification.metadata),
          }),
        },
      });
    } catch (error) {
      this.logger.error(`Push notification failed for user ${userId}:`, error);
    }
  }

  private async sendEmail(userId: string, notification: any): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true },
      });

      if (!user?.email) return;

      // Queue email for sending (would integrate with email service)
      await this.prisma.emailQueue.create({
        data: {
          to: user.email,
          subject: notification.title,
          template: 'notification',
          variables: {
            firstName: user.firstName,
            title: notification.title,
            message: notification.message,
            link: notification.link,
            notificationType: notification.type,
          },
          status: 'PENDING',
        },
      });
    } catch (error) {
      this.logger.error(`Email notification failed for user ${userId}:`, error);
    }
  }

  private async sendSms(userId: string, notification: any): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true, phoneVerified: true },
      });

      if (!user?.phone || !user.phoneVerified) return;

      // Queue SMS for sending (would integrate with Twilio or similar)
      await this.prisma.smsQueue.create({
        data: {
          to: user.phone,
          message: `${notification.title}: ${notification.message}`,
          status: 'PENDING',
          notificationId: notification.id,
        },
      });
    } catch (error) {
      this.logger.error(`SMS notification failed for user ${userId}:`, error);
    }
  }

  private async queueEmailDigest(userId: string, notification: any): Promise<void> {
    try {
      await this.prisma.emailDigestQueue.create({
        data: {
          userId,
          notificationId: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          link: notification.link,
        },
      });
    } catch (error) {
      this.logger.error(`Email digest queue failed for user ${userId}:`, error);
    }
  }

  // ==================== SCHEDULED NOTIFICATIONS ====================

  async scheduleNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
    metadata?: Record<string, unknown>,
    scheduledFor?: Date,
  ) {
    return this.prisma.scheduledNotification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
        metadata: metadata as never || {},
        scheduledFor: scheduledFor || new Date(),
        status: 'PENDING',
      },
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledNotifications() {
    const pendingNotifications = await this.prisma.scheduledNotification.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: new Date() },
      },
      take: 100,
    });

    for (const scheduled of pendingNotifications) {
      try {
        await this.createNotification(
          scheduled.userId,
          scheduled.type as NotificationType,
          scheduled.title,
          scheduled.message,
          scheduled.link || undefined,
          scheduled.metadata as Record<string, unknown>,
        );

        await this.prisma.scheduledNotification.update({
          where: { id: scheduled.id },
          data: { status: 'SENT' },
        });
      } catch (error) {
        this.logger.error(`Failed to process scheduled notification ${scheduled.id}:`, error);

        await this.prisma.scheduledNotification.update({
          where: { id: scheduled.id },
          data: { status: 'FAILED' },
        });
      }
    }
  }

  // ==================== BATCH NOTIFICATIONS ====================

  async sendBatchNotification(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
    metadata?: Record<string, unknown>,
  ) {
    const results = await Promise.allSettled(
      userIds.map(userId =>
        this.createNotification(userId, type, title, message, link, metadata)
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      total: userIds.length,
      successful,
      failed,
    };
  }

  async sendToAllUsers(
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
    metadata?: Record<string, unknown>,
    filters?: {
      role?: string;
      activeAfter?: Date;
    },
  ) {
    const where: any = { status: 'ACTIVE' };
    if (filters?.role) where.role = filters.role;
    if (filters?.activeAfter) where.lastLoginAt = { gte: filters.activeAfter };

    const users = await this.prisma.user.findMany({
      where,
      select: { id: true },
    });

    return this.sendBatchNotification(
      users.map(u => u.id),
      type,
      title,
      message,
      link,
      metadata,
    );
  }

  // ==================== TEMPLATE-BASED NOTIFICATIONS ====================

  async sendFromTemplate(
    userId: string,
    templateId: string,
    variables: Record<string, any>,
    link?: string,
  ) {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const title = this.interpolateTemplate(template.titleTemplate, variables);
    const message = this.interpolateTemplate(template.messageTemplate, variables);

    return this.createNotification(
      userId,
      template.type,
      title,
      message,
      link,
      variables,
      {
        channels: template.channels,
        priority: template.priority,
      },
    );
  }

  private interpolateTemplate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  getTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  // ==================== USER PREFERENCES ====================

  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      // Return defaults
      return {
        inApp: true,
        push: true,
        email: true,
        sms: false,
        emailDigest: 'INSTANT',
        disabledTypes: [],
      };
    }

    return {
      inApp: prefs.inApp,
      push: prefs.push,
      email: prefs.email,
      sms: prefs.sms,
      quietHoursStart: prefs.quietHoursStart || undefined,
      quietHoursEnd: prefs.quietHoursEnd || undefined,
      emailDigest: prefs.emailDigest as NotificationPreferences['emailDigest'],
      disabledTypes: (prefs.disabledTypes || []) as NotificationType[],
    };
  }

  async updateUserPreferences(userId: string, preferences: Partial<NotificationPreferences>) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        ...preferences,
        disabledTypes: preferences.disabledTypes as any,
      },
      create: {
        userId,
        inApp: preferences.inApp ?? true,
        push: preferences.push ?? true,
        email: preferences.email ?? true,
        sms: preferences.sms ?? false,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
        emailDigest: preferences.emailDigest ?? 'INSTANT',
        disabledTypes: preferences.disabledTypes as any || [],
      },
    });
  }

  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = preferences.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = preferences.quietHoursEnd.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  // ==================== BASIC NOTIFICATION METHODS ====================

  async getUserNotifications(userId: string, limit = 20, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { read: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        read: true,
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });
  }

  async deleteNotification(notificationId: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  // ==================== HELPER METHODS FOR SPECIFIC NOTIFICATION TYPES ====================

  async notifyMissionCreated(artisanId: string, missionId: string, missionTitle: string) {
    return this.sendFromTemplate(artisanId, 'mission_created', {
      missionTitle,
      missionId,
    }, `/artisan/missions/${missionId}`);
  }

  async notifyMissionAccepted(clientId: string, missionId: string, artisanName: string) {
    return this.sendFromTemplate(clientId, 'mission_accepted', {
      artisanName,
      missionId,
    }, `/client/missions/${missionId}`);
  }

  async notifyMissionCompleted(clientId: string, missionId: string) {
    return this.sendFromTemplate(clientId, 'mission_completed', {
      missionId,
    }, `/client/missions/${missionId}/review`);
  }

  async notifyNegotiationReceived(userId: string, missionId: string, proposedPrice: number) {
    return this.sendFromTemplate(userId, 'negotiation_new', {
      proposedPrice,
      missionId,
    }, `/missions/${missionId}`);
  }

  async notifyPaymentReceived(artisanId: string, amount: number, missionId: string) {
    return this.sendFromTemplate(artisanId, 'payment_received', {
      amount,
      missionId,
    }, `/artisan/missions/${missionId}`);
  }

  async notifyNewReview(artisanId: string, rating: number, clientName: string) {
    return this.sendFromTemplate(artisanId, 'review_new', {
      clientName,
      rating,
    }, '/artisan/reviews');
  }

  async notifyNewMessage(userId: string, senderName: string, conversationId: string) {
    return this.sendFromTemplate(userId, 'message_new', {
      senderName,
      conversationId,
    }, `/messages/${conversationId}`);
  }

  // ==================== EMAIL DIGEST PROCESSING ====================

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async processDailyEmailDigests() {
    await this.processEmailDigests('DAILY');
  }

  @Cron('0 8 * * 1') // Every Monday at 8 AM
  async processWeeklyEmailDigests() {
    await this.processEmailDigests('WEEKLY');
  }

  private async processEmailDigests(frequency: 'DAILY' | 'WEEKLY') {
    const cutoffDate = new Date();
    if (frequency === 'DAILY') {
      cutoffDate.setDate(cutoffDate.getDate() - 1);
    } else {
      cutoffDate.setDate(cutoffDate.getDate() - 7);
    }

    // Get users with this digest preference
    const users = await this.prisma.notificationPreference.findMany({
      where: { emailDigest: frequency },
      select: { userId: true },
    });

    for (const { userId } of users) {
      const digestItems = await this.prisma.emailDigestQueue.findMany({
        where: {
          userId,
          createdAt: { gte: cutoffDate },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (digestItems.length === 0) continue;

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true },
      });

      if (!user?.email) continue;

      // Create digest email
      await this.prisma.emailQueue.create({
        data: {
          to: user.email,
          subject: `Votre resume ${frequency === 'DAILY' ? 'quotidien' : 'hebdomadaire'} Krafolt`,
          template: 'notification_digest',
          variables: {
            firstName: user.firstName,
            notifications: digestItems.map(item => ({
              type: item.type,
              title: item.title,
              message: item.message,
              link: item.link,
            })),
            count: digestItems.length,
            frequency,
          },
          status: 'PENDING',
        },
      });

      // Mark as processed
      await this.prisma.emailDigestQueue.deleteMany({
        where: {
          id: { in: digestItems.map(d => d.id) },
        },
      });
    }
  }

  // ==================== ANALYTICS ====================

  async getNotificationAnalytics(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [total, readCount, byType] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, read: true } }),
      this.prisma.notification.groupBy({
        by: ['type'],
        where,
        _count: true,
      }),
    ]);

    const readRate = total > 0 ? Math.round((readCount / total) * 100) : 0;

    return {
      total,
      readCount,
      unreadCount: total - readCount,
      byType: byType.map(t => ({ type: t.type, count: t._count })),
      readRate,
    };
  }
}
