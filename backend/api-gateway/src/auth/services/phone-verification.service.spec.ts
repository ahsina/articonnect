import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PhoneVerificationService } from './phone-verification.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('PhoneVerificationService', () => {
  let service: PhoneVerificationService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    phoneVerificationToken: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhoneVerificationService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PhoneVerificationService>(PhoneVerificationService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendVerificationCode', () => {
    const phone = '+33612345678';
    const userId = 'user-123';

    it('should send verification code successfully', async () => {
      mockPrismaService.phoneVerificationToken.count.mockResolvedValue(0);
      mockPrismaService.phoneVerificationToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.phoneVerificationToken.create.mockResolvedValue({
        id: 'token-123',
        code: '123456',
        phone: '33612345678',
      });

      const result = await service.sendVerificationCode(phone, userId);

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('expiresIn', 600);
      expect(mockPrismaService.phoneVerificationToken.create).toHaveBeenCalled();
    });

    it('should normalize phone number', async () => {
      const phoneWithFormatting = '+33 6 12 34 56 78';
      mockPrismaService.phoneVerificationToken.count.mockResolvedValue(0);
      mockPrismaService.phoneVerificationToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.phoneVerificationToken.create.mockResolvedValue({
        id: 'token-123',
        code: '123456',
        phone: '+33612345678',
      });

      await service.sendVerificationCode(phoneWithFormatting);

      const createCall = mockPrismaService.phoneVerificationToken.create.mock.calls[0][0];
      expect(createCall.data.phone).toBe('+33612345678'); // normalized includes '+'
    });

    it('should invalidate existing tokens for the phone', async () => {
      mockPrismaService.phoneVerificationToken.count.mockResolvedValue(0);
      mockPrismaService.phoneVerificationToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.phoneVerificationToken.create.mockResolvedValue({
        id: 'token-123',
        code: '123456',
        phone: '+33612345678',
      });

      await service.sendVerificationCode(phone);

      expect(mockPrismaService.phoneVerificationToken.updateMany).toHaveBeenCalledWith({
        where: {
          phone: '+33612345678', // normalized includes '+'
          used: false,
        },
        data: {
          used: true,
        },
      });
    });
  });

  describe('verifyCode', () => {
    const phone = '+33612345678';
    const code = '123456';

    const mockToken = {
      id: 'token-123',
      code: '123456',
      phone: '33612345678',
      userId: 'user-123',
      used: false,
      attempts: 0,
      expiresAt: new Date(Date.now() + 600000), // 10 minutes from now
    };

    it('should verify code successfully', async () => {
      mockPrismaService.phoneVerificationToken.findFirst.mockResolvedValue(mockToken);
      mockPrismaService.phoneVerificationToken.update.mockResolvedValue({
        ...mockToken,
        used: true,
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: mockToken.userId,
        phoneVerified: true,
      });

      const result = await service.verifyCode(phone, code);

      expect(result).toEqual({
        verified: true,
        phone: '+33612345678', // normalizedPhone includes '+'
      });
    });

    it('should throw error for invalid code', async () => {
      mockPrismaService.phoneVerificationToken.findFirst.mockResolvedValue(null);

      await expect(service.verifyCode(phone, 'wrong-code')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error for expired code', async () => {
      mockPrismaService.phoneVerificationToken.findFirst.mockResolvedValue({
        ...mockToken,
        expiresAt: new Date(Date.now() - 60000), // Expired 1 minute ago
      });

      await expect(service.verifyCode(phone, code)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error after max attempts exceeded', async () => {
      mockPrismaService.phoneVerificationToken.findFirst.mockResolvedValue({
        ...mockToken,
        attempts: 5,
      });

      await expect(service.verifyCode(phone, code)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should increment attempts on wrong code', async () => {
      mockPrismaService.phoneVerificationToken.findFirst.mockResolvedValue({
        ...mockToken,
        code: '654321', // Different code
        attempts: 2,
      });
      mockPrismaService.phoneVerificationToken.update.mockResolvedValue({
        ...mockToken,
        attempts: 3,
      });

      await expect(service.verifyCode(phone, code)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockPrismaService.phoneVerificationToken.update).toHaveBeenCalledWith({
        where: { id: mockToken.id },
        data: { attempts: 3 },
      });
    });

    it('should update user phoneVerified status if userId is associated', async () => {
      mockPrismaService.phoneVerificationToken.findFirst.mockResolvedValue(mockToken);
      mockPrismaService.phoneVerificationToken.update.mockResolvedValue({
        ...mockToken,
        used: true,
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: mockToken.userId,
        phoneVerified: true,
      });

      await service.verifyCode(phone, code);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockToken.userId },
        data: {
          phone: '+33612345678', // normalizedPhone
          phoneVerified: true,
        },
      });
    });
  });

  describe('isPhoneVerified', () => {
    const phone = '+33612345678';

    it('should return true if phone is verified', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user-123',
        phone: '33612345678',
        phoneVerified: true,
      });

      const result = await service.isPhoneVerified(phone);

      expect(result).toBe(true);
    });

    it('should return false if phone is not verified', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      const result = await service.isPhoneVerified(phone);

      expect(result).toBe(false);
    });

    it('should normalize phone number when checking', async () => {
      const phoneWithFormatting = '+33 6 12 34 56 78';
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await service.isPhoneVerified(phoneWithFormatting);

      // isPhoneVerified uses a different normalization (removes all non-digits)
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          phone: '33612345678',
          phoneVerified: true,
        },
      });
    });
  });
});
