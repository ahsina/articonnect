import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as PDFDocument from 'pdfkit';
import {
  AddressInfo,
  InvoiceLineItem,
  safeJsonCast,
} from '../../common/types/json-fields.types';

interface CompanyInfo {
  name: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  siret?: string;
  vatNumber?: string;
}

interface LineItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

@Injectable()
export class PdfService {
  constructor(private prisma: PrismaService) {}

  private formatCurrency(amount: number | any, currency = 'EUR'): string {
    const numAmount = typeof amount === 'object' ? Number(amount) : amount;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
    }).format(numAmount);
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date));
  }

  async generateQuotePdf(quoteId: string): Promise<Buffer> {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        lineItems: { orderBy: { position: 'asc' } },
        artisan: {
          include: {
            artisanProfile: true,
          },
        },
        client: true,
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    const artisanProfile = quote.artisan.artisanProfile;
    const companyInfo: CompanyInfo = {
      name: artisanProfile?.companyName || `${quote.artisan.firstName} ${quote.artisan.lastName}`,
      // Anti-désintermédiation : on NE met PAS le téléphone/email de l'artisan sur le PDF
      // (non requis légalement — seuls nom, adresse, SIRET/TVA le sont ; le contact passe par Krafolt).
      phone: undefined,
      email: undefined,
      siret: artisanProfile?.siret || undefined,
      vatNumber: artisanProfile?.vatNumber || undefined,
    };

    const clientInfo = {
      name: `${quote.client.firstName} ${quote.client.lastName}`,
      address: quote.address,
      city: quote.city,
      postalCode: quote.postalCode,
      country: quote.country,
      email: quote.client.email,
    };

    // Convert Decimal line items to numbers
    const lineItems: LineItem[] = quote.lineItems.map(item => ({
      description: item.description,
      quantity: Number(item.quantity),
      unit: item.unit,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
    }));

    return this.createQuoteDocument({
      type: 'quote',
      number: quote.quoteNumber,
      date: quote.createdAt,
      validUntil: quote.validUntil,
      company: companyInfo,
      client: clientInfo,
      title: quote.title,
      description: quote.description,
      lineItems,
      subtotal: Number(quote.subtotal),
      discountPercent: Number(quote.discountPercent) || 0,
      discountAmount: Number(quote.discountAmount) || 0,
      taxRate: Number(quote.taxRate) || 0,
      taxAmount: Number(quote.taxAmount) || 0,
      totalAmount: Number(quote.totalAmount),
      currency: quote.currency,
      termsAndConditions: quote.termsAndConditions,
      notes: quote.notes,
      laborTotal: Number(quote.laborTotal) || 0,
      materialsTotal: Number(quote.materialsTotal) || 0,
      travelTotal: Number(quote.travelTotal) || 0,
    });
  }

  async generateInvoicePdf(invoiceId: string): Promise<Buffer> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        issuer: {
          include: { artisanProfile: true },
        },
        client: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const issuerAddr = safeJsonCast<AddressInfo>(invoice.issuerAddress, {});
    const clientAddr = safeJsonCast<AddressInfo>(invoice.clientAddress, {});
    const lineItems = safeJsonCast<InvoiceLineItem[]>(invoice.lineItems, []);

    const companyInfo: CompanyInfo = {
      name: issuerAddr.name || `${invoice.issuer.firstName} ${invoice.issuer.lastName}`,
      address: issuerAddr.address,
      city: issuerAddr.city,
      postalCode: issuerAddr.postalCode,
      country: issuerAddr.country,
      phone: invoice.issuer.phone || undefined,
      email: invoice.issuer.email,
      siret: issuerAddr.siret,
      vatNumber: issuerAddr.vat,
    };

    const clientInfo = {
      name: clientAddr.name || `${invoice.client.firstName} ${invoice.client.lastName}`,
      address: clientAddr.address,
      city: clientAddr.city,
      postalCode: clientAddr.postalCode,
      country: clientAddr.country,
      email: invoice.client.email,
    };

    return this.createInvoiceDocument({
      type: 'invoice',
      number: invoice.invoiceNumber,
      date: invoice.issueDate,
      dueDate: invoice.paymentDueDate,
      company: companyInfo,
      client: clientInfo,
      lineItems: lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity || 1,
        unit: item.unit || 'unité',
        unitPrice: item.unitPrice || item.total,
        totalPrice: item.total,
      })),
      subtotal: Number(invoice.subtotal),
      taxRate: Number(invoice.taxRate) || 0,
      taxAmount: Number(invoice.taxAmount) || 0,
      totalAmount: Number(invoice.totalAmount),
      currency: 'EUR',
      notes: invoice.notes,
      status: invoice.status,
      paidAmount: invoice.paidAt ? Number(invoice.totalAmount) : 0,
      remainingAmount: invoice.paidAt ? 0 : Number(invoice.totalAmount),
    });
  }

  private async createQuoteDocument(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      this.drawHeader(doc, data.company, 'DEVIS');

      // Quote Info Box
      doc.moveDown(2);
      const infoY = doc.y;

      doc.fontSize(10)
        .fillColor('#333')
        .text(`Devis N°: ${data.number}`, 50, infoY)
        .text(`Date: ${this.formatDate(data.date)}`, 50)
        .text(`Valide jusqu'au: ${this.formatDate(data.validUntil)}`, 50);

      // Client info on the right
      doc.fontSize(10)
        .text('Client:', 350, infoY, { continued: true })
        .font('Helvetica-Bold')
        .text(` ${data.client.name}`)
        .font('Helvetica');

      if (data.client.address) {
        doc.text(data.client.address, 350);
      }
      if (data.client.postalCode || data.client.city) {
        doc.text(`${data.client.postalCode || ''} ${data.client.city || ''}`.trim(), 350);
      }

      doc.moveDown(2);

      // Title
      if (data.title) {
        doc.fontSize(14)
          .font('Helvetica-Bold')
          .text(`Objet: ${data.title}`, 50)
          .font('Helvetica');
        doc.moveDown();
      }

      // Line items table
      this.drawLineItemsTable(doc, data.lineItems, data.currency);

      // Totals
      doc.moveDown();
      this.drawTotals(doc, data);

      // Signature area
      doc.moveDown(3);
      doc.fontSize(10)
        .text('Bon pour accord, le ___/___/______', 50)
        .moveDown()
        .text('Signature du client:', 50);

      // Footer
      this.drawFooter(doc, data.company);

      doc.end();
    });
  }

  private async createInvoiceDocument(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      this.drawHeader(doc, data.company, 'FACTURE');

      // Invoice Info
      doc.moveDown(2);
      const infoY = doc.y;

      doc.fontSize(10)
        .fillColor('#333')
        .text(`Facture N°: ${data.number}`, 50, infoY)
        .text(`Date d'émission: ${this.formatDate(data.date)}`, 50);

      if (data.dueDate) {
        doc.text(`Date d'échéance: ${this.formatDate(data.dueDate)}`, 50);
      }

      // Status
      const statusLabels: Record<string, string> = {
        PAID: 'PAYÉE',
        PARTIALLY_PAID: 'PARTIELLEMENT PAYÉE',
        SENT: 'ENVOYÉE',
        DRAFT: 'BROUILLON',
        OVERDUE: 'EN RETARD',
      };
      doc.text(`Statut: ${statusLabels[data.status] || data.status}`, 50);

      // Client info
      doc.fontSize(10)
        .text('Client:', 350, infoY, { continued: true })
        .font('Helvetica-Bold')
        .text(` ${data.client.name}`)
        .font('Helvetica');

      if (data.client.address) {
        doc.text(data.client.address, 350);
      }
      if (data.client.postalCode || data.client.city) {
        doc.text(`${data.client.postalCode || ''} ${data.client.city || ''}`.trim(), 350);
      }

      doc.moveDown(2);

      // Line items table
      if (data.lineItems && data.lineItems.length > 0) {
        this.drawLineItemsTable(doc, data.lineItems, data.currency);
      }

      // Totals
      doc.moveDown();
      this.drawTotals(doc, data);

      // Footer
      this.drawFooter(doc, data.company);

      doc.end();
    });
  }

  async generateContractPdf(missionId: string): Promise<Buffer> {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        artisan: { include: { artisanProfile: true } },
        client: true,
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#2563eb')
        .text('CONTRAT DE PRESTATION DE SERVICES', { align: 'center' });

      doc.moveDown(2);

      // Parties
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#333').text('ENTRE LES SOUSSIGNÉS:');
      doc.moveDown();

      const artisanProfile = mission.artisan.artisanProfile;
      doc.fontSize(10).font('Helvetica');
      doc.text(`Le Prestataire: ${artisanProfile?.companyName || `${mission.artisan.firstName} ${mission.artisan.lastName}`}`);
      if (artisanProfile?.siret) doc.text(`SIRET: ${artisanProfile.siret}`);

      doc.moveDown();
      doc.text('ET');
      doc.moveDown();

      doc.text(`Le Client: ${mission.client.firstName} ${mission.client.lastName}`);
      doc.text(`Email: ${mission.client.email}`);

      doc.moveDown(2);

      // Object
      doc.fontSize(12).font('Helvetica-Bold').text('ARTICLE 1 - OBJET DU CONTRAT');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Le présent contrat a pour objet la réalisation de la prestation suivante:`);
      doc.text(`${mission.title}`, { indent: 20 });

      doc.moveDown(2);

      // Signatures
      doc.fontSize(12).font('Helvetica-Bold').text('SIGNATURES');
      doc.moveDown();

      const sigY = doc.y;
      doc.fontSize(10).font('Helvetica');

      doc.text('Le Prestataire:', 50, sigY);
      doc.text('Le Client:', 300, sigY);

      doc.text('Date: ___/___/______', 50, sigY + 80);
      doc.text('Date: ___/___/______', 300, sigY + 80);

      doc.end();
    });
  }

  private drawHeader(doc: PDFKit.PDFDocument, company: CompanyInfo, documentType: string): void {
    doc.fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#2563eb')
      .text(company.name, 50, 50);

    doc.fontSize(9)
      .font('Helvetica')
      .fillColor('#666');

    let y = 75;
    if (company.address) {
      doc.text(company.address, 50, y);
      y += 12;
    }
    if (company.postalCode || company.city) {
      doc.text(`${company.postalCode || ''} ${company.city || ''}`.trim(), 50, y);
      y += 12;
    }
    if (company.phone) {
      doc.text(`Tél: ${company.phone}`, 50, y);
      y += 12;
    }
    if (company.email) {
      doc.text(company.email, 50, y);
      y += 12;
    }
    if (company.siret) {
      doc.text(`SIRET: ${company.siret}`, 50, y);
    }

    doc.fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#2563eb')
      .text(documentType, 400, 50, { align: 'right' });

    doc.moveTo(50, 140)
      .lineTo(545, 140)
      .strokeColor('#e5e7eb')
      .stroke();

    doc.y = 150;
  }

  private drawLineItemsTable(doc: PDFKit.PDFDocument, items: LineItem[], currency: string): void {
    const tableTop = doc.y;
    const columns = {
      description: { x: 50, width: 200 },
      quantity: { x: 260, width: 50 },
      unit: { x: 310, width: 50 },
      unitPrice: { x: 370, width: 80 },
      total: { x: 460, width: 85 },
    };

    // Header
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#fff');
    doc.rect(50, tableTop, 495, 20).fill('#2563eb');

    doc.text('Description', columns.description.x + 5, tableTop + 6)
      .text('Qté', columns.quantity.x + 5, tableTop + 6)
      .text('Unité', columns.unit.x + 5, tableTop + 6)
      .text('Prix unit.', columns.unitPrice.x + 5, tableTop + 6)
      .text('Total', columns.total.x + 5, tableTop + 6);

    doc.font('Helvetica').fillColor('#333');
    let y = tableTop + 25;

    items.forEach((item, index) => {
      const bgColor = index % 2 === 0 ? '#f9fafb' : '#fff';
      doc.rect(50, y - 5, 495, 20).fill(bgColor);
      doc.fillColor('#333');

      doc.fontSize(9)
        .text(item.description.substring(0, 40), columns.description.x + 5, y, { width: columns.description.width - 10 })
        .text(String(item.quantity), columns.quantity.x + 5, y)
        .text(item.unit, columns.unit.x + 5, y)
        .text(this.formatCurrency(item.unitPrice, currency), columns.unitPrice.x + 5, y)
        .text(this.formatCurrency(item.totalPrice, currency), columns.total.x + 5, y);

      y += 20;
    });

    doc.rect(50, tableTop, 495, y - tableTop).stroke('#e5e7eb');
    doc.y = y + 10;
  }

  private drawTotals(doc: PDFKit.PDFDocument, data: any): void {
    const startX = 350;
    const valueX = 460;
    let y = doc.y;

    doc.fontSize(10).font('Helvetica');

    doc.text('Sous-total HT:', startX, y)
      .text(this.formatCurrency(data.subtotal, data.currency), valueX, y, { align: 'right', width: 85 });
    y += 15;

    if (data.discountAmount > 0) {
      doc.text(`Remise (${data.discountPercent}%):`, startX, y)
        .text(`-${this.formatCurrency(data.discountAmount, data.currency)}`, valueX, y, { align: 'right', width: 85 });
      y += 15;
    }

    if (data.taxAmount > 0) {
      doc.text(`TVA (${data.taxRate}%):`, startX, y)
        .text(this.formatCurrency(data.taxAmount, data.currency), valueX, y, { align: 'right', width: 85 });
      y += 15;
    }

    doc.rect(startX - 5, y - 3, 200, 22).fill('#2563eb');
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#fff')
      .text('TOTAL TTC:', startX, y)
      .text(this.formatCurrency(data.totalAmount, data.currency), valueX, y, { align: 'right', width: 85 });

    doc.fillColor('#333').font('Helvetica');
    doc.y = y + 30;
  }

  private drawFooter(doc: PDFKit.PDFDocument, company: CompanyInfo): void {
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 80;

    doc.fontSize(8)
      .fillColor('#999')
      .text(
        `${company.name}${company.siret ? ` - SIRET: ${company.siret}` : ''}${company.vatNumber ? ` - TVA: ${company.vatNumber}` : ''}`,
        50,
        footerY,
        { align: 'center', width: 495 }
      );

    // French legal mentions (obligatory for invoices)
    doc.fontSize(7)
      .fillColor('#666')
      .text(
        'En cas de retard de paiement, une pénalité égale à 3 fois le taux d\'intérêt légal sera exigible (Article L.441-6 du Code de commerce).',
        50,
        footerY + 15,
        { align: 'center', width: 495 }
      )
      .text(
        'Indemnité forfaitaire pour frais de recouvrement en cas de retard de paiement: 40€ (Art. D.441-5 du Code de commerce).',
        50,
        footerY + 27,
        { align: 'center', width: 495 }
      );
  }

  /**
   * Generate a professional receipt PDF
   */
  async generateReceiptPdf(paymentId: string): Promise<Buffer> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: {
          include: { artisanProfile: true },
        },
        mission: {
          include: {
            client: true,
            artisan: { include: { artisanProfile: true } },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const artisanProfile = payment.mission?.artisan?.artisanProfile;
      const companyInfo: CompanyInfo = {
        name: artisanProfile?.companyName || `${payment.mission?.artisan?.firstName || ''} ${payment.mission?.artisan?.lastName || ''}`.trim() || 'Krafolt',
        phone: payment.mission?.artisan?.phone || undefined,
        email: payment.mission?.artisan?.email || '',
        siret: artisanProfile?.siret || undefined,
        vatNumber: artisanProfile?.vatNumber || undefined,
      };

      // Header
      this.drawHeader(doc, companyInfo, 'RECU DE PAIEMENT');

      // Receipt details
      doc.moveDown(2);
      const infoY = doc.y;

      doc.fontSize(10)
        .fillColor('#333')
        .text(`Reçu N°: REC-${paymentId.slice(0, 8).toUpperCase()}`, 50, infoY)
        .text(`Date: ${this.formatDate(payment.createdAt)}`, 50);

      doc.moveDown(2);

      // Payment details
      doc.fontSize(12).font('Helvetica-Bold').text('Détails du paiement', 50);
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');

      doc.text(`Montant: ${this.formatCurrency(Number(payment.amount))}`, 50);
      doc.text(`Type: ${payment.type}`, 50);

      if (payment.mission) {
        doc.moveDown();
        doc.text(`Mission: ${payment.mission.title}`, 50);
        doc.text(`Client: ${payment.mission.client.firstName} ${payment.mission.client.lastName}`, 50);
      }

      doc.moveDown(3);

      // Certification
      doc.fontSize(10)
        .text('Ce reçu certifie le paiement effectué via la plateforme Krafolt.', 50, doc.y, { align: 'center', width: 495 });

      this.drawFooter(doc, companyInfo);

      doc.end();
    });
  }

  /**
   * Generate a detailed work report PDF (attestation de travaux)
   */
  async generateWorkReportPdf(missionId: string): Promise<Buffer> {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        artisan: { include: { artisanProfile: true } },
        client: true,
        payments: true,
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const artisanProfile = mission.artisan.artisanProfile;
      const companyInfo: CompanyInfo = {
        name: artisanProfile?.companyName || `${mission.artisan.firstName} ${mission.artisan.lastName}`,
        phone: mission.artisan.phone || undefined,
        email: mission.artisan.email,
        siret: artisanProfile?.siret || undefined,
        vatNumber: artisanProfile?.vatNumber || undefined,
      };

      // Header
      this.drawHeader(doc, companyInfo, 'ATTESTATION DE TRAVAUX');

      doc.moveDown(2);

      // Document info
      doc.fontSize(10)
        .fillColor('#333')
        .text(`Référence: ATT-${missionId.slice(0, 8).toUpperCase()}`, 50)
        .text(`Date d'émission: ${this.formatDate(new Date())}`, 50);

      doc.moveDown(2);

      // Client info
      doc.fontSize(12).font('Helvetica-Bold').text('CLIENT', 50);
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica')
        .text(`${mission.client.firstName} ${mission.client.lastName}`, 50)
        .text(`Email: ${mission.client.email}`, 50);

      if (mission.address) {
        doc.text(`Adresse des travaux: ${mission.address}, ${mission.postalCode} ${mission.city}`, 50);
      }

      doc.moveDown(2);

      // Work description
      doc.fontSize(12).font('Helvetica-Bold').text('DESCRIPTION DES TRAVAUX', 50);
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica')
        .text(`Intitulé: ${mission.title}`, 50);

      if (mission.description) {
        doc.text(`Description: ${mission.description}`, 50, doc.y, { width: 495 });
      }

      doc.moveDown();
      doc.text(`Catégorie: ${mission.category}`, 50);

      if (mission.startedAt) {
        doc.text(`Date de début: ${this.formatDate(mission.startedAt)}`, 50);
      }
      if (mission.completedAt) {
        doc.text(`Date de fin: ${this.formatDate(mission.completedAt)}`, 50);
      }

      doc.moveDown(2);

      // Financial summary
      doc.fontSize(12).font('Helvetica-Bold').text('MONTANTS', 50);
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica')
        .text(`Montant total: ${this.formatCurrency(Number(mission.finalPrice || mission.agreedPrice || mission.totalAmount || 0))}`, 50);

      const totalPaid = mission.payments
        .filter(p => !p.refundedAt) // Exclude refunded payments
        .reduce((sum, p) => sum + Number(p.amount), 0);

      doc.text(`Total payé: ${this.formatCurrency(totalPaid)}`, 50);

      doc.moveDown(3);

      // Certification
      doc.fontSize(10)
        .text('Je soussigné, certifie que les travaux décrits ci-dessus ont été réalisés conformément aux règles de l\'art.', 50)
        .moveDown(2)
        .text('Fait à _________________, le ___/___/______', 50)
        .moveDown(2)
        .text('Signature du prestataire:', 50);

      this.drawFooter(doc, companyInfo);

      doc.end();
    });
  }
}
