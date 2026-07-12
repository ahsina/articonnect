import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { GdprAdminService } from '../services/gdpr-admin.service';
import {
  ProcessGdprRequestDto,
  GdprRequestFilterDto,
} from '../dto/gdpr-admin.dto';

/**
 * File RGPD (opérateur ADMIN) : demandes de suppression / droit d'accès.
 * Toutes les routes sont réservées aux ADMIN.
 */
@Controller('compliance/admin/gdpr')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class GdprAdminController {
  constructor(private readonly gdprAdminService: GdprAdminService) {}

  /**
   * GET /compliance/admin/gdpr/requests
   * Liste des demandes de suppression RGPD en attente.
   */
  @Get('requests')
  async listRequests(@Query() filters: GdprRequestFilterDto) {
    return this.gdprAdminService.listDeletionRequests(filters);
  }

  /**
   * GET /compliance/admin/gdpr/requests/:userId
   * Détail d'une demande + historique de traitement.
   */
  @Get('requests/:userId')
  async getRequest(@Param('userId') userId: string) {
    return this.gdprAdminService.getDeletionRequest(userId);
  }

  /**
   * POST /compliance/admin/gdpr/requests/:userId/process
   * Trace le traitement d'une demande RGPD (décision + notes).
   */
  @Post('requests/:userId/process')
  async processRequest(
    @Req() req: any,
    @Param('userId') userId: string,
    @Body() dto: ProcessGdprRequestDto,
  ) {
    return this.gdprAdminService.processDeletionRequest(
      req.user.userId || req.user.id,
      userId,
      dto,
      {
        ipAddress: req.ip || req.headers?.['x-forwarded-for'] || 'unknown',
        userAgent: req.headers?.['user-agent'],
      },
    );
  }
}
