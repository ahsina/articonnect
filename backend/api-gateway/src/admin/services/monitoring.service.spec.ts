import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringService } from './monitoring.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('MonitoringService', () => {
  let service: MonitoringService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    mission: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    missionHistory: {
      count: jest.fn(),
    },
    review: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCronMetrics', () => {
    it('should return comprehensive metrics', async () => {
      mockPrismaService.mission.count.mockResolvedValue(100);
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.missionHistory.count.mockResolvedValue(5);

      const result = await service.getCronMetrics();

      expect(result).toHaveProperty('overview');
      expect(result).toHaveProperty('autoValidation');
      expect(result).toHaveProperty('cleanup');
      expect(result).toHaveProperty('alerts');
      expect(result).toHaveProperty('performance');
      expect(result).toHaveProperty('trends');
      expect(result).toHaveProperty('generatedAt');
    });

    it('should use cached metrics if available and valid', async () => {
      mockPrismaService.mission.count.mockResolvedValue(100);
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.missionHistory.count.mockResolvedValue(5);

      // First call - populate cache
      await service.getCronMetrics();
      const callCountAfterFirst = mockPrismaService.mission.count.mock.calls.length;

      // Second call - should use cache
      await service.getCronMetrics();
      const callCountAfterSecond = mockPrismaService.mission.count.mock.calls.length;

      // Should not have made additional calls
      expect(callCountAfterSecond).toBe(callCountAfterFirst);
    });

    it('should include overview metrics', async () => {
      mockPrismaService.mission.count
        .mockResolvedValueOnce(1000) // total
        .mockResolvedValueOnce(50) // last24h
        .mockResolvedValueOnce(200) // last7days
        .mockResolvedValueOnce(500) // last30days
        .mockResolvedValueOnce(100) // completed (AUTO_VALIDATED)
        .mockResolvedValueOnce(80) // autoValidated
        .mockResolvedValueOnce(30) // cancelled
        .mockResolvedValueOnce(150); // pending validations (COMPLETED)

      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.missionHistory.count.mockResolvedValue(5);

      const result = await service.getCronMetrics();

      expect(result.overview.totalMissions).toBe(1000);
      expect(result.overview.autoValidationRate).toContain('%');
      expect(result.overview).toHaveProperty('health');
    });

    it('should calculate health score', async () => {
      mockPrismaService.mission.count
        .mockResolvedValueOnce(1000)
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(200)
        .mockResolvedValueOnce(500)
        .mockResolvedValueOnce(100) // completed
        .mockResolvedValueOnce(95) // autoValidated (95% rate)
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(5); // low pending validations

      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.missionHistory.count.mockResolvedValue(0);

      // Need to clear the internal cache first
      service['metricsCache'] = null;

      const result = await service.getCronMetrics();

      expect(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']).toContain(result.overview.health);
    });
  });

  describe('getAutoValidationChart', () => {
    it('should return chart data structure', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([
        {
          autoValidatedAt: new Date(),
          agreedPrice: 100,
        },
      ]);

      const result = await service.getAutoValidationChart(7);

      expect(result).toHaveProperty('labels');
      expect(result).toHaveProperty('datasets');
      expect(result.datasets).toHaveLength(2);
      expect(result.datasets[0].label).toBe('Auto-validations');
      expect(result.datasets[1].label).toBe('Montant total (€)');
    });

    it('should generate correct number of labels', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([]);

      const result = await service.getAutoValidationChart(14);

      expect(result.labels).toHaveLength(14);
    });

    it('should aggregate data by day', async () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      mockPrismaService.mission.findMany.mockResolvedValue([
        { autoValidatedAt: today, agreedPrice: 100 },
        { autoValidatedAt: today, agreedPrice: 200 },
      ]);

      const result = await service.getAutoValidationChart(7);

      // Today's count should be 2
      const todayIndex = result.labels.length - 1;
      expect(result.datasets[0].data[todayIndex]).toBe(2);
      expect(result.datasets[1].data[todayIndex]).toBe(300);
    });
  });

  describe('getSmartAlerts', () => {
    it('should return alerts structure', async () => {
      mockPrismaService.mission.count.mockResolvedValue(0);

      const result = await service.getSmartAlerts();

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('critical');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('info');
      expect(result).toHaveProperty('alerts');
      expect(result).toHaveProperty('lastCheck');
    });

    it('should generate PENDING_VALIDATIONS alert when threshold exceeded', async () => {
      mockPrismaService.mission.count
        .mockResolvedValueOnce(15) // pendingValidations > 10
        .mockResolvedValueOnce(0) // stuckNegotiations
        .mockResolvedValueOnce(0) // unpaidDeposits
        .mockResolvedValueOnce(10) // last7days
        .mockResolvedValueOnce(10); // previous7days

      const result = await service.getSmartAlerts();

      const pendingAlert = result.alerts.find(
        (a) => a.type === 'PENDING_VALIDATIONS',
      );
      expect(pendingAlert).toBeDefined();
      expect(pendingAlert?.level).toBe('WARNING');
    });

    it('should generate STUCK_NEGOTIATIONS alert when threshold exceeded', async () => {
      mockPrismaService.mission.count
        .mockResolvedValueOnce(0) // pendingValidations
        .mockResolvedValueOnce(6) // stuckNegotiations > 5
        .mockResolvedValueOnce(0) // unpaidDeposits
        .mockResolvedValueOnce(10) // last7days
        .mockResolvedValueOnce(10); // previous7days

      const result = await service.getSmartAlerts();

      const stuckAlert = result.alerts.find(
        (a) => a.type === 'STUCK_NEGOTIATIONS',
      );
      expect(stuckAlert).toBeDefined();
      expect(stuckAlert?.level).toBe('INFO');
    });

    it('should generate UNPAID_DEPOSITS alert when threshold exceeded', async () => {
      mockPrismaService.mission.count
        .mockResolvedValueOnce(0) // pendingValidations
        .mockResolvedValueOnce(0) // stuckNegotiations
        .mockResolvedValueOnce(5) // unpaidDeposits > 3
        .mockResolvedValueOnce(10) // last7days
        .mockResolvedValueOnce(10); // previous7days

      const result = await service.getSmartAlerts();

      const depositAlert = result.alerts.find(
        (a) => a.type === 'UNPAID_DEPOSITS',
      );
      expect(depositAlert).toBeDefined();
      expect(depositAlert?.level).toBe('WARNING');
    });

    it('should generate ACTIVITY_DROP alert when significant decrease', async () => {
      mockPrismaService.mission.count
        .mockResolvedValueOnce(0) // pendingValidations
        .mockResolvedValueOnce(0) // stuckNegotiations
        .mockResolvedValueOnce(0) // unpaidDeposits
        .mockResolvedValueOnce(30) // last7days (dropped)
        .mockResolvedValueOnce(100); // previous7days

      const result = await service.getSmartAlerts();

      const dropAlert = result.alerts.find((a) => a.type === 'ACTIVITY_DROP');
      expect(dropAlert).toBeDefined();
      expect(dropAlert?.level).toBe('INFO');
    });

    it('should not generate activity drop alert for minor decreases', async () => {
      mockPrismaService.mission.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(80) // 20% drop (not significant)
        .mockResolvedValueOnce(100);

      const result = await service.getSmartAlerts();

      const dropAlert = result.alerts.find((a) => a.type === 'ACTIVITY_DROP');
      expect(dropAlert).toBeUndefined();
    });

    it('should count alerts by level correctly', async () => {
      mockPrismaService.mission.count
        .mockResolvedValueOnce(15) // WARNING: pendingValidations
        .mockResolvedValueOnce(6) // INFO: stuckNegotiations
        .mockResolvedValueOnce(5) // WARNING: unpaidDeposits
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(10);

      const result = await service.getSmartAlerts();

      expect(result.total).toBe(3);
      expect(result.warnings).toBe(2);
      expect(result.info).toBe(1);
    });
  });

  describe('performance metrics', () => {
    it('should include cron execution metrics', async () => {
      mockPrismaService.mission.count.mockResolvedValue(0);
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.missionHistory.count.mockResolvedValue(0);

      service['metricsCache'] = null;

      const result = await service.getCronMetrics();

      expect(result.performance.cronExecutions).toHaveProperty('autoValidation');
      expect(result.performance.cronExecutions).toHaveProperty('cleanup');
      expect(result.performance.cronExecutions).toHaveProperty('alerts');
      expect(result.performance.cronExecutions).toHaveProperty('statistics');
    });

    it('should include database metrics', async () => {
      mockPrismaService.mission.count.mockResolvedValue(0);
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.missionHistory.count.mockResolvedValue(0);

      service['metricsCache'] = null;

      const result = await service.getCronMetrics();

      expect(result.performance.database).toHaveProperty('avgQueryTimeMs');
      expect(result.performance.database).toHaveProperty('slowQueries');
      expect(result.performance.database).toHaveProperty('connectionPoolSize');
    });
  });

  describe('trend analysis', () => {
    it('should calculate mission growth', async () => {
      mockPrismaService.mission.count.mockResolvedValue(0);
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.missionHistory.count.mockResolvedValue(0);

      service['metricsCache'] = null;

      const result = await service.getCronMetrics();

      expect(result.trends).toHaveProperty('missionsGrowth');
      expect(result.trends).toHaveProperty('autoValidationGrowth');
      expect(result.trends).toHaveProperty('prediction');
    });

    it('should include predictions', async () => {
      mockPrismaService.mission.count.mockResolvedValue(100);
      mockPrismaService.mission.findMany.mockResolvedValue([]);
      mockPrismaService.missionHistory.count.mockResolvedValue(0);

      service['metricsCache'] = null;

      const result = await service.getCronMetrics();

      expect(result.trends.prediction).toHaveProperty('nextMonthMissions');
      expect(result.trends.prediction).toHaveProperty('nextMonthAutoValidations');
    });
  });
});
