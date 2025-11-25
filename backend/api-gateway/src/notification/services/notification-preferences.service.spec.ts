import { Test, TestingModule } from '@nestjs/testing';
import { NotificationPreferencesService } from './notification-preferences.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('NotificationPreferencesService', () => {
  let service: NotificationPreferencesService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    notificationPreferences: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockPreferences = {
    id: 'prefs-123',
    userId: 'user-123',
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    newMission: true,
    missionUpdate: true,
    newMessage: true,
    paymentReceived: true,
    paymentSent: true,
    reviewReceived: true,
    marketingEmails: false,
    weeklyDigest: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationPreferencesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<NotificationPreferencesService>(
      NotificationPreferencesService,
    );
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPreferences', () => {
    it('should return existing preferences', async () => {
      mockPrismaService.notificationPreferences.findUnique.mockResolvedValue(
        mockPreferences,
      );

      const result = await service.getPreferences('user-123');

      expect(result).toEqual(mockPreferences);
      expect(
        mockPrismaService.notificationPreferences.findUnique,
      ).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });

    it('should create default preferences if not found', async () => {
      mockPrismaService.notificationPreferences.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationPreferences.create.mockResolvedValue(
        mockPreferences,
      );

      const result = await service.getPreferences('user-123');

      expect(result).toEqual(mockPreferences);
      expect(
        mockPrismaService.notificationPreferences.create,
      ).toHaveBeenCalledWith({
        data: { userId: 'user-123' },
      });
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences successfully', async () => {
      mockPrismaService.notificationPreferences.findUnique.mockResolvedValue(
        mockPreferences,
      );
      mockPrismaService.notificationPreferences.update.mockResolvedValue({
        ...mockPreferences,
        smsNotifications: true,
        marketingEmails: true,
      });

      const updates = {
        smsNotifications: true,
        marketingEmails: true,
      };

      const result = await service.updatePreferences('user-123', updates);

      expect(result.smsNotifications).toBe(true);
      expect(result.marketingEmails).toBe(true);
      expect(
        mockPrismaService.notificationPreferences.update,
      ).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: updates,
      });
    });

    it('should create preferences if not exist before updating', async () => {
      mockPrismaService.notificationPreferences.findUnique
        .mockResolvedValueOnce(null) // First call in getPreferences
        .mockResolvedValueOnce(mockPreferences); // After creation
      mockPrismaService.notificationPreferences.create.mockResolvedValue(
        mockPreferences,
      );
      mockPrismaService.notificationPreferences.update.mockResolvedValue(
        mockPreferences,
      );

      await service.updatePreferences('user-123', { newMission: false });

      expect(
        mockPrismaService.notificationPreferences.create,
      ).toHaveBeenCalled();
      expect(
        mockPrismaService.notificationPreferences.update,
      ).toHaveBeenCalled();
    });

    it('should handle partial updates', async () => {
      mockPrismaService.notificationPreferences.findUnique.mockResolvedValue(
        mockPreferences,
      );
      mockPrismaService.notificationPreferences.update.mockResolvedValue({
        ...mockPreferences,
        pushNotifications: false,
      });

      const result = await service.updatePreferences('user-123', {
        pushNotifications: false,
      });

      expect(result.pushNotifications).toBe(false);
      expect(
        mockPrismaService.notificationPreferences.update,
      ).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: { pushNotifications: false },
      });
    });
  });

  describe('resetPreferences', () => {
    it('should delete and recreate preferences', async () => {
      mockPrismaService.notificationPreferences.delete.mockResolvedValue(
        mockPreferences,
      );
      mockPrismaService.notificationPreferences.create.mockResolvedValue(
        mockPreferences,
      );

      const result = await service.resetPreferences('user-123');

      expect(
        mockPrismaService.notificationPreferences.delete,
      ).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
      expect(
        mockPrismaService.notificationPreferences.create,
      ).toHaveBeenCalledWith({
        data: { userId: 'user-123' },
      });
      expect(result).toEqual(mockPreferences);
    });
  });

  describe('shouldNotify', () => {
    beforeEach(() => {
      mockPrismaService.notificationPreferences.findUnique.mockResolvedValue(
        mockPreferences,
      );
    });

    it('should return true for NEW_MISSION when enabled', async () => {
      const result = await service.shouldNotify('user-123', 'NEW_MISSION');

      expect(result).toBe(true);
    });

    it('should return true for MISSION_UPDATE when enabled', async () => {
      const result = await service.shouldNotify('user-123', 'MISSION_UPDATE');

      expect(result).toBe(true);
    });

    it('should return true for NEW_MESSAGE when enabled', async () => {
      const result = await service.shouldNotify('user-123', 'NEW_MESSAGE');

      expect(result).toBe(true);
    });

    it('should return true for PAYMENT_RECEIVED when enabled', async () => {
      const result = await service.shouldNotify('user-123', 'PAYMENT_RECEIVED');

      expect(result).toBe(true);
    });

    it('should return true for PAYMENT_SENT when enabled', async () => {
      const result = await service.shouldNotify('user-123', 'PAYMENT_SENT');

      expect(result).toBe(true);
    });

    it('should return true for REVIEW_RECEIVED when enabled', async () => {
      const result = await service.shouldNotify('user-123', 'REVIEW_RECEIVED');

      expect(result).toBe(true);
    });

    it('should return false when notification type is disabled', async () => {
      mockPrismaService.notificationPreferences.findUnique.mockResolvedValue({
        ...mockPreferences,
        newMission: false,
      });

      const result = await service.shouldNotify('user-123', 'NEW_MISSION');

      expect(result).toBe(false);
    });

    it('should return true for unknown notification types', async () => {
      const result = await service.shouldNotify('user-123', 'UNKNOWN_TYPE');

      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle all update fields at once', async () => {
      mockPrismaService.notificationPreferences.findUnique.mockResolvedValue(
        mockPreferences,
      );

      const fullUpdate = {
        emailNotifications: false,
        pushNotifications: false,
        smsNotifications: true,
        newMission: false,
        missionUpdate: false,
        newMessage: false,
        paymentReceived: false,
        paymentSent: false,
        reviewReceived: false,
        marketingEmails: true,
        weeklyDigest: false,
      };

      mockPrismaService.notificationPreferences.update.mockResolvedValue({
        ...mockPreferences,
        ...fullUpdate,
      });

      const result = await service.updatePreferences('user-123', fullUpdate);

      expect(result.emailNotifications).toBe(false);
      expect(result.pushNotifications).toBe(false);
      expect(result.smsNotifications).toBe(true);
    });

    it('should handle empty update object', async () => {
      mockPrismaService.notificationPreferences.findUnique.mockResolvedValue(
        mockPreferences,
      );
      mockPrismaService.notificationPreferences.update.mockResolvedValue(
        mockPreferences,
      );

      const result = await service.updatePreferences('user-123', {});

      expect(result).toEqual(mockPreferences);
      expect(
        mockPrismaService.notificationPreferences.update,
      ).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: {},
      });
    });
  });
});
