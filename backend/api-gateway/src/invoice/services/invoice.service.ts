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
   * @param minCommissionAmount - Plancher de commission EN CENTIMES (cf. FeeSettingsDto). 0 = pas de plancher.
   * @param maxCommissionAmount - Plafond de commission EN CENTIMES (cf. FeeSettingsDto). 0 = pas de plafond.
   *
   * Intégrité commission : la commission facturée applique réellement le plancher/plafond configurés
   * (jusqu'ici code mort) et n'est JAMAIS nulle. Elle ne peut pas dépasser le sous-total (net artisan >= 0).
   */
  private calculateAmounts(
    subtotal: number,
    taxRate: number,
    platformCommissionRate: number,
    minCommissionAmount = 0,
    maxCommissionAmount = 0,
  ) {
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;

    const floorEuros = (Number(minCommissionAmount) || 0) / 100; // centimes -> euros
    const capEuros = (Number(maxCommissionAmount) || 0) / 100; // centimes -> euros
    let platformCommission = (subtotal * platformCommissionRate) / 100;
    if (floorEuros > 0) platformCommission = Math.max(platformCommission, floorEuros);
    if (capEuros > 0) platformCommission = Math.min(platformCommission, capEuros);
    // Jamais <= 0 ; jamais > sous-total (sinon net artisan négatif).
    platformCommission = Math.max(platformCommission, 0.01);
    platformCommission = Math.min(platformCommission, subtotal);

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

    // Calculate amounts with configurable commission rate + plancher/plafond appliqués.
    const amounts = this.calculateAmounts(
      createInvoiceDto.subtotal,
      createInvoiceDto.taxRate,
      platformCommissionRate,
      feeSettings.minCommissionAmount,
      feeSettings.maxCommissionAmount,
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
   * Marquer une facture PAYÉE.
   *
   * INTÉGRITÉ COMMISSION (anti-désintermédiation façon Uber) : une facture ne peut PLUS être
   * auto-déclarée « payée » par l'artisan. Le passage à PAID exige la PREUVE d'un encaissement
   * réel par la plateforme (escrow) — c.-à-d. une Transaction liée à la mission (ou à la commande)
   * dont le statut prouve la détention/capture des fonds (HELD ou COMPLETED). Sans cela, l'artisan
   * pourrait se faire régler en direct (cash/virement) puis marquer la facture payée dans l'app,
   * la plateforme ne touchant jamais sa commission. Ceci ferme aussi la piste devis -> facture
   * 100 % hors escrow : une facture issue d'un devis reste NON payable tant que le paiement n'a pas
   * transité par la plateforme.
   *
   * @param requester (optionnel) émetteur/admin — vérification d'ownership quand disponible.
   */
  async markAsPaid(invoiceId: string, requester?: { userId: string; isAdmin: boolean }) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        mission: { include: { transaction: true } },
        order: { include: { transaction: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Ownership : seul l'émetteur (artisan) ou un admin peut agir sur la facture.
    if (requester && !requester.isAdmin && invoice.issuerId !== requester.userId) {
      throw new NotFoundException('Invoice not found');
    }

    // Idempotence : déjà payée -> renvoyer tel quel.
    if (invoice.status === 'PAID') {
      return invoice;
    }

    if (invoice.status === 'CANCELLED' || invoice.status === 'REFUNDED') {
      throw new BadRequestException('Une facture annulée ou remboursée ne peut pas être marquée payée.');
    }

    // Preuve d'encaissement plateforme (escrow) : fonds détenus (HELD) ou versés (COMPLETED).
    const settlementTx = invoice.mission?.transaction ?? invoice.order?.transaction ?? null;
    const platformCollected =
      !!settlementTx && ['HELD', 'COMPLETED'].includes(settlementTx.status as string);

    if (!platformCollected) {
      throw new ForbiddenException(
        "Cette facture ne peut être marquée payée qu'une fois le paiement encaissé via la plateforme (escrow). " +
          "Le règlement hors plateforme (cash / virement direct) n'est pas autorisé : le paiement doit passer par Krafolt pour que la commission soit prélevée.",
      );
    }

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
      // Plancher/plafond appliqués aussi au recalcul (intégrité commission).
      const feeSettings = await this.platformConfig.getFeeSettings();
      const amounts = this.calculateAmounts(
        subtotal,
        taxRate,
        commissionRate,
        feeSettings.minCommissionAmount,
        feeSettings.maxCommissionAmount,
      );

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
   * Génère la/les facture(s) de VENTE d'une commande marketplace réglée.
   *
   * Une commande peut mêler des produits de PLUSIEURS vendeurs (artisans) : on émet alors UNE facture
   * par vendeur (issuerId = ce vendeur), ne reprenant QUE ses lignes, avec la TVA calculée ligne par
   * ligne selon le `vatRate` DU PRODUIT (et donc de la variante achetée, dont le prix est déjà figé
   * dans OrderItem.unitPrice/totalPrice). Le vendeur récupère ensuite sa facture (PDF) via /invoices.
   *
   * IDEMPOTENT : si une facture non annulée existe déjà pour (commande, vendeur), on ne la recrée pas.
   * Peut donc être appelé plusieurs fois (au règlement, puis en filet de sécurité à la lecture des
   * ventes) sans produire de doublon.
   *
   * @param opts.requirePaid (défaut true) : n'émet que pour une commande réellement encaissée
   *   (statut PAID/PROCESSING/SHIPPED/DELIVERED). La facture de vente est un document post-règlement.
   */
  async generateInvoicesForOrder(
    orderId: string,
    opts: { requirePaid?: boolean } = {},
  ): Promise<{ created: any[]; skipped: string[]; reason?: string }> {
    const requirePaid = opts.requirePaid ?? true;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        client: true,
        items: {
          include: {
            product: {
              include: {
                artisan: { include: { artisanProfile: true } },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const paidStatuses = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    if (requirePaid && !paidStatuses.includes(order.status as string)) {
      // Commande non encore encaissée : aucune facture de vente à émettre.
      return { created: [], skipped: [], reason: 'ORDER_NOT_PAID' };
    }

    // Regroupe les lignes par vendeur (artisan) — une facture par vendeur.
    const bySeller = new Map<string, typeof order.items>();
    for (const item of order.items) {
      const artisanId = item.product?.artisanId;
      if (!artisanId) continue;
      const arr = bySeller.get(artisanId) ?? [];
      arr.push(item);
      bySeller.set(artisanId, arr);
    }

    if (bySeller.size === 0) {
      throw new BadRequestException('Order has no artisan');
    }

    // STATUT FINAL DE LA FACTURE DE VENTE (conformité fiscale) : une facture de vente ne doit JAMAIS
    // rester en DRAFT une fois la commande encaissée. Quand la commande est réellement réglée
    // (PAID/PROCESSING/SHIPPED/DELIVERED, cf. paidStatuses), la facture est émise ET marquée payée
    // (statut PAID + paidAt) puisque les fonds ont bien transité par la plateforme (escrow) — l'ordre
    // « ISSUED puis PAID » est court-circuité vers PAID car l'encaissement est déjà prouvé par le
    // statut de la commande. GARDE : on n'émet PAID que si la commande est réellement encaissée ;
    // sinon (émission manuelle anticipée via createFromOrder, requirePaid:false) la facture reste en
    // brouillon jusqu'au règlement.
    const orderPaid = paidStatuses.includes(order.status as string);
    const finalizeData = orderPaid
      ? { status: 'PAID' as const, paidAt: new Date() }
      : null;

    // Factures déjà émises pour cette commande (idempotence par vendeur). On récupère aussi le statut
    // pour pouvoir FINALISER une facture laissée en DRAFT sur une commande depuis encaissée (rattrapage),
    // tout en ne retouchant jamais une facture déjà finalisée (ISSUED/PAID/OVERDUE/REFUNDED).
    const existing = await this.prisma.invoice.findMany({
      where: { orderId: order.id, status: { not: 'CANCELLED' } },
      select: { id: true, issuerId: true, status: true },
    });
    const existingBySeller = new Map(existing.map((e) => [e.issuerId, e]));

    const created: any[] = [];
    const skipped: string[] = [];

    for (const [artisanId, items] of bySeller.entries()) {
      const prior = existingBySeller.get(artisanId);
      if (prior) {
        // Une facture non annulée existe déjà pour ce vendeur.
        if (prior.status === 'DRAFT' && finalizeData) {
          // Rattrapage : brouillon sur commande encaissée -> on la finalise (émise + payée).
          const finalized = await this.prisma.invoice.update({
            where: { id: prior.id },
            data: finalizeData,
          });
          created.push(finalized);
        } else {
          // Déjà finalisée (ou commande non encore encaissée) : idempotent, on ne retouche rien.
          skipped.push(artisanId);
        }
        continue;
      }

      const artisan = items[0].product.artisan;

      // Sous-total vendeur + TVA calculée LIGNE PAR LIGNE selon le taux du produit.
      let subtotal = 0;
      let taxAmount = 0;
      const lineItems = items.map((item) => {
        const lineTotal = parseFloat(item.totalPrice.toString());
        const rate = parseFloat((item.product.vatRate ?? 0).toString());
        subtotal += lineTotal;
        taxAmount += (lineTotal * rate) / 100;
        return {
          description: `${item.product.name} x${item.quantity}`,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unitPrice.toString()),
          total: lineTotal,
        };
      });
      subtotal = Math.round(subtotal * 100) / 100;
      taxAmount = Math.round(taxAmount * 100) / 100;

      // Invoice ne porte qu'UN taux de TVA : on passe le taux EFFECTIF (moyenne pondérée) pour que
      // create() (taxAmount = subtotal * taxRate / 100) retrouve exactement la TVA ligne par ligne.
      const effectiveRate =
        subtotal > 0 ? Math.round((taxAmount / subtotal) * 10000) / 100 : 0;

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

      const invoice = await this.create({
        type: InvoiceType.MARKETPLACE,
        orderId: order.id,
        issuerId: artisanId,
        clientId: order.clientId,
        subtotal,
        taxRate: effectiveRate,
        lineItems,
        issuerAddress: issuerAddress as any,
        clientAddress: clientAddress as any,
        paymentDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      // create() pose toujours le défaut DRAFT : on finalise immédiatement (émise + payée) quand la
      // commande est encaissée, pour ne jamais laisser une facture de vente en brouillon.
      if (finalizeData) {
        const finalized = await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: finalizeData,
        });
        created.push(finalized);
      } else {
        created.push(invoice);
      }
    }

    return { created, skipped };
  }

  /**
   * Auto-generate invoice(s) from Order (endpoint manuel admin/artisan).
   * Délègue à generateInvoicesForOrder (une facture par vendeur). `requirePaid: false` : l'appel
   * manuel peut précéder l'automatisation. Renvoie la facture unique ou le tableau si multi-vendeurs.
   */
  async createFromOrder(orderId: string) {
    const { created } = await this.generateInvoicesForOrder(orderId, {
      requirePaid: false,
    });
    return created.length === 1 ? created[0] : created;
  }
}
