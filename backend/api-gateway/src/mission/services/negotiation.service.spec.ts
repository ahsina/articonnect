import { Test, TestingModule } from '@nestjs/testing';
import { NegotiationService } from './negotiation.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../../notification/services/notification.service';
import { PriceAnomalyDetectorService } from '../../fraud/services/price-anomaly-detector.service';
import { FeatureToggleService } from '../../fraud/services/feature-toggle.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { MissionType } from '@prisma/client';

describe('NegotiationService', () => {
  let service: NegotiationService;
  let prismaService: PrismaService;
  let notificationService: NotificationService;
  let priceAnomalyDetector: PriceAnomalyDetectorService;
  let featureToggle: FeatureToggleService;

  const mockPrismaService = {
    mission: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    negotiation: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockNotificationService = {
    notifyNegotiationReceived: jest.fn(),
  };

  const mockPriceAnomalyDetector = {
    detectPriceAnomaly: jest.fn(),
  };

  const mockFeatureToggle = {
    isPriceAnomalyDetectionEnabled: jest.fn(),
    isPriceAutoFlagEnabled: jest.fn(),
    getPriceDeviationThreshold: jest.fn(),
  };

  const mockMission = {
    id: 'mission-123',
    clientId: 'client-123',
    artisanId: 'artisan-123',
    type: MissionType.SCHEDULED,
    status: 'NEGOTIATING',
    title: 'Fix plumbing',
  };

  const mockNegotiation = {
    id: 'negotiation-123',
    missionId: 'mission-123',
    senderId: 'client-123',
    receiverId: 'artisan-123',
    proposedPrice: 250,
    laborCost: 150,
    materialCost: 50,
    travelCost: 50,
    message: 'Please consider this offer',
    accepted: null,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    mission: mockMission,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NegotiationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: PriceAnomalyDetectorService, useValue: mockPriceAnomalyDetector },
        { provide: FeatureToggleService, useValue: mockFeatureToggle },
      ],
    }).compile();

    service = module.get<NegotiationService>(NegotiationService);
    prismaService = module.get<PrismaService>(PrismaService);
    notificationService = module.get<NotificationService>(NotificationService);
    priceAnomalyDetector = module.get<PriceAnomalyDetectorService>(
      PriceAnomalyDetectorService,
    );
    featureToggle = module.get<FeatureToggleService>(FeatureToggleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      missionId: 'mission-123',
      proposedPrice: 250,
      laborCost: 150,
      materialCost: 50,
      travelCost: 50,
      message: 'My offer',
    };

    it('should create negotiation from client to artisan', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.negotiation.count.mockResolvedValue(0);
      mockPrismaService.negotiation.create.mockResolvedValue(mockNegotiation);
      mockNotificationService.notifyNegotiationReceived.mockResolvedValue({});

      const result = await service.create('client-123', createDto);

      expect(result).toEqual(mockNegotiation);
      expect(mockPrismaService.negotiation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          senderId: 'client-123',
          receiverId: 'artisan-123',
        }),
      });
      expect(mockNotificationService.notifyNegotiationReceived).toHaveBeenCalledWith(
        'artisan-123',
        'mission-123',
        250,
      );
    });

    it('should create negotiation from artisan to client', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.negotiation.count.mockResolvedValue(0);
      mockPrismaService.negotiation.create.mockResolvedValue({
        ...mockNegotiation,
        senderId: 'artisan-123',
        receiverId: 'client-123',
      });
      mockNotificationService.notifyNegotiationReceived.mockResolvedValue({});

      await service.create('artisan-123', createDto);

      expect(mockPrismaService.negotiation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          senderId: 'artisan-123',
          receiverId: 'client-123',
        }),
      });
    });

    it('should throw NotFoundException if mission not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      await expect(service.create('client-123', createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if max negotiations reached', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.negotiation.count.mockResolvedValue(5);

      await expect(service.create('client-123', createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException if user not part of mission', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.negotiation.count.mockResolvedValue(0);

      await expect(service.create('outsider', createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should set 15-minute expiration for emergency missions', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        type: 'EMERGENCY',
      });
      mockPrismaService.negotiation.count.mockResolvedValue(0);
      mockPrismaService.negotiation.create.mockResolvedValue(mockNegotiation);
      mockNotificationService.notifyNegotiationReceived.mockResolvedValue({});

      await service.create('client-123', createDto);

      expect(mockPrismaService.negotiation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiresAt: expect.any(Date),
        }),
      });

      const callData = mockPrismaService.negotiation.create.mock.calls[0][0].data;
      const expiresAt = callData.expiresAt.getTime();
      const now = Date.now();
      const diffMinutes = (expiresAt - now) / (1000 * 60);

      // Should be approximately 15 minutes
      expect(diffMinutes).toBeGreaterThan(14);
      expect(diffMinutes).toBeLessThan(16);
    });
  });

  describe('accept', () => {
    it('should accept negotiation', async () => {
      mockPrismaService.negotiation.findUnique.mockResolvedValue(mockNegotiation);
      mockPrismaService.negotiation.update.mockResolvedValue({
        ...mockNegotiation,
        accepted: true,
      });
      mockPrismaService.mission.update.mockResolvedValue({});
      mockFeatureToggle.isPriceAnomalyDetectionEnabled.mockResolvedValue(false);

      const result = await service.accept('artisan-123', 'negotiation-123', {
        accepted: true,
      });

      expect(result.accepted).toBe(true);
      expect(mockPrismaService.mission.update).toHaveBeenCalledWith({
        where: { id: 'mission-123' },
        data: expect.objectContaining({
          agreedPrice: 250,
          status: 'ACCEPTED',
        }),
      });
    });

    it('should reject negotiation with reason', async () => {
      mockPrismaService.negotiation.findUnique.mockResolvedValue(mockNegotiation);
      mockPrismaService.negotiation.update.mockResolvedValue({
        ...mockNegotiation,
        accepted: false,
        rejectedReason: 'Price too high',
      });

      const result = await service.accept('artisan-123', 'negotiation-123', {
        accepted: false,
        rejectedReason: 'Price too high',
      });

      expect(result.accepted).toBe(false);
      expect(mockPrismaService.mission.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if negotiation not found', async () => {
      mockPrismaService.negotiation.findUnique.mockResolvedValue(null);

      await expect(
        service.accept('user-123', 'nonexistent', { accepted: true }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not the receiver', async () => {
      mockPrismaService.negotiation.findUnique.mockResolvedValue(mockNegotiation);

      await expect(
        service.accept('client-123', 'negotiation-123', { accepted: true }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if negotiation expired', async () => {
      mockPrismaService.negotiation.findUnique.mockResolvedValue({
        ...mockNegotiation,
        expiresAt: new Date(Date.now() - 1000), // Expired
      });

      await expect(
        service.accept('artisan-123', 'negotiation-123', { accepted: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should run price anomaly detection when enabled', async () => {
      mockPrismaService.negotiation.findUnique.mockResolvedValue(mockNegotiation);
      mockPrismaService.negotiation.update.mockResolvedValue({
        ...mockNegotiation,
        accepted: true,
      });
      mockPrismaService.mission.update.mockResolvedValue({});
      mockFeatureToggle.isPriceAnomalyDetectionEnabled.mockResolvedValue(true);
      mockFeatureToggle.isPriceAutoFlagEnabled.mockResolvedValue(false);
      mockPriceAnomalyDetector.detectPriceAnomaly.mockResolvedValue({
        isAnomalous: false,
        expectedPrice: 240,
        deviationPercentage: 4,
        signals: [],
      });

      await service.accept('artisan-123', 'negotiation-123', { accepted: true });

      expect(mockPriceAnomalyDetector.detectPriceAnomaly).toHaveBeenCalledWith(
        'mission-123',
      );
    });

    it('should handle price anomaly detection failure gracefully', async () => {
      mockPrismaService.negotiation.findUnique.mockResolvedValue(mockNegotiation);
      mockPrismaService.negotiation.update.mockResolvedValue({
        ...mockNegotiation,
        accepted: true,
      });
      mockPrismaService.mission.update.mockResolvedValue({});
      mockFeatureToggle.isPriceAnomalyDetectionEnabled.mockResolvedValue(true);
      mockPriceAnomalyDetector.detectPriceAnomaly.mockRejectedValue(
        new Error('Detection failed'),
      );

      // Should not throw
      await expect(
        service.accept('artisan-123', 'negotiation-123', { accepted: true }),
      ).resolves.not.toThrow();
    });
  });

  describe('findByMission', () => {
    it('should return negotiations for mission', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.negotiation.findMany.mockResolvedValue([mockNegotiation]);

      const result = await service.findByMission('mission-123', 'client-123');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.negotiation.findMany).toHaveBeenCalledWith({
        where: { missionId: 'mission-123' },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should throw NotFoundException if mission not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      await expect(
        service.findByMission('nonexistent', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not part of mission', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);

      await expect(
        service.findByMission('mission-123', 'outsider'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow artisan to view negotiations', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.negotiation.findMany.mockResolvedValue([mockNegotiation]);

      const result = await service.findByMission('mission-123', 'artisan-123');

      expect(result).toHaveLength(1);
    });
  });
});
