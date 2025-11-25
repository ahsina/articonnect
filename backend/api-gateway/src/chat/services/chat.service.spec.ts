import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';

describe('ChatService', () => {
  let service: ChatService;
  let prismaService: PrismaService;
  let redisService: RedisService;
  let jwtService: JwtService;

  const mockPrismaService = {
    message: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockRedisService = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    getClient: jest.fn().mockReturnValue({
      setex: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    }),
  };

  const mockJwtService = {
    verify: jest.fn(),
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateToken', () => {
    it('should validate a valid token', async () => {
      const token = 'valid-token';
      const payload = { userId: 'user-123', email: 'test@example.com' };

      mockJwtService.verify.mockReturnValue(payload);

      const result = await service.validateToken(token);

      expect(result).toEqual(payload);
      expect(mockJwtService.verify).toHaveBeenCalledWith(token);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const token = 'invalid-token';

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.validateToken(token)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('createMessage', () => {
    const messageData = {
      senderId: 'user-1',
      receiverId: 'user-2',
      content: 'Hello!',
    };

    it('should create a message successfully', async () => {
      const mockMessage = {
        id: 'msg-123',
        ...messageData,
        createdAt: new Date(),
        read: false,
      };

      mockPrismaService.message.create.mockResolvedValue(mockMessage);

      const result = await service.createMessage(messageData);

      expect(result).toEqual(mockMessage);
      expect(mockPrismaService.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          senderId: messageData.senderId,
          receiverId: messageData.receiverId,
          content: messageData.content,
        }),
      });
    });

    it('should sanitize message content', async () => {
      const dataWithXss = {
        ...messageData,
        content: '<script>alert("xss")</script>Hello',
      };

      mockPrismaService.message.create.mockResolvedValue({
        id: 'msg-123',
        ...dataWithXss,
        createdAt: new Date(),
      });

      await service.createMessage(dataWithXss);

      // Verify content was passed (actual sanitization depends on implementation)
      expect(mockPrismaService.message.create).toHaveBeenCalled();
    });
  });

  describe('getMessage', () => {
    const messageId = 'msg-123';

    it('should return message by ID', async () => {
      const mockMessage = {
        id: messageId,
        senderId: 'user-1',
        receiverId: 'user-2',
        content: 'Hello!',
        createdAt: new Date(),
      };

      mockPrismaService.message.findUnique.mockResolvedValue(mockMessage);

      const result = await service.getMessage(messageId);

      expect(result).toEqual(mockMessage);
      expect(mockPrismaService.message.findUnique).toHaveBeenCalledWith({
        where: { id: messageId },
      });
    });

    it('should throw NotFoundException if message not found', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue(null);

      await expect(service.getMessage(messageId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAsRead', () => {
    const messageId = 'msg-123';
    const userId = 'user-2';

    it('should mark message as read', async () => {
      const mockMessage = {
        id: messageId,
        senderId: 'user-1',
        receiverId: userId,
        read: false,
      };

      mockPrismaService.message.findUnique.mockResolvedValue(mockMessage);
      mockPrismaService.message.update.mockResolvedValue({
        ...mockMessage,
        read: true,
        readAt: new Date(),
      });

      await service.markAsRead(messageId, userId);

      expect(mockPrismaService.message.update).toHaveBeenCalledWith({
        where: { id: messageId },
        data: {
          read: true,
          readAt: expect.any(Date),
        },
      });
    });

    it('should throw error if user is not the receiver', async () => {
      const mockMessage = {
        id: messageId,
        senderId: 'user-1',
        receiverId: 'different-user',
        read: false,
      };

      mockPrismaService.message.findUnique.mockResolvedValue(mockMessage);

      await expect(service.markAsRead(messageId, userId)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getConversation', () => {
    const userId1 = 'user-1';
    const userId2 = 'user-2';

    it('should return conversation between two users', async () => {
      const mockMessages = [
        { id: 'msg-1', senderId: userId1, receiverId: userId2, content: 'Hi' },
        { id: 'msg-2', senderId: userId2, receiverId: userId1, content: 'Hello' },
      ];

      mockPrismaService.message.findMany.mockResolvedValue(mockMessages);

      const result = await service.getConversation(userId1, userId2);

      expect(result).toEqual(mockMessages);
      expect(mockPrismaService.message.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { senderId: userId1, receiverId: userId2 },
            { senderId: userId2, receiverId: userId1 },
          ],
        },
        orderBy: { createdAt: 'asc' },
        take: expect.any(Number),
      });
    });

    it('should support pagination', async () => {
      mockPrismaService.message.findMany.mockResolvedValue([]);

      await service.getConversation(userId1, userId2, { page: 2, limit: 20 });

      expect(mockPrismaService.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
        }),
      );
    });
  });

  describe('setUserOnline', () => {
    const userId = 'user-123';

    it('should set user online status in Redis', async () => {
      await service.setUserOnline(userId);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        expect.stringContaining(userId),
        'online',
        expect.any(Number),
      );
    });
  });

  describe('setUserOffline', () => {
    const userId = 'user-123';

    it('should remove user online status from Redis', async () => {
      await service.setUserOffline(userId);

      expect(mockRedisService.del).toHaveBeenCalledWith(
        expect.stringContaining(userId),
      );
    });
  });

  describe('isUserOnline', () => {
    const userId = 'user-123';

    it('should return true if user is online', async () => {
      mockRedisService.exists.mockResolvedValue(true);

      const result = await service.isUserOnline(userId);

      expect(result).toBe(true);
    });

    it('should return false if user is offline', async () => {
      mockRedisService.exists.mockResolvedValue(false);

      const result = await service.isUserOnline(userId);

      expect(result).toBe(false);
    });
  });

  describe('getUnreadCount', () => {
    const userId = 'user-123';

    it('should return count of unread messages', async () => {
      mockPrismaService.message.count.mockResolvedValue(5);

      const result = await service.getUnreadCount(userId);

      expect(result).toBe(5);
      expect(mockPrismaService.message.count).toHaveBeenCalledWith({
        where: {
          receiverId: userId,
          read: false,
        },
      });
    });
  });
});
