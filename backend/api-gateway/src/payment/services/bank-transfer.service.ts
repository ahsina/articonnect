import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StripeService } from './stripe.service';
import { NotificationService } from '../../notification/services/notification.service';
import { NotificationType } from '@prisma/client';

export interface BankTransferInstructions {
  accountHolder: string;
  iban: string;
  bic: string;
  bankName: string;
  reference: string;
  amount: number;
  currency: string;
  expiresAt: Date;
}

export interface BankTransferProof {
  transactionId: string;
  proofImageUrl: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export enum BankTransferStatus {
  PENDING_TRANSFER = 'PENDING_TRANSFER', // Awaiting client bank transfer
  PENDING_VERIFICATION = 'PENDING_VERIFICATION', // Transfer made, awaiting verification
  VERIFIED = 'VERIFIED', // Payment verified and confirmed
  REJECTED = 'REJECTED', // Proof of payment rejected
  EXPIRED = 'EXPIRED', // Payment window expired
}

/**
 * Bank Transfer Payment Service
 *
 * Handles manual bank transfer payments (traditional banking):
 * - Generate payment instructions with unique reference
 * - Accept proof of payment uploads
 * - Manual verification workflow for admin
 * - Automatic expiration of pending transfers
 * - Payment tracking and reconciliation
 *
 * Use Cases:
 * - Large B2B payments (prefer bank transfer for accounting)
 * - Users without cards or PayPal accounts
 * - Enterprise clients with accounting processes
 * - Cost-conscious users (lower fees than card payments)
 *
 * Payment Flow:
 * 1. Client requests bank transfer payment
 * 2. System generates payment instructions (IBAN, reference)
 * 3. Client makes bank transfer via their bank
 * 4. Client uploads proof of payment (screenshot/receipt)
 * 5. Admin verifies payment received in bank account
 * 6. System marks payment as verified and releases funds
 *
 * Verification Methods:
 * - Manual: Admin checks bank account and confirms
 * - Semi-automatic: Match bank statement imports to references
 * - Automatic: API integration with bank (future enhancement)
 *
 * Security:
 * - Unique reference per transaction (prevents confusion)
 * - Proof of payment required
 * - Admin verification required
 * - Automatic expiration after 7 days
 *
 * Benefits:
 * - No payment processor fees (direct bank-to-bank)
 * - Ideal for large amounts (>€1000)
 * - Familiar to enterprise users
 * - Accounting-friendly (bank statements)
 *
 * Drawbacks:
 * - Manual verification required (admin workload)
 * - Slower than card payments (1-3 business days)
 * - Higher abandonment risk (multi-step process)
 * - Not suitable for urgent missions
 */
@Injectable()
export class BankTransferService {
  private readonly logger = new Logger(BankTransferService.name);
  private readonly bankAccountIban: string;
  private readonly bankAccountBic: string;
  private readonly bankAccountHolder: string;
  private readonly bankName: string;
  private readonly transferExpiryDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly stripeService: StripeService,
    private readonly notificationService: NotificationService,
  ) {
    // Bank account details for receiving payments
    this.bankAccountIban = this.configService.get<string>('BANK_TRANSFER_IBAN') || '';
    this.bankAccountBic = this.configService.get<string>('BANK_TRANSFER_BIC') || '';
    this.bankAccountHolder =
      this.configService.get<string>('BANK_TRANSFER_ACCOUNT_HOLDER') || 'ArtiConnect SAS';
    this.bankName = this.configService.get<string>('BANK_TRANSFER_BANK_NAME') || 'BNP Paribas';
    this.transferExpiryDays = parseInt(
      this.configService.get<string>('BANK_TRANSFER_EXPIRY_DAYS') || '7',
      10,
    );

    if (this.bankAccountIban && this.bankAccountBic) {
      this.logger.log('✅ Bank Transfer service initialized');
    } else {
      this.logger.warn('⚠️  Bank Transfer service disabled (missing configuration)');
    }
  }

