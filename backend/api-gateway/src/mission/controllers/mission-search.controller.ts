import { Controller, Get, Query, UseGuards, Request, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { MissionSearchService, MissionSearchFilters } from '../services/mission-search.service';
import { MissionStatus } from '@prisma/client';

@ApiTags('Mission Search')
@Controller('missions/search')
export class MissionSearchController {
  constructor(private readonly searchService: MissionSearchService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search missions with advanced filters (artisan)' })
  @ApiQuery({ name: 'query', required: false, description: 'Text search query' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'city', required: false, description: 'Filter by city' })
  @ApiQuery({ name: 'region', required: false, description: 'Filter by region' })
  @ApiQuery({ name: 'minBudget', required: false, type: Number, description: 'Minimum budget' })
  @ApiQuery({ name: 'maxBudget', required: false, type: Number, description: 'Maximum budget' })
  @ApiQuery({ name: 'isUrgent', required: false, type: Boolean, description: 'Filter urgent missions' })
  @ApiQuery({ name: 'status', required: false, enum: MissionStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'latitude', required: false, type: Number, description: 'User latitude for distance calculation' })
  @ApiQuery({ name: 'longitude', required: false, type: Number, description: 'User longitude for distance calculation' })
  @ApiQuery({ name: 'maxDistance', required: false, type: Number, description: 'Maximum distance in km' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'scheduledFor', 'clientBudget', 'distance'], description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  async search(@Request() req, @Query() query: any) {
    const filters: MissionSearchFilters = {
      query: query.query,
      category: query.category,
      city: query.city,
      region: query.region,
      minBudget: query.minBudget ? parseFloat(query.minBudget) : undefined,
      maxBudget: query.maxBudget ? parseFloat(query.maxBudget) : undefined,
      isUrgent: query.isUrgent === 'true',
      status: query.status as MissionStatus,
      latitude: query.latitude ? parseFloat(query.latitude) : undefined,
      longitude: query.longitude ? parseFloat(query.longitude) : undefined,
      maxDistance: query.maxDistance ? parseFloat(query.maxDistance) : undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder || 'desc',
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 20,
    };

    return this.searchService.searchMissions(filters, req.user.userId);
  }

  @Get('recommendations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get personalized mission recommendations for artisan' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of recommendations (default: 10)' })
  async getRecommendations(@Request() req, @Query('limit') limit?: string) {
    const recommendations = await this.searchService.getRecommendationsForArtisan(
      req.user.userId,
      limit ? parseInt(limit, 10) : 10,
    );

    return { recommendations };
  }

  @Get('similar/:missionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get similar missions (artisan)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of similar missions (default: 5)' })
  async getSimilar(
    @Request() req,
    @Param('missionId') missionId: string,
    @Query('limit') limit?: string,
  ) {
    const similar = await this.searchService.getSimilarMissions(
      missionId,
      limit ? parseInt(limit, 10) : 5,
      req.user.userId,
    );

    return { similar };
  }

  @Get('nearby')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search missions near a location (artisan)' })
  @ApiQuery({ name: 'latitude', required: true, type: Number, description: 'Latitude' })
  @ApiQuery({ name: 'longitude', required: true, type: Number, description: 'Longitude' })
  @ApiQuery({ name: 'maxDistance', required: false, type: Number, description: 'Maximum distance in km (default: 50)' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results (default: 20)' })
  async searchNearby(@Request() req, @Query() query: any) {
    const filters: MissionSearchFilters = {
      latitude: parseFloat(query.latitude),
      longitude: parseFloat(query.longitude),
      maxDistance: query.maxDistance ? parseFloat(query.maxDistance) : 50,
      category: query.category,
      sortBy: 'distance',
      sortOrder: 'asc',
      limit: query.limit ? parseInt(query.limit, 10) : 20,
      status: MissionStatus.PENDING,
    };

    return this.searchService.searchMissions(filters, req.user.userId);
  }

  @Get('urgent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ARTISAN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all urgent missions (artisan)' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'city', required: false, description: 'Filter by city' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results (default: 20)' })
  async getUrgentMissions(@Request() req, @Query() query: any) {
    const filters: MissionSearchFilters = {
      isUrgent: true,
      status: MissionStatus.PENDING,
      category: query.category,
      city: query.city,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit: query.limit ? parseInt(query.limit, 10) : 20,
    };

    return this.searchService.searchMissions(filters, req.user.userId);
  }
}
