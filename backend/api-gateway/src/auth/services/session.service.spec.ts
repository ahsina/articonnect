import { Test, TestingModule } from '@nestjs/testing';
import { SessionService, SessionInfo } from './session.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

describe('SessionService', () => {
  let service: SessionService;
  let redisService: RedisService;

  const mockPrismaService = {};

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    const userId = 'user-123';
    const ipAddress = '192.168.1.1';
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0';

    it('should create a new session successfully', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');

      const sessionId = await service.createSession(userId, ipAddress, userAgent);

      expect(sessionId).toBeDefined();
      expect(sessionId.length).toBe(64); // 32 bytes hex = 64 chars
      expect(mockRedisService.set).toHaveBeenCalledTimes(2); // Session + user sessions list
    });

    it('should add session to existing user sessions list', async () => {
      const existingSessions = ['existing-session-1'];
      mockRedisService.get.mockResolvedValue(JSON.stringify(existingSessions));
      mockRedisService.set.mockResolvedValue('OK');

      const sessionId = await service.createSession(userId, ipAddress, userAgent);

      expect(sessionId).toBeDefined();
      expect(mockRedisService.set).toHaveBeenCalledTimes(2);
    });

    it('should detect mobile device from user agent', async () => {
      const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) Mobile';
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');

      await service.createSession(userId, ipAddress, mobileUA);

      const setCall = mockRedisService.set.mock.calls[0];
      const sessionData = JSON.parse(setCall[1]);
      expect(sessionData.deviceInfo.type).toBe('MOBILE');
    });

    it('should detect tablet device from user agent', async () => {
      const tabletUA = 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit';
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');

      await service.createSession(userId, ipAddress, tabletUA);

      const setCall = mockRedisService.set.mock.calls[0];
      const sessionData = JSON.parse(setCall[1]);
      expect(sessionData.deviceInfo.type).toBe('TABLET');
    });

    it('should detect desktop device from user agent', async () => {
      const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');

      await service.createSession(userId, ipAddress, desktopUA);

      const setCall = mockRedisService.set.mock.calls[0];
      const sessionData = JSON.parse(setCall[1]);
      expect(sessionData.deviceInfo.type).toBe('DESKTOP');
    });

    it('should detect Chrome browser', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');

      await service.createSession(userId, ipAddress, userAgent);

      const setCall = mockRedisService.set.mock.calls[0];
      const sessionData = JSON.parse(setCall[1]);
      expect(sessionData.deviceInfo.browser).toBe('Chrome');
    });

    it('should detect Firefox browser', async () => {
      const firefoxUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:100.0) Gecko/20100101 Firefox/100.0';
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');

      await service.createSession(userId, ipAddress, firefoxUA);

      const setCall = mockRedisService.set.mock.calls[0];
      const sessionData = JSON.parse(setCall[1]);
      expect(sessionData.deviceInfo.browser).toBe('Firefox');
    });
  });

  describe('getSession', () => {
    const sessionId = 'test-session-123';

    it('should return session if it exists and not expired', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now
      const mockSession: SessionInfo = {
        id: sessionId,
        userId: 'user-123',
        deviceInfo: {
          type: 'DESKTOP',
          browser: 'Chrome',
          os: 'Windows',
          ipAddress: '192.168.1.1',
        },
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        expiresAt: futureDate,
        isActive: true,
      };

      mockRedisService.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await service.getSession(sessionId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(sessionId);
    });

    it('should return null if session does not exist', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.getSession(sessionId);

      expect(result).toBeNull();
    });

    it('should return null and revoke expired session', async () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      const mockSession: SessionInfo = {
        id: sessionId,
        userId: 'user-123',
        deviceInfo: {
          type: 'DESKTOP',
          browser: 'Chrome',
          os: 'Windows',
          ipAddress: '192.168.1.1',
        },
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        expiresAt: pastDate,
        isActive: true,
      };

      mockRedisService.get
        .mockResolvedValueOnce(JSON.stringify(mockSession)) // First call for getSession
        .mockResolvedValueOnce(JSON.stringify(mockSession)); // Second call in revokeSession

      const result = await service.getSession(sessionId);

      expect(result).toBeNull();
    });
  });

  describe('getUserSessions', () => {
    const userId = 'user-123';

    it('should return all active sessions for user', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60);
      const session1: SessionInfo = {
        id: 'session-1',
        userId,
        deviceInfo: { type: 'DESKTOP', ipAddress: '192.168.1.1' },
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        expiresAt: futureDate,
        isActive: true,
      };
      const session2: SessionInfo = {
        id: 'session-2',
        userId,
        deviceInfo: { type: 'MOBILE', ipAddress: '192.168.1.2' },
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        expiresAt: futureDate,
        isActive: true,
      };

      mockRedisService.get
        .mockResolvedValueOnce(JSON.stringify(['session-1', 'session-2']))
        .mockResolvedValueOnce(JSON.stringify(session1))
        .mockResolvedValueOnce(JSON.stringify(session2));
      mockRedisService.set.mockResolvedValue('OK');

      const result = await service.getUserSessions(userId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('session-1');
      expect(result[1].id).toBe('session-2');
    });

    it('should return empty array if no sessions exist', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');

      const result = await service.getUserSessions(userId);

      expect(result).toEqual([]);
    });

    it('should filter out expired sessions', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60);
      const pastDate = new Date(Date.now() - 1000 * 60 * 60);

      const activeSession: SessionInfo = {
        id: 'session-active',
        userId,
        deviceInfo: { type: 'DESKTOP', ipAddress: '192.168.1.1' },
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        expiresAt: futureDate,
        isActive: true,
      };
      const expiredSession: SessionInfo = {
        id: 'session-expired',
        userId,
        deviceInfo: { type: 'MOBILE', ipAddress: '192.168.1.2' },
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        expiresAt: pastDate,
        isActive: true,
      };

      mockRedisService.get
        .mockResolvedValueOnce(JSON.stringify(['session-active', 'session-expired']))
        .mockResolvedValueOnce(JSON.stringify(activeSession))
        .mockResolvedValueOnce(JSON.stringify(expiredSession))
        .mockResolvedValueOnce(JSON.stringify(expiredSession)); // For revokeSession
      mockRedisService.set.mockResolvedValue('OK');

      const result = await service.getUserSessions(userId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('session-active');
    });
  });

  describe('touchSession', () => {
    const sessionId = 'test-session-123';

    it('should update lastAccessedAt for valid session', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60);
      const mockSession: SessionInfo = {
        id: sessionId,
        userId: 'user-123',
        deviceInfo: { type: 'DESKTOP', ipAddress: '192.168.1.1' },
        createdAt: new Date(),
        lastAccessedAt: new Date(Date.now() - 1000 * 60), // 1 minute ago
        expiresAt: futureDate,
        isActive: true,
      };

      mockRedisService.get.mockResolvedValue(JSON.stringify(mockSession));
      mockRedisService.set.mockResolvedValue('OK');

      const beforeTouch = mockSession.lastAccessedAt;
      await service.touchSession(sessionId);

      expect(mockRedisService.set).toHaveBeenCalled();
      const setCall = mockRedisService.set.mock.calls[0];
      const updatedSession = JSON.parse(setCall[1]);
      expect(new Date(updatedSession.lastAccessedAt).getTime()).toBeGreaterThan(beforeTouch.getTime());
    });

    it('should do nothing for non-existent session', async () => {
      mockRedisService.get.mockResolvedValue(null);

      await service.touchSession(sessionId);

      expect(mockRedisService.set).not.toHaveBeenCalled();
    });
  });

  describe('revokeSession', () => {
    const sessionId = 'test-session-123';

    it('should mark session as inactive', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60);
      const mockSession: SessionInfo = {
        id: sessionId,
        userId: 'user-123',
        deviceInfo: { type: 'DESKTOP', ipAddress: '192.168.1.1' },
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        expiresAt: futureDate,
        isActive: true,
      };

      mockRedisService.get
        .mockResolvedValueOnce(JSON.stringify(mockSession)) // getSession
        .mockResolvedValueOnce(JSON.stringify([sessionId])); // getUserSessionIds
      mockRedisService.set.mockResolvedValue('OK');

      await service.revokeSession(sessionId);

      const setCall = mockRedisService.set.mock.calls[0];
      const updatedSession = JSON.parse(setCall[1]);
      expect(updatedSession.isActive).toBe(false);
    });

    it('should delete key if session does not exist', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.del.mockResolvedValue(1);

      await service.revokeSession(sessionId);

      expect(mockRedisService.del).toHaveBeenCalledWith(`session:${sessionId}`);
    });
  });

  describe('revokeAllSessionsExcept', () => {
    const userId = 'user-123';
    const currentSessionId = 'current-session';

    it('should revoke all sessions except the current one', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60);
      const currentSession: SessionInfo = {
        id: currentSessionId,
        userId,
        deviceInfo: { type: 'DESKTOP', ipAddress: '192.168.1.1' },
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        expiresAt: futureDate,
        isActive: true,
      };
      const otherSession: SessionInfo = {
        id: 'other-session',
        userId,
        deviceInfo: { type: 'MOBILE', ipAddress: '192.168.1.2' },
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        expiresAt: futureDate,
        isActive: true,
      };

      mockRedisService.get
        .mockResolvedValueOnce(JSON.stringify([currentSessionId, 'other-session']))
        .mockResolvedValueOnce(JSON.stringify(currentSession))
        .mockResolvedValueOnce(JSON.stringify(otherSession))
        .mockResolvedValueOnce(JSON.stringify(otherSession))
        .mockResolvedValueOnce(JSON.stringify([currentSessionId, 'other-session']));
      mockRedisService.set.mockResolvedValue('OK');

      await service.revokeAllSessionsExcept(userId, currentSessionId);

      // Verify that at least one session was revoked
      expect(mockRedisService.set).toHaveBeenCalled();
    });
  });

  describe('revokeAllSessions', () => {
    const userId = 'user-123';

    it('should revoke all sessions for user', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60);
      const session: SessionInfo = {
        id: 'session-1',
        userId,
        deviceInfo: { type: 'DESKTOP', ipAddress: '192.168.1.1' },
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        expiresAt: futureDate,
        isActive: true,
      };

      mockRedisService.get
        .mockResolvedValueOnce(JSON.stringify(['session-1']))
        .mockResolvedValueOnce(JSON.stringify(session))
        .mockResolvedValueOnce(JSON.stringify(session))
        .mockResolvedValueOnce(JSON.stringify(['session-1']));
      mockRedisService.set.mockResolvedValue('OK');
      mockRedisService.del.mockResolvedValue(1);

      await service.revokeAllSessions(userId);

      expect(mockRedisService.del).toHaveBeenCalledWith(`user:sessions:${userId}`);
    });
  });

  describe('getActiveSessionCount', () => {
    const userId = 'user-123';

    it('should return count of active sessions', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60);
      const session1: SessionInfo = {
        id: 'session-1',
        userId,
        deviceInfo: { type: 'DESKTOP', ipAddress: '192.168.1.1' },
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        expiresAt: futureDate,
        isActive: true,
      };
      const session2: SessionInfo = {
        id: 'session-2',
        userId,
        deviceInfo: { type: 'MOBILE', ipAddress: '192.168.1.2' },
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        expiresAt: futureDate,
        isActive: true,
      };

      mockRedisService.get
        .mockResolvedValueOnce(JSON.stringify(['session-1', 'session-2']))
        .mockResolvedValueOnce(JSON.stringify(session1))
        .mockResolvedValueOnce(JSON.stringify(session2));
      mockRedisService.set.mockResolvedValue('OK');

      const count = await service.getActiveSessionCount(userId);

      expect(count).toBe(2);
    });

    it('should return 0 for user with no sessions', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');

      const count = await service.getActiveSessionCount(userId);

      expect(count).toBe(0);
    });
  });
});
