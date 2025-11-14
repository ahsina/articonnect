import { Injectable, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private jwtService: JwtService,
  ) {}

  async validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async createMessage(data: {
    senderId: string;
    receiverId: string;
    content: string;
    missionId?: string;
  }) {
    return this.prisma.message.create({
      data: {
        senderId: data.senderId,
        receiverId: data.receiverId,
        content: data.content,
      },
    });
  }

  async getMessage(messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  async getConversation(userId: string, otherUserId: string, limit: number = 50) {
    return this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });
  }

  async getConversations(userId: string) {
    // Get unique users the current user has chatted with
    const conversations = await this.prisma.$queryRaw`
      SELECT DISTINCT ON (other_user_id)
        other_user_id,
        last_message,
        last_message_at,
        unread_count
      FROM (
        SELECT
          CASE
            WHEN sender_id = ${userId} THEN receiver_id
            ELSE sender_id
          END as other_user_id,
          content as last_message,
          created_at as last_message_at,
          CASE WHEN receiver_id = ${userId} AND read = false THEN 1 ELSE 0 END as unread_count
        FROM messages
        WHERE sender_id = ${userId} OR receiver_id = ${userId}
        ORDER BY created_at DESC
      ) as conversations
      ORDER BY other_user_id, last_message_at DESC
    `;

    return conversations;
  }

  async markAsRead(messageId: string, userId: string) {
    const message = await this.getMessage(messageId);

    if (message.receiverId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async markConversationAsRead(userId: string, otherUserId: string) {
    return this.prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async setUserOnline(userId: string) {
    const client = this.redis.getClient();
    await client.setex(`user:online:${userId}`, 300, 'true'); // 5 min TTL
  }

  async setUserOffline(userId: string) {
    const client = this.redis.getClient();
    await client.del(`user:online:${userId}`);
  }

  async isUserOnline(userId: string): Promise<boolean> {
    const client = this.redis.getClient();
    const status = await client.get(`user:online:${userId}`);
    return status === 'true';
  }

  async sendPushNotification(_userId: string, _notification: { title: string; body: string }) {
    // TODO: Implement push notification (FCM)
    // Placeholder - will be implemented when FCM is configured
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.getMessage(messageId);

    if (message.senderId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    return this.prisma.message.delete({
      where: { id: messageId },
    });
  }
}
