import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditLogService } from '../../common/services/audit-log.service';
import {
  ProcessGdprRequestDto,
  GdprRequestFilterDto,
} from '../dto/gdpr-admin.dto';

// Action utilisée dans AuditLog pour tracer le traitement des demandes de suppression RGPD.
const GDPR_PROCESS_ACTION = 'GDPR_DELETION_PROCESSED';

@Injectable()
export class GdprAdminService {
  private readonly logger = new Logger(GdprAdminService.name);

  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  /**
   * Liste GLOBALE des demandes de suppression RGPD en attente (droit à l'effacement).
   * Ce sont les utilisateurs pour lesquels `deletionRequestedAt` est posé et dont le compte
   * n'est pas encore réellement supprimé. Chaque ligne est enrichie de l'historique de
   * traitement (traces AuditLog) pour donner de la visibilité à l'opérateur.
   */
  async listDeletionRequests(filters: GdprRequestFilterDto) {
    const { page = 1, limit = 50 } = filters;

    const where: any = {
      deletionRequestedAt: { not: null },
      deletedAt: null,
      status: { not: 'DELETED' },
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          createdAt: true,
          deletionRequestedAt: true,
          deletionScheduledFor: true,
        },
        orderBy: { deletionRequestedAt: 'asc' }, // les plus anciennes demandes d'abord
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    // Traces de traitement pour l'ensemble des utilisateurs listés (une seule requête).
    const userIds = users.map((u) => u.id);
    const traces = userIds.length
      ? await this.prisma.auditLog.findMany({
          where: { action: GDPR_PROCESS_ACTION, resource: { in: userIds } },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const tracesByUser = new Map<string, typeof traces>();
    for (const trace of traces) {
      const list = tracesByUser.get(trace.resource) || [];
      list.push(trace);
      tracesByUser.set(trace.resource, list);
    }

    const now = Date.now();
    const data = users.map((u) => {
      const userTraces = tracesByUser.get(u.id) || [];
      const scheduledFor = u.deletionScheduledFor;
      const overdue = scheduledFor ? scheduledFor.getTime() < now : false;
      const daysRemaining = scheduledFor
        ? Math.ceil((scheduledFor.getTime() - now) / (24 * 60 * 60 * 1000))
        : null;

      return {
        userId: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        status: u.status,
        accountCreatedAt: u.createdAt,
        requestedAt: u.deletionRequestedAt,
        scheduledFor,
        overdue,
        daysRemaining,
        processed: userTraces.length > 0,
        processedCount: userTraces.length,
        lastProcessedAt: userTraces[0]?.createdAt ?? null,
        lastOutcome: (userTraces[0]?.details as any)?.outcome ?? null,
      };
    });

    const overdueCount = data.filter((d) => d.overdue).length;

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        overdue: overdueCount,
      },
    };
  }

  /**
   * Détail d'une demande de suppression + historique complet de traitement.
   */
  async getDeletionRequest(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        deletionRequestedAt: true,
        deletionScheduledFor: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const history = await this.prisma.auditLog.findMany({
      where: { action: GDPR_PROCESS_ACTION, resource: userId },
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();
    const scheduledFor = user.deletionScheduledFor;

    return {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      accountCreatedAt: user.createdAt,
      requestedAt: user.deletionRequestedAt,
      scheduledFor,
      overdue: scheduledFor ? scheduledFor.getTime() < now : false,
      pending: !!user.deletionRequestedAt,
      history: history.map((h) => ({
        id: h.id,
        processedBy: h.userId,
        outcome: (h.details as any)?.outcome ?? null,
        notes: (h.details as any)?.notes ?? null,
        createdAt: h.createdAt,
      })),
    };
  }

  /**
   * Trace le traitement d'une demande RGPD (décision de l'opérateur).
   * N'exécute PAS l'effacement (opération sensible, déférée) : enregistre uniquement une trace
   * horodatée + décision + notes dans l'AuditLog, réutilisable comme registre RGPD.
   */
  async processDeletionRequest(
    adminId: string,
    userId: string,
    dto: ProcessGdprRequestDto,
    reqMeta: { ipAddress: string; userAgent?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    await this.auditLog.log({
      userId: adminId,
      action: GDPR_PROCESS_ACTION,
      resource: userId,
      details: {
        outcome: dto.outcome,
        notes: dto.notes ?? null,
        targetEmail: user.email,
      },
      ipAddress: reqMeta.ipAddress || 'unknown',
      userAgent: reqMeta.userAgent,
    });

    this.logger.log(
      `Demande RGPD de ${user.email} tracée par admin ${adminId} → ${dto.outcome}`,
    );

    // Renvoie l'état à jour (avec l'historique fraîchement écrit) pour un read-back immédiat.
    return this.getDeletionRequest(userId);
  }
}
