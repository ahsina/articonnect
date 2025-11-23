import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ContentFilterService } from '../../chat/services/content-filter.service';

/**
 * Content Moderation Controller
 *
 * Admin endpoints for managing content filtering and violations
 */
@ApiTags('Content Moderation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('moderation/content')
export class ContentModerationController {
  constructor(private readonly contentFilter: ContentFilterService) {}

  /**
   * Get all content violations (Admin only)
   */
  @Get('violations')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all content violations' })
  @ApiResponse({ status: 200, description: 'List of violations retrieved' })
  async getAllViolations(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50'
  ) {
    return this.contentFilter.getAllViolations(parseInt(page), parseInt(limit));
  }

  /**
   * Get violations for specific user (Admin only)
   */
  @Get('violations/user/:userId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get violations for specific user' })
  @ApiResponse({ status: 200, description: 'User violations retrieved' })
  async getUserViolations(
    @Param('userId') userId: string,
    @Query('days') days: string = '30'
  ) {
    return this.contentFilter.getUserViolations(userId, parseInt(days));
  }

  /**
   * Get my violations (for current user)
   */
  @Get('violations/me')
  @ApiOperation({ summary: 'Get my content violations' })
  @ApiResponse({ status: 200, description: 'User violations retrieved' })
  async getMyViolations(
    @Request() req,
    @Query('days') days: string = '30'
  ) {
    const userId = req.user.userId;
    return this.contentFilter.getUserViolations(userId, parseInt(days));
  }

  /**
   * Get all filter patterns (Admin only)
   */
  @Get('patterns')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all filter patterns' })
  @ApiResponse({ status: 200, description: 'Filter patterns retrieved' })
  async getPatterns() {
    return {
      patterns: this.contentFilter.getPatterns(),
    };
  }

  /**
   * Toggle pattern on/off (Admin only)
   */
  @Post('patterns/:patternName/toggle')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable or disable a filter pattern' })
  @ApiResponse({ status: 200, description: 'Pattern toggled successfully' })
  async togglePattern(
    @Param('patternName') patternName: string,
    @Body('enabled') enabled: boolean
  ) {
    await this.contentFilter.togglePattern(patternName, enabled);
    return {
      message: `Pattern ${patternName} ${enabled ? 'enabled' : 'disabled'}`,
      patternName,
      enabled,
    };
  }

  /**
   * Test content against filters (Admin only)
   */
  @Post('test')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test content against filters' })
  @ApiResponse({ status: 200, description: 'Test results returned' })
  async testContent(
    @Request() req,
    @Body('content') content: string
  ) {
    const userId = req.user.userId;
    const filterResult = await this.contentFilter.filterContent(content, userId);
    return {
      isBlocked: filterResult.isBlocked,
      filteredContent: filterResult.filteredContent,
      detectedPatterns: filterResult.detectedPatterns,
      violationType: filterResult.violationType,
    };
  }

  /**
   * Get moderation statistics (Admin only)
   */
  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get content moderation statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getStats() {
    // Implementation would aggregate violation statistics
    return {
      message: 'Statistics endpoint - to be implemented with aggregation queries',
    };
  }
}
