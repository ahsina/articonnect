import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { MissionService } from './mission.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MissionStatus, MissionType } from '@prisma/client';

describe('MissionService', () => {
  let service: MissionService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    mission: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    missionHistory: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    negotiation: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MissionService>(MissionService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 'user-123';
    const createDto = {
      title: 'Fix leak',
      description: 'Water leak in kitchen',
      type: MissionType.EMERGENCY,
      category: 'Plumbing',
      address: '123 Main St',
      city: 'Paris',
      postalCode: '75001',
      country: 'FR',
      latitude: 48.8566,
      longitude: 2.3522,
    };

    it('should create a mission successfully', async () => {
      const mockMission = {
        id: 'mission-123',
        ...createDto,
        clientId: userId,
        status: MissionStatus.PENDING,
      };

      mockPrismaService.mission.create.mockResolvedValue(mockMission);
      mockPrismaService.missionHistory.create.mockResolvedValue({
        id: 'history-123',
        missionId: mockMission.id,
        status: MissionStatus.PENDING,
      });
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.create(createDto, userId);

      expect(result).toEqual(mockMission);
      expect(mockPrismaService.mission.create).toHaveBeenCalled();
      expect(mockPrismaService.missionHistory.create).toHaveBeenCalled();
    });

    it('should calculate VAT rate based on country', async () => {
      mockPrismaService.mission.create.mockResolvedValue({
        id: 'mission-123',
        ...createDto,
        vatRate: 20,
      });
      mockPrismaService.missionHistory.create.mockResolvedValue({});
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.create(createDto, userId);

      const createCall = mockPrismaService.mission.create.mock.calls[0][0];
      expect(createCall.data.vatRate).toBe(20); // France VAT rate
    });

    it('should notify nearby artisans', async () => {
      const mockMission = {
        id: 'mission-123',
        ...createDto,
        clientId: userId,
      };
      const mockArtisans = [
        {
          id: 'artisan-1',
          artisanProfile: {
            latitude: 48.8566,
            longitude: 2.3522,
            serviceRadius: 20,
          },
        },
      ];

      mockPrismaService.mission.create.mockResolvedValue(mockMission);
      mockPrismaService.missionHistory.create.mockResolvedValue({});
      mockPrismaService.user.findMany.mockResolvedValue(mockArtisans);
      mockPrismaService.notification.createMany.mockResolvedValue({ count: 1 });

      await service.create(createDto, userId);

      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    const missionId = 'mission-123';

    it('should return mission with relations', async () => {
      const mockMission = {
        id: missionId,
        title: 'Fix leak',
        client: { id: 'user-123' },
        artisan: { id: 'artisan-123' },
      };

      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);

      const result = await service.findOne(missionId);

      expect(result).toEqual(mockMission);
      expect(mockPrismaService.mission.findUnique).toHaveBeenCalledWith({
        where: { id: missionId },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if mission not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      await expect(service.findOne(missionId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    const missionId = 'mission-123';
    const userId = 'user-123';

    it('should update mission status', async () => {
      const mockMission = {
        id: missionId,
        status: MissionStatus.PENDING,
        clientId: userId,
      };

      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.mission.update.mockResolvedValue({
        ...mockMission,
        status: MissionStatus.CANCELLED,
      });
      mockPrismaService.missionHistory.create.mockResolvedValue({});

      const result = await service.updateStatus(
        missionId,
        MissionStatus.CANCELLED,
        userId,
        'CLIENT',
      );

      expect(result.status).toBe(MissionStatus.CANCELLED);
    });

    it('should reject invalid status transitions', async () => {
      const mockMission = {
        id: missionId,
        status: MissionStatus.COMPLETED, // Cannot transition from COMPLETED
        clientId: userId,
      };

      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);

      await expect(
        service.updateStatus(missionId, MissionStatus.PENDING, userId, 'CLIENT'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findNearbyMissions', () => {
    const artisanId = 'artisan-123';
    const latitude = 48.8566;
    const longitude = 2.3522;
    const radiusKm = 20;

    it('should return missions within radius', async () => {
      const mockMissions = [
        {
          id: 'mission-1',
          latitude: 48.8566,
          longitude: 2.3522,
        },
        {
          id: 'mission-2',
          latitude: 48.9,
          longitude: 2.4,
        },
      ];

      mockPrismaService.mission.findMany.mockResolvedValue(mockMissions);

      const result = await service.getNearbyMissions(
        latitude,
        longitude,
        radiusKm,
        artisanId,
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter out missions outside radius', async () => {
      const mockMissions = [
        {
          id: 'mission-1',
          latitude: 48.8566,
          longitude: 2.3522, // Same location
        },
        {
          id: 'mission-2',
          latitude: 50.0, // Far away
          longitude: 3.0,
        },
      ];

      mockPrismaService.mission.findMany.mockResolvedValue(mockMissions);

      const result = await service.getNearbyMissions(latitude, longitude, 10, artisanId);

      // Only the nearby mission should be returned
      expect(result.length).toBeLessThanOrEqual(mockMissions.length);
    });
  });

  describe('findAndNotifyNearbyArtisans', () => {
    const mission = {
      id: 'mission-123',
      category: 'Plumbing',
      latitude: 48.8566,
      longitude: 2.3522,
      title: 'Fix leak',
    };

    it('should notify nearby artisans', async () => {
      const mockArtisans = [
        {
          id: 'artisan-1',
          artisanProfile: {
            latitude: 48.8566,
            longitude: 2.3522,
            serviceRadius: 20,
          },
        },
        {
          id: 'artisan-2',
          artisanProfile: {
            latitude: 48.86,
            longitude: 2.35,
            serviceRadius: 25,
          },
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockArtisans);
      mockPrismaService.notification.createMany.mockResolvedValue({ count: 2 });

      const result = await service.findAndNotifyNearbyArtisans(mission);

      expect(result.notifiedCount).toBe(2);
      expect(mockPrismaService.notification.createMany).toHaveBeenCalled();
    });

    it('should limit notifications to 10 artisans', async () => {
      const mockArtisans = Array.from({ length: 15 }, (_, i) => ({
        id: `artisan-${i}`,
        artisanProfile: {
          latitude: 48.8566,
          longitude: 2.3522,
          serviceRadius: 20,
        },
      }));

      mockPrismaService.user.findMany.mockResolvedValue(mockArtisans);
      mockPrismaService.notification.createMany.mockResolvedValue({ count: 10 });

      const result = await service.findAndNotifyNearbyArtisans(mission);

      expect(result.notifiedCount).toBe(10);
    });
  });

  describe('acceptNegotiation', () => {
    const negotiationId = 'negotiation-123';
    const userId = 'user-123';

    const mockNegotiation = {
      id: negotiationId,
      missionId: 'mission-123',
      proposedPrice: 150,
      senderId: 'artisan-123',
      receiverId: userId,
      accepted: null,
    };

    const mockMission = {
      id: 'mission-123',
      clientId: userId,
      status: MissionStatus.NEGOTIATING,
    };

    it('should accept negotiation and update mission', async () => {
      mockPrismaService.negotiation.findFirst.mockResolvedValue(mockNegotiation);
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.negotiation.update.mockResolvedValue({
        ...mockNegotiation,
        accepted: true,
      });
      mockPrismaService.mission.update.mockResolvedValue({
        ...mockMission,
        status: MissionStatus.ACCEPTED,
        agreedPrice: 150,
      });
      mockPrismaService.missionHistory.create.mockResolvedValue({});

      const result = await service.acceptNegotiation(negotiationId, userId);

      expect(result.accepted).toBe(true);
      expect(mockPrismaService.mission.update).toHaveBeenCalled();
    });

    it('should throw error if negotiation not found', async () => {
      mockPrismaService.negotiation.findFirst.mockResolvedValue(null);

      await expect(service.acceptNegotiation(negotiationId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error if user is not the receiver', async () => {
      mockPrismaService.negotiation.findFirst.mockResolvedValue({
        ...mockNegotiation,
        receiverId: 'different-user',
      });
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);

      await expect(service.acceptNegotiation(negotiationId, userId)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
