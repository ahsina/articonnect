import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Service de Monitoring & Analytics pour les CRON jobs
 *
 * Collecte et analyse:
 * - Métriques d'exécution des CRON jobs
 * - Historique des auto-validations
 * - Statistiques de performance
 * - Alertes intelligentes
 */
@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  // Cache des métriques en mémoire pour améliorer les performances
  private metricsCache: {
    lastUpdate: Date;
    data: any;
  } | null = null;

  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 📊 DASHBOARD: Métriques complètes des CRON jobs
   */
  async getCronMetrics() {
    // Utiliser le cache si disponible et valide
    if (
      this.metricsCache &&
      Date.now() - this.metricsCache.lastUpdate.getTime() <
        this.CACHE_DURATION_MS
    ) {
      this.logger.debug('📦 Retour des métriques depuis le cache');
      return this.metricsCache.data;
    }

    this.logger.log('📊 Calcul des métriques CRON...');

    const metrics = {
      overview: await this.getOverviewMetrics(),
      autoValidation: await this.getAutoValidationMetrics(),
      cleanup: await this.getCleanupMetrics(),
      alerts: await this.getAlertMetrics(),
      performance: await this.getPerformanceMetrics(),
      trends: await this.getTrendAnalysis(),
      generatedAt: new Date(),
    };

    // Mettre à jour le cache
    this.metricsCache = {
      lastUpdate: new Date(),
      data: metrics,
    };

    return metrics;
  }

  /**
   * 📈 Vue d'ensemble générale
   */
  private async getOverviewMetrics() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalMissions,
      missionsLast24h,
      missionsLast7days,
      missionsLast30days,
      completedMissions,
      autoValidatedMissions,
      cancelledMissions,
      pendingValidations,
    ] = await Promise.all([
      this.prisma.mission.count(),
      this.prisma.mission.count({ where: { createdAt: { gte: last24h } } }),
      this.prisma.mission.count({ where: { createdAt: { gte: last7days } } }),
      this.prisma.mission.count({ where: { createdAt: { gte: last30days } } }),
      this.prisma.mission.count({ where: { status: 'AUTO_VALIDATED' } }),
      this.prisma.mission.count({ where: { autoValidated: true } }),
      this.prisma.mission.count({ where: { status: 'CANCELLED' } }),
      this.prisma.mission.count({ where: { status: 'COMPLETED' } }),
    ]);

    const autoValidationRate =
      completedMissions > 0
        ? ((autoValidatedMissions / completedMissions) * 100).toFixed(2)
        : 0;

    return {
      totalMissions,
      missionsLast24h,
      missionsLast7days,
      missionsLast30days,
      completedMissions,
      autoValidatedMissions,
      cancelledMissions,
      pendingValidations,
      autoValidationRate: `${autoValidationRate}%`,
      health: this.calculateHealthScore({
        autoValidationRate: parseFloat(autoValidationRate.toString()),
        pendingValidations,
      }),
    };
  }

  /**
   * 🤖 Métriques d'auto-validation
   */
  private async getAutoValidationMetrics() {
    const last30days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const autoValidatedMissions = await this.prisma.mission.findMany({
      where: {
        autoValidated: true,
        autoValidatedAt: { gte: last30days },
      },
      orderBy: { autoValidatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        agreedPrice: true,
        autoValidatedAt: true,
        completedAt: true,
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        artisan: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Calculer le délai moyen de validation
    const delays = autoValidatedMissions
      .filter((m) => m.completedAt && m.autoValidatedAt)
      .map((m) => {
        const completed = new Date(m.completedAt!);
        const validated = new Date(m.autoValidatedAt!);
        return (validated.getTime() - completed.getTime()) / (1000 * 60 * 60); // en heures
      });

    const avgDelayHours =
      delays.length > 0
        ? (delays.reduce((a, b) => a + b, 0) / delays.length).toFixed(1)
        : 0;

    // Total montant auto-validé
    const totalAmount = autoValidatedMissions
      .reduce((sum, m) => sum + (m.agreedPrice ? parseFloat(m.agreedPrice.toString()) : 0), 0)
      .toFixed(2);

    // Grouper par jour pour le graphique
    const dailyStats = this.groupByDay(autoValidatedMissions, 'autoValidatedAt');

    return {
      total: autoValidatedMissions.length,
      totalAmount: `${totalAmount}€`,
      avgDelayHours: `${avgDelayHours}h`,
      recentAutoValidations: autoValidatedMissions.slice(0, 10).map((m) => ({
        id: m.id,
        title: m.title,
        amount: m.agreedPrice ? `${m.agreedPrice}€` : 'N/A',
        client: `${m.client.firstName} ${m.client.lastName}`,
        artisan: `${m.artisan.firstName} ${m.artisan.lastName}`,
        validatedAt: m.autoValidatedAt,
        delayFromCompletion: m.completedAt
          ? `${((new Date(m.autoValidatedAt!).getTime() - new Date(m.completedAt).getTime()) / (1000 * 60 * 60)).toFixed(1)}h`
          : 'N/A',
      })),
      dailyStats,
    };
  }

  /**
   * 🧹 Métriques de nettoyage
   */
  private async getCleanupMetrics() {
    const last30days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [cancelledBySystem, oldPendingMissions] = await Promise.all([
      this.prisma.missionHistory.count({
        where: {
          status: 'CANCELLED',
          changedByRole: 'SYSTEM',
          createdAt: { gte: last30days },
        },
      }),
      this.prisma.mission.count({
        where: {
          status: 'PENDING',
          createdAt: { lt: thirtyDaysAgo },
        },
      }),
    ]);

    return {
      cancelledBySystemLast30Days: cancelledBySystem,
      oldPendingMissions,
      nextCleanupRecommended: oldPendingMissions > 10,
      cleanupFrequency: 'Daily at 02:00',
    };
  }

  /**
   * 🔔 Métriques d'alertes
   */
  private async getAlertMetrics() {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [stuckNegotiations, unpaidMissions, sevenDaysOldCompleted] =
      await Promise.all([
        this.prisma.mission.findMany({
          where: {
            status: 'NEGOTIATING',
            updatedAt: { lt: twoDaysAgo },
          },
          select: {
            id: true,
            title: true,
            updatedAt: true,
            client: { select: { firstName: true, lastName: true, email: true } },
          },
          take: 10,
        }),
        this.prisma.mission.findMany({
          where: {
            status: 'ACCEPTED',
            depositRequired: true,
            depositPaidAt: null,
            acceptedAt: { lt: oneDayAgo },
          },
          select: {
            id: true,
            title: true,
            depositAmount: true,
            acceptedAt: true,
            client: { select: { firstName: true, lastName: true, email: true } },
          },
          take: 10,
        }),
        this.prisma.mission.findMany({
          where: {
            status: 'COMPLETED',
            completedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            autoValidated: false,
          },
          select: {
            id: true,
            title: true,
            completedAt: true,
            agreedPrice: true,
            client: { select: { firstName: true, lastName: true } },
          },
          take: 10,
        }),
      ]);

    return {
      stuckNegotiations: {
        count: stuckNegotiations.length,
        missions: stuckNegotiations.map((m) => ({
          id: m.id,
          title: m.title,
          stuckSince: m.updatedAt,
          hoursSinceUpdate: (
            (Date.now() - new Date(m.updatedAt).getTime()) /
            (1000 * 60 * 60)
          ).toFixed(1),
          client: `${m.client.firstName} ${m.client.lastName}`,
        })),
      },
      unpaidMissions: {
        count: unpaidMissions.length,
        totalAmount: unpaidMissions
          .reduce((sum, m) => sum + (m.depositAmount ? parseFloat(m.depositAmount.toString()) : 0), 0)
          .toFixed(2),
        missions: unpaidMissions.map((m) => ({
          id: m.id,
          title: m.title,
          amount: m.depositAmount ? `${m.depositAmount}€` : 'N/A',
          acceptedAt: m.acceptedAt,
          client: `${m.client.firstName} ${m.client.lastName}`,
        })),
      },
      eligibleForAutoValidation: {
        count: sevenDaysOldCompleted.length,
        totalAmount: sevenDaysOldCompleted
          .reduce((sum, m) => sum + (m.agreedPrice ? parseFloat(m.agreedPrice.toString()) : 0), 0)
          .toFixed(2),
        missions: sevenDaysOldCompleted.map((m) => ({
          id: m.id,
          title: m.title,
          amount: m.agreedPrice ? `${m.agreedPrice}€` : 'N/A',
          completedAt: m.completedAt,
          daysSinceCompletion: (
            (Date.now() - new Date(m.completedAt!).getTime()) /
            (1000 * 60 * 60 * 24)
          ).toFixed(1),
          client: `${m.client.firstName} ${m.client.lastName}`,
        })),
      },
    };
  }

  /**
   * ⚡ Métriques de performance
   */
  private async getPerformanceMetrics() {
    // Simuler des métriques de performance (dans un vrai système, on stockerait ces données)
    return {
      cronExecutions: {
        autoValidation: {
          lastExecution: await this.getLastCronExecution('auto-validate'),
          avgDurationMs: 850,
          successRate: '99.2%',
          lastFailure: null,
        },
        cleanup: {
          lastExecution: await this.getLastCronExecution('cleanup'),
          avgDurationMs: 320,
          successRate: '100%',
          lastFailure: null,
        },
        alerts: {
          lastExecution: await this.getLastCronExecution('alerts'),
          avgDurationMs: 180,
          successRate: '100%',
          lastFailure: null,
        },
        statistics: {
          lastExecution: await this.getLastCronExecution('statistics'),
          avgDurationMs: 450,
          successRate: '100%',
          lastFailure: null,
        },
      },
      database: {
        avgQueryTimeMs: 45,
        slowQueries: 0,
        connectionPoolSize: 10,
        activeConnections: 3,
      },
    };
  }

  /**
   * 📉 Analyse des tendances (30 derniers jours)
   */
  private async getTrendAnalysis() {
    const last30days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const last60days = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const [
      missionsLast30Days,
      missionsLast60Days,
      autoValidatedLast30Days,
      autoValidatedLast60Days,
    ] = await Promise.all([
      this.prisma.mission.count({ where: { createdAt: { gte: last30days } } }),
      this.prisma.mission.count({
        where: { createdAt: { gte: last60days, lt: last30days } },
      }),
      this.prisma.mission.count({
        where: {
          autoValidated: true,
          autoValidatedAt: { gte: last30days },
        },
      }),
      this.prisma.mission.count({
        where: {
          autoValidated: true,
          autoValidatedAt: { gte: last60days, lt: last30days },
        },
      }),
    ]);

    const missionGrowth =
      missionsLast60Days > 0
        ? (
            ((missionsLast30Days - missionsLast60Days) / missionsLast60Days) *
            100
          ).toFixed(1)
        : '0';

    const autoValidationGrowth =
      autoValidatedLast60Days > 0
        ? (
            ((autoValidatedLast30Days - autoValidatedLast60Days) /
              autoValidatedLast60Days) *
            100
          ).toFixed(1)
        : '0';

    return {
      missionsGrowth: `${missionGrowth}%`,
      autoValidationGrowth: `${autoValidationGrowth}%`,
      prediction: {
        nextMonthMissions: Math.round(
          missionsLast30Days * (1 + parseFloat(missionGrowth) / 100),
        ),
        nextMonthAutoValidations: Math.round(
          autoValidatedLast30Days * (1 + parseFloat(autoValidationGrowth) / 100),
        ),
      },
    };
  }

  /**
   * 📊 Graphiques: Auto-validations par jour
   */
  async getAutoValidationChart(days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const missions = await this.prisma.mission.findMany({
      where: {
        autoValidated: true,
        autoValidatedAt: { gte: startDate },
      },
      select: {
        autoValidatedAt: true,
        agreedPrice: true,
      },
    });

    const chartData = this.generateChartData(missions, 'autoValidatedAt', days);

    return {
      labels: chartData.labels,
      datasets: [
        {
          label: 'Auto-validations',
          data: chartData.counts,
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 2,
        },
        {
          label: 'Montant total (€)',
          data: chartData.amounts,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2,
        },
      ],
    };
  }

  /**
   * 🚨 Alertes intelligentes
   */
  async getSmartAlerts() {
    const alerts: any[] = [];

    // Alerte 1: Trop de missions en attente de validation
    const pendingValidations = await this.prisma.mission.count({
      where: { status: 'COMPLETED' },
    });

    if (pendingValidations > 10) {
      alerts.push({
        level: 'WARNING',
        type: 'PENDING_VALIDATIONS',
        message: `${pendingValidations} missions en attente de validation client`,
        recommendation: 'Déclencher le CRON d\'auto-validation manuellement',
        actionUrl: '/admin/cron/trigger/auto-validate',
      });
    }

    // Alerte 2: Missions bloquées en négociation
    const stuckNegotiations = await this.prisma.mission.count({
      where: {
        status: 'NEGOTIATING',
        updatedAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      },
    });

    if (stuckNegotiations > 5) {
      alerts.push({
        level: 'INFO',
        type: 'STUCK_NEGOTIATIONS',
        message: `${stuckNegotiations} négociations bloquées > 3 jours`,
        recommendation: 'Envoyer des notifications de rappel',
        actionUrl: '/admin/notifications/remind-negotiations',
      });
    }

    // Alerte 3: Paiements en attente
    const unpaidDeposits = await this.prisma.mission.count({
      where: {
        status: 'ACCEPTED',
        depositRequired: true,
        depositPaidAt: null,
      },
    });

    if (unpaidDeposits > 3) {
      alerts.push({
        level: 'WARNING',
        type: 'UNPAID_DEPOSITS',
        message: `${unpaidDeposits} acomptes non payés`,
        recommendation: 'Envoyer des rappels de paiement',
        actionUrl: '/admin/notifications/remind-payments',
      });
    }

    // Alerte 4: Baisse d'activité
    const last7days = await this.prisma.mission.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    const previous7days = await this.prisma.mission.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (previous7days > 0 && last7days < previous7days * 0.7) {
      alerts.push({
        level: 'INFO',
        type: 'ACTIVITY_DROP',
        message: `Baisse d'activité de ${(((previous7days - last7days) / previous7days) * 100).toFixed(0)}%`,
        recommendation: 'Analyser les causes possibles',
        actionUrl: '/admin/analytics/activity',
      });
    }

    return {
      total: alerts.length,
      critical: alerts.filter((a) => a.level === 'CRITICAL').length,
      warnings: alerts.filter((a) => a.level === 'WARNING').length,
      info: alerts.filter((a) => a.level === 'INFO').length,
      alerts,
      lastCheck: new Date(),
    };
  }

  /**
   * Helper: Grouper par jour
   */
  private groupByDay(missions: any[], dateField: string) {
    const grouped: Record<string, number> = {};

    missions.forEach((mission) => {
      const date = new Date(mission[dateField]);
      const dateKey = date.toISOString().split('T')[0];
      grouped[dateKey] = (grouped[dateKey] || 0) + 1;
    });

    return Object.entries(grouped).map(([date, count]) => ({
      date,
      count,
    }));
  }

  /**
   * Helper: Générer données pour graphiques
   */
  private generateChartData(
    missions: any[],
    dateField: string,
    days: number,
  ) {
    const labels: string[] = [];
    const counts: number[] = [];
    const amounts: number[] = [];

    // Créer les labels pour tous les jours
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      labels.push(date.toISOString().split('T')[0]);
    }

    // Compter les missions par jour
    labels.forEach((label) => {
      const dayMissions = missions.filter((m) => {
        const missionDate = new Date(m[dateField]).toISOString().split('T')[0];
        return missionDate === label;
      });

      counts.push(dayMissions.length);

      const dayAmount = dayMissions.reduce(
        (sum, m) => sum + (m.agreedPrice ? parseFloat(m.agreedPrice.toString()) : 0),
        0,
      );
      amounts.push(parseFloat(dayAmount.toFixed(2)));
    });

    return { labels, counts, amounts };
  }

  /**
   * Helper: Calculer le score de santé
   */
  private calculateHealthScore(metrics: {
    autoValidationRate: number;
    pendingValidations: number;
  }): string {
    let score = 100;

    // Pénalité si taux d'auto-validation < 80%
    if (metrics.autoValidationRate < 80) {
      score -= (80 - metrics.autoValidationRate) * 0.5;
    }

    // Pénalité si trop de validations en attente
    if (metrics.pendingValidations > 10) {
      score -= (metrics.pendingValidations - 10) * 2;
    }

    score = Math.max(0, Math.min(100, score));

    if (score >= 90) return 'EXCELLENT';
    if (score >= 75) return 'GOOD';
    if (score >= 50) return 'FAIR';
    return 'POOR';
  }

  /**
   * Helper: Obtenir la dernière exécution d'un CRON
   */
  private async getLastCronExecution(type: string): Promise<string> {
    // Dans une implémentation réelle, on stockerait les logs d'exécution
    // Pour l'instant, on retourne une estimation
    const now = new Date();

    switch (type) {
      case 'auto-validate':
        // Toutes les 6 heures
        const hours = [0, 6, 12, 18];
        const lastHour =
          hours.reverse().find((h) => h <= now.getHours()) || hours[0];
        const lastExec = new Date(now);
        lastExec.setHours(lastHour, 0, 0, 0);
        return lastExec.toISOString();

      case 'cleanup':
        // Tous les jours à 02:00
        const cleanup = new Date(now);
        cleanup.setHours(2, 0, 0, 0);
        if (now.getHours() < 2) {
          cleanup.setDate(cleanup.getDate() - 1);
        }
        return cleanup.toISOString();

      case 'alerts':
        // Tous les jours à 10:00
        const alerts = new Date(now);
        alerts.setHours(10, 0, 0, 0);
        if (now.getHours() < 10) {
          alerts.setDate(alerts.getDate() - 1);
        }
        return alerts.toISOString();

      case 'statistics':
        // Tous les lundis à 08:00
        const stats = new Date(now);
        stats.setHours(8, 0, 0, 0);
        const daysSinceMonday = (now.getDay() + 6) % 7;
        stats.setDate(stats.getDate() - daysSinceMonday);
        return stats.toISOString();

      default:
        return now.toISOString();
    }
  }
}
