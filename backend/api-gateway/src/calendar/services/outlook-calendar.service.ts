import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Client } from '@microsoft/microsoft-graph-client';
import axios from 'axios';

/**
 * Outlook/Microsoft 365 Calendar Synchronization Service
 *
 * Integrates with Microsoft Graph API to sync mission events with Outlook Calendar.
 * Uses OAuth 2.0 for authentication and Microsoft Graph SDK for API calls.
 *
 * Required environment variables:
 * - OUTLOOK_CALENDAR_CLIENT_ID: Azure AD application client ID
 * - OUTLOOK_CALENDAR_CLIENT_SECRET: Azure AD application client secret
 * - OUTLOOK_CALENDAR_REDIRECT_URI: OAuth redirect URI
 * - OUTLOOK_CALENDAR_TENANT_ID: Azure AD tenant ID (default: 'common')
 */
@Injectable()
export class OutlookCalendarService {
  private readonly logger = new Logger(OutlookCalendarService.name);
  private readonly enabled: boolean;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly tenantId: string;
  private readonly scopes = 'Calendars.ReadWrite offline_access';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.clientId = this.configService.get<string>('OUTLOOK_CALENDAR_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('OUTLOOK_CALENDAR_CLIENT_SECRET') || '';
    this.redirectUri = this.configService.get<string>('OUTLOOK_CALENDAR_REDIRECT_URI') || '';
    this.tenantId = this.configService.get<string>('OUTLOOK_CALENDAR_TENANT_ID') || 'common';
    this.enabled = !!(this.clientId && this.clientSecret);

    if (this.enabled) {
      this.logger.log('✅ Outlook Calendar service initialized');
    } else {
      this.logger.warn('⚠️  Outlook Calendar service disabled (missing configuration)');
    }
  }

  /**
   * Generate OAuth 2.0 authorization URL for user consent
   * User will be redirected to Microsoft login to grant calendar access
   */
  getAuthorizationUrl(userId: string): string {
    if (!this.enabled) {
      throw new BadRequestException('Outlook Calendar service is not enabled');
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      response_mode: 'query',
      scope: this.scopes,
      state: userId, // Pass userId to identify user after OAuth callback
    });

    return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access and refresh tokens
   * Called after user grants consent and is redirected back
   */
  async exchangeCodeForTokens(code: string, userId: string): Promise<void> {
    if (!this.enabled) {
      throw new BadRequestException('Outlook Calendar service is not enabled');
    }

    try {
      const response = await axios.post(
        `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: this.redirectUri,
          grant_type: 'authorization_code',
          scope: this.scopes,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      const { access_token, refresh_token, expires_in } = response.data;

      // Store tokens in database
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          outlookAccessToken: access_token,
          outlookRefreshToken: refresh_token,
          outlookTokenExpiry: new Date(Date.now() + expires_in * 1000),
        },
      });

      this.logger.log(`Outlook Calendar connected for user ${userId}`);
    } catch (error: any) {
      this.logger.error(`Failed to exchange tokens: ${error.message}`);
      throw new BadRequestException('Failed to connect Outlook Calendar');
    }
  }

  /**
   * Refresh access token using refresh token
   * Called automatically when access token expires
   */
  private async refreshAccessToken(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { outlookRefreshToken: true },
    });

    if (!user?.outlookRefreshToken) {
      throw new BadRequestException('No refresh token found for user');
    }

    try {
      const response = await axios.post(
        `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: user.outlookRefreshToken,
          grant_type: 'refresh_token',
          scope: this.scopes,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      const { access_token, refresh_token, expires_in } = response.data;

      // Update tokens in database
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          outlookAccessToken: access_token,
          outlookRefreshToken: refresh_token,
          outlookTokenExpiry: new Date(Date.now() + expires_in * 1000),
        },
      });

      return access_token;
    } catch (error: any) {
      this.logger.error(`Failed to refresh token: ${error.message}`);
      throw new BadRequestException('Failed to refresh Outlook Calendar access');
    }
  }

  /**
   * Get valid access token (refresh if expired)
   */
  private async getAccessToken(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        outlookAccessToken: true,
        outlookTokenExpiry: true,
      },
    });

    if (!user?.outlookAccessToken) {
      throw new BadRequestException('User has not connected Outlook Calendar');
    }

    // Check if token is expired (with 5 minute buffer)
    const isExpired = user.outlookTokenExpiry && user.outlookTokenExpiry < new Date(Date.now() + 5 * 60 * 1000);

    if (isExpired) {
      return await this.refreshAccessToken(userId);
    }

    return user.outlookAccessToken;
  }

  /**
   * Create calendar event for a mission
   * Syncs mission details to user's Outlook calendar
   */
  async createMissionEvent(missionId: string): Promise<string | null> {
    if (!this.enabled) {
      this.logger.warn('Outlook Calendar service is not enabled');
      return null;
    }

    try {
      const mission = await this.prisma.mission.findUnique({
        where: { id: missionId },
        include: {
          artisan: true,
          client: true,
        },
      });

      if (!mission || !mission.scheduledFor) {
        this.logger.warn(`Mission ${missionId} not found or has no scheduled date`);
        return null;
      }

      // Get artisan's access token
      const userId = mission.artisanId;
      const accessToken = await this.getAccessToken(userId);

      // Create Microsoft Graph client
      const client = Client.init({
        authProvider: (done) => {
          done(null, accessToken);
        },
      });

      // Calculate event end time (2 hours by default)
      const startTime = new Date(mission.scheduledFor);
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

      // Create event
      const event = {
        subject: `Mission: ${mission.title || 'Nouvelle mission'}`,
        body: {
          contentType: 'HTML',
          content: `
            <h3>${mission.title || 'Nouvelle mission'}</h3>
            <p><strong>Client:</strong> ${mission.client?.firstName || ''} ${mission.client?.lastName || ''}</p>
            <p><strong>Description:</strong> ${mission.description || 'Aucune description'}</p>
            <p><strong>Adresse:</strong> ${mission.address || 'Non spécifiée'}</p>
            ${mission.clientBudget ? `<p><strong>Budget:</strong> ${mission.clientBudget}€</p>` : ''}
          `,
        },
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'Europe/Luxembourg',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'Europe/Luxembourg',
        },
        location: {
          displayName: mission.address || 'À définir',
        },
        isReminderOn: true,
        reminderMinutesBeforeStart: 60,
      };

      const createdEvent = await client.api('/me/events').post(event);

      this.logger.log(`Outlook Calendar event created for mission ${missionId}: ${createdEvent.id}`);
      return createdEvent.id;
    } catch (error: any) {
      this.logger.error(`Failed to create Outlook event: ${error.message}`);
      return null;
    }
  }

  /**
   * Disconnect Outlook Calendar by removing stored tokens
   * User will need to re-authenticate to use calendar sync again
   */
  async disconnectCalendar(userId: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          outlookAccessToken: null,
          outlookRefreshToken: null,
          outlookTokenExpiry: null,
        },
      });

      this.logger.log(`Outlook Calendar disconnected for user ${userId}`);
    } catch (error: any) {
      this.logger.error(`Failed to disconnect Outlook Calendar: ${error.message}`);
      throw new BadRequestException('Failed to disconnect Outlook Calendar');
    }
  }

  /**
   * Check if Outlook Calendar service is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Check if user has connected their Outlook Calendar
   */
  async isUserConnected(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { outlookAccessToken: true },
    });

    return !!user?.outlookAccessToken;
  }
}
