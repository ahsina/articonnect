import {
  Controller,
  Post,
  Body,
  Request,
  Ip,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { NotificationService } from '../../notification/services/notification.service';
import { NotificationGateway } from '../../notification/gateways/notification.gateway';
import { AuditLogService } from '../../common/services/audit-log.service';
import { CreateAnnouncementDto } from '../dto/create-announcement.dto';

/**
 * Annonces / notifications plateforme (broadcast) réservées aux administrateurs.
 *
 * Réutilise l'infrastructure Notification existante :
 *  - NotificationService.sendToAllUsers -> crée une notification SYSTEM persistante
 *    pour chaque utilisateur actif (visible dans la cloche, compteur non-lu) et
 *    l'émet en temps réel par WebSocket / push selon les préférences de chacun.
 *  - NotificationGateway.broadcastToAll -> bannière éphémère instantanée pour les
 *    utilisateurs actuellement connectés (annonce de maintenance, etc.).
 *
 * Aucun nouveau champ de schéma : type SYSTEM déjà présent dans NotificationType.
 */
@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class AnnouncementsController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post('announcements')
  @ApiOperation({
    summary:
      'Diffuse une annonce plateforme (SYSTEM) à tous les utilisateurs ou à un rôle (Admin only)',
  })
  async broadcast(
    @Request() req,
    @Ip() ipAddress: string,
    @Body() dto: CreateAnnouncementDto,
  ) {
    const audience = dto.audience ?? 'ALL';
    const roleFilter = audience === 'ALL' ? undefined : audience;

    // 1) Notification persistante par utilisateur (cloche + temps réel + push/email
    //    selon préférences). SYSTEM n'est jamais dans les disabledTypes -> toujours livrée.
    const result = await this.notificationService.sendToAllUsers(
      NotificationType.SYSTEM,
      dto.title,
      dto.message,
      dto.link,
      { announcement: true, audience },
      roleFilter ? { role: roleFilter } : undefined,
    );

    // 2) Bannière éphémère temps réel pour les connectés (best-effort).
    try {
      await this.notificationGateway.broadcastToAll({
        type: NotificationType.SYSTEM,
        title: dto.title,
        message: dto.message,
        link: dto.link,
        data: { announcement: true, audience },
        createdAt: new Date(),
      });
    } catch {
      // Le broadcast temps réel est un bonus ; l'échec ne doit pas invalider l'envoi persistant.
    }

    // 3) Traçabilité admin.
    await this.auditLogService.log({
      userId: req.user?.userId,
      action: 'ADMIN_ANNOUNCEMENT_BROADCAST',
      resource: 'notification',
      details: {
        audience,
        title: dto.title,
        recipients: result.total,
        successful: result.successful,
        failed: result.failed,
      },
      ipAddress: ipAddress || 'unknown',
      userAgent: req.headers?.['user-agent'] || 'unknown',
    });

    return {
      success: true,
      audience,
      ...result,
    };
  }
}
