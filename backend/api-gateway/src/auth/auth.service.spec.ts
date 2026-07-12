import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { EmailService } from '../email/services/email.service';
import { TwoFactorService } from './services/two-factor.service';
import { SessionService } from './services/session.service';
import { MultiAccountDetectorService } from '../fraud/services/multi-account-detector.service';
import { FeatureToggleService } from '../fraud/services/feature-toggle.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let _prisma: PrismaService;
  let _jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    clientProfile: {
      create: jest.fn(),
    },
    userConsent: {
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    emailVerificationToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockRedisService = {
    getClient: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn(),
    sendEmailVerification: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendWelcomeEmail: jest.fn(),
  };

  const mockTwoFactorService = {
    generateSecret: jest.fn(),
    verifyToken: jest.fn(),
    enableTwoFactor: jest.fn(),
    disableTwoFactor: jest.fn(),
  };

  const mockMultiAccountDetectorService = {
    checkForDuplicates: jest.fn(),
    analyzeRegistration: jest.fn(),
  };

  const mockSessionService = {
    createSession: jest.fn().mockResolvedValue('test-session-id'),
    revokeSession: jest.fn().mockResolvedValue(undefined),
    touchSession: jest.fn().mockResolvedValue(undefined),
    getUserSessions: jest.fn().mockResolvedValue([]),
    getSession: jest.fn().mockResolvedValue(null),
  };

  const mockFeatureToggleService = {
    isMultiAccountDetectionEnabled: jest.fn(),
    getMultiAccountRiskThreshold: jest.fn(),
    isReviewFraudDetectionEnabled: jest.fn(),
  };

  beforeEach(async () => {
    // Reset mock implementations before each test
    mockJwtService.sign.mockReturnValue('test-token');
    mockJwtService.verify.mockReturnValue({ sub: 'user-id' });
    mockMultiAccountDetectorService.checkForDuplicates.mockResolvedValue({ isDuplicate: false });
    mockMultiAccountDetectorService.analyzeRegistration.mockResolvedValue({ riskScore: 0, signals: [] });
    mockFeatureToggleService.isMultiAccountDetectionEnabled.mockResolvedValue(false);
    mockFeatureToggleService.getMultiAccountRiskThreshold.mockResolvedValue(70);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: TwoFactorService, useValue: mockTwoFactorService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: MultiAccountDetectorService, useValue: mockMultiAccountDetectorService },
        { provide: FeatureToggleService, useValue: mockFeatureToggleService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    _prisma = module.get<PrismaService>(PrismaService);
    _jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should register a new user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: '1',
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        role: 'CLIENT',
      });
      mockJwtService.sign.mockReturnValue('test-token');

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        email: registerDto.email,
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should hash password before saving', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockImplementation((args) => {
        return Promise.resolve({
          id: '1',
          ...args.data,
        });
      });
      mockJwtService.sign.mockReturnValue('test-token');

      await service.register(registerDto);

      const createCall = mockPrismaService.user.create.mock.calls[0][0];
      expect(createCall.data.password).not.toBe(registerDto.password);
      expect(await bcrypt.compare(registerDto.password, createCall.data.password)).toBe(true);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    const mockUser = {
      id: '1',
      email: loginDto.email,
      password: '', // Will be set in beforeEach
      firstName: 'Test',
      lastName: 'User',
      role: 'CLIENT',
      twoFactorEnabled: false,
    };

    beforeEach(async () => {
      mockUser.password = await bcrypt.hash(loginDto.password, 12);
    });

    it('should login user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('test-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: '1',
        token: 'hashed-refresh-token',
      });

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException with wrong password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.login({ ...loginDto, password: 'WrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with non-existent email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should require 2FA token if enabled', async () => {
      const user2FA = { ...mockUser, twoFactorEnabled: true };
      mockPrismaService.user.findUnique.mockResolvedValue(user2FA);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('requires2FA', true);
      expect(result).not.toHaveProperty('accessToken');
    });
  });

  describe('validateUser', () => {
    const email = 'test@example.com';
    const password = 'Password123!';

    it('should validate user with correct credentials', async () => {
      const hashedPassword = await bcrypt.hash(password, 12);
      const mockUser = {
        id: '1',
        email,
        password: hashedPassword,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser(email, password);

      expect(result).toEqual(mockUser);
    });

    it('should return null with wrong password', async () => {
      const hashedPassword = await bcrypt.hash(password, 12);
      const mockUser = {
        id: '1',
        email,
        password: hashedPassword,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser(email, 'WrongPassword');

      expect(result).toBeNull();
    });

    it('should return null with non-existent email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
    });
  });

  describe('sanitizeUser', () => {
    it('should remove sensitive fields from user object', () => {
      const user: any = {
        id: '1',
        email: 'test@example.com',
        password: 'hashed-password',
        twoFactorSecret: 'secret',
        firstName: 'Test',
        lastName: 'User',
      };

      const sanitized = service.sanitizeUser(user);

      expect(sanitized).not.toHaveProperty('password');
      expect(sanitized).not.toHaveProperty('twoFactorSecret');
      expect(sanitized).toHaveProperty('email');
      expect(sanitized).toHaveProperty('firstName');
    });
  });
});
