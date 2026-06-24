import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { BadgesService } from '../services/badges.service';
import { CreateBadgeDto, UpdateBadgeDto } from '../dto/badge.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  /**
   * Get all badges
   * GET /badges
   */
  @Get()
  async getAllBadges(@Query('includeInactive') includeInactive?: string) {
    return this.badgesService.getAllBadges(includeInactive === 'true');
  }

  /**
   * Get current user's badges
   * GET /badges/my-badges  (déclaré avant :id pour ne pas être capturé par la route paramétrée)
   */
  @Get('my-badges')
  @UseGuards(JwtAuthGuard)
  async getMyBadges(@Request() req) {
    return this.badgesService.getUserBadges(req.user.userId);
  }

  /**
   * Get badge by ID
   * GET /badges/:id
   */
  @Get(':id')
  async getBadgeById(@Param('id') badgeId: string) {
    return this.badgesService.getBadgeById(badgeId);
  }

  /**
   * Get user's badges
   * GET /badges/user/:userId
   */
  @Get('user/:userId')
  async getUserBadges(@Param('userId') userId: string) {
    return this.badgesService.getUserBadges(userId);
  }

  /**
   * Get badge statistics (admin only)
   * GET /badges/admin/statistics
   */
  @Get('admin/statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getBadgeStatistics() {
    return this.badgesService.getBadgeStatistics();
  }

  /**
   * Create new badge (admin only)
   * POST /badges
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createBadge(@Body() dto: CreateBadgeDto) {
    return this.badgesService.createBadge(dto);
  }

  /**
   * Update badge (admin only)
   * PUT /badges/:id
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateBadge(@Param('id') badgeId: string, @Body() dto: UpdateBadgeDto) {
    return this.badgesService.updateBadge(badgeId, dto);
  }

  /**
   * Delete badge (admin only)
   * DELETE /badges/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteBadge(@Param('id') badgeId: string) {
    return this.badgesService.deleteBadge(badgeId);
  }

  /**
   * Manually trigger badge award process (admin only)
   * POST /badges/admin/award-all
   */
  @Post('admin/award-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async triggerBadgeAward() {
    await this.badgesService.awardBadgesAutomatically();
    return { message: 'Badge award process triggered successfully' };
  }

  /**
   * Award badge to specific user (admin only)
   * POST /badges/:badgeId/award/:userId
   */
  @Post(':badgeId/award/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async awardBadgeToUser(
    @Param('badgeId') badgeId: string,
    @Param('userId') userId: string,
  ) {
    return this.badgesService.awardBadge(userId, badgeId, {
      manual: true,
      awardedAt: new Date(),
    });
  }
}
