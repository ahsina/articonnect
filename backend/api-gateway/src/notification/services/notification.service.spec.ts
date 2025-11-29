import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FcmService } from '../../fcm/services/fcm.service';
import { NotificationGateway } from '../gateways/notification.gateway';
import { NotificationType } from '@prisma/client';

describe('NotificationService', () => {
  let service: NotificationService;
  let prismaService: PrismaService;
  let fcmService: FcmService;

  const mockPrismaService = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    notificationPreference: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  };

  const mockFcmService = {
    sendToUser: jest.fn(),
  };

  const mockNotificationGateway = {
    sendToUser: jest.fn(),
    sendToRoom: jest.fn(),
    sendNotification: jest.fn(),
    isUserOnline: jest.fn().mockReturnValue(false),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: FcmService, useValue: mockFcmService },
        { provide: NotificationGateway, useValue: mockNotificationGateway },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    prismaService = module.get<PrismaService>(PrismaService);
    fcmService = module.get<FcmService>(FcmService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    const userId = 'user-123';
    const type = NotificationType.MISSION_ACCEPTED;
    const title = 'Test Notification';
    const message = 'This is a test';

    it('should create notification and send push notification', async () => {
      const mockNotification = {
        id: 'notif-123',
        userId,
        type,
        title,
        message,
        read: false,
      };

      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockFcmService.sendToUser.mockResolvedValue({});

      const result = await service.createNotification(userId, type, title, message);

      expect(result).toEqual(mockNotification);
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          type,
          title,
          message,
          read: false,
        }),
      });
      expect(mockFcmService.sendToUser).toHaveBeenCalledWith(userId, {
        title,
        body: message,
        data: expect.objectContaining({
          type,
          notificationId: mockNotification.id,
        }),
      });
    });

    it('should include link in notification', async () => {
      const link = '/missions/123';
      mockPrismaService.notification.create.mockResolvedValue({
        id: 'notif-123',
        link,
      });
      mockFcmService.sendToUser.mockResolvedValue({});

      await service.createNotification(userId, type, title, message, link);

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ link }),
      });
    });

    it('should include metadata in notification', async () => {
      const metadata = { missionId: 'mission-123', amount: 100 };
      mockPrismaService.notification.create.mockResolvedValue({
        id: 'notif-123',
        metadata,
      });
      mockFcmService.sendToUser.mockResolvedValue({});

      await service.createNotification(userId, type, title, message, undefined, metadata);

      expect(mockFcmService.sendToUser).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: JSON.stringify(metadata),
          }),
        }),
      );
    });
  });

  describe('getUserNotifications', () => {
    const userId = 'user-123';

    it('should return user notifications', async () => {
      const mockNotifications = [
        { id: 'notif-1', title: 'Test 1' },
        { id: 'notif-2', title: 'Test 2' },
      ];

      mockPrismaService.notification.findMany.mockResolvedValue(mockNotifications);

      const result = await service.getUserNotifications(userId);

      expect(result).toEqual(mockNotifications);
      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    });

    it('should return only unread notifications when specified', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      await service.getUserNotifications(userId, 20, true);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId, read: false },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    });

    it('should respect custom limit', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      await service.getUserNotifications(userId, 50);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.markAsRead('notif-123', 'user-123');

      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-123', userId: 'user-123' },
        data: { read: true },
      });
    });

    it('should only update notification for correct user', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 0 });

      await service.markAsRead('notif-123', 'different-user');

      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-123', userId: 'different-user' },
        data: { read: true },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('user-123');

      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', read: false },
        data: { read: true },
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification for user', async () => {
      mockPrismaService.notification.deleteMany.mockResolvedValue({ count: 1 });

      await service.deleteNotification('notif-123', 'user-123');

      expect(mockPrismaService.notification.deleteMany).toHaveBeenCalledWith({
        where: { id: 'notif-123', userId: 'user-123' },
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      mockPrismaService.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-123');

      expect(result).toBe(5);
      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-123', read: false },
      });
    });
  });

  describe('notifyMissionCreated', () => {
    it('should create mission notification for artisan', async () => {
      mockPrismaService.notification.create.mockResolvedValue({ id: 'notif-123' });
      mockFcmService.sendToUser.mockResolvedValue({});

      await service.notifyMissionCreated('artisan-123', 'mission-123', 'Fix leak');

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'artisan-123',
          type: NotificationType.NEW_MISSION,
          title: 'Nouvelle mission disponible',
          link: '/artisan/missions/mission-123',
        }),
      });
    });
  });

  describe('notifyMissionAccepted', () => {
    it('should notify client when mission is accepted', async () => {
      mockPrismaService.notification.create.mockResolvedValue({ id: 'notif-123' });
      mockFcmService.sendToUser.mockResolvedValue({});

      await service.notifyMissionAccepted('client-123', 'mission-123', 'John Doe');

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'client-123',
          type: NotificationType.MISSION_ACCEPTED,
        }),
      });
    });
  });

  describe('notifyMissionCompleted', () => {
    it('should notify client when mission is completed', async () => {
      mockPrismaService.notification.create.mockResolvedValue({ id: 'notif-123' });
      mockFcmService.sendToUser.mockResolvedValue({});

      await service.notifyMissionCompleted('client-123', 'mission-123');

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'client-123',
          type: NotificationType.MISSION_COMPLETED,
          link: '/client/missions/mission-123/review',
        }),
      });
    });
  });

  describe('notifyNegotiationReceived', () => {
    it('should notify user of new price proposal', async () => {
      mockPrismaService.notification.create.mockResolvedValue({ id: 'notif-123' });
      mockFcmService.sendToUser.mockResolvedValue({});

      await service.notifyNegotiationReceived('user-123', 'mission-123', 500);

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: NotificationType.NEGOTIATION_NEW,
          userId: 'user-123',
        }),
      });
    });
  });

  describe('notifyPaymentReceived', () => {
    it('should notify artisan of payment', async () => {
      mockPrismaService.notification.create.mockResolvedValue({ id: 'notif-123' });
      mockFcmService.sendToUser.mockResolvedValue({});

      await service.notifyPaymentReceived('artisan-123', 150, 'mission-123');

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'artisan-123',
          type: NotificationType.PAYMENT_RECEIVED,
        }),
      });
    });
  });

  describe('notifyNewReview', () => {
    it('should notify artisan of new review', async () => {
      mockPrismaService.notification.create.mockResolvedValue({ id: 'notif-123' });
      mockFcmService.sendToUser.mockResolvedValue({});

      await service.notifyNewReview('artisan-123', 5, 'Jane Smith');

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'artisan-123',
          type: NotificationType.REVIEW_NEW,
        }),
      });
    });
  });

  describe('notifyNewMessage', () => {
    it('should notify user of new message', async () => {
      mockPrismaService.notification.create.mockResolvedValue({ id: 'notif-123' });
      mockFcmService.sendToUser.mockResolvedValue({});

      await service.notifyNewMessage('user-123', 'John Doe', 'conv-123');

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          type: NotificationType.MESSAGE_NEW,
          link: '/messages/conv-123',
        }),
      });
    });
  });
});
