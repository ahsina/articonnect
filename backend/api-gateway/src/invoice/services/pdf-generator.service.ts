import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Readable } from 'stream';

interface InvoiceData {
  invoiceNumber: string;
  issueDate: Date;
  paymentDueDate?: Date;
  issuer: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    siret?: string;
    vat?: string;
  };
  client: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  platformCommissionRate: number;
  platformCommission: number;
  artisanNetAmount: number;
  notes?: string;
}

@Injectable()
export class PdfGeneratorService {
  /**
   * Generate invoice PDF and return as buffer
   */
  async generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Header
        this.generateHeader(doc, data);

        // Invoice details
        this.generateInvoiceDetails(doc, data);

        // Billing addresses
        this.generateAddresses(doc, data);

        // Line items table
        this.generateLineItemsTable(doc, data);

        // Summary
        this.generateSummary(doc, data);

        // Notes
        if (data.notes) {
          this.generateNotes(doc, data.notes);
        }

        // Footer
        this.generateFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private generateHeader(doc: PDFKit.PDFDocument, data: InvoiceData) {
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('FACTURE / INVOICE', 50, 50, { align: 'center' })
      .moveDown();
  }

  private generateInvoiceDetails(doc: PDFKit.PDFDocument, data: InvoiceData) {
    const startY = 100;

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(`Facture N° / Invoice #: `, 50, startY)
      .font('Helvetica')
      .text(data.invoiceNumber, 200, startY)
      .font('Helvetica-Bold')
      .text(`Date d'émission / Issue Date: `, 50, startY + 15)
      .font('Helvetica')
      .text(this.formatDate(data.issueDate), 200, startY + 15);

    if (data.paymentDueDate) {
      doc
        .font('Helvetica-Bold')
        .text(`Date d'échéance / Due Date: `, 50, startY + 30)
        .font('Helvetica')
        .text(this.formatDate(data.paymentDueDate), 200, startY + 30);
    }

    doc.moveDown(2);
  }

  private generateAddresses(doc: PDFKit.PDFDocument, data: InvoiceData) {
    const startY = doc.y;

    // Issuer (left)
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('De / From:', 50, startY)
      .fontSize(10)
      .font('Helvetica')
      .text(data.issuer.name, 50, startY + 20)
      .text(data.issuer.address, 50, startY + 35)
      .text(`${data.issuer.postalCode} ${data.issuer.city}`, 50, startY + 50)
      .text(data.issuer.country, 50, startY + 65);

    if (data.issuer.siret) {
      doc.text(`SIRET: ${data.issuer.siret}`, 50, startY + 80);
    }
    if (data.issuer.vat) {
      doc.text(`TVA / VAT: ${data.issuer.vat}`, 50, startY + 95);
    }

    // Client (right)
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('À / To:', 300, startY)
      .fontSize(10)
      .font('Helvetica')
      .text(data.client.name, 300, startY + 20)
      .text(data.client.address, 300, startY + 35)
      .text(`${data.client.postalCode} ${data.client.city}`, 300, startY + 50)
      .text(data.client.country, 300, startY + 65);

    doc.moveDown(6);
  }

  private generateLineItemsTable(doc: PDFKit.PDFDocument, data: InvoiceData) {
    const tableTop = doc.y + 20;
    const itemCodeX = 50;
    const descriptionX = 150;
    const quantityX = 320;
    const priceX = 390;
    const totalX = 470;

    // Table header
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Description', descriptionX, tableTop)
      .text('Qté', quantityX, tableTop)
      .text('Prix U.', priceX, tableTop)
      .text('Total', totalX, tableTop);

    // Draw header line
    doc
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    // Table rows
    let y = tableTop + 25;
    doc.font('Helvetica');

    data.lineItems.forEach((item) => {
      doc
        .text(item.description, descriptionX, y, { width: 150 })
        .text(item.quantity.toString(), quantityX, y)
        .text(`${this.formatCurrency(item.unitPrice)}`, priceX, y)
        .text(`${this.formatCurrency(item.total)}`, totalX, y);

      y += 20;
    });

    // Draw bottom line
    doc
      .moveTo(50, y)
      .lineTo(550, y)
      .stroke();

    doc.y = y + 10;
  }

  private generateSummary(doc: PDFKit.PDFDocument, data: InvoiceData) {
    const summaryTop = doc.y + 20;
    const labelX = 350;
    const valueX = 470;

    doc
      .fontSize(10)
      .font('Helvetica')
      .text('Sous-total HT / Subtotal:', labelX, summaryTop)
      .text(this.formatCurrency(data.subtotal), valueX, summaryTop)
      .text(`TVA / VAT (${data.taxRate}%):`, labelX, summaryTop + 15)
      .text(this.formatCurrency(data.taxAmount), valueX, summaryTop + 15)
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Total TTC / Total:', labelX, summaryTop + 35)
      .text(this.formatCurrency(data.totalAmount), valueX, summaryTop + 35);

    // Commission info (for artisan reference)
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#666666')
      .text(
        `Commission plateforme (${data.platformCommissionRate}%): ${this.formatCurrency(data.platformCommission)}`,
        labelX,
        summaryTop + 55,
      )
      .text(`Net artisan: ${this.formatCurrency(data.artisanNetAmount)}`, labelX, summaryTop + 68)
      .fillColor('#000000');

    doc.y = summaryTop + 90;
  }

  private generateNotes(doc: PDFKit.PDFDocument, notes: string) {
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Notes:', 50, doc.y + 20)
      .font('Helvetica')
      .text(notes, 50, doc.y + 5, { width: 500 });
  }

  private generateFooter(doc: PDFKit.PDFDocument) {
    const footerY = 750;

    doc
      .fontSize(8)
      .fillColor('#666666')
      .text('ArtiConnect - Plateforme de mise en relation artisans-clients', 50, footerY, {
        align: 'center',
        width: 500,
      })
      .text('www.articonnect.com', 50, footerY + 12, { align: 'center', width: 500 });
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  private formatCurrency(amount: number): string {
    return `${amount.toFixed(2)} €`;
  }
}
