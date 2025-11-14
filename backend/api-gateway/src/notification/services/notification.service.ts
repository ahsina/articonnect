import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FcmService } from '../../fcm/services/fcm.service';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fcmService: FcmService,
  ) {}

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
    metadata?: Record<string, unknown>,
  ) {
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
      },
    });

    // Send push notification via FCM
    await this.fcmService.sendToUser(userId, {
      title,
      body: message,
      data: {
        type,
        notificationId: notification.id,
        ...(link && { link }),
        ...(metadata && {
          metadata: JSON.stringify(metadata),
        }),
      },
    });

    return notification;
  }

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

  // Helper methods for creating specific notification types
  async notifyMissionCreated(artisanId: string, missionId: string, missionTitle: string) {
    await this.createNotification(
      artisanId,
      NotificationType.NEW_MISSION,
      'Nouvelle mission disponible',
      `Une nouvelle mission "${missionTitle}" est disponible près de vous`,
      `/artisan/missions/${missionId}`,
      { missionId },
    );
  }

  async notifyMissionAccepted(clientId: string, missionId: string, artisanName: string) {
    await this.createNotification(
      clientId,
      NotificationType.MISSION_ACCEPTED,
      'Mission acceptée',
      `${artisanName} a accepté votre mission`,
      `/client/missions/${missionId}`,
      { missionId },
    );
  }

  async notifyMissionCompleted(clientId: string, missionId: string) {
    await this.createNotification(
      clientId,
      NotificationType.MISSION_COMPLETED,
      'Mission terminée',
      'Votre mission est terminée. Vous pouvez laisser un avis.',
      `/client/missions/${missionId}/review`,
      { missionId },
    );
  }

  async notifyNegotiationReceived(userId: string, missionId: string, proposedPrice: number) {
    await this.createNotification(
      userId,
      NotificationType.NEGOTIATION_NEW,
      'Nouvelle proposition de prix',
      `Vous avez reçu une proposition de ${proposedPrice}€`,
      `/missions/${missionId}`,
      { missionId, proposedPrice },
    );
  }

  async notifyPaymentReceived(artisanId: string, amount: number, missionId: string) {
    await this.createNotification(
      artisanId,
      NotificationType.PAYMENT_RECEIVED,
      'Paiement reçu',
      `Vous avez reçu un paiement de ${amount}€`,
      `/artisan/missions/${missionId}`,
      { missionId, amount },
    );
  }

  async notifyNewReview(artisanId: string, rating: number, clientName: string) {
    await this.createNotification(
      artisanId,
      NotificationType.REVIEW_NEW,
      'Nouvel avis',
      `${clientName} vous a laissé un avis de ${rating} étoiles`,
      '/artisan/reviews',
      { rating },
    );
  }

  async notifyNewMessage(userId: string, senderName: string, conversationId: string) {
    await this.createNotification(
      userId,
      NotificationType.MESSAGE_NEW,
      'Nouveau message',
      `${senderName} vous a envoyé un message`,
      `/messages/${conversationId}`,
      { conversationId },
    );
  }
}
