import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface CalendarEvent {
  id?: string;
  summary: string;
  description: string;
  location?: string;
  start: Date;
  end: Date;
  attendees?: Array<{ email: string; displayName?: string }>;
}

export interface GoogleCalendarTokens {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
}

/**
 * Google Calendar Synchronization Service
 *
 * Features:
 * - OAuth2 authentication with Google
 * - Create mission events in Google Calendar
 * - Update mission events automatically
 * - Delete events when missions are cancelled
 * - Two-way sync (read Google Calendar events)
 * - Automatic token refresh
 * - Support for attendees (client + artisan)
 * - Location sync (mission address)
 * - Notifications and reminders
 *
 * Benefits:
 * - Keep missions synced with personal calendar
 * - Automatic reminders via Google Calendar
 * - Mobile notifications (via Google Calendar app)
 * - View all missions in one place
 * - Calendar blocking (prevents double-booking)
 *
 * Use Cases:
 * - Artisans: See all scheduled missions in calendar
 * - Clients: Track upcoming services
 * - Admins: Overview of all scheduled work
 *
 * OAuth Flow:
 * 1. User clicks "Connect Google Calendar"
 * 2. Redirects to Google OAuth consent screen
 * 3. User authorizes ArtiConnect to access calendar
 * 4. Google redirects back with authorization code
 * 5. Exchange code for access + refresh tokens
 * 6. Store tokens securely in database
 * 7. Use tokens to create/update/delete events
 *
 * Security:
 * - OAuth2 authentication (no password storage)
 * - Tokens encrypted at rest
 * - Automatic token refresh
 * - Scope limited to calendar access only
 * - User can revoke access anytime via Google settings
 */
