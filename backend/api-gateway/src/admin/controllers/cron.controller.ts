import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { MissionCronService } from '../../mission/services/mission-cron.service';

/**
 * Controller admin pour la gestion des CRON jobs
 * Permet de:
 * - Visualiser le statut des CRON jobs
 * - Déclencher manuellement les tâches planifiées
 * - Surveiller l'exécution des jobs
 */
@ApiTags('Admin - CRON Jobs')
@Controller('admin/cron')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class CronController {
  constructor(private readonly missionCronService: MissionCronService) {}

  /**
   * GET /admin/cron/status
   * Obtenir le statut de tous les CRON jobs
   */
  @Get('status')
  @ApiOperation({
    summary: 'Statut des CRON jobs',
    description: 'Retourne le statut et la planification de tous les CRON jobs actifs',
  })
  @ApiResponse({
    status: 200,
    description: 'Statut des CRON jobs',
    schema: {
      example: {
        jobs: [
          {
            name: 'auto-validate-stuck-missions',
            schedule: 'Toutes les 6 heures (00:00, 06:00, 12:00, 18:00)',
            description: 'Auto-validation missions bloquées > 7 jours',
            enabled: true,
          },
        ],
        timezone: 'Europe/Paris',
        nextExecutions: {
          autoValidate: '2025-11-08T18:00:00.000Z',
          cleanup: '2025-11-09T02:00:00.000Z',
          alerts: '2025-11-09T10:00:00.000Z',
          statistics: '2025-11-11T08:00:00.000Z',
        },
      },
    },
  })
  getCronJobsStatus() {
    return this.missionCronService.getCronJobsStatus();
  }

  /**
   * POST /admin/cron/trigger/auto-validate
   * Déclencher manuellement l'auto-validation des missions
   */
  @Post('trigger/auto-validate')
  @ApiOperation({
    summary: 'Déclencher auto-validation manuellement',
    description:
      'Lance immédiatement la tâche d\'auto-validation des missions bloquées (normalement exécutée toutes les 6h)',
  })
  @ApiResponse({
    status: 200,
    description: 'Auto-validation déclenchée avec succès',
    schema: {
      example: {
        autoValidatedCount: 3,
        missions: [
          {
            id: 'uuid-123',
            title: 'Réparation fuite',
            clientId: 'uuid-client',
            artisanId: 'uuid-artisan',
          },
        ],
      },
    },
  })
  async triggerAutoValidation() {
    return this.missionCronService.triggerAutoValidationManually();
  }

  /**
   * GET /admin/cron/health
   * Vérifier la santé du système de CRON
   */
  @Get('health')
  @ApiOperation({
    summary: 'Santé du système CRON',
    description: 'Vérifie que le ScheduleModule est correctement configuré',
  })
  @ApiResponse({
    status: 200,
    description: 'Système CRON opérationnel',
    schema: {
      example: {
        status: 'healthy',
        scheduleModuleEnabled: true,
        activeJobs: 4,
        message: 'Tous les CRON jobs sont opérationnels',
      },
    },
  })
  async getCronHealth() {
    const status = await this.missionCronService.getCronJobsStatus();

    return {
      status: 'healthy',
      scheduleModuleEnabled: true,
      activeJobs: status.jobs.filter((j) => j.enabled).length,
      totalJobs: status.jobs.length,
      timezone: status.timezone,
      message: 'Tous les CRON jobs sont opérationnels',
    };
  }
}
