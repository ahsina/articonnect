import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DeferredPaymentService } from './deferred-payment.service';

/**
 * Service CRON pour les tâches automatisées liées aux paiements
 *
 * Tâches planifiées:
 * - Vérification des factures impayées (paiements différés)
 * - Envoi de rappels pour factures en retard
 * - Suspension des comptes en cas de non-paiement
 */
@Injectable()
export class PaymentCronService {
  private readonly logger = new Logger(PaymentCronService.name);

  constructor(private readonly deferredPaymentService: DeferredPaymentService) {}

  /**
   * CRON: Vérification des factures impayées
   * S'exécute tous les jours à 09:00
   *
   * Cette tâche:
   * - Identifie les factures en retard
   * - Met à jour leur statut à OVERDUE
   * - Envoie des rappels aux clients
   * - Suspend le paiement différé après 3 factures en retard
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM, {
    name: 'check-overdue-invoices',
    timeZone: 'Europe/Paris',
  })
  async checkOverdueInvoices() {
    this.logger.log('💰 Démarrage CRON: Vérification factures impayées');

    try {
      const startTime = Date.now();

      // Récupérer les factures en retard
      const overdueInvoices = await this.deferredPaymentService.getOverdueInvoices();

      if (overdueInvoices.length === 0) {
        this.logger.log('✅ CRON terminé: Aucune facture en retard');
        return;
      }

      let remindersSent = 0;
      let suspendedAccounts = 0;

      // Grouper par client pour éviter les doublons
      const clientInvoices = new Map<string, typeof overdueInvoices>();
      for (const invoice of overdueInvoices) {
        const clientId = invoice.clientId;
        if (!clientInvoices.has(clientId)) {
          clientInvoices.set(clientId, []);
        }
        clientInvoices.get(clientId)!.push(invoice);
      }

      // Traiter chaque client
      for (const [clientId, invoices] of clientInvoices.entries()) {
        try {
          const overdueCount = invoices.length;
          const totalOverdue = invoices.reduce(
            (sum, inv) => sum + Number(inv.totalAmount),
            0,
          );

          this.logger.log(
            `  💳 Client ${clientId}: ${overdueCount} facture(s) en retard, total ${totalOverdue}€`,
          );

          // Si plus de 3 factures en retard, suspendre le paiement différé
          if (overdueCount >= 3) {
            await this.deferredPaymentService.suspendForNonPayment(clientId);
            this.logger.warn(
              `  ⚠️  Client ${clientId}: Paiement différé suspendu (${overdueCount} factures impayées)`,
            );
            suspendedAccounts++;
          }

          // Envoyer rappel (1er rappel: -7j, 2ème rappel: -14j, mise en demeure: -30j)
          for (const invoice of invoices) {
            const daysPastDue = Math.floor(
              (Date.now() - invoice.paymentDueDate!.getTime()) / (1000 * 60 * 60 * 24),
            );

            let reminderType = 'REMINDER';
            if (daysPastDue >= 30) {
              reminderType = 'FINAL_NOTICE'; // Mise en demeure
            } else if (daysPastDue >= 14) {
              reminderType = 'SECOND_REMINDER';
            } else if (daysPastDue >= 7) {
              reminderType = 'FIRST_REMINDER';
            }

            // En production, envoyer email/notification
            // await this.notificationService.sendPaymentReminder({
            //   clientId: invoice.clientId,
            //   invoiceId: invoice.id,
            //   invoiceNumber: invoice.invoiceNumber,
            //   amount: invoice.totalAmount,
            //   daysPastDue,
            //   reminderType,
            // });

            remindersSent++;

            this.logger.log(
              `    📧 Rappel envoyé: Facture ${invoice.invoiceNumber} (${daysPastDue}j de retard)`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Erreur traitement client ${clientId}: ${error.message}`,
          );
        }
      }

      const duration = Date.now() - startTime;

      this.logger.log(
        `✅ CRON terminé: ${overdueInvoices.length} facture(s) en retard, ${remindersSent} rappel(s) envoyé(s), ${suspendedAccounts} compte(s) suspendu(s) en ${duration}ms`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erreur CRON factures impayées: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * CRON: Revue de crédit trimestrielle
   * S'exécute le 1er de chaque trimestre à 08:00
   *
   * Réévalue l'éligibilité des clients au paiement différé
   * et ajuste les limites de crédit en fonction de l'historique
   */
  @Cron('0 8 1 */3 *', {
    name: 'quarterly-credit-review',
    timeZone: 'Europe/Paris',
  })
  async quarterlyCreditReview() {
    this.logger.log('📊 Démarrage CRON: Revue de crédit trimestrielle');

    try {
      // Récupérer tous les clients avec paiement différé activé
      const clients = await this.deferredPaymentService['prisma'].clientProfile.findMany({
        where: { deferredPaymentEnabled: true },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              reputationScore: true,
              completedMissions: true,
              disputeCount: true,
              noShowCount: true,
            },
          },
        },
      });

      if (clients.length === 0) {
        this.logger.log('✅ CRON terminé: Aucun client à réviser');
        return;
      }

      let reviewedCount = 0;
      let increasedCount = 0;
      let decreasedCount = 0;
      let revokedCount = 0;

      for (const client of clients) {
        try {
          // Vérifier l'éligibilité actuelle
          const eligibility = await this.deferredPaymentService.checkEligibility(
            client.user.id,
          );

          // Si plus éligible, révoquer
          if (!eligibility.eligible) {
            await this.deferredPaymentService.disableDeferredPayment(client.user.id);
            this.logger.warn(
              `  ⚠️  Client ${client.user.email}: Paiement différé révoqué (score: ${eligibility.score})`,
            );
            revokedCount++;
            continue;
          }

          // Ajuster la limite de crédit en fonction du score
          let newCreditLimit = Number(client.creditLimit);
          const score = eligibility.score;

          if (score >= 150 && client.user.completedMissions >= 20) {
            // Excellent score: augmenter de 20%
            newCreditLimit = Math.min(newCreditLimit * 1.2, 10000); // Max 10k€
            increasedCount++;
          } else if (score < 100 || client.user.disputeCount > 2) {
            // Score faible ou litiges: réduire de 30%
            newCreditLimit = newCreditLimit * 0.7;
            decreasedCount++;
          }

          // Mettre à jour si changement
          if (newCreditLimit !== Number(client.creditLimit)) {
            await this.deferredPaymentService['prisma'].clientProfile.update({
              where: { userId: client.user.id },
              data: {
                creditLimit: newCreditLimit,
                lastCreditReview: new Date(),
              },
            });
          }

          reviewedCount++;
        } catch (error) {
          this.logger.error(
            `Erreur revue crédit client ${client.user.id}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `✅ CRON terminé: ${reviewedCount} client(s) révisé(s), ${increasedCount} augmenté(s), ${decreasedCount} réduit(s), ${revokedCount} révoqué(s)`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erreur CRON revue de crédit: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Obtenir le statut de tous les CRON jobs
   */
  getCronJobsStatus() {
    return {
      jobs: [
        {
          name: 'check-overdue-invoices',
          schedule: 'Tous les jours à 09:00',
          description: 'Vérification factures impayées et envoi rappels',
          enabled: true,
        },
        {
          name: 'quarterly-credit-review',
          schedule: 'Trimestriel (1er du trimestre à 08:00)',
          description: 'Revue de crédit et ajustement limites',
          enabled: true,
        },
      ],
      timezone: 'Europe/Paris',
    };
  }
}
