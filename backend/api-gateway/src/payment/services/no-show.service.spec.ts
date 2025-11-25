import { Test, TestingModule } from '@nestjs/testing';
import { NoShowService, ReportNoShowDto, ContactAttempt } from './no-show.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ReputationService } from './reputation.service';
import { StripeService } from './stripe.service';
import { NotificationService } from '../../notification/services/notification.service';
import { BadRequestException } from '@nestjs/common';

describe('NoShowService', () => {
  let service: NoShowService;
  let prismaService: PrismaService;
  let reputationService: ReputationService;
  let stripeService: StripeService;
  let notificationService: NotificationService;

  const mockPrismaService = {
    mission: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    noShowEvent: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
    compensationLog: {
      create: jest.fn(),
    },
    reputationHistory: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockReputationService = {
    applyPenalty: jest.fn(),
  };

  const mockStripeService = {
    createTransfer: jest.fn(),
  };

  const mockNotificationService = {
    createNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NoShowService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ReputationService, useValue: mockReputationService },
        { provide: StripeService, useValue: mockStripeService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<NoShowService>(NoShowService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createValidNoShowDto = (): ReportNoShowDto => ({
    missionId: 'mission-123',
    arrivalTime: new Date(),
    waitDurationMinutes: 20,
    contactAttempts: [
      { timestamp: new Date(), method: 'PHONE_CALL', success: false },
      { timestamp: new Date(), method: 'SMS', success: false },
      { timestamp: new Date(), method: 'APP_MESSAGE', success: false },
    ],
    proofPhotos: ['photo1.jpg', 'photo2.jpg'],
    gpsCoords: {
      latitude: 49.6116,
      longitude: 6.1319,
      accuracy: 10,
    },
  });

  const mockMission = {
    id: 'mission-123',
    clientId: 'client-123',
    artisanId: 'artisan-123',
    status: 'DEPOSIT_PAID',
    type: 'EMERGENCY',
    latitude: 49.6116,
    longitude: 6.1319,
    client: {
      id: 'client-123',
      firstName: 'John',
      lastName: 'Doe',
    },
  };

  describe('reportNoShow', () => {
    it('should create a no-show report successfully', async () => {
      // Use waitDurationMinutes < 20 to trigger admin review path (not auto-validate)
      const dto = createValidNoShowDto();
      dto.waitDurationMinutes = 18; // Less than 20 means it goes to admin review
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.noShowEvent.create.mockResolvedValue({
        id: 'no-show-123',
        ...dto,
        feeAmount: 50,
        status: 'REPORTED',
      });
      mockPrismaService.noShowEvent.update.mockResolvedValue({
        id: 'no-show-123',
        status: 'PENDING_REVIEW',
      });
      mockPrismaService.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);
      mockNotificationService.createNotification.mockResolvedValue({});

      const result = await service.reportNoShow('artisan-123', dto);

      expect(result).toHaveProperty('noShowEvent');
      expect(mockPrismaService.noShowEvent.create).toHaveBeenCalled();
    });

    it('should throw if mission not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      await expect(
        service.reportNoShow('artisan-123', createValidNoShowDto()),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if artisan does not own mission', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        artisanId: 'different-artisan',
      });

      await expect(
        service.reportNoShow('artisan-123', createValidNoShowDto()),
      ).rejects.toThrow('Cette mission ne vous appartient pas');
    });

    it('should throw if mission status is not appropriate', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        status: 'PENDING',
      });

      await expect(
        service.reportNoShow('artisan-123', createValidNoShowDto()),
      ).rejects.toThrow('La mission doit être en cours');
    });

    it('should throw if wait duration is less than 15 minutes', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);

      const dto = createValidNoShowDto();
      dto.waitDurationMinutes = 10;

      await expect(service.reportNoShow('artisan-123', dto)).rejects.toThrow(
        'Attente minimum de 15 minutes',
      );
    });

    it('should throw if less than 2 contact attempts', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);

      const dto = createValidNoShowDto();
      dto.contactAttempts = [{ timestamp: new Date(), method: 'PHONE_CALL', success: false }];

      await expect(service.reportNoShow('artisan-123', dto)).rejects.toThrow(
        'Minimum 2 tentatives de contact',
      );
    });

    it('should throw if no proof photos', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);

      const dto = createValidNoShowDto();
      dto.proofPhotos = [];

      await expect(service.reportNoShow('artisan-123', dto)).rejects.toThrow(
        'Au moins une photo de preuve',
      );
    });

    it('should throw if GPS coordinates are too far from mission', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);

      const dto = createValidNoShowDto();
      dto.gpsCoords = {
        latitude: 50.0, // Far from mission
        longitude: 7.0,
        accuracy: 10,
      };

      await expect(service.reportNoShow('artisan-123', dto)).rejects.toThrow(
        'Position GPS trop éloignée',
      );
    });

    it('should auto-validate when all criteria met', async () => {
      const dto = createValidNoShowDto();
      dto.waitDurationMinutes = 25; // > 20 min
      dto.contactAttempts = [
        { timestamp: new Date(), method: 'PHONE_CALL', success: false },
        { timestamp: new Date(), method: 'SMS', success: false },
        { timestamp: new Date(), method: 'APP_MESSAGE', success: false },
      ]; // 3+ attempts
      dto.proofPhotos = ['photo1.jpg', 'photo2.jpg']; // 2+ photos
      dto.gpsCoords.accuracy = 5; // < 20m

      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.noShowEvent.create.mockResolvedValue({
        id: 'no-show-123',
        status: 'REPORTED',
        feeAmount: 50,
      });
      mockPrismaService.noShowEvent.findUnique.mockResolvedValue({
        id: 'no-show-123',
        status: 'REPORTED',
        feeAmount: 50,
        mission: {
          ...mockMission,
          artisan: {
            id: 'artisan-123',
            artisanProfile: { stripeAccountId: 'acct_123', stripeOnboarded: true },
          },
        },
      });
      mockPrismaService.noShowEvent.update.mockResolvedValue({
        id: 'no-show-123',
        status: 'VALIDATED',
      });
      // Mock user.findUnique to return different values for client and artisan
      mockPrismaService.user.findUnique.mockImplementation(({ where }) => {
        if (where.id === 'client-123') {
          return Promise.resolve({ id: 'client-123', reputationScore: 100 });
        }
        // For artisan lookup in transferToArtisan
        return Promise.resolve({
          id: 'artisan-123',
          artisanProfile: { stripeAccountId: 'acct_123', stripeOnboarded: true },
        });
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.payment.create.mockResolvedValue({});
      mockPrismaService.compensationLog.create.mockResolvedValue({});
      mockPrismaService.reputationHistory.create.mockResolvedValue({});
      mockStripeService.createTransfer.mockResolvedValue({ id: 'tr_123' });
      mockReputationService.applyPenalty.mockResolvedValue({});
      mockNotificationService.createNotification.mockResolvedValue({});

      const result = await service.reportNoShow('artisan-123', dto);

      expect(result.autoValidated).toBe(true);
      expect(result.message).toContain('validé');
    });

    it('should calculate 50€ fee for emergency missions', async () => {
      // Use waitDurationMinutes < 20 to trigger admin review path (not auto-validate)
      const dto = createValidNoShowDto();
      dto.waitDurationMinutes = 18;
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        type: 'EMERGENCY',
      });
      mockPrismaService.noShowEvent.create.mockResolvedValue({
        id: 'no-show-123',
        feeAmount: 50,
        status: 'REPORTED',
      });
      mockPrismaService.noShowEvent.update.mockResolvedValue({});
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockNotificationService.createNotification.mockResolvedValue({});

      await service.reportNoShow('artisan-123', dto);

      expect(mockPrismaService.noShowEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            feeAmount: 50,
          }),
        }),
      );
    });

    it('should calculate 30€ fee for scheduled missions', async () => {
      // Use waitDurationMinutes < 20 to trigger admin review path (not auto-validate)
      const dto = createValidNoShowDto();
      dto.waitDurationMinutes = 18;
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        type: 'SCHEDULED',
      });
      mockPrismaService.noShowEvent.create.mockResolvedValue({
        id: 'no-show-123',
        feeAmount: 30,
        status: 'REPORTED',
      });
      mockPrismaService.noShowEvent.update.mockResolvedValue({});
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockNotificationService.createNotification.mockResolvedValue({});

      await service.reportNoShow('artisan-123', dto);

      expect(mockPrismaService.noShowEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            feeAmount: 30,
          }),
        }),
      );
    });
  });

  describe('validateNoShow', () => {
    const mockNoShowEvent = {
      id: 'no-show-123',
      feeAmount: 50,
      status: 'PENDING_REVIEW',
      mission: {
        ...mockMission,
        artisan: {
          id: 'artisan-123',
          artisanProfile: {
            stripeAccountId: 'acct_123',
            stripeOnboarded: true,
          },
        },
      },
    };

    it('should validate a no-show by admin', async () => {
      mockPrismaService.noShowEvent.findUnique.mockResolvedValue(mockNoShowEvent);
      mockPrismaService.noShowEvent.update.mockResolvedValue({
        ...mockNoShowEvent,
        status: 'VALIDATED',
      });
      // Mock user.findUnique to return different values for client and artisan
      mockPrismaService.user.findUnique.mockImplementation(({ where }) => {
        if (where.id === 'client-123') {
          return Promise.resolve({ id: 'client-123', reputationScore: 100 });
        }
        // For artisan lookup in transferToArtisan
        return Promise.resolve({
          id: 'artisan-123',
          artisanProfile: { stripeAccountId: 'acct_123', stripeOnboarded: true },
        });
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.payment.create.mockResolvedValue({});
      mockPrismaService.compensationLog.create.mockResolvedValue({});
      mockPrismaService.reputationHistory.create.mockResolvedValue({});
      mockStripeService.createTransfer.mockResolvedValue({ id: 'tr_123' });
      mockReputationService.applyPenalty.mockResolvedValue({});
      mockNotificationService.createNotification.mockResolvedValue({});

      const result = await service.validateNoShow('no-show-123', 'admin-123');

      expect(result.noShowEvent.status).toBe('VALIDATED');
      expect(result.autoValidated).toBe(false);
    });

    it('should validate automatically when validatedBy is AUTO', async () => {
      mockPrismaService.noShowEvent.findUnique.mockResolvedValue(mockNoShowEvent);
      mockPrismaService.noShowEvent.update.mockResolvedValue({
        ...mockNoShowEvent,
        status: 'VALIDATED',
      });
      // Mock user.findUnique to return different values for client and artisan
      mockPrismaService.user.findUnique.mockImplementation(({ where }) => {
        if (where.id === 'client-123') {
          return Promise.resolve({ id: 'client-123', reputationScore: 100 });
        }
        // For artisan lookup in transferToArtisan
        return Promise.resolve({
          id: 'artisan-123',
          artisanProfile: { stripeAccountId: 'acct_123', stripeOnboarded: true },
        });
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.payment.create.mockResolvedValue({});
      mockPrismaService.compensationLog.create.mockResolvedValue({});
      mockPrismaService.reputationHistory.create.mockResolvedValue({});
      mockStripeService.createTransfer.mockResolvedValue({ id: 'tr_123' });
      mockReputationService.applyPenalty.mockResolvedValue({});
      mockNotificationService.createNotification.mockResolvedValue({});

      const result = await service.validateNoShow('no-show-123', 'AUTO');

      expect(result.autoValidated).toBe(true);
    });

    it('should throw if no-show event not found', async () => {
      mockPrismaService.noShowEvent.findUnique.mockResolvedValue(null);

      await expect(
        service.validateNoShow('invalid-id', 'admin-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectNoShow', () => {
    it('should reject a no-show and notify artisan', async () => {
      mockPrismaService.noShowEvent.findUnique.mockResolvedValue({
        id: 'no-show-123',
        missionId: 'mission-123',
        mission: {
          artisanId: 'artisan-123',
          artisan: { id: 'artisan-123' },
        },
      });
      mockPrismaService.noShowEvent.update.mockResolvedValue({});
      mockNotificationService.createNotification.mockResolvedValue({});

      await service.rejectNoShow('no-show-123', 'admin-123', 'Insufficient proof');

      expect(mockPrismaService.noShowEvent.update).toHaveBeenCalledWith({
        where: { id: 'no-show-123' },
        data: {
          status: 'REJECTED',
          reviewedBy: 'admin-123',
          reviewNotes: 'Insufficient proof',
        },
      });
      expect(mockNotificationService.createNotification).toHaveBeenCalled();
    });

    it('should throw if no-show not found', async () => {
      mockPrismaService.noShowEvent.findUnique.mockResolvedValue(null);

      await expect(
        service.rejectNoShow('invalid-id', 'admin-123', 'reason'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getNoShowsByMission', () => {
    it('should return all no-shows for a mission', async () => {
      const mockNoShows = [
        { id: 'no-show-1', missionId: 'mission-123' },
        { id: 'no-show-2', missionId: 'mission-123' },
      ];

      mockPrismaService.noShowEvent.findMany.mockResolvedValue(mockNoShows);

      const result = await service.getNoShowsByMission('mission-123');

      expect(result).toHaveLength(2);
      expect(mockPrismaService.noShowEvent.findMany).toHaveBeenCalledWith({
        where: { missionId: 'mission-123' },
        include: expect.any(Object),
      });
    });
  });

  describe('getPendingNoShows', () => {
    it('should return all pending no-shows for admin review', async () => {
      const mockPending = [
        { id: 'no-show-1', status: 'PENDING_REVIEW' },
        { id: 'no-show-2', status: 'PENDING_REVIEW' },
      ];

      mockPrismaService.noShowEvent.findMany.mockResolvedValue(mockPending);

      const result = await service.getPendingNoShows();

      expect(result).toHaveLength(2);
      expect(mockPrismaService.noShowEvent.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING_REVIEW' },
        include: expect.any(Object),
        orderBy: { createdAt: 'asc' },
      });
    });
  });
});
