import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * FEC (Fichier des Ecritures Comptables) Export Service
 *
 * The FEC is a mandatory standardized accounting file format in France
 * required during tax audits (Article A47 A-1 du LPF).
 *
 * Format: Tab-separated CSV with specific columns
 * Encoding: ISO-8859-15 (Latin-9) or UTF-8 with BOM
 */

interface FECEntry {
  JournalCode: string;          // Code journal
  JournalLib: string;           // Libellé journal
  EcritureNum: string;          // Numéro d'écriture
  EcritureDate: string;         // Date d'écriture (YYYYMMDD)
  CompteNum: string;            // Numéro de compte
  CompteLib: string;            // Libellé du compte
  CompAuxNum: string;           // Numéro compte auxiliaire
  CompAuxLib: string;           // Libellé compte auxiliaire
  PieceRef: string;             // Référence pièce
  PieceDate: string;            // Date pièce (YYYYMMDD)
  EcritureLib: string;          // Libellé écriture
  Debit: string;                // Montant débit
  Credit: string;               // Montant crédit
  EcritureLet: string;          // Lettrage
  DateLet: string;              // Date de lettrage (YYYYMMDD)
  ValidDate: string;            // Date de validation (YYYYMMDD)
  Montantdevise: string;        // Montant en devise (si différent EUR)
  Idevise: string;              // Identifiant devise
}

interface ExportOptions {
  userId: string;
  startDate: Date;
  endDate: Date;
  format?: 'csv' | 'txt';
  encoding?: 'utf8' | 'latin9';
}

@Injectable()
export class FecExportService {
  private readonly logger = new Logger(FecExportService.name);

  // Standard French accounting codes
  private readonly ACCOUNT_CODES = {
    // Class 4 - Tiers
    CLIENT_RECEIVABLE: '411',      // Clients
    SUPPLIER_PAYABLE: '401',       // Fournisseurs
    VAT_COLLECTED: '44571',        // TVA collectée
    VAT_DEDUCTIBLE: '44566',       // TVA déductible
    SOCIAL_CHARGES: '431',         // Organismes sociaux

    // Class 5 - Finance
    BANK: '512',                   // Banque
    STRIPE_ACCOUNT: '5111',        // Compte Stripe
    CASH: '531',                   // Caisse

    // Class 6 - Charges
    PLATFORM_COMMISSION: '622',    // Commission plateforme
    BANK_FEES: '627',              // Frais bancaires

    // Class 7 - Produits
    REVENUE_SERVICES: '706',       // Prestations de services
    REVENUE_PRODUCTS: '707',       // Ventes de produits
  };

  // Journal codes
  private readonly JOURNALS = {
    SALES: { code: 'VE', name: 'Journal des ventes' },
    PURCHASES: { code: 'AC', name: 'Journal des achats' },
    BANK: { code: 'BQ', name: 'Journal de banque' },
    OD: { code: 'OD', name: 'Opérations diverses' },
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Generate FEC export file for a given period
   */
  async generateFEC(options: ExportOptions): Promise<{ data: string; filename: string }> {
    const { userId, startDate, endDate, format = 'txt' } = options;

    // Validate user has artisan profile
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { artisanProfile: true },
    });

    if (!user?.artisanProfile?.siret) {
      throw new BadRequestException('Un numéro SIRET est requis pour générer un FEC');
    }

    const siret = user.artisanProfile.siret;

    // Generate entries
    const entries: FECEntry[] = [];
    let entryNumber = 1;

    // Get invoices for the period
    const invoices = await this.prisma.invoice.findMany({
      where: {
        issuerId: userId,
        issueDate: {
          gte: startDate,
          lte: endDate,
        },
        status: { in: ['ISSUED', 'PAID', 'OVERDUE'] },
      },
      include: {
        client: true,
      },
      orderBy: { issueDate: 'asc' },
    });

    // Generate invoice entries
    for (const invoice of invoices) {
      const invoiceEntries = this.generateInvoiceEntries(invoice, entryNumber);
      entries.push(...invoiceEntries);
      entryNumber += invoiceEntries.length;
    }

