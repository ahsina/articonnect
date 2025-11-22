import { Controller, Get, Post, Query, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GoogleCalendarService } from '../services/google-calendar.service';
import { OutlookCalendarService } from '../services/outlook-calendar.service';

@ApiTags('Calendar')
@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly outlookCalendarService: OutlookCalendarService,
  ) {}

  @Get('google/auth-url')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Google Calendar OAuth URL' })
  getGoogleAuthUrl(@Request() req) {
    const authUrl = this.googleCalendarService.getAuthorizationUrl(req.user.userId);
    return { authUrl };
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google Calendar OAuth callback' })
  async googleCallback(@Query('code') code: string, @Query('state') userId: string) {
    await this.googleCalendarService.exchangeCodeForTokens(code, userId);
    return { success: true, message: 'Google Calendar connected' };
  }

  @Post('google/disconnect')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Google Calendar' })
  async disconnectGoogle(@Request() req) {
    await this.googleCalendarService.disconnectCalendar(req.user.userId);
    return { success: true };
  }

  @Get('google/events')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get upcoming Google Calendar events' })
  async getGoogleEvents(@Request() req) {
    const events = await this.googleCalendarService.getUpcomingEvents(req.user.userId);
    return { events };
  }

  @Get('outlook/auth-url')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Outlook Calendar OAuth URL' })
  getOutlookAuthUrl(@Request() req) {
    const authUrl = this.outlookCalendarService.getAuthorizationUrl(req.user.userId);
    return { authUrl };
  }

  @Get('outlook/callback')
  @ApiOperation({ summary: 'Outlook Calendar OAuth callback' })
  async outlookCallback(@Query('code') code: string, @Query('state') userId: string) {
    await this.outlookCalendarService.exchangeCodeForTokens(code, userId);
    return { success: true, message: 'Outlook Calendar connected' };
  }

  @Post('outlook/disconnect')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Outlook Calendar' })
  async disconnectOutlook(@Request() req) {
    await this.outlookCalendarService.disconnectCalendar(req.user.userId);
    return { success: true };
  }
}
