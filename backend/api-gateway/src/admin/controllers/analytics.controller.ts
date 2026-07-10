import { Controller, Get, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AnalyticsService } from '../services/analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get comprehensive business metrics' })
  @ApiResponse({
    status: 200,
    description: 'Business metrics retrieved successfully',
  })
  async getMetrics() {
    const metrics = await this.analyticsService.getBusinessMetrics();
    return {
      success: true,
      data: metrics,
    };
  }

  @Get('time-series')
  @ApiOperation({ summary: 'Get time series data for charts' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to retrieve (default: 30)',
  })
  @ApiResponse({
    status: 200,
    description: 'Time series data retrieved successfully',
  })
  async getTimeSeriesData(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    const data = await this.analyticsService.getTimeSeriesData(days || 30);
    return {
      success: true,
      data,
    };
  }

  @Get('top-artisans')
  @ApiOperation({ summary: 'Get top performing artisans' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of artisans to retrieve (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Top artisans retrieved successfully',
  })
  async getTopArtisans(
    // DefaultValuePipe applique 10 AVANT ParseIntPipe : un `limit` absent
    // ne déclenche plus de 400 (le pipe reçoit déjà "10", pas undefined).
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const artisans = await this.analyticsService.getTopArtisans(limit || 10);
    return {
      success: true,
      data: artisans,
    };
  }
}
