import { Test, TestingModule } from '@nestjs/testing';
import { LoginSecurityService, LoginAttempt } from './login-security.service';
import { RedisService } from '../../common/redis/redis.service';
import { UnauthorizedException } from '@nestjs/common';

describe('LoginSecurityService', () => {
  let service: LoginSecurityService;
  let redisService: RedisService;

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    ttl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginSecurityService,
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<LoginSecurityService>(LoginSecurityService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordAttempt', () => {
    const email = 'test@example.com';
    const ipAddress = '192.168.1.1';
    const userAgent = 'Mozilla/5.0';

    it('should record a successful login attempt', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');
      mockRedisService.del.mockResolvedValue(1);

      await service.recordAttempt(email, ipAddress, true, userAgent);

      expect(mockRedisService.set).toHaveBeenCalled();
      expect(mockRedisService.del).toHaveBeenCalled(); // Clears failed attempts on success
    });

    it('should record a failed login attempt', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');

      await service.recordAttempt(email, ipAddress, false, userAgent);

      expect(mockRedisService.set).toHaveBeenCalled();
      const setCall = mockRedisService.set.mock.calls[0];
      const attempts = JSON.parse(setCall[1]);
      expect(attempts[0].success).toBe(false);
    });

    it('should add to existing failed attempts', async () => {
      const existingAttempts: LoginAttempt[] = [
        {
          email,
          ipAddress,
          timestamp: new Date(),
          success: false,
        },
      ];
      mockRedisService.get.mockResolvedValue(JSON.stringify(existingAttempts));
      mockRedisService.set.mockResolvedValue('OK');

      await service.recordAttempt(email, ipAddress, false, userAgent);

      const setCall = mockRedisService.set.mock.calls[0];
      const attempts = JSON.parse(setCall[1]);
      expect(attempts).toHaveLength(2);
    });

    it('should trigger lockout after 5 failed attempts', async () => {
      const existingAttempts: LoginAttempt[] = Array(4).fill(null).map(() => ({
        email,
        ipAddress,
        timestamp: new Date(),
        success: false,
      }));
      mockRedisService.get
        .mockResolvedValueOnce(JSON.stringify(existingAttempts)) // getRecentAttempts
        .mockResolvedValueOnce(JSON.stringify([...existingAttempts, { email, ipAddress, timestamp: new Date(), success: false }])); // getFailedAttemptCount
      mockRedisService.set.mockResolvedValue('OK');

      await service.recordAttempt(email, ipAddress, false, userAgent);

      // Should set lockout key
      const lockoutSetCall = mockRedisService.set.mock.calls.find(
        call => call[0].includes('lockout')
      );
      expect(lockoutSetCall).toBeDefined();
    });
  });

  describe('isLockedOut', () => {
    const email = 'test@example.com';

    it('should return true when account is locked', async () => {
      mockRedisService.get.mockResolvedValue(JSON.stringify({
        email,
        lockedAt: new Date(),
        reason: 'Too many failed login attempts',
      }));

      const result = await service.isLockedOut(email);

      expect(result).toBe(true);
    });

    it('should return false when account is not locked', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.isLockedOut(email);

      expect(result).toBe(false);
    });
  });

  describe('getRemainingLockoutTime', () => {
    const email = 'test@example.com';

    it('should return remaining TTL for locked account', async () => {
      mockRedisService.ttl.mockResolvedValue(600); // 10 minutes

      const result = await service.getRemainingLockoutTime(email);

      expect(result).toBe(600);
    });

    it('should return 0 when not locked', async () => {
      mockRedisService.ttl.mockResolvedValue(-1);

      const result = await service.getRemainingLockoutTime(email);

      expect(result).toBe(0);
    });
  });

  describe('getFailedAttemptCount', () => {
    const email = 'test@example.com';

    it('should return count of failed attempts', async () => {
      const attempts: LoginAttempt[] = [
        { email, ipAddress: '1.1.1.1', timestamp: new Date(), success: false },
        { email, ipAddress: '1.1.1.2', timestamp: new Date(), success: true },
        { email, ipAddress: '1.1.1.3', timestamp: new Date(), success: false },
      ];
      mockRedisService.get.mockResolvedValue(JSON.stringify(attempts));

      const result = await service.getFailedAttemptCount(email);

      expect(result).toBe(2);
    });

    it('should return 0 when no attempts exist', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.getFailedAttemptCount(email);

      expect(result).toBe(0);
    });
  });

  describe('getRecentAttempts', () => {
    const email = 'test@example.com';

    it('should return all recent attempts within window', async () => {
      const recentAttempt: LoginAttempt = {
        email,
        ipAddress: '1.1.1.1',
        timestamp: new Date(),
        success: false,
      };
      mockRedisService.get.mockResolvedValue(JSON.stringify([recentAttempt]));

      const result = await service.getRecentAttempts(email);

      expect(result).toHaveLength(1);
    });

    it('should filter out old attempts outside window', async () => {
      const oldTimestamp = new Date(Date.now() - 20 * 60 * 1000); // 20 minutes ago
      const recentTimestamp = new Date();

      const attempts: LoginAttempt[] = [
        { email, ipAddress: '1.1.1.1', timestamp: oldTimestamp, success: false },
        { email, ipAddress: '1.1.1.2', timestamp: recentTimestamp, success: false },
      ];
      mockRedisService.get.mockResolvedValue(JSON.stringify(attempts));

      const result = await service.getRecentAttempts(email);

      expect(result).toHaveLength(1);
      expect(new Date(result[0].timestamp).getTime()).toBe(recentTimestamp.getTime());
    });

    it('should return empty array when no attempts exist', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.getRecentAttempts(email);

      expect(result).toEqual([]);
    });
  });

  describe('clearFailedAttempts', () => {
    const email = 'test@example.com';

    it('should delete attempts key', async () => {
      mockRedisService.del.mockResolvedValue(1);

      await service.clearFailedAttempts(email);

      expect(mockRedisService.del).toHaveBeenCalledWith(`login:attempts:${email}`);
    });
  });

  describe('unlockAccount', () => {
    const email = 'test@example.com';

    it('should delete both lockout and attempts keys', async () => {
      mockRedisService.del.mockResolvedValue(1);

      await service.unlockAccount(email);

      expect(mockRedisService.del).toHaveBeenCalledWith(`login:lockout:${email}`);
      expect(mockRedisService.del).toHaveBeenCalledWith(`login:attempts:${email}`);
    });
  });

  describe('verifyLoginAllowed', () => {
    const email = 'test@example.com';

    it('should pass when account is not locked', async () => {
      mockRedisService.get.mockResolvedValue(null);

      await expect(service.verifyLoginAllowed(email)).resolves.not.toThrow();
    });

    it('should throw UnauthorizedException when account is locked', async () => {
      mockRedisService.get.mockResolvedValue(JSON.stringify({
        email,
        lockedAt: new Date(),
      }));
      mockRedisService.ttl.mockResolvedValue(600);

      await expect(service.verifyLoginAllowed(email)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should include remaining time in error message', async () => {
      mockRedisService.get.mockResolvedValue(JSON.stringify({
        email,
        lockedAt: new Date(),
      }));
      mockRedisService.ttl.mockResolvedValue(300); // 5 minutes

      try {
        await service.verifyLoginAllowed(email);
        fail('Expected UnauthorizedException');
      } catch (error) {
        expect(error.message).toContain('5 minutes');
      }
    });
  });

  describe('getSecurityStats', () => {
    const email = 'test@example.com';

    it('should return comprehensive security stats', async () => {
      const attempts: LoginAttempt[] = [
        { email, ipAddress: '1.1.1.1', timestamp: new Date(), success: false },
        { email, ipAddress: '1.1.1.2', timestamp: new Date(), success: true },
      ];

      mockRedisService.get
        .mockResolvedValueOnce(null) // isLockedOut
        .mockResolvedValueOnce(JSON.stringify(attempts)) // getFailedAttemptCount
        .mockResolvedValueOnce(JSON.stringify(attempts)); // getRecentAttempts
      mockRedisService.ttl.mockResolvedValue(0);

      const result = await service.getSecurityStats(email);

      expect(result).toHaveProperty('isLockedOut');
      expect(result).toHaveProperty('failedAttempts');
      expect(result).toHaveProperty('remainingLockoutTime');
      expect(result).toHaveProperty('recentAttempts');
      expect(result.isLockedOut).toBe(false);
      expect(result.failedAttempts).toBe(1);
    });

    it('should limit recent attempts to last 10', async () => {
      const attempts: LoginAttempt[] = Array(15).fill(null).map((_, i) => ({
        email,
        ipAddress: `1.1.1.${i}`,
        timestamp: new Date(),
        success: i % 2 === 0,
      }));

      mockRedisService.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify(attempts))
        .mockResolvedValueOnce(JSON.stringify(attempts));
      mockRedisService.ttl.mockResolvedValue(0);

      const result = await service.getSecurityStats(email);

      expect(result.recentAttempts).toHaveLength(10);
    });
  });
});
