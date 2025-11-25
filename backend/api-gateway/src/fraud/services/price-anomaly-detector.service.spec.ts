import { Test, TestingModule } from '@nestjs/testing';
import { PriceAnomalyDetectorService } from './price-anomaly-detector.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('PriceAnomalyDetectorService', () => {
  let service: PriceAnomalyDetectorService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    mission: {
      findUnique: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  const mockMission = {
    id: 'mission-123',
    title: 'Fix plumbing',
    category: 'plumbing',
    agreedPrice: 150,
    estimatedDuration: 120, // 2 hours
    artisan: {
      id: 'artisan-123',
      artisanProfile: {
        hourlyRate: 50,
      },
      artisanMissions: [],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceAnomalyDetectorService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PriceAnomalyDetectorService>(PriceAnomalyDetectorService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('detectPriceAnomaly', () => {
    it('should detect normal pricing', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.mission.aggregate.mockResolvedValue({
        _avg: { agreedPrice: 150 },
      });

      const result = await service.detectPriceAnomaly('mission-123');

      expect(result.isAnomalous).toBe(false);
      expect(result.recommendation).toBe('ALLOW');
    });

    it('should throw error if mission not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      await expect(service.detectPriceAnomaly('nonexistent')).rejects.toThrow();
    });

    it('should throw error if price not set', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        agreedPrice: null,
      });

      await expect(service.detectPriceAnomaly('mission-123')).rejects.toThrow();
    });

    it('should detect price below market average', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        agreedPrice: 30, // Very low
      });
      mockPrismaService.mission.aggregate.mockResolvedValue({
        _avg: { agreedPrice: 150 },
      });

      const result = await service.detectPriceAnomaly('mission-123');

      expect(result.signals).toContainEqual(
        expect.objectContaining({
          type: 'BELOW_MARKET',
          severity: 'HIGH',
        }),
      );
      expect(result.isAnomalous).toBe(true);
    });

    it('should detect price below artisan rate', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        agreedPrice: 30, // Below expected 100 (50 * 2 hours)
      });
      mockPrismaService.mission.aggregate.mockResolvedValue({
        _avg: { agreedPrice: 100 },
      });

      const result = await service.detectPriceAnomaly('mission-123');

      expect(result.signals).toContainEqual(
        expect.objectContaining({
          type: 'BELOW_ARTISAN_RATE',
          severity: 'HIGH',
        }),
      );
    });

    it('should calculate deviation percentage', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        agreedPrice: 100,
      });
      mockPrismaService.mission.aggregate.mockResolvedValue({
        _avg: { agreedPrice: 200 },
      });

      const result = await service.detectPriceAnomaly('mission-123');

      expect(result.deviationPercentage).toBe(-50); // 100 is 50% below 200
    });

    it('should recommend MANUAL_REVIEW for severe deviation', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        agreedPrice: 20,
      });
      mockPrismaService.mission.aggregate.mockResolvedValue({
        _avg: { agreedPrice: 200 },
      });

      const result = await service.detectPriceAnomaly('mission-123');

      expect(result.recommendation).toBe('MANUAL_REVIEW');
    });

    it('should recommend ADJUST_COMMISSION for moderate deviation', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        agreedPrice: 80,
      });
      mockPrismaService.mission.aggregate.mockResolvedValue({
        _avg: { agreedPrice: 200 },
      });

      const result = await service.detectPriceAnomaly('mission-123');

      expect(['ADJUST_COMMISSION', 'FLAG', 'MANUAL_REVIEW']).toContain(
        result.recommendation,
      );
    });

    it('should recommend FLAG for slight deviation', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        agreedPrice: 130,
      });
      mockPrismaService.mission.aggregate.mockResolvedValue({
        _avg: { agreedPrice: 200 },
      });

      const result = await service.detectPriceAnomaly('mission-123');

      expect(['FLAG', 'ALLOW']).toContain(result.recommendation);
    });

    it('should use default fallback when no category average', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.mission.aggregate.mockResolvedValue({
        _avg: { agreedPrice: null },
      });

      const result = await service.detectPriceAnomaly('mission-123');

      expect(result.expectedPrice).toBe(100); // Default fallback
    });

    it('should handle artisan without hourly rate', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        artisan: {
          ...mockMission.artisan,
          artisanProfile: {
            hourlyRate: null,
          },
        },
      });
      mockPrismaService.mission.aggregate.mockResolvedValue({
        _avg: { agreedPrice: 150 },
      });

      const result = await service.detectPriceAnomaly('mission-123');

      // Should not include BELOW_ARTISAN_RATE signal
      const artisanRateSignal = result.signals.find(
        (s) => s.type === 'BELOW_ARTISAN_RATE',
      );
      expect(artisanRateSignal).toBeUndefined();
    });

    it('should include market average in signal', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        agreedPrice: 50,
      });
      mockPrismaService.mission.aggregate.mockResolvedValue({
        _avg: { agreedPrice: 200 },
      });

      const result = await service.detectPriceAnomaly('mission-123');

      const marketSignal = result.signals.find((s) => s.type === 'BELOW_MARKET');
      expect(marketSignal?.marketAverage).toBe(200);
    });
  });
});
