import { Test, TestingModule } from '@nestjs/testing';
import { MissionCronService } from './mission-cron.service';
import { MissionService } from './mission.service';

describe('MissionCronService', () => {
  let service: MissionCronService;
  let missionService: MissionService;

  const mockMissionService = {
    autoValidateStuckMissions: jest.fn(),
    prisma: {
      mission: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        update: jest.fn(),
      },
      missionHistory: {
        createMany: jest.fn(),
        create: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionCronService,
        { provide: MissionService, useValue: mockMissionService },
      ],
    }).compile();

    service = module.get<MissionCronService>(MissionCronService);
    missionService = module.get<MissionService>(MissionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('autoValidateStuckMissions', () => {
    it('should log when no missions to validate', async () => {
      mockMissionService.autoValidateStuckMissions.mockResolvedValue({
        processed: 0,
        results: [],
      });

      await service.autoValidateStuckMissions();

      expect(mockMissionService.autoValidateStuckMissions).toHaveBeenCalled();
    });

    it('should process stuck missions successfully', async () => {
      mockMissionService.autoValidateStuckMissions.mockResolvedValue({
        processed: 3,
        results: [
          { missionId: 'mission-1', status: 'success', message: 'Auto-validated' },
          { missionId: 'mission-2', status: 'success', message: 'Auto-validated' },
          { missionId: 'mission-3', status: 'error', message: 'Payment failed' },
        ],
      });

      await service.autoValidateStuckMissions();

      expect(mockMissionService.autoValidateStuckMissions).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockMissionService.autoValidateStuckMissions.mockRejectedValue(
        new Error('Database error'),
      );

      // Should not throw
      await expect(service.autoValidateStuckMissions()).resolves.not.toThrow();
    });
  });

  describe('cleanupExpiredMissions', () => {
    it('should log when no expired missions', async () => {
      mockMissionService.prisma.mission.findMany.mockResolvedValue([]);

      await service.cleanupExpiredMissions();

      expect(mockMissionService.prisma.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
          }),
        }),
      );
    });

    it('should cancel expired missions', async () => {
      const expiredMissions = [
        { id: 'mission-1', title: 'Test 1', clientId: 'client-1' },
        { id: 'mission-2', title: 'Test 2', clientId: 'client-2' },
      ];

      mockMissionService.prisma.mission.findMany.mockResolvedValue(expiredMissions);
      mockMissionService.prisma.mission.updateMany.mockResolvedValue({ count: 2 });
      mockMissionService.prisma.missionHistory.createMany.mockResolvedValue({ count: 2 });

      await service.cleanupExpiredMissions();

      expect(mockMissionService.prisma.mission.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['mission-1', 'mission-2'] } },
        data: expect.objectContaining({
          status: 'CANCELLED',
        }),
      });
      expect(mockMissionService.prisma.missionHistory.createMany).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockMissionService.prisma.mission.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.cleanupExpiredMissions()).resolves.not.toThrow();
    });
  });

  describe('alertPendingActions', () => {
    it('should count pending missions', async () => {
      mockMissionService.prisma.mission.count
        .mockResolvedValueOnce(5) // Negotiating > 48h
        .mockResolvedValueOnce(3); // Unpaid > 24h

      await service.alertPendingActions();

      expect(mockMissionService.prisma.mission.count).toHaveBeenCalledTimes(2);
    });

    it('should handle errors gracefully', async () => {
      mockMissionService.prisma.mission.count.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.alertPendingActions()).resolves.not.toThrow();
    });
  });

  describe('expandMissionSearchRadius', () => {
    it('should log when no missions to expand', async () => {
      mockMissionService.prisma.mission.findMany.mockResolvedValue([]);

      await service.expandMissionSearchRadius();

      expect(mockMissionService.prisma.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
            artisanId: null,
            maxRadiusReached: false,
          }),
        }),
      );
    });

    it('should expand radius for eligible missions', async () => {
      const mission = {
        id: 'mission-1',
        type: 'SCHEDULED',
        status: 'PENDING',
        currentSearchRadius: 20,
        maxRadiusReached: false,
        lastRadiusExpansion: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        latitude: 49.6116,
        longitude: 6.1319,
        category: 'PLUMBING',
        title: 'Fix leak',
        notificationsSent: 5,
        client: { firstName: 'John', lastName: 'Doe' },
      };

      mockMissionService.prisma.mission.findMany.mockResolvedValue([mission]);
      mockMissionService.prisma.user.findMany.mockResolvedValue([]);
      mockMissionService.prisma.mission.update.mockResolvedValue({});
      mockMissionService.prisma.missionHistory.create.mockResolvedValue({});

      await service.expandMissionSearchRadius();

      expect(mockMissionService.prisma.mission.update).toHaveBeenCalled();
    });

    it('should mark mission as max radius reached', async () => {
      const mission = {
        id: 'mission-1',
        type: 'EMERGENCY',
        status: 'PENDING',
        currentSearchRadius: 100, // Already at max
        maxRadiusReached: false,
        lastRadiusExpansion: new Date(Date.now() - 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        latitude: 49.6116,
        longitude: 6.1319,
        category: 'PLUMBING',
        title: 'Fix leak',
        notificationsSent: 10,
        client: { firstName: 'John', lastName: 'Doe' },
      };

      mockMissionService.prisma.mission.findMany.mockResolvedValue([mission]);
      mockMissionService.prisma.mission.update.mockResolvedValue({});
      mockMissionService.prisma.missionHistory.create.mockResolvedValue({});

      await service.expandMissionSearchRadius();

      expect(mockMissionService.prisma.mission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { maxRadiusReached: true },
        }),
      );
    });

    it('should handle errors gracefully', async () => {
      mockMissionService.prisma.mission.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.expandMissionSearchRadius()).resolves.not.toThrow();
    });
  });

  describe('generateWeeklyStatistics', () => {
    it('should generate weekly statistics', async () => {
      mockMissionService.prisma.mission.groupBy.mockResolvedValue([
        { status: 'COMPLETED', _count: 50 },
        { status: 'CANCELLED', _count: 10 },
        { status: 'PENDING', _count: 25 },
      ]);
      mockMissionService.prisma.mission.count.mockResolvedValue(30);

      await service.generateWeeklyStatistics();

      expect(mockMissionService.prisma.mission.groupBy).toHaveBeenCalled();
      expect(mockMissionService.prisma.mission.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            autoValidated: true,
          }),
        }),
      );
    });

    it('should handle errors gracefully', async () => {
      mockMissionService.prisma.mission.groupBy.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.generateWeeklyStatistics()).resolves.not.toThrow();
    });
  });

  describe('triggerAutoValidationManually', () => {
    it('should call autoValidateStuckMissions', async () => {
      mockMissionService.autoValidateStuckMissions.mockResolvedValue({
        processed: 0,
        results: [],
      });

      await service.triggerAutoValidationManually();

      expect(mockMissionService.autoValidateStuckMissions).toHaveBeenCalled();
    });
  });

  describe('getCronJobsStatus', () => {
    it('should return status of all cron jobs', () => {
      const status = service.getCronJobsStatus();

      expect(status).toHaveProperty('jobs');
      expect(status).toHaveProperty('timezone');
      expect(status).toHaveProperty('nextExecutions');
      expect(status.jobs).toHaveLength(5);
      expect(status.timezone).toBe('Europe/Paris');
    });

    it('should include all job details', () => {
      const status = service.getCronJobsStatus();

      const jobNames = status.jobs.map(j => j.name);
      expect(jobNames).toContain('auto-validate-stuck-missions');
      expect(jobNames).toContain('expand-mission-radius');
      expect(jobNames).toContain('cleanup-expired-missions');
      expect(jobNames).toContain('alert-pending-actions');
      expect(jobNames).toContain('weekly-statistics');
    });

    it('should calculate valid next execution times', () => {
      const status = service.getCronJobsStatus();

      const now = new Date();
      Object.values(status.nextExecutions).forEach(execution => {
        const nextDate = new Date(execution);
        expect(nextDate.getTime()).toBeGreaterThan(now.getTime() - 1000);
      });
    });
  });
});
