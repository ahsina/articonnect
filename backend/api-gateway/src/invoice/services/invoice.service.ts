import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { UpdateInvoiceDto } from '../dto/update-invoice.dto';
import { PdfGeneratorService } from './pdf-generator.service';
import { S3Service } from '../../upload/services/s3.service';
import { Prisma, InvoiceType } from '@prisma/client';
import { PlatformConfigService } from '../../config/services/platform-config.service';

@Injectable()
export class InvoiceService {
  constructor(
    private prisma: PrismaService,
    private pdfGenerator: PdfGeneratorService,
    private s3Service: S3Service,
    private platformConfig: PlatformConfigService,
  ) {}

  /**
   * Generate next invoice number for the current year
   * Format: INV-YYYY-XXXXX (e.g., INV-2025-00001)
   */
  private async generateInvoiceNumber(): Promise<{
    invoiceNumber: string;
    year: number;
    sequenceNumber: number;
  }> {
    const currentYear = new Date().getFullYear();

    // Get or create sequence for current year
    const sequence = await this.prisma.$transaction(async (tx) => {
      let seq = await tx.invoiceSequence.findUnique({
        where: { year: currentYear },
      });

      if (!seq) {
        seq = await tx.invoiceSequence.create({
          data: {
            year: currentYear,
            lastSequence: 0,
          },
        });
      }

      // Increment sequence
      const updated = await tx.invoiceSequence.update({
        where: { year: currentYear },
        data: { lastSequence: { increment: 1 } },
      });

      return updated;
    });

    const paddedNumber = sequence.lastSequence.toString().padStart(5, '0');
    const invoiceNumber = `INV-${currentYear}-${paddedNumber}`;

    return {
      invoiceNumber,
      year: currentYear,
      sequenceNumber: sequence.lastSequence,
    };
  }

  /**
   * Calculate tax amount and total
   * @param platformCommissionRate - Commission rate from PlatformConfigService (defaults to 12 if not provided)
   */
  private calculateAmounts(subtotal: number, taxRate: number, platformCommissionRate: number) {
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;
    const platformCommission = (subtotal * platformCommissionRate) / 100;
    const artisanNetAmount = subtotal - platformCommission;

    return {
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      platformCommission: parseFloat(platformCommission.toFixed(2)),
      artisanNetAmount: parseFloat(artisanNetAmount.toFixed(2)),
    };
  }

  /**
   * Create an invoice
   */
  async create(createInvoiceDto: CreateInvoiceDto) {
    // Generate invoice number
    const { invoiceNumber, year, sequenceNumber } = await this.generateInvoiceNumber();

    // Get configurable commission rate
    const feeSettings = await this.platformConfig.getFeeSettings();
    const platformCommissionRate = feeSettings.platformCommissionRate; // Default 12%

    // Calculate amounts with configurable commission rate
    const amounts = this.calculateAmounts(
      createInvoiceDto.subtotal,
      createInvoiceDto.taxRate,
      platformCommissionRate,
    );

    // Create invoice
    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        year,
        sequenceNumber,
        type: createInvoiceDto.type,
        missionId: createInvoiceDto.missionId,
        orderId: createInvoiceDto.orderId,
        noShowEventId: createInvoiceDto.noShowEventId,
        issuerId: createInvoiceDto.issuerId,
        clientId: createInvoiceDto.clientId,
        subtotal: createInvoiceDto.subtotal,
        taxRate: createInvoiceDto.taxRate,
        taxAmount: amounts.taxAmount,
        totalAmount: amounts.totalAmount,
        platformCommissionRate: platformCommissionRate,
        platformCommission: amounts.platformCommission,
        artisanNetAmount: amounts.artisanNetAmount,
        lineItems: createInvoiceDto.lineItems as unknown as Prisma.InputJsonValue,
        issuerAddress: createInvoiceDto.issuerAddress as unknown as Prisma.InputJsonValue,
        clientAddress: createInvoiceDto.clientAddress as unknown as Prisma.InputJsonValue,
        paymentDueDate: createInvoiceDto.paymentDueDate,
        notes: createInvoiceDto.notes,
      },
      include: {
        issuer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        client: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return invoice;
  }

