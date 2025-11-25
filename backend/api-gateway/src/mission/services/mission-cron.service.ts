import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MissionService } from './mission.service';

/**
 * Service CRON pour les tâches automatisées liées aux missions
 *
 * Tâches planifiées:
 * - Auto-validation des missions bloquées après 7 jours
 * - Nettoyage des missions expirées
 * - Alertes pour missions en attente
 * - Élargissement automatique du rayon de recherche
 */
@Injectable()
export class MissionCronService {
  private readonly logger = new Logger(MissionCronService.name);

  constructor(private readonly missionService: MissionService) {}

  /**
   * CRON: Auto-validation des missions bloquées > 7 jours
   * S'exécute toutes les 6 heures (à 00:00, 06:00, 12:00, 18:00)
   *
   * Cette tâche valide automatiquement les missions qui sont:
   * - En statut COMPLETED (travail terminé par l'artisan)
   * - Depuis plus de 7 jours
   * - Pas encore validées par le client
   *
   * Cela déclenche:
   * - Validation automatique de la mission
   * - Paiement de l'artisan
   * - Notification au client
   * - Mise à jour de la réputation
   */
  @Cron(CronExpression.EVERY_6_HOURS, {
    name: 'auto-validate-stuck-missions',
    timeZone: 'Europe/Paris',
  })
  async autoValidateStuckMissions() {
    this.logger.log('🔄 Démarrage CRON: Auto-validation missions bloquées');

    try {
      const startTime = Date.now();

      // Appeler la méthode d'auto-validation du service
      const result = await this.missionService.autoValidateStuckMissions();

      const duration = Date.now() - startTime;

      if (result.processed === 0) {
        this.logger.log('✅ CRON terminé: Aucune mission à auto-valider');
      } else {
        const successCount = result.results.filter(
          (r) => r.status === 'success',
        ).length;
        const errorCount = result.results.filter((r) => r.status === 'error')
          .length;

        this.logger.log(
          `✅ CRON terminé: ${successCount}/${result.processed} mission(s) auto-validée(s) en ${duration}ms`,
        );

        // Log des erreurs si présentes
        if (errorCount > 0) {
          this.logger.warn(`⚠️  ${errorCount} erreur(s) lors de l'auto-validation`);
          result.results
            .filter((r) => r.status === 'error')
            .forEach((r) => {
              this.logger.error(
                `  - Mission ${r.missionId}: ${r.message}`,
              );
            });
        }

        // Log détaillé des missions validées avec succès
        result.results
          .filter((r) => r.status === 'success')
          .forEach((r) => {
            this.logger.log(`  - Mission ${r.missionId}: ${r.message}`);
          });
      }
    } catch (error) {
      this.logger.error(
        `❌ Erreur CRON auto-validation: ${error.message}`,
        error.stack,
      );

      // Ne pas propager l'erreur pour éviter de bloquer les prochaines exécutions
      // En production, on enverrait une alerte (Sentry, PagerDuty, etc.)
    }
  }

