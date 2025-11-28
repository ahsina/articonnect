import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';

interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  data?: Record<string, any>;
  createdAt: Date;
}

@Injectable()
@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 10000,
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit() {
    this.logger.log('Notification WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn('Connection attempt without token');
        client.disconnect();
        return;
      }

      const decoded = this.jwtService.verify(token);
      const userId = decoded.sub || decoded.userId;

      if (!userId) {
        client.disconnect();
        return;
      }

      client.data.userId = userId;

      // Join user's notification room
      client.join(`notifications:${userId}`);

      // Track socket
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Send unread count on connect
      const unreadCount = await this.getUnreadCount(userId);
      client.emit('unread_count', { count: unreadCount });

      // Send recent unread notifications
      const recentNotifications = await this.getRecentNotifications(userId);
      client.emit('notifications_sync', { notifications: recentNotifications });

      this.logger.debug(`User ${userId} connected to notifications`);
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id);
      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  // ============ PUBLIC METHODS FOR SENDING NOTIFICATIONS ============

  async sendNotification(userId: string, notification: NotificationPayload) {
    this.server.to(`notifications:${userId}`).emit('new_notification', notification);

    // Also update unread count
    const unreadCount = await this.getUnreadCount(userId);
    this.server.to(`notifications:${userId}`).emit('unread_count', { count: unreadCount });
  }

  async sendBulkNotifications(userIds: string[], notification: Omit<NotificationPayload, 'id'>) {
    for (const userId of userIds) {
      this.server.to(`notifications:${userId}`).emit('new_notification', {
        ...notification,
        id: `bulk-${Date.now()}-${userId}`,
      });
    }
  }

  async broadcastToAll(notification: Omit<NotificationPayload, 'id'>) {
    this.server.emit('broadcast_notification', {
      ...notification,
      id: `broadcast-${Date.now()}`,
    });
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  // ============ CLIENT EVENT HANDLERS ============

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { notificationId: string },
  ) {
    const userId = client.data.userId;

    try {
      await this.prisma.notification.updateMany({
        where: { id: payload.notificationId, userId },
        data: { read: true },
      });

      const unreadCount = await this.getUnreadCount(userId);
      client.emit('unread_count', { count: unreadCount });
      client.emit('notification_marked_read', { id: payload.notificationId });
    } catch (error) {
      this.logger.error('Error marking notification as read:', error);
    }
  }

  @SubscribeMessage('mark_all_read')
  async handleMarkAllRead(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;

    try {
      await this.prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });

      client.emit('unread_count', { count: 0 });
      client.emit('all_notifications_read', {});
    } catch (error) {
      this.logger.error('Error marking all notifications as read:', error);
    }
  }

  @SubscribeMessage('get_notifications')
  async handleGetNotifications(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { limit?: number; offset?: number },
  ) {
    const userId = client.data.userId;
    const limit = payload.limit || 20;
    const offset = payload.offset || 0;

    try {
      const notifications = await this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      client.emit('notifications_list', { notifications, offset, limit });
    } catch (error) {
      this.logger.error('Error getting notifications:', error);
    }
  }

  @SubscribeMessage('delete_notification')
  async handleDeleteNotification(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { notificationId: string },
  ) {
    const userId = client.data.userId;

    try {
      await this.prisma.notification.deleteMany({
        where: { id: payload.notificationId, userId },
      });

      const unreadCount = await this.getUnreadCount(userId);
      client.emit('unread_count', { count: unreadCount });
      client.emit('notification_deleted', { id: payload.notificationId });
    } catch (error) {
      this.logger.error('Error deleting notification:', error);
    }
  }

  // ============ HELPER METHODS ============

  private async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, read: false },
    });
  }

  private async getRecentNotifications(userId: string, limit = 10) {
    return this.prisma.notification.findMany({
      where: { userId, read: false },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