  /**
   * Generate PDF for an invoice
   */
  async generatePDF(invoiceId: string, requester?: { userId: string; isAdmin: boolean }): Promise<string> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        issuer: true,
        client: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // SÉCURITÉ : ownership (émetteur / client / admin).
    if (requester && !requester.isAdmin &&
        invoice.issuerId !== requester.userId &&
        invoice.clientId !== requester.userId) {
      throw new NotFoundException('Invoice not found');
    }

    // Generate PDF
    const pdfBuffer = await this.pdfGenerator.generateInvoicePDF({
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      paymentDueDate: invoice.paymentDueDate,
      issuer: invoice.issuerAddress as any,
      client: invoice.clientAddress as any,
      lineItems: invoice.lineItems as any,
      subtotal: parseFloat(invoice.subtotal.toString()),
      taxRate: parseFloat(invoice.taxRate.toString()),
      taxAmount: parseFloat(invoice.taxAmount.toString()),
      totalAmount: parseFloat(invoice.totalAmount.toString()),
      platformCommissionRate: parseFloat(invoice.platformCommissionRate.toString()),
      platformCommission: parseFloat(invoice.platformCommission.toString()),
      artisanNetAmount: parseFloat(invoice.artisanNetAmount.toString()),
      notes: invoice.notes,
    });

    // Upload PDF to S3
    const fileName = `invoices/${invoice.invoiceNumber}.pdf`;
    const pdfUrl = await this.s3Service.uploadBuffer(
      pdfBuffer,
      fileName,
      'application/pdf',
    );

