import { Test, TestingModule } from '@nestjs/testing';
import { DisputeService } from './dispute.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RefundAbuseDetectorService } from '../../fraud/services/refund-abuse-detector.service';
import { FeatureToggleService } from '../../fraud/services/feature-toggle.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DisputeStatus } from '@prisma/client';

describe('DisputeService', () => {
  let service: DisputeService;
  let prismaService: PrismaService;
  let refundAbuseDetector: RefundAbuseDetectorService;
  let featureToggle: FeatureToggleService;

  const mockPrismaService = {
    mission: {
      findUnique: jest.fn(),
    },
    dispute: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  };

  const mockRefundAbuseDetector = {
    detectRefundAbuse: jest.fn(),
  };

  const mockFeatureToggle = {
    isRefundAbuseDetectionEnabled: jest.fn(),
    isRefundAutoRejectEnabled: jest.fn(),
    getRefundAbuseThreshold: jest.fn(),
  };

  const mockMission = {
    id: 'mission-123',
    clientId: 'client-123',
    artisanId: 'artisan-123',
    status: 'IN_PROGRESS',
    title: 'Test Mission',
  };

  const mockDispute = {
    id: 'dispute-123',
    missionId: 'mission-123',
    createdById: 'client-123',
    reason: 'Service not completed',
    description: 'Work was not done properly',
    status: DisputeStatus.OPEN,
    priority: 'MEDIUM',
    mission: mockMission,
    createdBy: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputeService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RefundAbuseDetectorService, useValue: mockRefundAbuseDetector },
        { provide: FeatureToggleService, useValue: mockFeatureToggle },
      ],
    }).compile();

    service = module.get<DisputeService>(DisputeService);
    prismaService = module.get<PrismaService>(PrismaService);
    refundAbuseDetector = module.get<RefundAbuseDetectorService>(RefundAbuseDetectorService);
    featureToggle = module.get<FeatureToggleService>(FeatureToggleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      missionId: 'mission-123',
      reason: 'Service not completed',
      description: 'Work was not done properly',
      priority: 'HIGH',
    };

    it('should create a dispute successfully', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.dispute.findFirst.mockResolvedValue(null);
      mockFeatureToggle.isRefundAbuseDetectionEnabled.mockResolvedValue(false);
      mockPrismaService.dispute.create.mockResolvedValue(mockDispute);

      const result = await service.create('client-123', createDto);

      expect(result).toEqual(mockDispute);
      expect(mockPrismaService.dispute.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if mission not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      await expect(service.create('client-123', createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user not involved in mission', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);

      await expect(
        service.create('unauthorized-user', createDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid mission status', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        status: 'CANCELLED',
      });

      await expect(service.create('client-123', createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if active dispute exists', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.dispute.findFirst.mockResolvedValue(mockDispute);

      await expect(service.create('client-123', createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should detect refund abuse when enabled', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.dispute.findFirst.mockResolvedValue(null);
      mockFeatureToggle.isRefundAbuseDetectionEnabled.mockResolvedValue(true);
      mockRefundAbuseDetector.detectRefundAbuse.mockResolvedValue({
        isAbusive: false,
        abuseScore: 0.2,
        recommendation: 'ALLOW',
      });
      mockPrismaService.dispute.create.mockResolvedValue(mockDispute);

      const refundDto = {
        ...createDto,
        reason: 'Request refund',
      };

      await service.create('client-123', refundDto);

      expect(mockRefundAbuseDetector.detectRefundAbuse).toHaveBeenCalled();
      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });

    it('should auto-reject abusive refund requests when enabled', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.dispute.findFirst.mockResolvedValue(null);
      mockFeatureToggle.isRefundAbuseDetectionEnabled.mockResolvedValue(true);
      mockFeatureToggle.isRefundAutoRejectEnabled.mockResolvedValue(true);
      mockFeatureToggle.getRefundAbuseThreshold.mockResolvedValue(0.7);
      mockRefundAbuseDetector.detectRefundAbuse.mockResolvedValue({
        isAbusive: true,
        abuseScore: 0.9,
        recommendation: 'REJECT',
      });

      const refundDto = {
        ...createDto,
        reason: 'Request refund',
      };

      await expect(service.create('client-123', refundDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all disputes with filters', async () => {
      mockPrismaService.dispute.findMany.mockResolvedValue([mockDispute]);

      const result = await service.findAll({
        status: DisputeStatus.OPEN,
        priority: 'HIGH',
      });

      expect(result).toEqual([mockDispute]);
      expect(mockPrismaService.dispute.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: DisputeStatus.OPEN,
            priority: 'HIGH',
          }),
        }),
      );
    });

    it('should filter by userId', async () => {
      mockPrismaService.dispute.findMany.mockResolvedValue([]);

      await service.findAll({ userId: 'user-123' });

      expect(mockPrismaService.dispute.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { createdById: 'user-123' },
            ]),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a dispute if user is involved', async () => {
      const disputeWithMission = {
        ...mockDispute,
        mission: {
          ...mockMission,
          client: { id: 'client-123' },
          artisan: { id: 'artisan-123' },
        },
      };
      mockPrismaService.dispute.findUnique.mockResolvedValue(disputeWithMission);

      const result = await service.findOne('dispute-123', 'client-123');

      expect(result).toEqual(disputeWithMission);
    });

    it('should throw NotFoundException if dispute not found', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user not involved', async () => {
      const disputeWithMission = {
        ...mockDispute,
        mission: {
          ...mockMission,
          clientId: 'other-client',
          artisanId: 'other-artisan',
        },
      };
      mockPrismaService.dispute.findUnique.mockResolvedValue(disputeWithMission);

      await expect(
        service.findOne('dispute-123', 'unauthorized-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateDto = {
      description: 'Updated description',
    };

    it('should update dispute successfully', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(mockDispute);
      mockPrismaService.dispute.update.mockResolvedValue({
        ...mockDispute,
        ...updateDto,
      });

      const result = await service.update('dispute-123', 'client-123', updateDto);

      expect(result.description).toBe('Updated description');
    });

    it('should throw NotFoundException if dispute not found', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', 'user-123', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not creator', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(mockDispute);

      await expect(
        service.update('dispute-123', 'other-user', updateDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if dispute is resolved', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue({
        ...mockDispute,
        status: DisputeStatus.RESOLVED,
      });

      await expect(
        service.update('dispute-123', 'client-123', updateDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resolve', () => {
    const resolveDto = {
      resolution: 'Full refund provided',
    };

    it('should resolve dispute successfully', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(mockDispute);
      mockPrismaService.dispute.update.mockResolvedValue({
        ...mockDispute,
        status: DisputeStatus.RESOLVED,
        resolution: resolveDto.resolution,
      });

      const result = await service.resolve('dispute-123', 'admin-123', resolveDto);

      expect(result.status).toBe(DisputeStatus.RESOLVED);
      expect(result.resolution).toBe(resolveDto.resolution);
    });

    it('should throw NotFoundException if dispute not found', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(null);

      await expect(
        service.resolve('nonexistent', 'admin-123', resolveDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already resolved', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue({
        ...mockDispute,
        status: DisputeStatus.RESOLVED,
      });

      await expect(
        service.resolve('dispute-123', 'admin-123', resolveDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('should cancel dispute successfully', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(mockDispute);
      mockPrismaService.dispute.update.mockResolvedValue({
        ...mockDispute,
        status: DisputeStatus.CANCELLED,
      });

      const result = await service.cancel('dispute-123', 'client-123');

      expect(result.status).toBe(DisputeStatus.CANCELLED);
    });

    it('should throw NotFoundException if dispute not found', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(null);

      await expect(service.cancel('nonexistent', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not creator', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(mockDispute);

      await expect(
        service.cancel('dispute-123', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if dispute is resolved', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue({
        ...mockDispute,
        status: DisputeStatus.RESOLVED,
      });

      await expect(
        service.cancel('dispute-123', 'client-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
