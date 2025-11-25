import { Test, TestingModule } from '@nestjs/testing';
import { FcmService } from './fcm.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as admin from 'firebase-admin';

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
}));

describe('FcmService', () => {
  let service: FcmService;
  let configService: ConfigService;
  let prismaService: PrismaService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockMessaging = {
    sendEachForMulticast: jest.fn(),
    send: jest.fn(),
  };

  const mockFirebaseApp = {
    messaging: jest.fn().mockReturnValue(mockMessaging),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    (admin.initializeApp as jest.Mock).mockReturnValue(mockFirebaseApp);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FcmService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FcmService>(FcmService);
    configService = module.get<ConfigService>(ConfigService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('onModuleInit', () => {
    it('should initialize Firebase when config is provided', () => {
      mockConfigService.get.mockReturnValue(JSON.stringify({ projectId: 'test' }));

      service.onModuleInit();

      expect(admin.initializeApp).toHaveBeenCalled();
    });

    it('should warn and skip when config is not provided', () => {
      mockConfigService.get.mockReturnValue(null);

      service.onModuleInit();

      expect(admin.initializeApp).not.toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', () => {
      mockConfigService.get.mockReturnValue(JSON.stringify({ projectId: 'test' }));
      (admin.initializeApp as jest.Mock).mockImplementation(() => {
        throw new Error('Init error');
      });

      expect(() => service.onModuleInit()).not.toThrow();
    });
  });

  describe('isConfigured', () => {
    it('should return true when Firebase is initialized', () => {
      mockConfigService.get.mockReturnValue(JSON.stringify({ projectId: 'test' }));
      service.onModuleInit();

      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when Firebase is not initialized', () => {
      mockConfigService.get.mockReturnValue(null);
      service.onModuleInit();

      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('registerToken', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue(JSON.stringify({ projectId: 'test' }));
      service.onModuleInit();
    });

    it('should register new token for user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        fcmTokens: [],
      });
      mockPrismaService.user.update.mockResolvedValue({});

      await service.registerToken('user-123', 'new-token');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          fcmTokens: {
            push: 'new-token',
          },
        },
      });
    });

    it('should not add duplicate token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        fcmTokens: ['existing-token'],
      });

      await service.registerToken('user-123', 'existing-token');

      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.registerToken('nonexistent', 'token'),
      ).rejects.toThrow('User not found');
    });
  });

  describe('unregisterToken', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue(JSON.stringify({ projectId: 'test' }));
      service.onModuleInit();
    });

    it('should remove token from user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        fcmTokens: ['token-1', 'token-2'],
      });
      mockPrismaService.user.update.mockResolvedValue({});

      await service.unregisterToken('user-123', 'token-1');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          fcmTokens: ['token-2'],
        },
      });
    });

    it('should throw error if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.unregisterToken('nonexistent', 'token'),
      ).rejects.toThrow('User not found');
    });
  });

  describe('sendToUser', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue(JSON.stringify({ projectId: 'test' }));
      service.onModuleInit();
    });

    it('should send notification to user devices', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        fcmTokens: ['token-1', 'token-2'],
      });
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 2,
        failureCount: 0,
        responses: [],
      });

      await service.sendToUser('user-123', {
        title: 'Test',
        body: 'Test message',
      });

      expect(mockMessaging.sendEachForMulticast).toHaveBeenCalledWith({
        notification: {
          title: 'Test',
          body: 'Test message',
        },
        data: {},
        tokens: ['token-1', 'token-2'],
      });
    });

    it('should skip if user has no tokens', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        fcmTokens: [],
      });

      await service.sendToUser('user-123', {
        title: 'Test',
        body: 'Test message',
      });

      expect(mockMessaging.sendEachForMulticast).not.toHaveBeenCalled();
    });

    it('should skip if FCM not configured', async () => {
      mockConfigService.get.mockReturnValue(null);
      service.onModuleInit();

      await service.sendToUser('user-123', {
        title: 'Test',
        body: 'Test message',
      });

      expect(mockMessaging.sendEachForMulticast).not.toHaveBeenCalled();
    });
  });

  describe('sendToTokens', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue(JSON.stringify({ projectId: 'test' }));
      service.onModuleInit();
    });

    it('should send notification to multiple tokens', async () => {
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 2,
        failureCount: 0,
        responses: [],
      });

      await service.sendToTokens(['token-1', 'token-2'], {
        title: 'Broadcast',
        body: 'Broadcast message',
        data: { type: 'notification' },
      });

      expect(mockMessaging.sendEachForMulticast).toHaveBeenCalledWith({
        notification: {
          title: 'Broadcast',
          body: 'Broadcast message',
        },
        data: { type: 'notification' },
        tokens: ['token-1', 'token-2'],
      });
    });

    it('should skip if no tokens provided', async () => {
      await service.sendToTokens([], {
        title: 'Test',
        body: 'Test message',
      });

      expect(mockMessaging.sendEachForMulticast).not.toHaveBeenCalled();
    });

    it('should remove invalid tokens', async () => {
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 1,
        responses: [
          { success: true },
          {
            success: false,
            error: { code: 'messaging/invalid-registration-token' },
          },
        ],
      });
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-1', fcmTokens: ['valid-token', 'invalid-token'] },
      ]);
      mockPrismaService.user.update.mockResolvedValue({});

      await service.sendToTokens(['valid-token', 'invalid-token'], {
        title: 'Test',
        body: 'Test message',
      });

      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });
  });

  describe('sendToUsers', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue(JSON.stringify({ projectId: 'test' }));
      service.onModuleInit();
    });

    it('should send notification to multiple users', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        { fcmTokens: ['token-1'] },
        { fcmTokens: ['token-2', 'token-3'] },
      ]);
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 3,
        failureCount: 0,
        responses: [],
      });

      await service.sendToUsers(['user-1', 'user-2'], {
        title: 'Multi-user',
        body: 'Message for multiple users',
      });

      expect(mockMessaging.sendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: ['token-1', 'token-2', 'token-3'],
        }),
      );
    });

    it('should skip if no tokens found for users', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        { fcmTokens: [] },
        { fcmTokens: [] },
      ]);

      await service.sendToUsers(['user-1', 'user-2'], {
        title: 'Test',
        body: 'Test message',
      });

      expect(mockMessaging.sendEachForMulticast).not.toHaveBeenCalled();
    });
  });

  describe('sendToTopic', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue(JSON.stringify({ projectId: 'test' }));
      service.onModuleInit();
    });

    it('should send notification to topic', async () => {
      mockMessaging.send.mockResolvedValue('message-id');

      await service.sendToTopic('announcements', {
        title: 'Announcement',
        body: 'Important announcement',
        data: { priority: 'high' },
      });

      expect(mockMessaging.send).toHaveBeenCalledWith({
        notification: {
          title: 'Announcement',
          body: 'Important announcement',
        },
        data: { priority: 'high' },
        topic: 'announcements',
      });
    });

    it('should skip if FCM not configured', async () => {
      mockConfigService.get.mockReturnValue(null);
      service.onModuleInit();

      await service.sendToTopic('announcements', {
        title: 'Test',
        body: 'Test message',
      });

      expect(mockMessaging.send).not.toHaveBeenCalled();
    });

    it('should handle send errors gracefully', async () => {
      mockMessaging.send.mockRejectedValue(new Error('Send failed'));

      await expect(
        service.sendToTopic('announcements', {
          title: 'Test',
          body: 'Test message',
        }),
      ).resolves.not.toThrow();
    });
  });
});
