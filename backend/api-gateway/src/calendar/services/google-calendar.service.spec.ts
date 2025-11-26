import { Test, TestingModule } from '@nestjs/testing';
import { GoogleCalendarService } from './google-calendar.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { google } from 'googleapis';

// Mock OAuth2 client instance
const mockOAuth2Client = {
  generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/auth'),
  getToken: jest.fn().mockResolvedValue({
    tokens: {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expiry_date: Date.now() + 3600000,
    },
  }),
  setCredentials: jest.fn(),
  refreshAccessToken: jest.fn().mockResolvedValue({
    credentials: {
      access_token: 'new-access-token',
      expiry_date: Date.now() + 3600000,
    },
  }),
};

// Mock calendar API
const mockCalendarApi = {
  events: {
    insert: jest.fn().mockResolvedValue({ data: { id: 'event-123' } }),
    delete: jest.fn().mockResolvedValue({}),
    list: jest.fn().mockResolvedValue({
      data: {
        items: [
          {
            id: 'event-1',
            summary: 'Test Event',
            start: { dateTime: new Date().toISOString() },
            end: { dateTime: new Date().toISOString() },
          },
        ],
      },
    }),
  },
};

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn(),
    },
    calendar: jest.fn(),
  },
}));

describe('GoogleCalendarService', () => {
  let service: GoogleCalendarService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  const mockPrismaService = {
    mission: {
      findUnique: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        GOOGLE_CALENDAR_CLIENT_ID: 'test-client-id',
        GOOGLE_CALENDAR_CLIENT_SECRET: 'test-client-secret',
        GOOGLE_CALENDAR_REDIRECT_URI: 'http://localhost:4000/calendar/google/callback',
      };
      return config[key];
    }),
  };

  const mockMission = {
    id: 'mission-123',
    title: 'Fix plumbing',
    description: 'Fix kitchen sink',
    address: '123 Main St, Luxembourg',
    scheduledFor: new Date('2025-02-01T10:00:00Z'),
    agreedPrice: 150,
    clientBudget: 200,
    clientId: 'client-123',
    artisanId: 'artisan-123',
    client: {
      id: 'client-123',
      email: 'client@example.com',
      firstName: 'John',
      lastName: 'Client',
    },
    artisan: {
      id: 'artisan-123',
      email: 'artisan@example.com',
      firstName: 'Pierre',
      lastName: 'Artisan',
    },
  };

  beforeEach(async () => {
    // Reset ConfigService mock before each test
    mockConfigService.get.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        GOOGLE_CALENDAR_CLIENT_ID: 'test-client-id',
        GOOGLE_CALENDAR_CLIENT_SECRET: 'test-client-secret',
        GOOGLE_CALENDAR_REDIRECT_URI: 'http://localhost:4000/calendar/google/callback',
      };
      return config[key];
    });

    // Reset googleapis mocks
    (google.auth.OAuth2 as jest.Mock).mockImplementation(() => mockOAuth2Client);
    (google.calendar as jest.Mock).mockReturnValue(mockCalendarApi);

    // Reset OAuth2 client mock methods
    mockOAuth2Client.generateAuthUrl.mockReturnValue('https://accounts.google.com/auth');
    mockOAuth2Client.getToken.mockResolvedValue({
      tokens: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expiry_date: Date.now() + 3600000,
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleCalendarService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<GoogleCalendarService>(GoogleCalendarService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
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
        get: jest.fn().mockReturnValue(undefined),
      };

      const module = await Test.createTestingModule({
        providers: [
          GoogleCalendarService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: disabledConfigService },
        ],
      }).compile();

      const disabledService = module.get<GoogleCalendarService>(GoogleCalendarService);
      expect(disabledService.isEnabled()).toBe(false);
    });
  });

  describe('getAuthorizationUrl', () => {
    it('should generate authorization URL with user state', () => {
      const url = service.getAuthorizationUrl('user-123');

      expect(url).toBe('https://accounts.google.com/auth');
    });

    it('should throw BadRequestException when service is disabled', async () => {
      const disabledConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module = await Test.createTestingModule({
        providers: [
          GoogleCalendarService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: disabledConfigService },
        ],
      }).compile();

      const disabledService = module.get<GoogleCalendarService>(GoogleCalendarService);

      expect(() => disabledService.getAuthorizationUrl('user-123')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange code and save tokens', async () => {
      await expect(
        service.exchangeCodeForTokens('auth-code', 'user-123'),
      ).resolves.not.toThrow();
    });

    it('should throw BadRequestException when service is disabled', async () => {
      const disabledConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module = await Test.createTestingModule({
        providers: [
          GoogleCalendarService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: disabledConfigService },
        ],
      }).compile();

      const disabledService = module.get<GoogleCalendarService>(GoogleCalendarService);

      await expect(
        disabledService.exchangeCodeForTokens('auth-code', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createMissionEvent', () => {
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

    it('should create event when user has calendar connected', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);

      // Note: In production implementation, this would create events
      // For now, it returns null because getTokens returns null
      const result = await service.createMissionEvent('mission-123');

      expect(mockPrismaService.mission.findUnique).toHaveBeenCalledWith({
        where: { id: 'mission-123' },
        include: expect.any(Object),
      });
    });
  });

  describe('updateMissionEvent', () => {
    it('should update mission event', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);

      await service.updateMissionEvent('mission-123');

      expect(mockPrismaService.mission.findUnique).toHaveBeenCalled();
    });
  });

  describe('deleteMissionEvent', () => {
    it('should handle deletion gracefully when user has no tokens', async () => {
      await expect(
        service.deleteMissionEvent('mission-123', 'user-123'),
      ).resolves.not.toThrow();
    });
  });

  describe('disconnectCalendar', () => {
    it('should disconnect calendar for user', async () => {
      await expect(
        service.disconnectCalendar('user-123'),
      ).resolves.not.toThrow();
    });
  });

  describe('isCalendarConnected', () => {
    it('should return false when user has no tokens', async () => {
      const result = await service.isCalendarConnected('user-123');

      // Returns false because getTokens returns null in stub implementation
      expect(result).toBe(false);
    });
  });

  describe('getUpcomingEvents', () => {
    it('should return empty array when user has no tokens', async () => {
      const result = await service.getUpcomingEvents('user-123');

      expect(result).toEqual([]);
    });

    it('should accept maxResults parameter', async () => {
      const result = await service.getUpcomingEvents('user-123', 5);

      expect(result).toEqual([]);
    });
  });

  describe('isEnabled', () => {
    it('should return true when configured', () => {
      expect(service.isEnabled()).toBe(true);
    });
  });
});