    // Get payments for the period
    const payments = await this.prisma.payment.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        type: { in: ['FULL_PAYMENT', 'DEPOSIT'] },
      },
      include: {
        mission: {
          include: { client: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Generate payment entries
    for (const payment of payments) {
      const paymentEntries = this.generatePaymentEntries(payment, entryNumber);
      entries.push(...paymentEntries);
      entryNumber += paymentEntries.length;
    }

    // Sort by date
    entries.sort((a, b) => a.EcritureDate.localeCompare(b.EcritureDate));

    // Generate filename (SIREN + FEC + DateClôture)
    const siren = siret.substring(0, 9);
    const dateStr = this.formatDateFEC(endDate);
    const filename = `${siren}FEC${dateStr}.${format}`;

    // Generate output
    const data = this.formatFECOutput(entries, format);

    this.logger.log(`Generated FEC with ${entries.length} entries for period ${startDate.toISOString()} to ${endDate.toISOString()}`);

    return { data, filename };
  }

  /**
   * Generate accounting entries for an invoice
   */
  private generateInvoiceEntries(invoice: any, startNum: number): FECEntry[] {
    const entries: FECEntry[] = [];
    const dateStr = this.formatDateFEC(invoice.issueDate);
    const num = String(startNum).padStart(6, '0');

    const subtotal = Number(invoice.subtotal);
    const taxAmount = Number(invoice.taxAmount);
    const totalAmount = Number(invoice.totalAmount);

    // Debit: Client receivable (411)
    entries.push({
      JournalCode: this.JOURNALS.SALES.code,
      JournalLib: this.JOURNALS.SALES.name,
      EcritureNum: num,
      EcritureDate: dateStr,
      CompteNum: this.ACCOUNT_CODES.CLIENT_RECEIVABLE + '000',
      CompteLib: 'Clients',
      CompAuxNum: this.generateAuxiliaryCode(invoice.client),
      CompAuxLib: `${invoice.client.firstName} ${invoice.client.lastName}`,
      PieceRef: invoice.invoiceNumber,
      PieceDate: dateStr,
      EcritureLib: `Facture ${invoice.invoiceNumber}`,
      Debit: this.formatAmount(totalAmount),
      Credit: '0,00',
      EcritureLet: '',
      DateLet: '',
      ValidDate: dateStr,
      Montantdevise: '',
      Idevise: '',
    });

    // Credit: Revenue (706)
    entries.push({
      JournalCode: this.JOURNALS.SALES.code,
      JournalLib: this.JOURNALS.SALES.name,
      EcritureNum: num,
      EcritureDate: dateStr,
      CompteNum: this.ACCOUNT_CODES.REVENUE_SERVICES + '000',
      CompteLib: 'Prestations de services',
      CompAuxNum: '',
      CompAuxLib: '',
      PieceRef: invoice.invoiceNumber,
      PieceDate: dateStr,
      EcritureLib: `Facture ${invoice.invoiceNumber}`,
      Debit: '0,00',
      Credit: this.formatAmount(subtotal),
      EcritureLet: '',
      DateLet: '',
      ValidDate: dateStr,
      Montantdevise: '',
      Idevise: '',
    });

    // Credit: VAT collected (44571) if applicable
    if (taxAmount > 0) {
      entries.push({
        JournalCode: this.JOURNALS.SALES.code,
        JournalLib: this.JOURNALS.SALES.name,
        EcritureNum: num,
        EcritureDate: dateStr,
        CompteNum: this.ACCOUNT_CODES.VAT_COLLECTED,
        CompteLib: 'TVA collectée',
        CompAuxNum: '',
        CompAuxLib: '',
        PieceRef: invoice.invoiceNumber,
        PieceDate: dateStr,
        EcritureLib: `TVA Facture ${invoice.invoiceNumber}`,
        Debit: '0,00',
        Credit: this.formatAmount(taxAmount),
        EcritureLet: '',
        DateLet: '',
        ValidDate: dateStr,
        Montantdevise: '',
        Idevise: '',
      });
    }

    return entries;
  }

  /**
   * Generate accounting entries for a payment
   */
  private generatePaymentEntries(payment: any, startNum: number): FECEntry[] {
    const entries: FECEntry[] = [];
    const dateStr = this.formatDateFEC(payment.createdAt);
    const num = String(startNum).padStart(6, '0');
    const amount = Number(payment.amount);

    const clientName = payment.mission?.client
      ? `${payment.mission.client.firstName} ${payment.mission.client.lastName}`
      : 'Client';

    // Debit: Bank/Stripe account (512/5111)
    entries.push({
      JournalCode: this.JOURNALS.BANK.code,
      JournalLib: this.JOURNALS.BANK.name,
      EcritureNum: num,
      EcritureDate: dateStr,
      CompteNum: this.ACCOUNT_CODES.STRIPE_ACCOUNT,
      CompteLib: 'Compte Stripe',
      CompAuxNum: '',
      CompAuxLib: '',
      PieceRef: payment.stripePaymentIntentId || payment.id,
      PieceDate: dateStr,
      EcritureLib: `Paiement ${clientName}`,
      Debit: this.formatAmount(amount),
      Credit: '0,00',
      EcritureLet: '',
      DateLet: '',
      ValidDate: dateStr,
      Montantdevise: '',
      Idevise: '',
    });

    // Credit: Client receivable (411)
    entries.push({
      JournalCode: this.JOURNALS.BANK.code,
      JournalLib: this.JOURNALS.BANK.name,
      EcritureNum: num,
      EcritureDate: dateStr,
      CompteNum: this.ACCOUNT_CODES.CLIENT_RECEIVABLE + '000',
      CompteLib: 'Clients',
      CompAuxNum: payment.mission?.client ? this.generateAuxiliaryCode(payment.mission.client) : '',
      CompAuxLib: clientName,
      PieceRef: payment.stripePaymentIntentId || payment.id,
      PieceDate: dateStr,
      EcritureLib: `Paiement ${clientName}`,
      Debit: '0,00',
      Credit: this.formatAmount(amount),
      EcritureLet: '',
      DateLet: '',
      ValidDate: dateStr,
      Montantdevise: '',
      Idevise: '',
    });

    return entries;
  }

  /**
   * Format date for FEC (YYYYMMDD)
   */
  private formatDateFEC(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * Format amount for FEC (French format: 1234,56)
   */
  private formatAmount(amount: number): string {
    return amount.toFixed(2).replace('.', ',');
  }

  /**
   * Generate auxiliary account code for client
   */
  private generateAuxiliaryCode(client: any): string {
    // Use first 3 letters of last name + first 3 letters of first name
    const lastName = (client.lastName || 'CLI').toUpperCase().substring(0, 3);
    const firstName = (client.firstName || 'ENT').toUpperCase().substring(0, 3);
    return `${lastName}${firstName}`;
  }

  /**
   * Format FEC output as tab-separated or CSV
   */
  private formatFECOutput(entries: FECEntry[], format: 'csv' | 'txt'): string {
    const headers = [
      'JournalCode',
      'JournalLib',
      'EcritureNum',
      'EcritureDate',
      'CompteNum',
      'CompteLib',
      'CompAuxNum',
      'CompAuxLib',
      'PieceRef',
      'PieceDate',
      'EcritureLib',
      'Debit',
      'Credit',
      'EcritureLet',
      'DateLet',
      'ValidDate',
      'Montantdevise',
      'Idevise',
    ];

    const separator = format === 'txt' ? '\t' : '|';

    const lines: string[] = [];

    // Add header line
    lines.push(headers.join(separator));

    // Add data lines
    for (const entry of entries) {
      const values = headers.map(h => entry[h as keyof FECEntry] || '');
      lines.push(values.join(separator));
    }

    return lines.join('\r\n'); // Windows line endings as per FEC spec
  }

  /**
   * Get summary statistics for a period
   */
  async getAccountingSummary(userId: string, startDate: Date, endDate: Date) {
    const [invoices, payments] = await Promise.all([
      this.prisma.invoice.findMany({
        where: {
          issuerId: userId,
          issueDate: { gte: startDate, lte: endDate },
          status: { in: ['ISSUED', 'PAID', 'OVERDUE'] },
        },
      }),
      this.prisma.payment.findMany({
        where: {
          userId,
          createdAt: { gte: startDate, lte: endDate },
          type: { in: ['FULL_PAYMENT', 'DEPOSIT'] },
        },
      }),
    ]);

    const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    const totalTax = invoices.reduce((sum, inv) => sum + Number(inv.taxAmount), 0);
    const totalReceived = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      invoices: {
        count: invoices.length,
        totalHT: totalInvoiced - totalTax,
        totalTVA: totalTax,
        totalTTC: totalInvoiced,
      },
      payments: {
        count: payments.length,
        total: totalReceived,
      },
      balance: {
        receivable: totalInvoiced - totalReceived,
      },
    };
  }
}