    // Update invoice with PDF URL
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { pdfUrl },
    });

    return pdfUrl;
  }

  /**
   * Issue an invoice (change status from DRAFT to ISSUED and generate PDF)
   */
  async issue(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Only draft invoices can be issued');
    }

    // Generate PDF
    const pdfUrl = await this.generatePDF(invoiceId);

    // Update status to ISSUED
    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'ISSUED',
        pdfUrl,
      },
      include: {
        issuer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        client: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Mark invoice as paid
   */
  async markAsPaid(invoiceId: string) {
    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });
  }

  /**
   * Find all invoices with filters
   */
  async findAll(filters: {
    issuerId?: string;
    clientId?: string;
    status?: string;
    type?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
    requesterUserId?: string;
    isAdmin?: boolean;
  }) {
    const { page = 1, limit = 20, requesterUserId, isAdmin, ...where } = filters;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.InvoiceWhereInput = {};

    // SÉCURITÉ : un non-admin ne voit QUE ses factures (émetteur ou client) ; on ignore les filtres
    // issuerId/clientId fournis par le client (sinon IDOR : lecture des factures d'autrui).
    if (!isAdmin) {
      if (!requesterUserId) throw new ForbiddenException('Non autorisé');
      whereClause.OR = [{ issuerId: requesterUserId }, { clientId: requesterUserId }];
    } else {
      if (where.issuerId) whereClause.issuerId = where.issuerId;
      if (where.clientId) whereClause.clientId = where.clientId;
    }
    if (where.status) whereClause.status = where.status as any;
    if (where.type) whereClause.type = where.type as any;

    if (where.startDate || where.endDate) {
      whereClause.issueDate = {};
      if (where.startDate) whereClause.issueDate.gte = where.startDate;
      if (where.endDate) whereClause.issueDate.lte = where.endDate;
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where: whereClause,
        include: {
          issuer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          client: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { issueDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where: whereClause }),
    ]);

    return {
      invoices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find one invoice by ID
   */
  async findOne(id: string, requester?: { userId: string; isAdmin: boolean }) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        issuer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        client: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        mission: true,
        order: true,
        noShowEvent: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // SÉCURITÉ : seuls l'émetteur (artisan), le client propriétaire ou un admin peuvent lire la facture.
    if (requester && !requester.isAdmin &&
        invoice.issuerId !== requester.userId &&
        invoice.clientId !== requester.userId) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  /**
   * Find invoice by invoice number
   */
  async findByInvoiceNumber(invoiceNumber: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: {
        issuer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        client: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  /**
   * Update invoice (only allowed for DRAFT invoices)
   */
  async update(id: string, updateInvoiceDto: UpdateInvoiceDto) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status !== 'DRAFT' && Object.keys(updateInvoiceDto).length > 1) {
      throw new BadRequestException('Only draft invoices can be fully updated');
    }

    // Recalculate amounts if subtotal or taxRate changed
    let updateData: any = { ...updateInvoiceDto };

    if (updateInvoiceDto.subtotal !== undefined || updateInvoiceDto.taxRate !== undefined) {
      const subtotal = updateInvoiceDto.subtotal ?? parseFloat(invoice.subtotal.toString());
      const taxRate = updateInvoiceDto.taxRate ?? parseFloat(invoice.taxRate.toString());
      // Use existing invoice's commission rate when recalculating
      const commissionRate = parseFloat(invoice.platformCommissionRate.toString());
      const amounts = this.calculateAmounts(subtotal, taxRate, commissionRate);

      updateData = {
        ...updateData,
        ...amounts,
      };
    }

    return this.prisma.invoice.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Cancel an invoice
   */
  async cancel(id: string) {
    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  /**
   * Delete invoice (only DRAFT or CANCELLED)
   */
  async remove(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status !== 'DRAFT' && invoice.status !== 'CANCELLED') {
      throw new BadRequestException('Only draft or cancelled invoices can be deleted');
    }

    return this.prisma.invoice.delete({
      where: { id },
    });
  }

  /**
   * Auto-generate invoice from Mission
   */
  async createFromMission(missionId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        client: true,
        artisan: {
          include: {
            artisanProfile: true,
          },
        },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    if (!mission.artisan) {
      throw new BadRequestException('Mission has no artisan assigned');
    }

    // Build line items
    const lineItems = [
      {
        description: mission.title,
        quantity: 1,
        unitPrice: parseFloat(mission.finalPrice?.toString() || mission.agreedPrice?.toString() || '0'),
        total: parseFloat(mission.finalPrice?.toString() || mission.agreedPrice?.toString() || '0'),
      },
    ];

    const subtotal = lineItems[0].total;

    // Build addresses
    const issuerAddress = {
      name: `${mission.artisan.firstName} ${mission.artisan.lastName}`,
      address: mission.artisan.artisanProfile?.baseAddress || mission.address,
      city: mission.city,
      postalCode: mission.postalCode,
      country: mission.country,
      siret: mission.artisan.artisanProfile?.siret || undefined,
      vat: mission.artisan.artisanProfile?.vatNumber || undefined,
    };

    const clientAddress = {
      name: `${mission.client.firstName} ${mission.client.lastName}`,
      address: mission.address,
      city: mission.city,
      postalCode: mission.postalCode,
      country: mission.country,
    };

    // Create invoice
    return this.create({
      type: InvoiceType.MISSION,
      missionId: mission.id,
      issuerId: mission.artisanId!,
      clientId: mission.clientId,
      subtotal,
      taxRate: parseFloat(mission.vatRate.toString()),
      lineItems,
      issuerAddress: issuerAddress as any,
      clientAddress: clientAddress as any,
      paymentDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      notes: `Prestation réalisée le ${mission.completedAt ? new Date(mission.completedAt).toLocaleDateString('fr-FR') : 'N/A'}`,
    });
  }

  /**
   * Convertir un devis signé/accepté en facture.
   *
   * Implémente l'étape « convertir devis -> facture » du cycle :
   *  - reprend les lignes, montants, taux de TVA et adresses du devis (cohérence garantie,
   *    plus de re-saisie manuelle) ;
   *  - lie la facture à la même mission que le devis (missionId) quand elle existe ;
   *  - référence le numéro de devis dans les notes (traçabilité) ;
   *  - bascule le devis en CONVERTED pour matérialiser la conversion.
   *
   * Le devis doit être ACCEPTED (donc signé) : on ne facture pas un devis non accepté.
   */
  async createFromQuote(quoteId: string, requester?: { userId: string; isAdmin: boolean }) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        lineItems: { orderBy: { position: 'asc' } },
        client: true,
        artisan: { include: { artisanProfile: true } },
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    // SÉCURITÉ : seul l'artisan émetteur du devis (ou un admin) peut le convertir.
    if (requester && !requester.isAdmin && quote.artisanId !== requester.userId) {
      throw new ForbiddenException('Non autorisé');
    }

    if (quote.status !== 'ACCEPTED') {
      throw new BadRequestException(
        `Seul un devis accepté (signé) peut être converti en facture (statut actuel : ${quote.status}).`,
      );
    }

    if (!quote.artisan) {
      throw new BadRequestException('Quote has no artisan');
    }

    // Reprise fidèle des lignes du devis.
    const lineItems = quote.lineItems.map((item) => ({
      description: item.description,
      quantity: parseFloat(item.quantity.toString()),
      unitPrice: parseFloat(item.unitPrice.toString()),
      total: parseFloat(item.totalPrice.toString()),
    }));

    const subtotal = parseFloat(quote.subtotal.toString());

    const issuerAddress = {
      name: `${quote.artisan.firstName} ${quote.artisan.lastName}`,
      address: quote.artisan.artisanProfile?.baseAddress || quote.address || 'N/A',
      city: quote.city || 'N/A',
      postalCode: quote.postalCode || 'N/A',
      country: quote.country || 'Luxembourg',
      siret: quote.artisan.artisanProfile?.siret || undefined,
      vat: quote.artisan.artisanProfile?.vatNumber || undefined,
    };

    const clientAddress = {
      name: `${quote.client.firstName} ${quote.client.lastName}`,
      address: quote.address || 'N/A',
      city: quote.city || 'N/A',
      postalCode: quote.postalCode || 'N/A',
      country: quote.country || 'Luxembourg',
    };

    const invoice = await this.create({
      type: InvoiceType.MISSION,
      missionId: quote.missionId || undefined,
      issuerId: quote.artisanId,
      clientId: quote.clientId,
      subtotal,
      taxRate: parseFloat(quote.taxRate.toString()),
      lineItems,
      issuerAddress: issuerAddress as any,
      clientAddress: clientAddress as any,
      paymentDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      notes: `Facture émise à partir du devis ${quote.quoteNumber} accepté le ${
        quote.acceptedAt ? new Date(quote.acceptedAt).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')
      }.`,
    });

    // Lien structurel devis -> facture (colonne Invoice.quoteId) : traçabilité + anti-doublon.
    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { quoteId: quote.id },
    });

    // Matérialise la conversion : le devis passe en CONVERTED (évite les factures multiples).
    await this.prisma.quote.update({
      where: { id: quote.id },
      data: { status: 'CONVERTED' as any },
    });

    return { ...invoice, quoteId: quote.id };
  }

  /**
   * Auto-generate invoice from Order
   */
  async createFromOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        client: true,
        items: {
          include: {
            product: {
              include: {
                artisan: {
                  include: {
                    artisanProfile: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // For now, assume one artisan per order (first product's artisan)
    const artisan = order.items[0]?.product.artisan;
    if (!artisan) {
      throw new BadRequestException('Order has no artisan');
    }

    // Build line items
    const lineItems = order.items.map((item) => ({
      description: `${item.product.name} x${item.quantity}`,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unitPrice.toString()),
      total: parseFloat(item.totalPrice.toString()),
    }));

    const subtotal = parseFloat(order.subtotal.toString());

    // Build addresses
    const issuerAddress = {
      name: `${artisan.firstName} ${artisan.lastName}`,
      address: artisan.artisanProfile?.baseAddress || 'N/A',
      city: 'N/A',
      postalCode: 'N/A',
      country: 'Luxembourg',
      siret: artisan.artisanProfile?.siret || undefined,
      vat: artisan.artisanProfile?.vatNumber || undefined,
    };

    const clientAddress = {
      name: `${order.client.firstName} ${order.client.lastName}`,
      address: order.shippingAddress,
      city: 'N/A',
      postalCode: 'N/A',
      country: 'Luxembourg',
    };

    // Calculate VAT rate
    const vatRate = ((parseFloat(order.vat.toString()) / subtotal) * 100).toFixed(2);

    // Create invoice
    return this.create({
      type: InvoiceType.MARKETPLACE,
      orderId: order.id,
      issuerId: artisan.id,
      clientId: order.clientId,
      subtotal,
      taxRate: parseFloat(vatRate),
      lineItems,
      issuerAddress: issuerAddress as any,
      clientAddress: clientAddress as any,
      paymentDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
}
