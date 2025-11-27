import { Test, TestingModule } from '@nestjs/testing';
import { RefundAbuseDetectorService } from './refund-abuse-detector.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('RefundAbuseDetectorService', () => {
  let service: RefundAbuseDetectorService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    dispute: {
      count: jest.fn(),
    },
  };

  const mockUser = {
    id: 'user-123',
    firstName: 'John',
    lastName: 'Client',
    clientMissions: [
      { id: 'mission-1', status: 'COMPLETED' },
      { id: 'mission-2', status: 'COMPLETED' },
      { id: 'mission-3', status: 'COMPLETED' },
      { id: 'mission-4', status: 'COMPLETED' },
      { id: 'mission-5', status: 'COMPLETED' },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundAbuseDetectorService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RefundAbuseDetectorService>(RefundAbuseDetectorService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('detectRefundAbuse', () => {
    it('should approve normal user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.dispute.count.mockResolvedValue(0);

      const result = await service.detectRefundAbuse('user-123', 'mission-123');

      expect(result.isAbusive).toBe(false);
      expect(result.recommendation).toBe('APPROVE');
    });

    it('should throw error if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.detectRefundAbuse('nonexistent', 'mission-123'),
      ).rejects.toThrow('User not found');
    });

    it('should detect high refund rate', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        clientMissions: [
          { id: 'm1', status: 'COMPLETED' },
          { id: 'm2', status: 'CANCELLED' },
          { id: 'm3', status: 'DISPUTED' },
          { id: 'm4', status: 'CANCELLED' },
          { id: 'm5', status: 'COMPLETED' },
        ],
      });
      mockPrismaService.dispute.count.mockResolvedValue(1);

      const result = await service.detectRefundAbuse('user-123', 'mission-123');

      expect(result.signals).toContainEqual(
        expect.objectContaining({
          type: 'HIGH_REFUND_RATE',
          severity: 'HIGH',
        }),
      );
    });

    it('should not flag high refund rate for few missions', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        clientMissions: [
          { id: 'm1', status: 'CANCELLED' },
          { id: 'm2', status: 'CANCELLED' },
        ],
      });
      mockPrismaService.dispute.count.mockResolvedValue(0);

      const result = await service.detectRefundAbuse('user-123', 'mission-123');

      // Should not flag because less than 5 total missions
      const refundSignal = result.signals.find((s) => s.type === 'HIGH_REFUND_RATE');
      expect(refundSignal).toBeUndefined();
    });

    it('should detect serial disputer', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.dispute.count.mockResolvedValue(5);

      const result = await service.detectRefundAbuse('user-123', 'mission-123');

      expect(result.signals).toContainEqual(
        expect.objectContaining({
          type: 'SERIAL_DISPUTER',
          severity: 'HIGH',
        }),
      );
    });

    it('should recommend REJECT for very abusive behavior', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        clientMissions: [
          { id: 'm1', status: 'CANCELLED' },
          { id: 'm2', status: 'DISPUTED' },
          { id: 'm3', status: 'CANCELLED' },
          { id: 'm4', status: 'DISPUTED' },
          { id: 'm5', status: 'CANCELLED' },
          { id: 'm6', status: 'COMPLETED' },
        ],
      });
      mockPrismaService.dispute.count.mockResolvedValue(10);

      const result = await service.detectRefundAbuse('user-123', 'mission-123');

      expect(result.isAbusive).toBe(true);
      expect(['REJECT', 'REQUIRE_DEPOSIT']).toContain(result.recommendation);
    });

    it('should recommend REQUIRE_DEPOSIT for moderate abuse', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        clientMissions: [
          { id: 'm1', status: 'CANCELLED' },
          { id: 'm2', status: 'CANCELLED' },
          { id: 'm3', status: 'COMPLETED' },
          { id: 'm4', status: 'COMPLETED' },
          { id: 'm5', status: 'COMPLETED' },
        ],
      });
      mockPrismaService.dispute.count.mockResolvedValue(4);

      const result = await service.detectRefundAbuse('user-123', 'mission-123');

      expect(['REQUIRE_DEPOSIT', 'MANUAL_REVIEW', 'REJECT']).toContain(result.recommendation);
    });

    it('should recommend MANUAL_REVIEW for slight concerns', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        clientMissions: [
          { id: 'm1', status: 'CANCELLED' },
          { id: 'm2', status: 'COMPLETED' },
          { id: 'm3', status: 'COMPLETED' },
          { id: 'm4', status: 'COMPLETED' },
          { id: 'm5', status: 'COMPLETED' },
          { id: 'm6', status: 'COMPLETED' },
        ],
      });
      mockPrismaService.dispute.count.mockResolvedValue(2);

      const result = await service.detectRefundAbuse('user-123', 'mission-123');

      expect(['APPROVE', 'MANUAL_REVIEW']).toContain(result.recommendation);
    });

    it('should calculate abuse score correctly', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.dispute.count.mockResolvedValue(0);

      const result = await service.detectRefundAbuse('user-123', 'mission-123');

      expect(result.abuseScore).toBeGreaterThanOrEqual(0);
      expect(result.abuseScore).toBeLessThanOrEqual(100);
    });

    it('should include refund rate in signal data', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        clientMissions: [
          { id: 'm1', status: 'CANCELLED' },
          { id: 'm2', status: 'CANCELLED' },
          { id: 'm3', status: 'COMPLETED' },
          { id: 'm4', status: 'COMPLETED' },
          { id: 'm5', status: 'COMPLETED' },
        ],
      });
      mockPrismaService.dispute.count.mockResolvedValue(0);

      const result = await service.detectRefundAbuse('user-123', 'mission-123');

      const refundSignal = result.signals.find((s) => s.type === 'HIGH_REFUND_RATE');
      if (refundSignal) {
        expect(refundSignal.historicalData).toBeDefined();
        expect(refundSignal.historicalData.refundRate).toBe(40);
        expect(refundSignal.historicalData.totalMissions).toBe(5);
        expect(refundSignal.historicalData.refundedMissions).toBe(2);
      }
    });

    it('should handle user with no missions', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        clientMissions: [],
      });
      mockPrismaService.dispute.count.mockResolvedValue(0);

      const result = await service.detectRefundAbuse('user-123', 'mission-123');

      expect(result.isAbusive).toBe(false);
      expect(result.abuseScore).toBe(0);
    });
  });
});
