import { Test, TestingModule } from '@nestjs/testing';
import { OutlookCalendarService } from './outlook-calendar.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { Client } from '@microsoft/microsoft-graph-client';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock Microsoft Graph client
jest.mock('@microsoft/microsoft-graph-client', () => ({
  Client: {
    init: jest.fn(),
  },
}));

describe('OutlookCalendarService', () => {
  let service: OutlookCalendarService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    mission: {
      findUnique: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        OUTLOOK_CALENDAR_CLIENT_ID: 'test-client-id',
        OUTLOOK_CALENDAR_CLIENT_SECRET: 'test-client-secret',
        OUTLOOK_CALENDAR_REDIRECT_URI: 'http://localhost:4000/calendar/outlook/callback',
        OUTLOOK_CALENDAR_TENANT_ID: 'common',
      };
      return config[key];
    }),
  };

  const mockUser = {
    id: 'user-123',
    outlookAccessToken: 'access-token',
    outlookRefreshToken: 'refresh-token',
    outlookTokenExpiry: new Date(Date.now() + 3600000),
  };

  const mockMission = {
    id: 'mission-123',
    title: 'Fix plumbing',
    description: 'Fix kitchen sink',
    address: '123 Main St, Luxembourg',
    scheduledFor: new Date('2025-02-01T10:00:00Z'),
    clientBudget: 200,
    artisanId: 'artisan-123',
    artisan: {
      id: 'artisan-123',
      firstName: 'Pierre',
      lastName: 'Artisan',
    },
    client: {
      id: 'client-123',
      firstName: 'John',
      lastName: 'Client',
    },
  };

  beforeEach(async () => {
    // Reset ConfigService mock before each test
    mockConfigService.get.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        OUTLOOK_CALENDAR_CLIENT_ID: 'test-client-id',
        OUTLOOK_CALENDAR_CLIENT_SECRET: 'test-client-secret',
        OUTLOOK_CALENDAR_REDIRECT_URI: 'http://localhost:4000/calendar/outlook/callback',
        OUTLOOK_CALENDAR_TENANT_ID: 'common',
      };
      return config[key];
    });

    // Reset Microsoft Graph client mock
    (Client.init as jest.Mock).mockReturnValue({
      api: jest.fn().mockReturnValue({
        post: jest.fn().mockResolvedValue({ id: 'outlook-event-123' }),
      }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutlookCalendarService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OutlookCalendarService>(OutlookCalendarService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize service when config is provided', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('should disable service when config is missing', async () => {
      const disabledConfigService = {
        get: jest.fn().mockReturnValue(''),
      };

      const module = await Test.createTestingModule({
        providers: [
          OutlookCalendarService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: disabledConfigService },
        ],
      }).compile();

      const disabledService = module.get<OutlookCalendarService>(OutlookCalendarService);
      expect(disabledService.isEnabled()).toBe(false);
    });
  });

  describe('getAuthorizationUrl', () => {
    it('should generate Microsoft authorization URL', () => {
      const url = service.getAuthorizationUrl('user-123');

      expect(url).toContain('login.microsoftonline.com');
      expect(url).toContain('oauth2/v2.0/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('state=user-123');
    });

    it('should throw BadRequestException when service is disabled', async () => {
      const disabledConfigService = {
        get: jest.fn().mockReturnValue(''),
      };

      const module = await Test.createTestingModule({
        providers: [
          OutlookCalendarService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: disabledConfigService },
        ],
      }).compile();

      const disabledService = module.get<OutlookCalendarService>(OutlookCalendarService);

      expect(() => disabledService.getAuthorizationUrl('user-123')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange code and store tokens', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
        },
      });
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await service.exchangeCodeForTokens('auth-code', 'user-123');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('oauth2/v2.0/token'),
        expect.any(URLSearchParams),
        expect.any(Object),
      );
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: expect.objectContaining({
          outlookAccessToken: 'new-access-token',
          outlookRefreshToken: 'new-refresh-token',
        }),
      });
    });

    it('should throw BadRequestException when service is disabled', async () => {
      const disabledConfigService = {
        get: jest.fn().mockReturnValue(''),
      };

      const module = await Test.createTestingModule({
        providers: [
          OutlookCalendarService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: disabledConfigService },
        ],
      }).compile();

      const disabledService = module.get<OutlookCalendarService>(OutlookCalendarService);

      await expect(
        disabledService.exchangeCodeForTokens('auth-code', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on token exchange failure', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      await expect(
        service.exchangeCodeForTokens('invalid-code', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createMissionEvent', () => {
    it('should return null when service is disabled', async () => {
      const disabledConfigService = {
        get: jest.fn().mockReturnValue(''),
      };

      const module = await Test.createTestingModule({
        providers: [
          OutlookCalendarService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: disabledConfigService },
        ],
      }).compile();

      const disabledService = module.get<OutlookCalendarService>(OutlookCalendarService);

      const result = await disabledService.createMissionEvent('mission-123');

      expect(result).toBeNull();
    });

    it('should return null when mission not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      const result = await service.createMissionEvent('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when mission has no scheduled date', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        scheduledFor: null,
      });

      const result = await service.createMissionEvent('mission-123');

      expect(result).toBeNull();
    });

    it('should create event when user has connected calendar', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.createMissionEvent('mission-123');

      expect(result).toBe('outlook-event-123');
    });

    it('should throw when user has not connected calendar', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        outlookAccessToken: null,
      });

      const result = await service.createMissionEvent('mission-123');

      // Returns null because exception is caught
      expect(result).toBeNull();
    });

    it('should refresh token if expired', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({
          ...mockUser,
          outlookTokenExpiry: new Date(Date.now() - 1000), // Expired
        })
        .mockResolvedValueOnce({
          ...mockUser,
          outlookRefreshToken: 'refresh-token',
        });

      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
        },
      });
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.createMissionEvent('mission-123');

      expect(mockedAxios.post).toHaveBeenCalled();
    });
  });

  describe('disconnectCalendar', () => {
    it('should clear tokens from database', async () => {
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await service.disconnectCalendar('user-123');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          outlookAccessToken: null,
          outlookRefreshToken: null,
          outlookTokenExpiry: null,
        },
      });
    });

    it('should throw BadRequestException on failure', async () => {
      mockPrismaService.user.update.mockRejectedValue(new Error('DB error'));

      await expect(service.disconnectCalendar('user-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('isUserConnected', () => {
    it('should return true when user has access token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.isUserConnected('user-123');

      expect(result).toBe(true);
    });

    it('should return false when user has no access token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        outlookAccessToken: null,
      });

      const result = await service.isUserConnected('user-123');

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.isUserConnected('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('isEnabled', () => {
    it('should return true when configured', () => {
      expect(service.isEnabled()).toBe(true);
    });
  });
});
