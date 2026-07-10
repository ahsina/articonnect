import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from '../services/chat.service';
import { RedisService } from '../../common/redis/redis.service';
import { UseGuards, Logger } from '@nestjs/common';
import { WsJwtGuard } from '../guards/ws-jwt.guard';

// Connection limits
const MAX_CONNECTIONS_PER_USER = 5;
const CONNECTION_COUNT_KEY = (userId: string) => `ws:connections:${userId}`;
const CONNECTION_TTL = 86400; // 24 hours

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  // WebSocket optimization: Enable heartbeat/ping-pong
  pingInterval: 25000, // Send ping every 25 seconds
  pingTimeout: 10000, // Wait 10 seconds for pong before disconnecting
  // Limit payload size to prevent DoS
  maxHttpBufferSize: 1e6, // 1MB max
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private chatService: ChatService,
    private redis: RedisService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized with heartbeat enabled');
  }

  async handleConnection(client: Socket) {
    // Extract user from token
    const token = client.handshake.auth.token;
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const user = await this.chatService.validateToken(token);
      client.data.userId = user.userId;

      // Check connection limit per user
      const connectionCount = await this.incrementConnectionCount(user.userId);
      if (connectionCount > MAX_CONNECTIONS_PER_USER) {
        this.logger.warn(`User ${user.userId} exceeded max connections (${connectionCount})`);
        await this.decrementConnectionCount(user.userId);
        client.emit('error', {
          message: 'Too many connections',
          code: 'MAX_CONNECTIONS_EXCEEDED',
        });
        client.disconnect();
        return;
      }

      // Join user's room
      client.join(`user:${user.userId}`);

      // Update user online status
      await this.chatService.setUserOnline(user.userId);

      this.logger.debug(`User ${user.userId} connected (connection #${connectionCount})`);
    } catch (error) {
      // Log sanitized error without exposing sensitive details
      this.logger.error('WebSocket connection error', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        clientId: client.id,
      });
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      try {
        // Decrement connection count
        await this.decrementConnectionCount(userId);

        // Check if user has any remaining connections before setting offline
        const remainingConnections = await this.getConnectionCount(userId);
        if (remainingConnections <= 0) {
          await this.chatService.setUserOffline(userId);
        }
      } catch (error) {
        this.logger.error('Error handling disconnect', {
          userId,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  // ================================
  // CONNECTION MANAGEMENT HELPERS
  // ================================

  private async incrementConnectionCount(userId: string): Promise<number> {
    const key = CONNECTION_COUNT_KEY(userId);
    const count = await this.redis.incr(key);
    await this.redis.expire(key, CONNECTION_TTL);
    return count;
  }

  private async decrementConnectionCount(userId: string): Promise<void> {
    const key = CONNECTION_COUNT_KEY(userId);
    const client = this.redis.getClient();
    await client.decr(key);
  }

  private async getConnectionCount(userId: string): Promise<number> {
    const key = CONNECTION_COUNT_KEY(userId);
    const count = await this.redis.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { receiverId: string; content: string; missionId?: string; tempId?: string },
  ) {
    const senderId = client.data.userId;
    const { receiverId, content, missionId } = payload;

    try {
      // Save message to database. createMessage applique le content-filter et
      // renvoie `message.content` = contenu FILTRÉ en clair (jamais le brut).
      const message = await this.chatService.createMessage({
        senderId,
        receiverId,
        content,
        missionId,
      });

      // ⚠️ Anti-désintermédiation : on diffuse le contenu FILTRÉ (message.content),
      // JAMAIS le `content` brut du payload, sinon le masquage ne s'applique pas en
      // temps réel côté destinataire.
      const safeContent = message.content;

      // Send to receiver
      this.server.to(`user:${receiverId}`).emit('new_message', {
        id: message.id,
        senderId,
        content: safeContent,
        missionId,
        createdAt: message.createdAt,
        read: false,
      });

      // Confirm to sender
      client.emit('message_sent', {
        id: message.id,
        tempId: payload.tempId,
        content: safeContent,
        createdAt: message.createdAt,
      });

      // Send push notification if user is offline (contenu filtré uniquement)
      const isOnline = await this.chatService.isUserOnline(receiverId);
      if (!isOnline) {
        await this.chatService.sendPushNotification(receiverId, {
          title: 'Nouveau message',
          body: safeContent.substring(0, 50),
        });
      }
    } catch (error) {
      this.logger.error('Error sending message', {
        senderId,
        receiverId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      client.emit('error', { message: 'Failed to send message', code: 'MESSAGE_SEND_FAILED' });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { messageId: string },
  ) {
    const userId = client.data.userId;

    try {
      await this.chatService.markAsRead(payload.messageId, userId);

      // Notify sender that message was read
      const message = await this.chatService.getMessage(payload.messageId);
      this.server.to(`user:${message.senderId}`).emit('message_read', {
        messageId: payload.messageId,
      });
    } catch (error) {
      this.logger.error('Error marking message as read', {
        userId,
        messageId: payload.messageId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { receiverId: string; isTyping: boolean },
  ) {
    const senderId = client.data.userId;

    this.server.to(`user:${payload.receiverId}`).emit('user_typing', {
      userId: senderId,
      isTyping: payload.isTyping,
    });
  }
}
