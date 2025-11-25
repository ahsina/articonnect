import { Test, TestingModule } from '@nestjs/testing';
import { BotDetectorService } from './bot-detector.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

describe('BotDetectorService', () => {
  let service: BotDetectorService;
  let prismaService: PrismaService;
  let redisService: RedisService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    loginAttempt: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    fraudAlert: {
      create: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    getClient: jest.fn().mockReturnValue({
      get: jest.fn(),
      setex: jest.fn(),
      incr: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotDetectorService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<BotDetectorService>(BotDetectorService);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeRequest', () => {
    const requestData = {
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      headers: {
        'accept-language': 'en-US,en;q=0.9',
        'accept-encoding': 'gzip, deflate, br',
      },
    };

    it('should return low risk for normal request', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.incr.mockResolvedValue(1);

      const result = await service.analyzeRequest(requestData);

      expect(result).toHaveProperty('riskScore');
      expect(result.riskScore).toBeLessThan(50);
      expect(result).toHaveProperty('signals');
    });

    it('should detect missing user agent', async () => {
      const dataWithoutUA = {
        ...requestData,
        userAgent: '',
      };

      mockRedisService.get.mockResolvedValue(null);

      const result = await service.analyzeRequest(dataWithoutUA);

      expect(result.signals).toContain('MISSING_USER_AGENT');
      expect(result.riskScore).toBeGreaterThan(0);
    });

    it('should detect bot user agent', async () => {
      const botRequest = {
        ...requestData,
        userAgent: 'Googlebot/2.1 (+http://www.google.com/bot.html)',
      };

      mockRedisService.get.mockResolvedValue(null);

      const result = await service.analyzeRequest(botRequest);

      expect(result.signals).toContain('BOT_USER_AGENT');
    });

    it('should detect high request rate', async () => {
      mockRedisService.incr.mockResolvedValue(100); // High request count

      const result = await service.analyzeRequest(requestData);

      expect(result.signals).toContain('HIGH_REQUEST_RATE');
      expect(result.riskScore).toBeGreaterThan(30);
    });
  });

  describe('detectAutomatedBehavior', () => {
    const userId = 'user-123';

    it('should detect rapid sequential actions', async () => {
      const actions = [
        { timestamp: Date.now() - 100, type: 'click' },
        { timestamp: Date.now() - 50, type: 'click' },
        { timestamp: Date.now(), type: 'click' },
      ];

      const result = await service.detectAutomatedBehavior(userId, actions);

      expect(result).toHaveProperty('isAutomated');
      expect(result).toHaveProperty('confidence');
    });

    it('should return low confidence for normal behavior', async () => {
      const actions = [
        { timestamp: Date.now() - 5000, type: 'click' },
        { timestamp: Date.now() - 3000, type: 'scroll' },
        { timestamp: Date.now(), type: 'click' },
      ];

      const result = await service.detectAutomatedBehavior(userId, actions);

      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('checkCaptchaRequired', () => {
    const ip = '192.168.1.1';

    it('should require captcha after multiple failed attempts', async () => {
      mockRedisService.get.mockResolvedValue('5'); // 5 failed attempts

      const result = await service.checkCaptchaRequired(ip);

      expect(result).toBe(true);
    });

    it('should not require captcha for normal usage', async () => {
      mockRedisService.get.mockResolvedValue('1'); // 1 attempt

      const result = await service.checkCaptchaRequired(ip);

      expect(result).toBe(false);
    });

    it('should not require captcha for new IP', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.checkCaptchaRequired(ip);

      expect(result).toBe(false);
    });
  });

  describe('recordFailedAttempt', () => {
    const ip = '192.168.1.1';

    it('should increment failed attempt counter', async () => {
      mockRedisService.incr.mockResolvedValue(1);
      mockRedisService.expire.mockResolvedValue(1);

      await service.recordFailedAttempt(ip);

      expect(mockRedisService.incr).toHaveBeenCalled();
      expect(mockRedisService.expire).toHaveBeenCalled();
    });
  });

  describe('analyzeMouseMovement', () => {
    it('should detect linear mouse movement (bot-like)', async () => {
      const movements = [
        { x: 0, y: 0, timestamp: 0 },
        { x: 100, y: 100, timestamp: 100 },
        { x: 200, y: 200, timestamp: 200 },
        { x: 300, y: 300, timestamp: 300 },
      ];

      const result = await service.analyzeMouseMovement(movements);

      expect(result.isHuman).toBe(false);
      expect(result.signals).toContain('LINEAR_MOVEMENT');
    });

    it('should accept natural mouse movement', async () => {
      const movements = [
        { x: 0, y: 0, timestamp: 0 },
        { x: 50, y: 30, timestamp: 150 },
        { x: 120, y: 80, timestamp: 320 },
        { x: 200, y: 150, timestamp: 500 },
      ];

      const result = await service.analyzeMouseMovement(movements);

      expect(result.isHuman).toBe(true);
    });
  });

  describe('getIPRiskScore', () => {
    it('should return higher score for known proxy IPs', async () => {
      mockRedisService.get.mockResolvedValue('proxy');

      const result = await service.getIPRiskScore('192.168.1.1');

      expect(result).toBeGreaterThan(50);
    });

    it('should return low score for clean IPs', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.getIPRiskScore('192.168.1.1');

      expect(result).toBeLessThan(20);
    });
  });
});
