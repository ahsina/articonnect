import { Test, TestingModule } from '@nestjs/testing';
import { TwilioSmsService } from './twilio-sms.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../common/redis/redis.service';
import { BadRequestException } from '@nestjs/common';

// Mock Twilio
jest.mock('twilio', () => {
  return {
    Twilio: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          sid: 'SM123456',
          price: '0.05',
        }),
      },
    })),
  };
});

describe('TwilioSmsService', () => {
  let service: TwilioSmsService;
  let redisService: RedisService;

  const mockPrismaService = {};

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        TWILIO_ACCOUNT_SID: 'AC123456',
        TWILIO_AUTH_TOKEN: 'auth-token',
        TWILIO_PHONE_NUMBER: '+352123456789',
        TWILIO_ENABLED: 'true',
        API_BASE_URL: 'http://localhost:4000',
      };
      return config[key];
    }),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwilioSmsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<TwilioSmsService>(TwilioSmsService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize when configuration is present', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('should disable when TWILIO_ENABLED is false', async () => {
      const disabledConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'TWILIO_ENABLED') return 'false';
          return mockConfigService.get(key);
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          TwilioSmsService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: disabledConfigService },
          { provide: RedisService, useValue: mockRedisService },
        ],
      }).compile();

      const disabledService = module.get<TwilioSmsService>(TwilioSmsService);
      expect(disabledService.isEnabled()).toBe(false);
    });
  });

  describe('send', () => {
    it('should send SMS successfully', async () => {
      mockRedisService.get.mockResolvedValue(null); // Not opted out
      mockRedisService.incr.mockResolvedValue(1);

      const result = await service.send('+33612345678', 'Test message', 'user-123');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('SM123456');
    });

    it('should return error when service disabled', async () => {
      const disabledConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'TWILIO_ENABLED') return 'false';
          return '';
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          TwilioSmsService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: disabledConfigService },
          { provide: RedisService, useValue: mockRedisService },
        ],
      }).compile();

      const disabledService = module.get<TwilioSmsService>(TwilioSmsService);
      const result = await disabledService.send('+33612345678', 'Test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });

    it('should reject invalid phone numbers', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.send('invalid', 'Test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid phone');
    });

    it('should not send to opted-out users', async () => {
      mockRedisService.get.mockResolvedValue('true'); // Opted out

      const result = await service.send('+33612345678', 'Test', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('opted out');
    });

    it('should respect rate limits', async () => {
      mockRedisService.get
        .mockResolvedValueOnce(null) // Not opted out
        .mockResolvedValueOnce('15') // Hourly count (over limit)
        .mockResolvedValueOnce('60'); // Daily count

      const result = await service.send('+33612345678', 'Test', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit');
    });

    it('should format French phone numbers', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.incr.mockResolvedValue(1);

      const result = await service.send('0612345678', 'Test');

      expect(result.success).toBe(true);
    });

    it('should log SMS to Redis', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.incr.mockResolvedValue(1);

      await service.send('+33612345678', 'Test', 'user-123');

      expect(mockRedisService.set).toHaveBeenCalledWith(
        expect.stringContaining('sms:log:'),
        expect.any(String),
        604800,
      );
    });
  });

  describe('sendTemplate', () => {
    it('should send SMS using template', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.incr.mockResolvedValue(1);

      const result = await service.sendTemplate(
        '+33612345678',
        'verification_code',
        { code: '123456' },
        'user-123',
      );

      expect(result.success).toBe(true);
    });

    it('should throw BadRequestException for unknown template', async () => {
      await expect(
        service.sendTemplate('+33612345678', 'unknown_template', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should replace variables in template', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.incr.mockResolvedValue(1);

      const result = await service.sendTemplate(
        '+33612345678',
        'mission_accepted',
        { artisanName: 'Pierre', eta: '30', trackingLink: 'http://track.me' },
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendVerificationCode', () => {
    it('should send verification code SMS', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.incr.mockResolvedValue(1);

      const result = await service.sendVerificationCode(
        '+33612345678',
        '123456',
        'user-123',
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendMissionNotification', () => {
    it('should send mission accepted notification', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.incr.mockResolvedValue(1);

      const result = await service.sendMissionNotification(
        '+33612345678',
        'accepted',
        { artisanName: 'Pierre', eta: '30', trackingLink: 'http://track.me' },
        'user-123',
      );

      expect(result.success).toBe(true);
    });

    it('should send mission arrived notification', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.incr.mockResolvedValue(1);

      const result = await service.sendMissionNotification(
        '+33612345678',
        'arrived',
        { artisanName: 'Pierre', artisanPhone: '+33612345678' },
      );

      expect(result.success).toBe(true);
    });

    it('should send mission completed notification', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.incr.mockResolvedValue(1);

      const result = await service.sendMissionNotification(
        '+33612345678',
        'completed',
        { amount: '150', artisanName: 'Pierre', reviewLink: 'http://review.me' },
      );

      expect(result.success).toBe(true);
    });
  });

  describe('handleOptOut', () => {
    it('should mark phone as opted out', async () => {
      await service.handleOptOut('+33612345678');

      expect(mockRedisService.set).toHaveBeenCalledWith(
        'sms:optout:+33612345678',
        'true',
        31536000,
      );
    });
  });

  describe('handleOptIn', () => {
    it('should remove opt-out status', async () => {
      await service.handleOptIn('+33612345678');

      expect(mockRedisService.del).toHaveBeenCalledWith('sms:optout:+33612345678');
    });
  });

  describe('handleDeliveryStatus', () => {
    it('should update SMS log with status', async () => {
      mockRedisService.get.mockResolvedValue(
        JSON.stringify({
          phoneNumber: '+33612345678',
          message: 'Test',
          messageId: 'SM123456',
          sentAt: '2025-01-01',
        }),
      );

      await service.handleDeliveryStatus('SM123456', 'delivered');

      expect(mockRedisService.set).toHaveBeenCalledWith(
        'sms:log:SM123456',
        expect.stringContaining('delivered'),
        604800,
      );
    });

    it('should handle failed delivery status', async () => {
      mockRedisService.get.mockResolvedValue(null);

      // Should not throw
      await expect(
        service.handleDeliveryStatus('SM123456', 'failed'),
      ).resolves.not.toThrow();
    });
  });

  describe('getStatistics', () => {
    it('should return statistics', async () => {
      const result = await service.getStatistics('user-123');

      expect(result).toHaveProperty('sentToday');
      expect(result).toHaveProperty('sentThisMonth');
      expect(result).toHaveProperty('totalCost');
      expect(result).toHaveProperty('deliveryRate');
    });
  });

  describe('getTemplates', () => {
    it('should return available templates', () => {
      const templates = service.getTemplates();

      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toHaveProperty('code');
      expect(templates[0]).toHaveProperty('message');
    });

    it('should include verification_code template', () => {
      const templates = service.getTemplates();
      const verificationTemplate = templates.find(t => t.code === 'verification_code');

      expect(verificationTemplate).toBeDefined();
      expect(verificationTemplate?.message).toContain('{code}');
    });

    it('should include mission-related templates', () => {
      const templates = service.getTemplates();
      const missionTemplates = templates.filter(t => t.code.includes('mission'));

      expect(missionTemplates.length).toBeGreaterThan(0);
    });
  });

  describe('isEnabled', () => {
    it('should return true when properly configured', () => {
      expect(service.isEnabled()).toBe(true);
    });
  });
});
