import { Test, TestingModule } from '@nestjs/testing';
import { TwoFactorService } from './two-factor.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as speakeasy from 'speakeasy';
import * as bcrypt from 'bcrypt';

// Mock external libraries
jest.mock('speakeasy', () => ({
  generateSecret: jest.fn(),
  totp: {
    verify: jest.fn(),
  },
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}));

describe('TwoFactorService', () => {
  let service: TwoFactorService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    backupCode: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TwoFactorService>(TwoFactorService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSecret', () => {
    const userId = 'user-123';
    const mockUser = {
      id: userId,
      email: 'test@example.com',
    };

    it('should generate a new secret and QR code', async () => {
      const mockSecret = {
        base32: 'JBSWY3DPEHPK3PXP',
        otpauth_url: 'otpauth://totp/Krafolt...',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (speakeasy.generateSecret as jest.Mock).mockReturnValue(mockSecret);
      const QRCode = require('qrcode');
      QRCode.toDataURL.mockResolvedValue('data:image/png;base64,mock-qr-code');

      const result = await service.generateSecret(userId);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
      expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(speakeasy.generateSecret).toHaveBeenCalledWith({
        name: `Krafolt (${mockUser.email})`,
        issuer: 'Krafolt',
      });
    });
  });

  describe('verifyToken', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const token = '123456';

    it('should return true for valid token', async () => {
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      const result = await service.verifyToken(secret, token);

      expect(result).toBe(true);
      expect(speakeasy.totp.verify).toHaveBeenCalledWith({
        secret,
        encoding: 'base32',
        token,
        window: 2,
      });
    });

    it('should return false for invalid token', async () => {
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      const result = await service.verifyToken(secret, 'invalid');

      expect(result).toBe(false);
    });
  });

  describe('enable2FA', () => {
    const userId = 'user-123';
    const secret = 'JBSWY3DPEHPK3PXP';

    it('should enable 2FA and generate backup codes', async () => {
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.backupCode.create.mockResolvedValue({});

      const result = await service.enable2FA(userId, secret);

      expect(result).toHaveProperty('backupCodes');
      expect(result.backupCodes).toHaveLength(10);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          twoFactorSecret: secret,
          twoFactorEnabled: true,
        },
      });
      expect(mockPrismaService.backupCode.create).toHaveBeenCalledTimes(10);
    });

    it('should hash backup codes before storing', async () => {
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.backupCode.create.mockResolvedValue({});

      await service.enable2FA(userId, secret);

      // Verify that backup codes are hashed (bcrypt hash starts with $2b$)
      const createCalls = mockPrismaService.backupCode.create.mock.calls;
      for (const call of createCalls) {
        expect(call[0].data.code).toMatch(/^\$2[aby]\$/);
      }
    });
  });

  describe('verifyBackupCode', () => {
    const userId = 'user-123';

    it('should return true and mark code as used for valid backup code', async () => {
      const validCode = 'ABCD1234';
      const hashedCode = await bcrypt.hash(validCode, 10);

      mockPrismaService.backupCode.findMany.mockResolvedValue([
        { id: 'backup-1', code: hashedCode, used: false },
      ]);
      mockPrismaService.backupCode.update.mockResolvedValue({});

      const result = await service.verifyBackupCode(userId, validCode);

      expect(result).toBe(true);
      expect(mockPrismaService.backupCode.update).toHaveBeenCalledWith({
        where: { id: 'backup-1' },
        data: {
          used: true,
          usedAt: expect.any(Date),
        },
      });
    });

    it('should return false for invalid backup code', async () => {
      const hashedCode = await bcrypt.hash('VALID123', 10);

      mockPrismaService.backupCode.findMany.mockResolvedValue([
        { id: 'backup-1', code: hashedCode, used: false },
      ]);

      const result = await service.verifyBackupCode(userId, 'INVALID1');

      expect(result).toBe(false);
      expect(mockPrismaService.backupCode.update).not.toHaveBeenCalled();
    });

    it('should return false if no unused backup codes exist', async () => {
      mockPrismaService.backupCode.findMany.mockResolvedValue([]);

      const result = await service.verifyBackupCode(userId, 'ANYCODE1');

      expect(result).toBe(false);
    });

    it('should not reuse already used backup codes', async () => {
      mockPrismaService.backupCode.findMany.mockResolvedValue([]); // Only unused codes returned

      const result = await service.verifyBackupCode(userId, 'USED1234');

      expect(result).toBe(false);
    });
  });

  describe('getRemainingBackupCodesCount', () => {
    const userId = 'user-123';

    it('should return count of unused backup codes', async () => {
      mockPrismaService.backupCode.count.mockResolvedValue(7);

      const result = await service.getRemainingBackupCodesCount(userId);

      expect(result).toBe(7);
      expect(mockPrismaService.backupCode.count).toHaveBeenCalledWith({
        where: {
          userId,
          used: false,
        },
      });
    });

    it('should return 0 when all codes are used', async () => {
      mockPrismaService.backupCode.count.mockResolvedValue(0);

      const result = await service.getRemainingBackupCodesCount(userId);

      expect(result).toBe(0);
    });
  });

  describe('regenerateBackupCodes', () => {
    const userId = 'user-123';

    it('should delete old codes and generate new ones', async () => {
      mockPrismaService.backupCode.deleteMany.mockResolvedValue({ count: 5 });
      mockPrismaService.backupCode.create.mockResolvedValue({});

      const result = await service.regenerateBackupCodes(userId);

      expect(result).toHaveProperty('backupCodes');
      expect(result.backupCodes).toHaveLength(10);
      expect(mockPrismaService.backupCode.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(mockPrismaService.backupCode.create).toHaveBeenCalledTimes(10);
    });

    it('should generate unique backup codes', async () => {
      mockPrismaService.backupCode.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.backupCode.create.mockResolvedValue({});

      const result = await service.regenerateBackupCodes(userId);

      const uniqueCodes = new Set(result.backupCodes);
      expect(uniqueCodes.size).toBe(10);
    });
  });
});
