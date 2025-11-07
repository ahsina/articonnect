import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from '../services/chat.service';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../guards/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private chatService: ChatService) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);

    // Extract user from token
    const token = client.handshake.auth.token;
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const user = await this.chatService.validateToken(token);
      client.data.userId = user.userId;

      // Join user's room
      client.join(`user:${user.userId}`);

      // Update user online status
      await this.chatService.setUserOnline(user.userId);

      console.log(`User ${user.userId} connected`);
    } catch (error) {
      console.error('Connection error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      await this.chatService.setUserOffline(userId);
      console.log(`User ${userId} disconnected`);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { receiverId: string; content: string; missionId?: string },
  ) {
    const senderId = client.data.userId;
    const { receiverId, content, missionId } = payload;

    try {
      // Save message to database
      const message = await this.chatService.createMessage({
        senderId,
        receiverId,
        content,
        missionId,
      });

      // Send to receiver
      this.server.to(`user:${receiverId}`).emit('new_message', {
        id: message.id,
        senderId,
        content,
        missionId,
        createdAt: message.createdAt,
        read: false,
      });

      // Confirm to sender
      client.emit('message_sent', {
        id: message.id,
        tempId: payload.tempId,
        createdAt: message.createdAt,
      });

      // Send push notification if user is offline
      const isOnline = await this.chatService.isUserOnline(receiverId);
      if (!isOnline) {
        await this.chatService.sendPushNotification(receiverId, {
          title: 'Nouveau message',
          body: content.substring(0, 50),
        });
      }
    } catch (error) {
      client.emit('error', { message: 'Failed to send message' });
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
      console.error('Mark read error:', error);
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
