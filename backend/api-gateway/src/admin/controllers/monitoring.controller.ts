import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { MonitoringService } from '../services/monitoring.service';

/**
 * Controller pour le Monitoring & Analytics
 * Endpoints admin pour visualiser les métriques et graphiques des CRON jobs
 */
@ApiTags('Admin - Monitoring & Analytics')
@Controller('admin/monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  /**
   * GET /admin/monitoring/dashboard
   * Dashboard complet avec toutes les métriques
   */
  @Get('dashboard')
  @ApiOperation({
    summary: 'Dashboard complet des métriques CRON',
    description:
      'Retourne toutes les métriques: overview, auto-validation, cleanup, alerts, performance, trends',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard des métriques',
    schema: {
      example: {
        overview: {
          totalMissions: 1250,
          missionsLast24h: 12,
          missionsLast7days: 87,
          missionsLast30days: 342,
          completedMissions: 980,
          autoValidatedMissions: 765,
          cancelledMissions: 45,
          pendingValidations: 8,
          autoValidationRate: '78.06%',
          health: 'GOOD',
        },
        autoValidation: {
          total: 25,
          totalAmount: '4350.00€',
          avgDelayHours: '171.2h',
          recentAutoValidations: [],
          dailyStats: [],
        },
        cleanup: {
          cancelledBySystemLast30Days: 12,
          oldPendingMissions: 3,
          nextCleanupRecommended: false,
          cleanupFrequency: 'Daily at 02:00',
        },
        alerts: {
          stuckNegotiations: { count: 2, missions: [] },
          unpaidMissions: { count: 1, totalAmount: '150.00', missions: [] },
          eligibleForAutoValidation: {
            count: 5,
            totalAmount: '890.00',
            missions: [],
          },
        },
        performance: {
          cronExecutions: {},
          database: {},
        },
        trends: {
          missionsGrowth: '12.5%',
          autoValidationGrowth: '8.3%',
          prediction: {
            nextMonthMissions: 385,
            nextMonthAutoValidations: 828,
          },
        },
        generatedAt: '2025-11-10T10:30:00.000Z',
      },
    },
  })
  async getDashboard() {
    return this.monitoringService.getCronMetrics();
  }

  /**
   * GET /admin/monitoring/auto-validation/chart
   * Graphique des auto-validations
   */
  @Get('auto-validation/chart')
  @ApiOperation({
    summary: 'Graphique des auto-validations',
    description:
      'Retourne les données pour afficher un graphique des auto-validations par jour',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Nombre de jours à afficher (défaut: 30)',
  })
  @ApiResponse({
    status: 200,
    description: 'Données du graphique',
    schema: {
      example: {
        labels: [
          '2025-10-11',
          '2025-10-12',
          '2025-10-13',
          '...',
          '2025-11-10',
        ],
        datasets: [
          {
            label: 'Auto-validations',
            data: [2, 3, 1, 0, 4, 2],
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 2,
          },
          {
            label: 'Montant total (€)',
            data: [300, 450, 150, 0, 680, 290],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2,
          },
        ],
      },
    },
  })
  async getAutoValidationChart(@Query('days') days?: string) {
    const numDays = days ? parseInt(days, 10) : 30;
    return this.monitoringService.getAutoValidationChart(numDays);
  }

  /**
   * GET /admin/monitoring/alerts
   * Alertes intelligentes
   */
  @Get('alerts')
  @ApiOperation({
    summary: 'Alertes intelligentes',
    description:
      'Analyse automatique des problèmes potentiels et recommandations',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des alertes',
    schema: {
      example: {
        total: 3,
        critical: 0,
        warnings: 1,
        info: 2,
        alerts: [
          {
            level: 'WARNING',
            type: 'PENDING_VALIDATIONS',
            message: '15 missions en attente de validation client',
            recommendation: "Déclencher le CRON d'auto-validation manuellement",
            actionUrl: '/admin/cron/trigger/auto-validate',
          },
          {
            level: 'INFO',
            type: 'STUCK_NEGOTIATIONS',
            message: '7 négociations bloquées > 3 jours',
            recommendation: 'Envoyer des notifications de rappel',
            actionUrl: '/admin/notifications/remind-negotiations',
          },
        ],
        lastCheck: '2025-11-10T10:30:00.000Z',
      },
    },
  })
  async getSmartAlerts() {
    return this.monitoringService.getSmartAlerts();
  }

  /**
   * GET /admin/monitoring/health
   * État de santé global du système
   */
  @Get('health')
  @ApiOperation({
    summary: 'État de santé du système',
    description: 'Score de santé global basé sur les métriques',
  })
  @ApiResponse({
    status: 200,
    description: 'État de santé',
    schema: {
      example: {
        status: 'GOOD',
        score: 87,
        checks: {
          autoValidationRate: { status: 'OK', value: '78%' },
          pendingValidations: { status: 'OK', value: 8 },
          stuckNegotiations: { status: 'WARNING', value: 5 },
          unpaidDeposits: { status: 'OK', value: 2 },
          cronJobs: { status: 'OK', value: 'All running' },
        },
        recommendations: [
          'Surveiller les négociations bloquées',
          'Tout est opérationnel',
        ],
        lastCheck: '2025-11-10T10:30:00.000Z',
      },
    },
  })
  async getHealthStatus() {
    const metrics = await this.monitoringService.getCronMetrics();
    const alerts = await this.monitoringService.getSmartAlerts();

    const checks = {
      autoValidationRate: {
        status:
          parseFloat(metrics.overview.autoValidationRate) >= 70 ? 'OK' : 'WARNING',
        value: metrics.overview.autoValidationRate,
      },
      pendingValidations: {
        status: metrics.overview.pendingValidations <= 10 ? 'OK' : 'WARNING',
        value: metrics.overview.pendingValidations,
      },
      stuckNegotiations: {
        status: metrics.alerts.stuckNegotiations.count <= 3 ? 'OK' : 'WARNING',
        value: metrics.alerts.stuckNegotiations.count,
      },
      unpaidDeposits: {
        status: metrics.alerts.unpaidMissions.count <= 3 ? 'OK' : 'WARNING',
        value: metrics.alerts.unpaidMissions.count,
      },
      cronJobs: {
        status: 'OK',
        value: 'All running',
      },
    };

    const warningsCount = Object.values(checks).filter(
      (c) => c.status === 'WARNING',
    ).length;

    let status = 'EXCELLENT';
    let score = 100;

    if (warningsCount === 1) {
      status = 'GOOD';
      score = 85;
    } else if (warningsCount === 2) {
      status = 'FAIR';
      score = 70;
    } else if (warningsCount >= 3) {
      status = 'POOR';
      score = 50;
    }

    const recommendations: string[] = [];

    if (checks.stuckNegotiations.status === 'WARNING') {
      recommendations.push('Surveiller les négociations bloquées');
    }
    if (checks.pendingValidations.status === 'WARNING') {
      recommendations.push("Déclencher l'auto-validation manuellement");
    }
    if (checks.unpaidDeposits.status === 'WARNING') {
      recommendations.push('Relancer les clients pour les paiements');
    }
    if (recommendations.length === 0) {
      recommendations.push('Tout est opérationnel 🎉');
    }

    return {
      status,
      score,
      checks,
      alerts: {
        total: alerts.total,
        critical: alerts.critical,
        warnings: alerts.warnings,
        info: alerts.info,
      },
      recommendations,
      lastCheck: new Date(),
    };
  }

  /**
   * GET /admin/monitoring/metrics/overview
   * Vue d'ensemble uniquement
   */
  @Get('metrics/overview')
  @ApiOperation({
    summary: 'Vue d\'ensemble des métriques',
    description: 'Statistiques générales du système',
  })
  @ApiResponse({
    status: 200,
    description: 'Métriques générales',
  })
  async getOverview() {
    const metrics = await this.monitoringService.getCronMetrics();
    return {
      overview: metrics.overview,
      generatedAt: metrics.generatedAt,
    };
  }

  /**
   * GET /admin/monitoring/metrics/auto-validation
   * Métriques d'auto-validation uniquement
   */
  @Get('metrics/auto-validation')
  @ApiOperation({
    summary: 'Métriques d\'auto-validation',
    description: 'Statistiques détaillées des auto-validations',
  })
  @ApiResponse({
    status: 200,
    description: 'Métriques d\'auto-validation',
  })
  async getAutoValidationMetrics() {
    const metrics = await this.monitoringService.getCronMetrics();
    return {
      autoValidation: metrics.autoValidation,
      generatedAt: metrics.generatedAt,
    };
  }

  /**
   * GET /admin/monitoring/metrics/trends
   * Analyse des tendances
   */
  @Get('metrics/trends')
  @ApiOperation({
    summary: 'Analyse des tendances',
    description: 'Évolution des métriques et prédictions',
  })
  @ApiResponse({
    status: 200,
    description: 'Tendances et prédictions',
  })
  async getTrends() {
    const metrics = await this.monitoringService.getCronMetrics();
    return {
      trends: metrics.trends,
      generatedAt: metrics.generatedAt,
    };
  }
}