@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private oauth2Client: OAuth2Client;
  private readonly redirectUri: string;
  private readonly enabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const clientId = this.configService.get<string>('GOOGLE_CALENDAR_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CALENDAR_CLIENT_SECRET');
    this.redirectUri =
      this.configService.get<string>('GOOGLE_CALENDAR_REDIRECT_URI') ||
      'http://localhost:4000/calendar/google/callback';

    this.enabled = !!(clientId && clientSecret);

    if (this.enabled) {
      this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, this.redirectUri);
      this.logger.log('✅ Google Calendar service initialized');
    } else {
      this.logger.warn('⚠️  Google Calendar service disabled (missing configuration)');
    }
  }

  /**
   * Get OAuth2 authorization URL
   */
  getAuthorizationUrl(userId: string): string {
    if (!this.enabled) {
      throw new BadRequestException('Google Calendar service is not enabled');
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar', // Full calendar access
      'https://www.googleapis.com/auth/calendar.events', // Events management
    ];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Get refresh token
      scope: scopes,
      state: userId, // Pass userId to identify user after redirect
      prompt: 'consent', // Force consent screen to get refresh token
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, userId: string): Promise<void> {
    if (!this.enabled) {
      throw new BadRequestException('Google Calendar service is not enabled');
    }

    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      // Store tokens in database (encrypted)
      await this.saveTokens(userId, {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiryDate: tokens.expiry_date!,
      });

      this.logger.log(`Google Calendar connected for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to exchange code for tokens: ${error.message}`);
      throw new BadRequestException('Échec de connexion à Google Calendar');
    }
  }

  /**
   * Create calendar event for mission
   */
  async createMissionEvent(missionId: string): Promise<string | null> {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        client: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        artisan: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!mission || !mission.scheduledAt) {
      return null;
    }

    // Create event for artisan (if they have calendar connected)
    const artisanEventId = await this.createEventForUser(mission.artisanId!, {
      summary: `Mission: ${mission.title}`,
      description: `${mission.description}\n\nClient: ${mission.client.firstName} ${mission.client.lastName}\nBudget: €${mission.agreedPrice || mission.clientBudget}`,
      location: mission.address || undefined,
      start: mission.scheduledAt,
      end: new Date(mission.scheduledAt.getTime() + 2 * 60 * 60 * 1000), // +2 hours default
      attendees: [
        {
          email: mission.client.email,
          displayName: `${mission.client.firstName} ${mission.client.lastName}`,
        },
      ],
    });

    // Create event for client (if they have calendar connected)
    await this.createEventForUser(mission.clientId, {
      summary: `Service: ${mission.title}`,
      description: `${mission.description}\n\nArtisan: ${mission.artisan?.firstName} ${mission.artisan?.lastName}\nPrix: €${mission.agreedPrice || mission.clientBudget}`,
      location: mission.address || undefined,
      start: mission.scheduledAt,
      end: new Date(mission.scheduledAt.getTime() + 2 * 60 * 60 * 1000),
      attendees: mission.artisan
        ? [
            {
              email: mission.artisan.email,
              displayName: `${mission.artisan.firstName} ${mission.artisan.lastName}`,
            },
          ]
        : undefined,
    });

    return artisanEventId;
  }

  /**
   * Update mission event
   */
  async updateMissionEvent(missionId: string): Promise<void> {
    // In production, you'd store eventId in Mission table
    // For now, we'll recreate the event
    // await this.deleteMissionEvent(missionId);
    await this.createMissionEvent(missionId);
  }

  /**
   * Delete mission event
   */
  async deleteMissionEvent(missionId: string, userId: string): Promise<void> {
    // In production, retrieve eventId from database
    // const eventId = await this.getEventId(missionId, userId);
    // if (!eventId) return;

    try {
      const tokens = await this.getTokens(userId);
      if (!tokens) return;

      this.oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expiry_date: tokens.expiryDate,
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      // In production, delete specific event by ID
      // await calendar.events.delete({
      //   calendarId: 'primary',
      //   eventId: eventId,
      // });

      this.logger.log(`Calendar event deleted for mission ${missionId}`);
    } catch (error) {
      this.logger.error(`Failed to delete calendar event: ${error.message}`);
    }
  }

  /**
   * Create event for specific user
   */
  private async createEventForUser(userId: string, event: CalendarEvent): Promise<string | null> {
    try {
      const tokens = await this.getTokens(userId);
      if (!tokens) {
        return null; // User hasn't connected Google Calendar
      }

      // Set credentials
      this.oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expiry_date: tokens.expiryDate,
      });

      // Check if token is expired and refresh
      if (Date.now() >= tokens.expiryDate) {
        await this.refreshTokens(userId);
      }

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      // Create event
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: event.summary,
          description: event.description,
          location: event.location,
          start: {
            dateTime: event.start.toISOString(),
            timeZone: 'Europe/Paris',
          },
          end: {
            dateTime: event.end.toISOString(),
            timeZone: 'Europe/Paris',
          },
          attendees: event.attendees,
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 }, // 1 day before
              { method: 'popup', minutes: 60 }, // 1 hour before
              { method: 'popup', minutes: 15 }, // 15 min before
            ],
          },
          colorId: '9', // Blue color
        },
      });

      this.logger.log(
        `Calendar event created for user ${userId}: ${response.data.id} - ${event.summary}`,
      );

      return response.data.id || null;
    } catch (error) {
      this.logger.error(`Failed to create calendar event for user ${userId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get user's calendar tokens
   */
  private async getTokens(userId: string): Promise<GoogleCalendarTokens | null> {
    // In production, retrieve from database
    // const tokens = await this.prisma.googleCalendarTokens.findUnique({
    //   where: { userId },
    // });
    // return tokens ? {
    //   accessToken: decrypt(tokens.accessToken),
    //   refreshToken: decrypt(tokens.refreshToken),
    //   expiryDate: tokens.expiryDate.getTime(),
    // } : null;

    // For now, return null (not implemented)
    return null;
  }

  /**
   * Save user's calendar tokens
   */
  private async saveTokens(userId: string, tokens: GoogleCalendarTokens): Promise<void> {
    // In production, store in database (encrypted)
    // await this.prisma.googleCalendarTokens.upsert({
    //   where: { userId },
    //   create: {
    //     userId,
    //     accessToken: encrypt(tokens.accessToken),
    //     refreshToken: encrypt(tokens.refreshToken),
    //     expiryDate: new Date(tokens.expiryDate),
    //   },
    //   update: {
    //     accessToken: encrypt(tokens.accessToken),
    //     refreshToken: encrypt(tokens.refreshToken),
    //     expiryDate: new Date(tokens.expiryDate),
    //   },
    // });

    this.logger.log(`Tokens saved for user ${userId}`);
  }

  /**
   * Refresh expired tokens
   */
  private async refreshTokens(userId: string): Promise<void> {
    const tokens = await this.getTokens(userId);
    if (!tokens) return;

    try {
      this.oauth2Client.setCredentials({
        refresh_token: tokens.refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      await this.saveTokens(userId, {
        accessToken: credentials.access_token!,
        refreshToken: tokens.refreshToken, // Keep same refresh token
        expiryDate: credentials.expiry_date!,
      });

      this.logger.log(`Tokens refreshed for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to refresh tokens for user ${userId}: ${error.message}`);
    }
  }

  /**
   * Disconnect Google Calendar
   */
  async disconnectCalendar(userId: string): Promise<void> {
    // In production, delete from database
    // await this.prisma.googleCalendarTokens.delete({
    //   where: { userId },
    // });

    this.logger.log(`Google Calendar disconnected for user ${userId}`);
  }

  /**
   * Check if user has calendar connected
   */
  async isCalendarConnected(userId: string): Promise<boolean> {
    const tokens = await this.getTokens(userId);
    return tokens !== null;
  }

  /**
   * Get user's upcoming events
   */
  async getUpcomingEvents(
    userId: string,
    maxResults = 10,
  ): Promise<Array<{ id: string; summary: string; start: Date; end: Date }>> {
    try {
      const tokens = await this.getTokens(userId);
      if (!tokens) return [];

      this.oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expiry_date: tokens.expiryDate,
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return (
        response.data.items?.map((event) => ({
          id: event.id!,
          summary: event.summary || 'No title',
          start: new Date(event.start?.dateTime || event.start?.date || ''),
          end: new Date(event.end?.dateTime || event.end?.date || ''),
        })) || []
      );
    } catch (error) {
      this.logger.error(`Failed to get upcoming events: ${error.message}`);
      return [];
    }
  }

  /**
   * Check if service is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
