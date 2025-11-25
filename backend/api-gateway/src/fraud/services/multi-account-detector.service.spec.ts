import { Test, TestingModule } from '@nestjs/testing';
import { MultiAccountDetectorService } from './multi-account-detector.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('MultiAccountDetectorService', () => {
  let service: MultiAccountDetectorService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultiAccountDetectorService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MultiAccountDetectorService>(MultiAccountDetectorService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('detectMultipleAccounts', () => {
    const userId = 'user-123';
    const baseUser = {
      email: 'john@example.com',
      phone: '+352123456789',
      deviceFingerprints: ['fp-123'],
      lastIpAddress: '192.168.1.1',
      clientProfile: { stripeCustomerId: 'cus_123' },
    };

    it('should return no risk for user with no linked accounts', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(baseUser);
      mockPrismaService.user.findMany.mockResolvedValue([]); // No matches

      const result = await service.detectMultipleAccounts(userId);

      expect(result.isSuspicious).toBe(false);
      expect(result.riskScore).toBeLessThan(50);
      expect(result.linkedAccounts).toHaveLength(0);
    });

    it('should return empty result for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.detectMultipleAccounts(userId);

      expect(result.isSuspicious).toBe(false);
      expect(result.riskScore).toBe(0);
      expect(result.linkedAccounts).toHaveLength(0);
    });

    it('should detect similar email accounts', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        email: 'john+test@example.com',
        phone: null,
        deviceFingerprints: [],
        lastIpAddress: null,
        clientProfile: null,
      });
      mockPrismaService.user.findMany.mockResolvedValueOnce([
        { id: 'user-456', email: 'john+other@example.com' },
      ]).mockResolvedValue([]);

      const result = await service.detectMultipleAccounts(userId);

      expect(result.signals.some(s => s.type === 'EMAIL_SIMILARITY')).toBe(true);
      expect(result.linkedAccounts).toContain('user-456');
    });

    it('should detect phone number matches', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...baseUser,
        deviceFingerprints: [],
        clientProfile: null,
      });
      mockPrismaService.user.findMany
        .mockResolvedValueOnce([]) // Email check
        .mockResolvedValueOnce([{ id: 'user-789', email: 'other@example.com' }]) // Phone check
        .mockResolvedValue([]);

      const result = await service.detectMultipleAccounts(userId);

      expect(result.signals.some(s => s.type === 'PHONE_MATCH')).toBe(true);
      expect(result.linkedAccounts).toContain('user-789');
    });

    it('should detect device fingerprint matches', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...baseUser,
        phone: null,
        clientProfile: null,
      });
      mockPrismaService.user.findMany
        .mockResolvedValueOnce([]) // Email
        .mockResolvedValueOnce([{ id: 'user-device', email: 'device@example.com' }]) // Device
        .mockResolvedValue([]);

      const result = await service.detectMultipleAccounts(userId, {
        fingerprintId: 'fp-123',
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
      });

      expect(result.signals.some(s => s.type === 'DEVICE_MATCH')).toBe(true);
    });

    it('should detect IP address matches with lower confidence', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...baseUser,
        phone: null,
        deviceFingerprints: [],
        clientProfile: null,
      });
      mockPrismaService.user.findMany
        .mockResolvedValueOnce([]) // Email
        .mockResolvedValueOnce([{ id: 'user-ip', email: 'ip@example.com' }]) // IP
        .mockResolvedValue([]);

      const result = await service.detectMultipleAccounts(userId);

      const ipSignal = result.signals.find(s => s.type === 'IP_MATCH');
      expect(ipSignal).toBeDefined();
      expect(ipSignal?.confidence).toBe(60); // Lower confidence for IP
    });

    it('should detect payment method matches', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...baseUser,
        phone: null,
        deviceFingerprints: [],
      });
      mockPrismaService.user.findMany
        .mockResolvedValueOnce([]) // Email
        .mockResolvedValueOnce([]) // IP
        .mockResolvedValueOnce([{ id: 'user-pay', email: 'pay@example.com' }]) // Payment
        .mockResolvedValue([]);

      const result = await service.detectMultipleAccounts(userId);

      expect(result.signals.some(s => s.type === 'PAYMENT_METHOD_MATCH')).toBe(true);
    });

    it('should recommend BLOCK for very high risk', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(baseUser);
      // Multiple matches across all categories
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'linked-1', email: 'test1@example.com' },
        { id: 'linked-2', email: 'test2@example.com' },
      ]);

      const result = await service.detectMultipleAccounts(userId);

      expect(result.isSuspicious).toBe(true);
      expect(['BLOCK', 'MANUAL_REVIEW', 'FLAG']).toContain(result.recommendation);
    });

    it('should recommend ALLOW for low risk', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        email: 'unique@example.com',
        phone: null,
        deviceFingerprints: [],
        lastIpAddress: null,
        clientProfile: null,
      });
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.detectMultipleAccounts(userId);

      expect(result.recommendation).toBe('ALLOW');
    });
  });

  describe('storeDeviceFingerprint', () => {
    it('should add new fingerprint to user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        deviceFingerprints: ['existing-fp'],
      });
      mockPrismaService.user.update.mockResolvedValue({});

      await service.storeDeviceFingerprint('user-123', {
        fingerprintId: 'new-fp',
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
      });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          deviceFingerprints: ['existing-fp', 'new-fp'],
          lastUserAgent: 'Mozilla/5.0',
          lastIpAddress: '192.168.1.1',
        },
      });
    });

    it('should not add duplicate fingerprint', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        deviceFingerprints: ['existing-fp'],
      });

      await service.storeDeviceFingerprint('user-123', {
        fingerprintId: 'existing-fp',
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
      });

      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('should handle user with no existing fingerprints', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        deviceFingerprints: null,
      });
      mockPrismaService.user.update.mockResolvedValue({});

      await service.storeDeviceFingerprint('user-123', {
        fingerprintId: 'first-fp',
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
      });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: expect.objectContaining({
          deviceFingerprints: ['first-fp'],
        }),
      });
    });
  });

  describe('getFlaggedUsers', () => {
    it('should return users with high risk scores', async () => {
      const flaggedUsers = [
        { id: 'user-1', email: 'test1@example.com', multiAccountRiskScore: 90 },
        { id: 'user-2', email: 'test2@example.com', multiAccountRiskScore: 75 },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(flaggedUsers);

      const result = await service.getFlaggedUsers();

      expect(result).toHaveLength(2);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { multiAccountRiskScore: { gte: 50 } },
          orderBy: { multiAccountRiskScore: 'desc' },
        }),
      );
    });

    it('should respect limit parameter', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.getFlaggedUsers(50);

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });

    it('should use default limit of 100', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.getFlaggedUsers();

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });
  });
});
