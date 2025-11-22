import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ExportQueryDto, ExportFormat, ExportType } from '../dto/export.dto';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate accounting export
   */
  async generateExport(query: ExportQueryDto, userId: string): Promise<Buffer> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    // Verify user has access
    if (query.artisanId) {
      await this.verifyAccess(userId, query.artisanId);
    }

    // Get data based on export type
    let data: any[];
    let headers: string[];
    let title: string;

    switch (query.type) {
      case ExportType.INVOICES:
        ({ data, headers, title } = await this.getInvoicesData(
          query.artisanId || userId,
          startDate,
          endDate,
        ));
        break;

      case ExportType.TRANSACTIONS:
        ({ data, headers, title } = await this.getTransactionsData(
          query.artisanId || userId,
          startDate,
          endDate,
        ));
        break;

      case ExportType.VAT_DECLARATIONS:
        ({ data, headers, title } = await this.getVatDeclarationsData(
          query.artisanId || userId,
          startDate,
          endDate,
        ));
        break;

      case ExportType.REVENUE_REPORT:
        ({ data, headers, title } = await this.getRevenueReportData(
          query.artisanId || userId,
          startDate,
          endDate,
        ));
        break;

      default:
        throw new Error('Invalid export type');
    }

    // Generate export based on format
    if (query.format === ExportFormat.CSV) {
      return this.generateCSV(data, headers);
    } else {
      return this.generatePDF(data, headers, title, startDate, endDate);
    }
  }

  /**
   * Get invoices data
   */
  private async getInvoicesData(artisanId: string, startDate: Date, endDate: Date) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        issuerId: artisanId,
        issueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        mission: true,
      },
      orderBy: {
        issueDate: 'asc',
      },
    });

    const headers = [
      'N° Facture',
      'Date',
      'Mission',
      'Montant HT',
      'TVA',
      'Montant TTC',
      'Statut',
    ];

    const data = invoices.map((inv) => ({
      'N° Facture': inv.invoiceNumber,
      'Date': inv.issueDate?.toISOString().split('T')[0] || 'N/A',
      'Mission': inv.mission?.title || 'N/A',
      'Montant HT': parseFloat(inv.subtotal.toString()).toFixed(2) + ' €',
      'TVA': parseFloat(inv.taxAmount.toString()).toFixed(2) + ' €',
      'Montant TTC': parseFloat(inv.totalAmount.toString()).toFixed(2) + ' €',
      'Statut': inv.status,
    }));

    return {
      data,
      headers,
      title: 'Factures',
    };
  }

  /**
   * Get transactions data
   */
  private async getTransactionsData(artisanId: string, startDate: Date, endDate: Date) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        mission: {
          artisanId,
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        mission: {
          select: {
            title: true,
            client: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const headers = [
      'Date',
      'Transaction ID',
      'Client',
      'Mission',
      'Montant',
      'Commission',
      'Net perçu',
      'Statut',
    ];

    const data = transactions.map((txn) => {
      const amount = parseFloat(txn.amount.toString());
      const commission = parseFloat(txn.commission.toString());
      const artisanAmount = parseFloat(txn.artisanAmount.toString());

      return {
        'Date': txn.createdAt.toISOString().split('T')[0],
        'Transaction ID': txn.stripePaymentIntentId || txn.id,
        'Client': txn.mission
          ? `${txn.mission.client.firstName} ${txn.mission.client.lastName}`
          : 'N/A',
        'Mission': txn.mission?.title || 'N/A',
        'Montant': amount.toFixed(2) + ' €',
        'Commission': commission.toFixed(2) + ' €',
        'Net perçu': artisanAmount.toFixed(2) + ' €',
        'Statut': txn.status,
      };
    });

    return {
      data,
      headers,
      title: 'Transactions',
    };
  }

  /**
   * Get VAT declarations data
   */
  private async getVatDeclarationsData(artisanId: string, startDate: Date, endDate: Date) {
    const declarations = await this.prisma.vatDeclaration.findMany({
      where: {
        artisanId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const headers = [
      'Période',
      'Pays',
      'CA Total',
      'TVA Collectée',
      'Crédit TVA',
      'TVA Nette Due',
      'Statut',
    ];

    const data = declarations.map((decl) => ({
      'Période': decl.period,
      'Pays': decl.countryCode,
      'CA Total': parseFloat(decl.totalSales.toString()).toFixed(2) + ' €',
      'TVA Collectée': parseFloat(decl.totalTax.toString()).toFixed(2) + ' €',
      'Crédit TVA': parseFloat(decl.totalTaxCredit?.toString() || '0').toFixed(2) + ' €',
      'TVA Nette Due': parseFloat(decl.netTaxDue.toString()).toFixed(2) + ' €',
      'Statut': decl.status,
    }));

    return {
      data,
      headers,
      title: 'Déclarations de TVA',
    };
  }

  /**
   * Get revenue report data
   */
  private async getRevenueReportData(artisanId: string, startDate: Date, endDate: Date) {
    const missions = await this.prisma.mission.findMany({
      where: {
        artisanId,
        status: 'COMPLETED',
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        completedAt: 'asc',
      },
    });

    // Group by month
    const monthlyRevenue: Record<string, { missions: number; revenue: number }> = {};

    missions.forEach((mission) => {
      const month = mission.completedAt?.toISOString().substring(0, 7) || 'N/A';
      if (!monthlyRevenue[month]) {
        monthlyRevenue[month] = { missions: 0, revenue: 0 };
      }
      monthlyRevenue[month].missions += 1;
      monthlyRevenue[month].revenue += parseFloat(mission.finalPrice?.toString() || '0');
    });

    const headers = ['Mois', 'Nb Missions', 'Chiffre d\'affaires'];

    const data = Object.entries(monthlyRevenue).map(([month, stats]) => ({
      'Mois': month,
      'Nb Missions': stats.missions.toString(),
      'Chiffre d\'affaires': stats.revenue.toFixed(2) + ' €',
    }));

    // Add totals
    const totalMissions = missions.length;
    const totalRevenue = missions.reduce(
      (sum, m) => sum + parseFloat(m.finalPrice?.toString() || '0'),
      0,
    );

    data.push({
      'Mois': 'TOTAL',
      'Nb Missions': totalMissions.toString(),
      'Chiffre d\'affaires': totalRevenue.toFixed(2) + ' €',
    });

    return {
      data,
      headers,
      title: 'Rapport de chiffre d\'affaires',
    };
  }

  /**
   * Generate CSV
   */
  private generateCSV(data: any[], headers: string[]): Buffer {
    // Create CSV header
    let csv = headers.join(',') + '\n';

    // Add data rows
    data.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header] || '';
        // Escape quotes and wrap in quotes if contains comma
        return value.toString().includes(',')
          ? `"${value.toString().replace(/"/g, '""')}"`
          : value;
      });
      csv += values.join(',') + '\n';
    });

    return Buffer.from(csv, 'utf-8');
  }

  /**
   * Generate PDF
   */
  private generatePDF(
    data: any[],
    headers: string[],
    title: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text(title, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(
        `Période: ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
        { align: 'center' },
      );
      doc.text(`Date d'export: ${new Date().toISOString().split('T')[0]}`, {
        align: 'center',
      });
      doc.moveDown(2);

      // Table
      const tableTop = doc.y;
      const columnWidth = (doc.page.width - 100) / headers.length;

      // Table headers
      doc.fontSize(9).font('Helvetica-Bold');
      headers.forEach((header, i) => {
        doc.text(header, 50 + i * columnWidth, tableTop, {
          width: columnWidth,
          align: 'left',
        });
      });

      doc.moveDown();
      let y = doc.y;

      // Draw line after headers
      doc
        .strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(50, y)
        .lineTo(doc.page.width - 50, y)
        .stroke();

      doc.moveDown(0.5);
      y = doc.y;

      // Table data
      doc.font('Helvetica').fontSize(8);
      data.forEach((row, rowIndex) => {
        // Check if we need a new page
        if (y > doc.page.height - 100) {
          doc.addPage();
          y = 50;
        }

        headers.forEach((header, i) => {
          const value = row[header]?.toString() || '';
          doc.text(value, 50 + i * columnWidth, y, {
            width: columnWidth,
            align: 'left',
          });
        });

        y += 20;
        doc.y = y;

        // Draw light line between rows
        if (rowIndex < data.length - 1) {
          doc
            .strokeColor('#eeeeee')
            .lineWidth(0.5)
            .moveTo(50, y)
            .lineTo(doc.page.width - 50, y)
            .stroke();
        }
      });

      // Footer
      doc
        .fontSize(8)
        .text(
          `ArtiConnect - Export généré le ${new Date().toLocaleString('fr-FR')}`,
          50,
          doc.page.height - 50,
          { align: 'center' },
        );

      doc.end();
    });
  }

  /**
   * Verify user has access to artisan data
   */
  private async verifyAccess(userId: string, artisanId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { artisanProfile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Admin can access any artisan
    if (user.role === 'ADMIN') {
      return;
    }

    // User can only access their own data
    if (user.artisanProfile?.id !== artisanId) {
      throw new NotFoundException('Access denied');
    }
  }
}
