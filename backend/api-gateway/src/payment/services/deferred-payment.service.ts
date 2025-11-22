import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InvoiceStatus } from '@prisma/client';

/**
 * Service for managing deferred payments for professional clients
 *
 * Deferred payment allows trusted business clients to:
 * - Pay after service completion (Net-30, Net-60 terms)
 * - Build credit history with the platform
 * - Receive consolidated monthly invoices
 *
 * Eligibility criteria:
 * - Business registration (SIRET/company)
 * - Minimum reputation score (150+)
 * - Payment history (10+ completed missions)
 * - No disputes in last 6 months
 * - Manual admin approval required
 */
@Injectable()
export class DeferredPaymentService {
  constructor(private prisma: PrismaService) {}

  /**
   * Enable deferred payment for a professional client
   * Admin only - requires manual credit check
   */
  async enableDeferredPayment(params: {
    clientId: string;
    creditLimit: number;
    paymentTermDays: number; // 30, 60, or 90
    notes?: string;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: params.clientId },
      include: { clientProfile: true },
    });

    if (!user || user.role !== 'CLIENT') {
      throw new BadRequestException('Client introuvable');
    }

    // Verify eligibility criteria
    const isEligible = await this.checkEligibility(params.clientId);
    if (!isEligible.eligible) {
      throw new BadRequestException(
        `Client non éligible: ${isEligible.reasons.join(', ')}`,
      );
    }

    // Update client profile
    await this.prisma.clientProfile.update({
      where: { userId: params.clientId },
      data: {
        deferredPaymentEnabled: true,
        creditLimit: params.creditLimit,
        paymentTermDays: params.paymentTermDays,
        currentOutstanding: 0,
        lastCreditReview: new Date(),
        deferredPaymentNotes: params.notes,
      },
    });

    return {
      message: 'Paiement différé activé avec succès',
      creditLimit: params.creditLimit,
      paymentTermDays: params.paymentTermDays,
    };
  }

  /**
   * Disable deferred payment for a client
   * All outstanding invoices must be paid first
   */
  async disableDeferredPayment(clientId: string) {
    const profile = await this.prisma.clientProfile.findUnique({
      where: { userId: clientId },
    });

    if (!profile?.deferredPaymentEnabled) {
      throw new BadRequestException('Paiement différé non activé');
    }

    // Check for outstanding balance
    if (Number(profile.currentOutstanding) > 0) {
      throw new BadRequestException(
        `Impossible de désactiver: ${profile.currentOutstanding}€ en attente de paiement`,
      );
    }

    await this.prisma.clientProfile.update({
      where: { userId: clientId },
      data: {
        deferredPaymentEnabled: false,
        creditLimit: 0,
      },
    });

    return { message: 'Paiement différé désactivé' };
  }

  /**
   * Check if client is eligible for deferred payment
   */
  async checkEligibility(clientId: string): Promise<{
    eligible: boolean;
    reasons: string[];
    score: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: clientId },
      include: {
        clientProfile: true,
        clientMissions: {
          where: {
            status: { in: ['COMPLETED', 'AUTO_VALIDATED'] },
          },
        },
        disputesCreated: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000), // Last 6 months
            },
          },
        },
      },
    });

    if (!user) {
      return { eligible: false, reasons: ['Utilisateur introuvable'], score: 0 };
    }

    const reasons: string[] = [];
    let score = 100;

    // Criterion 1: Reputation score (150+ required)
    if (user.reputationScore < 150) {
      reasons.push('Score de réputation insuffisant (min. 150)');
      score -= 30;
    } else {
      score += 10;
    }

    // Criterion 2: Completed missions (10+ required)
    const completedCount = user.clientMissions.length;
    if (completedCount < 10) {
      reasons.push('Historique insuffisant (min. 10 missions)');
      score -= 25;
    } else {
      score += completedCount * 2; // Bonus for experience
    }

    // Criterion 3: No recent disputes
    if (user.disputesCreated.length > 0) {
      reasons.push('Litiges récents (6 derniers mois)');
      score -= 20;
    } else {
      score += 15;
    }

    // Criterion 4: No-show rate (<5%)
    if (user.noShowCount > 0) {
      const noShowRate = (user.noShowCount / Math.max(user.completedMissions, 1)) * 100;
      if (noShowRate > 5) {
        reasons.push('Taux de no-show trop élevé');
        score -= 15;
      }
    }

    // Criterion 5: Dispute rate (<3%)
    if (Number(user.disputeRate) > 3) {
      reasons.push('Taux de litiges trop élevé');
      score -= 15;
    }

    const eligible = reasons.length === 0 && score >= 100;

    return { eligible, reasons, score };
  }

  /**
   * Check if client can make a deferred payment for this amount
   * Verifies credit limit and outstanding balance
   */
  async canDeferPayment(clientId: string, amount: number): Promise<boolean> {
    const profile = await this.prisma.clientProfile.findUnique({
      where: { userId: clientId },
    });

    if (!profile?.deferredPaymentEnabled) {
      return false;
    }

    const availableCredit =
      Number(profile.creditLimit) - Number(profile.currentOutstanding);

    return availableCredit >= amount;
  }

  /**
   * Create deferred payment (no immediate charge)
   * Creates invoice with payment due date based on terms
   */
  async createDeferredPayment(params: {
    missionId: string;
    clientId: string;
    amount: number;
  }) {
    const profile = await this.prisma.clientProfile.findUnique({
      where: { userId: params.clientId },
    });

    if (!profile?.deferredPaymentEnabled) {
      throw new ForbiddenException('Paiement différé non activé');
    }

    // Check credit limit
    const canDefer = await this.canDeferPayment(params.clientId, params.amount);
    if (!canDefer) {
      throw new BadRequestException(
        'Limite de crédit dépassée. Veuillez payer les factures en attente.',
      );
    }

    // Calculate payment due date based on terms
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + profile.paymentTermDays);

    // Update outstanding balance
    await this.prisma.clientProfile.update({
      where: { userId: params.clientId },
      data: {
        currentOutstanding: {
          increment: params.amount,
        },
      },
    });

    // Invoice will be created by the invoice service
    // This just tracks the deferred payment

    return {
      success: true,
      dueDate,
      paymentTermDays: profile.paymentTermDays,
      message: `Paiement différé accepté. Échéance: ${dueDate.toLocaleDateString('fr-FR')}`,
    };
  }

  /**
   * Mark deferred payment as paid
   * Updates outstanding balance when invoice is paid
   */
  async markPaid(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: {
          include: { clientProfile: true },
        },
      },
    });

    if (!invoice) {
      throw new BadRequestException('Facture introuvable');
    }

    if (invoice.status === 'PAID') {
      return { message: 'Facture déjà payée' };
    }

    // Update invoice status
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    // Decrease outstanding balance
    if (invoice.client.clientProfile?.deferredPaymentEnabled) {
      await this.prisma.clientProfile.update({
        where: { userId: invoice.clientId },
        data: {
          currentOutstanding: {
            decrement: Number(invoice.totalAmount),
          },
        },
      });
    }

    return { message: 'Paiement enregistré' };
  }

  /**
   * Get overdue invoices for CRON job to send reminders
   */
  async getOverdueInvoices() {
    const now = new Date();

    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        status: 'ISSUED',
        paymentDueDate: {
          lt: now,
        },
      },
      include: {
        client: {
          include: { clientProfile: true },
        },
        issuer: true,
      },
    });

    // Update status to OVERDUE
    for (const invoice of overdueInvoices) {
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'OVERDUE' },
      });
    }

    return overdueInvoices;
  }

  /**
   * Get deferred payment status for a client
   */
  async getStatus(clientId: string) {
    const profile = await this.prisma.clientProfile.findUnique({
      where: { userId: clientId },
    });

    if (!profile?.deferredPaymentEnabled) {
      return {
        enabled: false,
        message: 'Paiement différé non activé',
      };
    }

    const availableCredit =
      Number(profile.creditLimit) - Number(profile.currentOutstanding);

    const overdueInvoices = await this.prisma.invoice.count({
      where: {
        clientId,
        status: { in: ['OVERDUE', 'ISSUED'] },
        paymentDueDate: {
          lt: new Date(),
        },
      },
    });

    return {
      enabled: true,
      creditLimit: Number(profile.creditLimit),
      currentOutstanding: Number(profile.currentOutstanding),
      availableCredit,
      paymentTermDays: profile.paymentTermDays,
      overdueInvoicesCount: overdueInvoices,
      lastCreditReview: profile.lastCreditReview,
    };
  }

  /**
   * Suspend deferred payment if client has overdue invoices
   */
  async suspendForNonPayment(clientId: string) {
    await this.prisma.clientProfile.update({
      where: { userId: clientId },
      data: {
        deferredPaymentEnabled: false,
        deferredPaymentNotes: 'Suspendu pour factures impayées',
      },
    });

    return { message: 'Paiement différé suspendu' };
  }
}
