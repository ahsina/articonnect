import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from '../services/analytics.service';
import {
  MatchingQueryDto,
  CreateRevenueGoalDto,
  UpdateRevenueGoalDto,
  TrendAnalysisDto,
  ForecastDto,
  ProfitabilityQueryDto,
} from '../dto/analytics.dto';
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

  // ============ ADVANCED ANALYTICS - ARTISAN DASHBOARD ============

  /**
   * Get artisan dashboard summary
   * GET /analytics/dashboard
   */
  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  async getDashboardSummary(@Request() req) {
    return this.analyticsService.getDashboardSummary(req.user.id);
  }

  /**
   * Get profitability analysis
   * POST /analytics/profitability
   */
  @Post('profitability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  async getProfitabilityAnalysis(@Request() req, @Body() dto: ProfitabilityQueryDto) {
    return this.analyticsService.getProfitabilityAnalysis(req.user.id, dto);
  }

  /**
   * Get trend analysis for a specific metric
   * POST /analytics/trends
   */
  @Post('trends')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  async getTrendAnalysis(@Request() req, @Body() dto: TrendAnalysisDto) {
    return this.analyticsService.getTrendAnalysis(req.user.id, dto);
  }

  /**
   * Get revenue/mission forecast
   * POST /analytics/forecast
   */
  @Post('forecast')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  async getForecast(@Request() req, @Body() dto: ForecastDto) {
    return this.analyticsService.getForecast(req.user.id, dto);
  }

  // ============ REVENUE GOALS ============

  /**
   * Create a revenue goal
   * POST /analytics/goals
   */
  @Post('goals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  async createRevenueGoal(@Request() req, @Body() dto: CreateRevenueGoalDto) {
    return this.analyticsService.createRevenueGoal(req.user.id, dto);
  }

  /**
   * Get revenue goals
   * GET /analytics/goals
   */
  @Get('goals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  async getRevenueGoals(@Request() req, @Query('activeOnly') activeOnly?: string) {
    return this.analyticsService.getRevenueGoals(req.user.id, activeOnly !== 'false');
  }

  /**
   * Update a revenue goal
   * PUT /analytics/goals/:id
   */
  @Put('goals/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  async updateRevenueGoal(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateRevenueGoalDto,
  ) {
    return this.analyticsService.updateRevenueGoal(id, req.user.id, dto);
  }

  /**
   * Delete a revenue goal
   * DELETE /analytics/goals/:id
   */
  @Delete('goals/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  async deleteRevenueGoal(@Request() req, @Param('id') id: string) {
    return this.analyticsService.deleteRevenueGoal(id, req.user.id);
  }

  // ============ SNAPSHOTS ============

  /**
   * Create analytics snapshot (can be called by cron job)
   * POST /analytics/snapshot
   */
  @Post('snapshot')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  async createSnapshot(@Request() req) {
    return this.analyticsService.createSnapshot(req.user.id);
  }

  /**
   * Get historical snapshots
   * GET /analytics/snapshots
   */
  @Get('snapshots')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  async getSnapshots(@Request() req, @Query('limit') limit?: string) {
    return this.analyticsService.getSnapshots(req.user.id, limit ? parseInt(limit) : 12);
  }
}