  /**
   * CRON: Nettoyage missions expirées (PENDING > 30 jours)
   * S'exécute tous les jours à 02:00
   *
   * Annule automatiquement les missions en PENDING depuis plus de 30 jours
   * pour éviter l'accumulation de missions obsolètes
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    name: 'cleanup-expired-missions',
    timeZone: 'Europe/Paris',
  })
  async cleanupExpiredMissions() {
    this.logger.log('🧹 Démarrage CRON: Nettoyage missions expirées');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const expiredMissions = await this.missionService['prisma'].mission.findMany({
        where: {
          status: 'PENDING',
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
        select: {
          id: true,
          title: true,
          clientId: true,
        },
      });

      if (expiredMissions.length === 0) {
        this.logger.log('✅ CRON terminé: Aucune mission expirée à nettoyer');
        return;
      }

      const missionIds = expiredMissions.map((m) => m.id);
      const now = new Date();

      // Batch update all expired missions (N+1 fix)
      const updateResult = await this.missionService['prisma'].mission.updateMany({
        where: { id: { in: missionIds } },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
        },
      });

      // Batch create history records (N+1 fix)
      await this.missionService['prisma'].missionHistory.createMany({
        data: missionIds.map((missionId) => ({
          missionId,
          status: 'CANCELLED',
          changedById: null, // System-level change
          changedByRole: 'SYSTEM',
          note: 'Mission expirée automatiquement (> 30 jours sans action)',
        })),
        skipDuplicates: true,
      });

      this.logger.log(
        `✅ CRON terminé: ${updateResult.count}/${expiredMissions.length} mission(s) expirée(s) annulée(s)`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erreur CRON nettoyage missions: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * CRON: Alertes missions en attente de réponse
   * S'exécute tous les jours à 10:00
   *
   * Envoie des notifications de rappel pour:
   * - Missions NEGOTIATING depuis > 48h
   * - Missions ACCEPTED non payées depuis > 24h
   */
  @Cron(CronExpression.EVERY_DAY_AT_10AM, {
    name: 'alert-pending-actions',
    timeZone: 'Europe/Paris',
  })
  async alertPendingActions() {
    this.logger.log('🔔 Démarrage CRON: Alertes missions en attente');

    try {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      // 1. Missions en négociation > 48h
      const negotiatingMissions = await this.missionService['prisma'].mission.count({
        where: {
          status: 'NEGOTIATING',
          updatedAt: {
            lt: twoDaysAgo,
          },
        },
      });

      // 2. Missions acceptées non payées > 24h
      const unpaidMissions = await this.missionService['prisma'].mission.count({
        where: {
          status: 'ACCEPTED',
          depositRequired: true,
          depositPaidAt: null,
          acceptedAt: {
            lt: oneDayAgo,
          },
        },
      });

      this.logger.log(
        `✅ CRON terminé: ${negotiatingMissions} mission(s) en négociation > 48h, ${unpaidMissions} mission(s) non payées > 24h`,
      );

      // En production, envoyer des notifications ici
      // - NotificationService.sendNegotiationReminder()
      // - NotificationService.sendPaymentReminder()
    } catch (error) {
      this.logger.error(
        `❌ Erreur CRON alertes: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * CRON: Élargissement automatique du rayon de recherche
   * S'exécute toutes les 10 minutes
   *
   * Pour les missions PENDING sans réponse d'artisan:
   * - Missions EMERGENCY: élargissement après 15 minutes
   * - Missions SCHEDULED/QUOTE: élargissement après 30 minutes
   *
   * Élargissement progressif: +5km à chaque étape jusqu'à max 100km
   */
  @Cron('*/10 * * * *', {
    name: 'expand-mission-radius',
    timeZone: 'Europe/Paris',
  })
  async expandMissionSearchRadius() {
    this.logger.log('📍 Démarrage CRON: Élargissement rayon de recherche');

    try {
      const startTime = Date.now();
      const now = new Date();

      // Find missions that need radius expansion
      const missions = await this.missionService['prisma'].mission.findMany({
        where: {
          status: 'PENDING',
          artisanId: null,
          maxRadiusReached: false,
        },
        include: {
          client: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (missions.length === 0) {
        this.logger.log('✅ CRON terminé: Aucune mission à élargir');
        return;
      }

      let expandedCount = 0;
      let maxReachedCount = 0;

      for (const mission of missions) {
        try {
          // Determine timeout based on mission type
          const timeoutMinutes = mission.type === 'EMERGENCY' ? 15 : 30;
          const timeoutMs = timeoutMinutes * 60 * 1000;

          // Check if last expansion was long enough ago
          const lastExpansion = mission.lastRadiusExpansion || mission.createdAt;
          const timeSinceLastExpansion = now.getTime() - lastExpansion.getTime();

          if (timeSinceLastExpansion < timeoutMs) {
            // Not enough time passed yet
            continue;
          }

          // Check if we've reached max radius (100km)
          const MAX_RADIUS = 100;
          const RADIUS_INCREMENT = 5;

          if (mission.currentSearchRadius >= MAX_RADIUS) {
            // Mark as max radius reached
            await this.missionService['prisma'].mission.update({
              where: { id: mission.id },
              data: { maxRadiusReached: true },
            });

            await this.missionService['prisma'].missionHistory.create({
              data: {
                missionId: mission.id,
                status: mission.status,
                changedBy: 'SYSTEM',
                changedByRole: 'SYSTEM',
                note: `Rayon maximum atteint (${MAX_RADIUS}km) - Aucun artisan disponible`,
              },
            });

            this.logger.warn(
              `⚠️  Mission ${mission.id}: rayon maximum atteint (${MAX_RADIUS}km)`,
            );
            maxReachedCount++;
            continue;
          }

          // Expand radius
          const newRadius = Math.min(
            mission.currentSearchRadius + RADIUS_INCREMENT,
            MAX_RADIUS,
          );

          // Find new artisans within expanded radius
          const artisans = await this.missionService['prisma'].user.findMany({
            where: {
              role: 'ARTISAN',
              status: 'ACTIVE',
              artisanProfile: {
                available: true,
                specialties: {
                  some: {
                    category: mission.category,
                  },
                },
              },
            },
            include: {
              artisanProfile: {
                select: {
                  latitude: true,
                  longitude: true,
                  serviceRadius: true,
                },
              },
            },
          });

          // Filter artisans by new radius (but exclude those already in old radius)
          const newArtisans = artisans.filter((artisan) => {
            if (!artisan.artisanProfile) return false;

            const distance = this.calculateDistance(
              mission.latitude,
              mission.longitude,
              artisan.artisanProfile.latitude,
              artisan.artisanProfile.longitude,
            );

            // Only notify artisans in the new expanded area
            return (
              distance > mission.currentSearchRadius &&
              distance <= newRadius &&
              distance <= (artisan.artisanProfile.serviceRadius || 20)
            );
          });

          // Update mission radius
          await this.missionService['prisma'].mission.update({
            where: { id: mission.id },
            data: {
              currentSearchRadius: newRadius,
              lastRadiusExpansion: now,
              notificationsSent: mission.notificationsSent + newArtisans.length,
            },
          });

          // Send notifications to newly eligible artisans
          for (const artisan of newArtisans) {
            await this.missionService['prisma'].notification.create({
              data: {
                userId: artisan.id,
                type: 'NEW_MISSION',
                title: 'Nouvelle mission disponible',
                message: `Une nouvelle mission "${mission.title}" correspond à vos compétences (rayon élargi à ${newRadius}km)`,
                link: `/artisan/missions/${mission.id}`,
                metadata: { missionId: mission.id, expandedRadius: newRadius },
              },
            });
          }

          // Log history
          await this.missionService['prisma'].missionHistory.create({
            data: {
              missionId: mission.id,
              status: mission.status,
              changedBy: 'SYSTEM',
              changedByRole: 'SYSTEM',
              note: `Rayon élargi de ${mission.currentSearchRadius}km à ${newRadius}km - ${newArtisans.length} nouveaux artisans notifiés`,
            },
          });

          this.logger.log(
            `  📍 Mission ${mission.id} (${mission.type}): ${mission.currentSearchRadius}km → ${newRadius}km (${newArtisans.length} nouveaux artisans)`,
          );

          expandedCount++;
        } catch (error) {
          this.logger.error(
            `Erreur élargissement mission ${mission.id}: ${error.message}`,
          );
        }
      }

      const duration = Date.now() - startTime;

      if (expandedCount === 0 && maxReachedCount === 0) {
        this.logger.log('✅ CRON terminé: Aucune mission prête pour élargissement');
      } else {
        this.logger.log(
          `✅ CRON terminé: ${expandedCount} mission(s) élargie(s), ${maxReachedCount} rayon max atteint en ${duration}ms`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Erreur CRON élargissement rayon: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * CRON: Statistiques hebdomadaires
   * S'exécute tous les lundis à 08:00
   *
   * Génère et log des statistiques sur:
   * - Missions complétées la semaine précédente
   * - Taux de validation automatique
   * - No-shows et disputes
   */
  @Cron(CronExpression.EVERY_WEEK, {
    name: 'weekly-statistics',
    timeZone: 'Europe/Paris',
  })
  async generateWeeklyStatistics() {
    this.logger.log('📊 Démarrage CRON: Statistiques hebdomadaires');

    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const stats = await this.missionService['prisma'].mission.groupBy({
        by: ['status'],
        where: {
          updatedAt: {
            gte: oneWeekAgo,
          },
        },
        _count: true,
      });

      this.logger.log('📈 Statistiques des 7 derniers jours:');
      stats.forEach((stat) => {
        this.logger.log(`  - ${stat.status}: ${stat._count} missions`);
      });

      // Auto-validations
      const autoValidatedCount = await this.missionService['prisma'].mission.count({
        where: {
          autoValidated: true,
          autoValidatedAt: {
            gte: oneWeekAgo,
          },
        },
      });

      this.logger.log(`  - Auto-validations: ${autoValidatedCount} missions`);

      this.logger.log('✅ CRON terminé: Statistiques générées');
    } catch (error) {
      this.logger.error(
        `❌ Erreur CRON statistiques: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Méthode manuelle pour tester le CRON (accessible via endpoint admin)
   */
  async triggerAutoValidationManually() {
    this.logger.log('🔧 Déclenchement manuel de l\'auto-validation');
    return this.autoValidateStuckMissions();
  }

  /**
   * Obtenir le statut de tous les CRON jobs
   */
  getCronJobsStatus() {
    return {
      jobs: [
        {
          name: 'auto-validate-stuck-missions',
          schedule: 'Toutes les 6 heures (00:00, 06:00, 12:00, 18:00)',
          description: 'Auto-validation missions bloquées > 7 jours',
          enabled: true,
        },
        {
          name: 'expand-mission-radius',
          schedule: 'Toutes les 10 minutes',
          description: 'Élargissement automatique du rayon de recherche (+5km jusqu\'à 100km)',
          enabled: true,
        },
        {
          name: 'cleanup-expired-missions',
          schedule: 'Tous les jours à 02:00',
          description: 'Nettoyage missions PENDING > 30 jours',
          enabled: true,
        },
        {
          name: 'alert-pending-actions',
          schedule: 'Tous les jours à 10:00',
          description: 'Alertes missions en attente de réponse',
          enabled: true,
        },
        {
          name: 'weekly-statistics',
          schedule: 'Tous les lundis à 08:00',
          description: 'Génération statistiques hebdomadaires',
          enabled: true,
        },
      ],
      timezone: 'Europe/Paris',
      nextExecutions: {
        autoValidate: this.getNextCronExecution('EVERY_6_HOURS'),
        radiusExpansion: this.getNextCronExecution('EVERY_10_MINUTES'),
        cleanup: this.getNextCronExecution('DAILY_2AM'),
        alerts: this.getNextCronExecution('DAILY_10AM'),
        statistics: this.getNextCronExecution('WEEKLY'),
      },
    };
  }

  /**
   * Helper pour calculer la prochaine exécution
   */
  private getNextCronExecution(type: string): string {
    const now = new Date();
    const next = new Date(now);

    switch (type) {
      case 'EVERY_10_MINUTES': {
        const currentMinute = now.getMinutes();
        const nextTenMinute = Math.ceil((currentMinute + 1) / 10) * 10;
        if (nextTenMinute >= 60) {
          next.setHours(next.getHours() + 1);
          next.setMinutes(0, 0, 0);
        } else {
          next.setMinutes(nextTenMinute, 0, 0);
        }
        break;
      }
      case 'EVERY_6_HOURS': {
        const hours = [0, 6, 12, 18];
        const currentHour = now.getHours();
        const nextHour = hours.find((h) => h > currentHour) || hours[0];
        next.setHours(nextHour, 0, 0, 0);
        if (nextHour <= currentHour) {
          next.setDate(next.getDate() + 1);
        }
        break;
      }
      case 'DAILY_2AM':
        next.setHours(2, 0, 0, 0);
        if (now.getHours() >= 2) {
          next.setDate(next.getDate() + 1);
        }
        break;
      case 'DAILY_10AM':
        next.setHours(10, 0, 0, 0);
        if (now.getHours() >= 10) {
          next.setDate(next.getDate() + 1);
        }
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + ((8 - now.getDay()) % 7 || 7));
        next.setHours(8, 0, 0, 0);
        break;
    }

    return next.toISOString();
  }
}