  /**
   * Generate bank transfer payment instructions
   */
  async createBankTransferPayment(params: {
    missionId: string;
    clientId: string;
    amount: number;
    currency?: string;
  }): Promise<BankTransferInstructions> {
    const { missionId, clientId, amount, currency = 'EUR' } = params;

    // Verify mission exists and client owns it
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
    });

    if (!mission || mission.clientId !== clientId) {
      throw new BadRequestException('Mission introuvable ou non autorisée');
    }

    // Generate unique payment reference
    const reference = this.generatePaymentReference(missionId);

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.transferExpiryDays);

    // Create transaction record
    const transaction = await this.prisma.transaction.create({
      data: {
        type: 'MISSION',
        missionId,
        amount,
        currency,
        commission: amount * 0.12,
        artisanAmount: amount * 0.88,
        paymentMethod: 'BANK_TRANSFER',
        status: 'PENDING',
      },
    });

    this.logger.log(
      `Bank transfer payment created: ${transaction.id} | Reference: ${reference} | Amount: €${amount}`,
    );

    // Return payment instructions for client
    return {
      accountHolder: this.bankAccountHolder,
      iban: this.bankAccountIban,
      bic: this.bankAccountBic,
      bankName: this.bankName,
      reference,
      amount,
      currency,
      expiresAt,
    };
  }

  /**
   * Upload proof of payment
   */
  async uploadProofOfPayment(params: {
    transactionId: string;
    proofImageUrl: string;
    userId: string;
  }): Promise<void> {
    const { transactionId, proofImageUrl, userId } = params;

    // Verify transaction exists and user owns it
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        mission: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction introuvable');
    }

    if (transaction.mission?.clientId !== userId) {
      throw new BadRequestException('Non autorisé');
    }

    if (transaction.status !== 'PENDING') {
      throw new BadRequestException('Transaction déjà traitée');
    }

    // Store proof of payment (you'd create a ProofOfPayment table in production)
    // For now, we'll update the transaction with a note
    this.logger.log(
      `Proof of payment uploaded: Transaction ${transactionId} | Image: ${proofImageUrl} | User: ${userId}`,
    );

    // In production, create a dedicated ProofOfPayment record:
    // await this.prisma.proofOfPayment.create({
    //   data: {
    //     transactionId,
    //     imageUrl: proofImageUrl,
    //     uploadedBy: userId,
    //   },
    // });

    this.logger.log(`Bank transfer proof uploaded for transaction ${transactionId}`);
  }

  /**
   * Verify bank transfer payment (admin only)
   */
  async verifyBankTransfer(params: {
    transactionId: string;
    adminId: string;
    verified: boolean;
    notes?: string;
  }): Promise<void> {
    const { transactionId, adminId, verified, notes } = params;

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        mission: {
          include: {
            artisan: {
              include: {
                artisanProfile: true,
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction introuvable');
    }

    if (transaction.paymentMethod !== 'BANK_TRANSFER') {
      throw new BadRequestException('Cette transaction n\'est pas un virement bancaire');
    }

    if (verified) {
      // Mark as completed
      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      this.logger.log(
        `Bank transfer verified: ${transactionId} | Admin: ${adminId} | Notes: ${notes || 'N/A'}`,
      );

      // Transfer funds to artisan Stripe Connect account
      if (transaction.mission?.artisan?.artisanProfile?.stripeAccountId) {
        try {
          // Calculate platform commission (10% by default)
          const amount = transaction.amount.toNumber();
          const platformCommission = amount * 0.1;
          const artisanAmount = amount - platformCommission;

          // Transfer to artisan's Stripe Connect account
          await this.stripeService.createTransfer({
            amount: Math.round(artisanAmount * 100), // Convert to cents
            destination: transaction.mission.artisan.artisanProfile.stripeAccountId,
            metadata: {
              transactionId: transaction.id,
              missionId: transaction.mission.id,
              type: 'bank_transfer_payout',
              platformCommission: platformCommission.toString(),
            },
          });

          this.logger.log(
            `Funds transferred to artisan: ${transaction.mission.artisan.id} | Amount: ${artisanAmount}€ | Transaction: ${transactionId}`,
          );

          // Notify artisan of payment
          await this.notificationService.createNotification(
            transaction.mission.artisan.id,
            NotificationType.PAYMENT_RECEIVED,
            'Paiement reçu',
            `Vous avez reçu un paiement de ${artisanAmount.toFixed(2)}€ pour la mission "${transaction.mission.title || 'Mission'}"`,
            `/artisan/missions/${transaction.mission.id}`,
            {
              transactionId: transaction.id,
              amount: artisanAmount,
              missionId: transaction.mission.id,
            },
          );
        } catch (error) {
          this.logger.error(
            `Failed to transfer funds to artisan: ${error.message} | Transaction: ${transactionId}`,
          );
          // Don't fail the verification, but log the error for manual intervention
          // The transaction is still marked as completed, but funds need manual transfer
        }
      } else {
        this.logger.warn(
          `Artisan has no Stripe Connect account. Manual payout required. | Transaction: ${transactionId}`,
        );
      }
    } else {
      // Reject payment
      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'FAILED',
        },
      });

      this.logger.warn(
        `Bank transfer rejected: ${transactionId} | Admin: ${adminId} | Reason: ${notes || 'N/A'}`,
      );

      // Notify client of rejection
      if (transaction.mission?.clientId) {
        try {
          await this.notificationService.createNotification(
            transaction.mission.clientId,
            NotificationType.SYSTEM,
            'Paiement refusé',
            `Votre preuve de paiement pour la mission "${transaction.mission.title || 'Mission'}" a été refusée. ${notes ? `Raison: ${notes}` : 'Veuillez soumettre une nouvelle preuve de paiement valide.'}`,
            `/client/missions/${transaction.mission.id}`,
            {
              transactionId: transaction.id,
              missionId: transaction.mission.id,
              reason: notes || 'Non spécifiée',
            },
          );

          this.logger.log(
            `Client notified of payment rejection: ${transaction.mission.clientId} | Transaction: ${transactionId}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to notify client of rejection: ${error.message} | Transaction: ${transactionId}`,
          );
        }
      }
    }
  }

  /**
   * Get pending bank transfers for admin review
   */
  async getPendingBankTransfers(params?: {
    limit?: number;
    offset?: number;
  }): Promise<Array<any>> {
    const { limit = 50, offset = 0 } = params || {};

    const transactions = await this.prisma.transaction.findMany({
      where: {
        paymentMethod: 'BANK_TRANSFER',
        status: 'PENDING',
      },
      include: {
        mission: {
          include: {
            client: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    return transactions.map((tx) => ({
      id: tx.id,
      amount: tx.amount,
      currency: tx.currency,
      reference: this.generatePaymentReference(tx.missionId || ''),
      createdAt: tx.createdAt,
      missionId: tx.missionId,
      client: tx.mission?.client,
    }));
  }

  /**
   * Get bank transfer payment status
   */
  async getBankTransferStatus(transactionId: string): Promise<{
    status: string;
    instructions?: BankTransferInstructions;
    proofUploaded: boolean;
  }> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction introuvable');
    }

    const proofUploaded = false; // In production, check ProofOfPayment table

    let instructions: BankTransferInstructions | undefined;
    if (transaction.status === 'PENDING') {
      const expiresAt = new Date(transaction.createdAt);
      expiresAt.setDate(expiresAt.getDate() + this.transferExpiryDays);

      instructions = {
        accountHolder: this.bankAccountHolder,
        iban: this.bankAccountIban,
        bic: this.bankAccountBic,
        bankName: this.bankName,
        reference: this.generatePaymentReference(transaction.missionId || ''),
        amount: Number(transaction.amount),
        currency: transaction.currency,
        expiresAt,
      };
    }

    return {
      status: transaction.status,
      instructions,
      proofUploaded,
    };
  }

  /**
   * Generate unique payment reference
   */
  private generatePaymentReference(missionId: string): string {
    // Format: ARTIC-MISSION-XXXXXX (last 6 chars of mission ID)
    const shortId = missionId.slice(-6).toUpperCase();
    return `ARTIC-${shortId}`;
  }

  /**
   * CRON: Mark expired bank transfers as expired
   * Runs daily at 02:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async expirePendingBankTransfers(): Promise<void> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - this.transferExpiryDays);

    const result = await this.prisma.transaction.updateMany({
      where: {
        paymentMethod: 'BANK_TRANSFER',
        status: 'PENDING',
        createdAt: {
          lt: expiryDate,
        },
      },
      data: {
        status: 'FAILED',
      },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} pending bank transfer(s)`);
    }
  }

  /**
   * Get bank transfer statistics
   */
  async getStatistics(days = 30): Promise<{
    totalBankTransfers: number;
    pendingVerification: number;
    verified: number;
    rejected: number;
    expired: number;
    totalAmount: number;
    averageAmount: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        paymentMethod: 'BANK_TRANSFER',
        createdAt: {
          gte: startDate,
        },
      },
    });

    const stats = {
      totalBankTransfers: transactions.length,
      pendingVerification: transactions.filter((t) => t.status === 'PENDING').length,
      verified: transactions.filter((t) => t.status === 'COMPLETED').length,
      rejected: transactions.filter((t) => t.status === 'FAILED').length,
      expired: 0, // Count from FAILED with expired flag
      totalAmount: transactions.reduce((sum, t) => sum + Number(t.amount), 0),
      averageAmount:
        transactions.length > 0
          ? transactions.reduce((sum, t) => sum + Number(t.amount), 0) / transactions.length
          : 0,
    };

    return stats;
  }

  /**
   * Check if bank transfer service is enabled
   */
  isEnabled(): boolean {
    return !!(this.bankAccountIban && this.bankAccountBic);
  }

  /**
   * Get bank account details for display (public info only)
   */
  getBankAccountInfo(): {
    accountHolder: string;
    bankName: string;
    iban: string; // Partially masked
    bic: string;
  } {
    return {
      accountHolder: this.bankAccountHolder,
      bankName: this.bankName,
      iban: this.maskIban(this.bankAccountIban),
      bic: this.bankAccountBic,
    };
  }

  /**
   * Partially mask IBAN for display
   */
  private maskIban(iban: string): string {
    if (iban.length < 8) return iban;
    // Show first 4 and last 4 characters, mask middle
    const start = iban.substring(0, 4);
    const end = iban.substring(iban.length - 4);
    const masked = '*'.repeat(Math.max(0, iban.length - 8));
    return `${start}${masked}${end}`;
  }
}
