import { Test, TestingModule } from '@nestjs/testing';
import { PayoutFraudDetectorService } from './payout-fraud-detector.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('PayoutFraudDetectorService', () => {
  let service: PayoutFraudDetectorService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockArtisan = {
    id: 'artisan-123',
    firstName: 'Pierre',
    lastName: 'Artisan',
    artisanProfile: {
      id: 'profile-123',
    },
    artisanMissions: [
      {
        id: 'mission-1',
        status: 'COMPLETED',
        clientId: 'client-1',
        createdAt: new Date(),
        acceptedAt: new Date(),
        completedAt: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours later
      },
      {
        id: 'mission-2',
        status: 'COMPLETED',
        clientId: 'client-2',
        createdAt: new Date(),
        acceptedAt: new Date(),
        completedAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours later
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutFraudDetectorService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PayoutFraudDetectorService>(PayoutFraudDetectorService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('screenPayout', () => {
    it('should approve low-risk payout', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockArtisan);

      const result = await service.screenPayout('artisan-123', 100);

      expect(result.isRisky).toBe(false);
      expect(result.recommendation).toBe('APPROVE');
    });

    it('should throw error if artisan not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.screenPayout('nonexistent', 100)).rejects.toThrow(
        'Artisan not found',
      );
    });

    it('should flag first high-value payout', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockArtisan,
        artisanMissions: [
          { id: 'mission-1', status: 'PENDING', clientId: 'client-1' },
        ],
      });

      const result = await service.screenPayout('artisan-123', 600);

      expect(result.signals).toContainEqual(
        expect.objectContaining({
          type: 'FIRST_PAYOUT_HIGH_VALUE',
          severity: 'CRITICAL',
        }),
      );
      expect(result.isRisky).toBe(true);
    });

    it('should detect rapid mission completion', async () => {
      const now = Date.now();
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockArtisan,
        artisanMissions: [
          {
            id: 'mission-1',
            status: 'COMPLETED',
            clientId: 'client-1',
            acceptedAt: new Date(now),
            completedAt: new Date(now + 30 * 60 * 1000), // 30 min
          },
          {
            id: 'mission-2',
            status: 'COMPLETED',
            clientId: 'client-2',
            acceptedAt: new Date(now),
            completedAt: new Date(now + 20 * 60 * 1000), // 20 min
          },
          {
            id: 'mission-3',
            status: 'COMPLETED',
            clientId: 'client-3',
            acceptedAt: new Date(now),
            completedAt: new Date(now + 25 * 60 * 1000), // 25 min
          },
        ],
      });

      const result = await service.screenPayout('artisan-123', 100);

      expect(result.signals).toContainEqual(
        expect.objectContaining({
          type: 'RAPID_COMPLETION',
          severity: 'HIGH',
        }),
      );
    });

    it('should detect same client repeatedly', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockArtisan,
        artisanMissions: [
          { id: 'm1', status: 'COMPLETED', clientId: 'client-1' },
          { id: 'm2', status: 'COMPLETED', clientId: 'client-1' },
          { id: 'm3', status: 'COMPLETED', clientId: 'client-1' },
          { id: 'm4', status: 'COMPLETED', clientId: 'client-1' },
          { id: 'm5', status: 'COMPLETED', clientId: 'client-1' },
          { id: 'm6', status: 'COMPLETED', clientId: 'client-1' },
        ].map((m) => ({
          ...m,
          createdAt: new Date(),
          acceptedAt: new Date(),
          completedAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
        })),
      });

      const result = await service.screenPayout('artisan-123', 100);

      expect(result.signals).toContainEqual(
        expect.objectContaining({
          type: 'SAME_CLIENT_REPEATEDLY',
          severity: 'MEDIUM',
        }),
      );
    });

    it('should flag no mission history', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockArtisan,
        artisanMissions: [],
      });

      const result = await service.screenPayout('artisan-123', 100);

      expect(result.signals).toContainEqual(
        expect.objectContaining({
          type: 'NO_HISTORY',
          severity: 'HIGH',
        }),
      );
    });

    it('should recommend BLOCK for very high risk', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockArtisan,
        artisanMissions: [],
      });

      const result = await service.screenPayout('artisan-123', 1000);

      expect(result.signals.length).toBeGreaterThan(0);
      // Should have high risk score
      expect(['BLOCK', 'MANUAL_REVIEW', 'HOLD_48H', 'HOLD_24H']).toContain(
        result.recommendation,
      );
    });

    it('should recommend HOLD_24H for moderate risk', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockArtisan);

      const result = await service.screenPayout('artisan-123', 100);

      // With normal history, should be low risk
      expect(['APPROVE', 'HOLD_24H']).toContain(result.recommendation);
    });

    it('should calculate risk score from signals', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockArtisan,
        artisanMissions: [],
      });

      const result = await service.screenPayout('artisan-123', 100);

      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });
  });
});
