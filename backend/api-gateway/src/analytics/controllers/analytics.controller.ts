import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from '../services/analytics.service';
import { MatchingQueryDto } from '../dto/analytics.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Get artisan recommendations for a mission
   * POST /analytics/match
   */
  @Post('match')
  @UseGuards(JwtAuthGuard)
  async getArtisanRecommendations(@Body() query: MatchingQueryDto) {
    return this.analyticsService.getArtisanRecommendations(query);
  }

  /**
   * Get platform-wide analytics (admin only)
   * GET /analytics/platform
   */
  @Get('platform')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getPlatformAnalytics() {
    return this.analyticsService.getPlatformAnalytics();
  }

  /**
   * Get artisan performance analytics
   * GET /analytics/artisan/:artisanId
   */
  @Get('artisan/:artisanId')
  @UseGuards(JwtAuthGuard)
  async getArtisanAnalytics(@Param('artisanId') artisanId: string) {
    return this.analyticsService.getArtisanAnalytics(artisanId);
  }
}
