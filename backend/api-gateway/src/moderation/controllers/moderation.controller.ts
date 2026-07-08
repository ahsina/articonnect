import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ModerationService } from '../services/moderation.service';
import { CreateReportDto } from '../dto/create-report.dto';
import { ResolveReportDto } from '../dto/resolve-report.dto';
import { UpdateReportStatusDto } from '../dto/update-report-status.dto';
import { QueryReportDto } from '../dto/query-report.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('moderation')
@UseGuards(JwtAuthGuard)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  /**
   * Create a new report
   * POST /moderation/reports
   */
  @Post('reports')
  async createReport(@Request() req, @Body() createReportDto: CreateReportDto) {
    const userId = req.user.userId;
    return this.moderationService.createReport(userId, createReportDto);
  }

  /**
   * Get all reports (admin only)
   * GET /moderation/reports
   */
  @Get('reports')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllReports(@Query() queryDto: QueryReportDto) {
    return this.moderationService.getAllReports(queryDto);
  }

  /**
   * Get moderation statistics (admin only)
   * GET /moderation/stats
   */
  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getModerationStats() {
    return this.moderationService.getModerationStats();
  }

  /**
   * Get reports made by current user
   * GET /moderation/my-reports
   */
  @Get('my-reports')
  async getMyReports(@Request() req) {
    const userId = req.user.userId;
    return this.moderationService.getReportsByUser(userId);
  }

  /**
   * Get a single report by ID
   * GET /moderation/reports/:id
   */
  @Get('reports/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getReportById(@Param('id') reportId: string) {
    return this.moderationService.getReportById(reportId);
  }

  /**
   * Resolve a report (admin only)
   * PUT /moderation/reports/:id/resolve
   */
  @Put('reports/:id/resolve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async resolveReport(
    @Param('id') reportId: string,
    @Request() req,
    @Body() resolveReportDto: ResolveReportDto,
  ) {
    const adminId = req.user.userId;
    return this.moderationService.resolveReport(reportId, adminId, resolveReportDto);
  }

  /**
   * Update report status (admin only)
   * PUT /moderation/reports/:id/status
   */
  @Put('reports/:id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateReportStatus(
    @Param('id') reportId: string,
    @Body() dto: UpdateReportStatusDto,
  ) {
    return this.moderationService.updateReportStatus(reportId, dto.status);
  }
}
