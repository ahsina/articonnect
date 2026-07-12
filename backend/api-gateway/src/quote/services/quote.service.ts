import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../../notification/services/notification.service';
import {
  CreateQuoteDto,
  UpdateQuoteDto,
  SendQuoteDto,
  RespondToQuoteDto,
  QuoteFilterDto,
  QuoteStatus,
  LineItemType,
} from '../dto/quote.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { QuoteTotals } from '../../common/types/json-fields.types';
import { ContactRevealService } from '../../mission/services/contact-reveal.service';
import { PdfService } from '../../documents/services/pdf.service';

@Injectable()
export class QuoteService {
  private readonly logger = new Logger(QuoteService.name);

  // Révélation de contact time-boxée + auditée + révocable (anti-désintermédiation), partagée avec
  // MissionService. Instanciée manuellement (pas de provider dédié) : même connexion Prisma.
  private readonly contactReveal: ContactRevealService;

  constructor(
    private prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly pdfService: PdfService,
  ) {
    this.contactReveal = new ContactRevealService(this.prisma);
  }

  /**
   * Include Prisma standard pour la mission liée à un devis : fournit tout ce dont la couche de
   * révélation a besoin (preuve d'escrow + dates de clôture pour le time-box + parties de la mission).
   */
  private static readonly MISSION_REVEAL_SELECT = {
    id: true,
    title: true,
    status: true,
    clientId: true,
    artisanId: true,
    depositPaidAt: true,
    completedAt: true,
    validatedAt: true,
    autoValidatedAt: true,
    transaction: { select: { status: true } },
  };

  /**
   * Masque les coordonnées réelles (email/téléphone/nom de famille) d'un utilisateur tant que la
   * révélation n'est pas autorisée. Avant révélation : prénom + initiale du nom. L'EMAIL n'est JAMAIS
   * exposé (politique messaging-first phone-only, on pousse vers le chat in-app filtré).
   */
  private maskQuoteUserContact(user: any, reveal: boolean): any {
    if (!user) return user;
    if (reveal) {
      // Fenêtre active : téléphone révélé, mais email toujours masqué.
      return { ...user, email: null };
    }
    const { phone: _phone, email: _email, lastName, ...rest } = user;
    return {
      ...rest,
      lastName: lastName ? `${String(lastName).charAt(0)}.` : null,
      phone: null,
      email: null,
    };
  }

  /**
   * « Payée en escrow » au sens révélation (façon Uber) : Transaction HELD/COMPLETED, depositPaidAt
   * posé, ou mission dans un statut avancé (atteignable seulement après sécurisation réelle des fonds).
   * Sans mission liée : jamais d'escrow → aucune révélation croisée.
   */
  private isQuoteEscrowSecured(mission: any): boolean {
    if (!mission) return false;
    const txStatus = mission.transaction?.status;
    return (
      !!mission.depositPaidAt ||
      txStatus === 'HELD' ||
      txStatus === 'COMPLETED' ||
      QuoteService.PAID_MISSION_STATUSES.includes(String(mission.status))
    );
  }

  /**
   * Applique le masquage anti-désintermédiation au CLIENT et à l'ARTISAN d'un devis (mutation en place
   * de quote.client / quote.artisan). Le contact croisé n'est révélé que si la mission liée est payée
   * en escrow ET dans sa fenêtre active (COMPLETED/AUTO_VALIDATED + 72h de grâce, puis re-masquage),
   * uniquement pour le client et l'artisan effectivement assigné. La décision croisée est déléguée à
   * ContactRevealService (audit ContactRevealLog + refus des viewers `leakageFlagged`). Un devis sans
   * mission liée (ou hors fenêtre) → aucune révélation croisée (fail-closed).
   */
  private async maskQuoteParties(quote: any, userId: string): Promise<any> {
    if (!quote) return quote;

    const mission = quote.mission ?? null;
    const isClientViewer = userId === quote.clientId;
    const isAssignedArtisanViewer =
      userId === quote.artisanId &&
      (mission?.artisanId == null || mission.artisanId === userId);
    const escrowSecured = this.isQuoteEscrowSecured(mission);

    // Par défaut : chaque partie voit sa propre donnée (email quand même masqué), rien d'autre.
    let revealClientContact = isClientViewer;
    let revealArtisanContact = isAssignedArtisanViewer;

    if (mission?.id) {
      // Chemin audité + time-boxé + révocable, mutualisé avec MissionService.
      const resolved = await this.contactReveal.resolveContactReveal({
        mission,
        userId,
        isAdmin: false,
        isClientViewer,
        isAssignedArtisanViewer,
        escrowSecured,
      });
      // Le contact croisé ne s'applique qu'aux parties EFFECTIVEMENT liées à cette mission
      // (un autre soumissionnaire ne récupère jamais le contact via son propre devis).
      if (mission.clientId === quote.clientId) {
        revealClientContact = resolved.revealClientContact;
      }
      if (mission.artisanId === quote.artisanId) {
        revealArtisanContact = resolved.revealArtisanContact;
      }
    }

    if (quote.client) {
      quote.client = this.maskQuoteUserContact(quote.client, revealClientContact);
    }
    if (quote.artisan) {
      quote.artisan = this.maskQuoteUserContact(quote.artisan, revealArtisanContact);
    }
    return quote;
  }

  /**
   * Garde anti-moisson : refuse la création d'un devis vers un clientId avec lequel l'artisan n'a
   * AUCUNE relation vérifiable (sinon POST /quotes devient un oracle d'emails par userId).
   *  - Devis rattaché à une mission → l'artisan doit y être impliqué (assigné ou a fait une offre) et
   *    la mission doit appartenir au client visé.
   *  - Devis « libre » → exiger une relation préexistante (négociation passée ou mission commune).
   */
  private async assertQuoteRelationAllowed(
    artisanId: string,
    clientId: string,
    missionId?: string,
  ): Promise<void> {
    if (missionId) {
      const mission = await this.prisma.mission.findUnique({
        where: { id: missionId },
        select: { id: true, clientId: true, artisanId: true },
      });
      if (!mission) {
        throw new ForbiddenException('Devis non autorisé : mission introuvable');
      }
      if (mission.clientId !== clientId) {
        throw new ForbiddenException(
          'Devis non autorisé : aucune relation avec ce client',
        );
      }
      if (mission.artisanId === artisanId) {
        return; // artisan assigné à la mission
      }
      const nego = await this.prisma.negotiation.findFirst({
        where: { missionId, OR: [{ senderId: artisanId }, { receiverId: artisanId }] },
        select: { id: true },
      });
      if (nego) return; // artisan a fait une offre / négocié sur cette mission
      throw new ForbiddenException('Devis non autorisé : aucune relation avec ce client');
    }

    // Devis sans mission : exiger une relation préexistante entre l'artisan et le client.
    const [nego, mission] = await Promise.all([
      this.prisma.negotiation.findFirst({
        where: {
          OR: [
            { senderId: artisanId, receiverId: clientId },
            { senderId: clientId, receiverId: artisanId },
          ],
        },
        select: { id: true },
      }),
      this.prisma.mission.findFirst({
        where: { clientId, artisanId },
        select: { id: true },
      }),
    ]);
    if (!nego && !mission) {
      throw new ForbiddenException('Devis non autorisé : aucune relation avec ce client');
    }
  }

  /**
   * Notifie un utilisateur d'un évènement lié à un devis (best-effort : un échec
   * de notification ne doit pas faire échouer l'opération métier).
   */
  private async notifyQuoteEvent(
    userId: string,
    title: string,
    message: string,
    link: string,
  ): Promise<void> {
    try {
      await this.notificationService.createNotification(
        userId,
        NotificationType.SYSTEM,
        title,
        message,
        link,
      );
    } catch (error) {
      this.logger.error(`Failed to send quote notification to ${userId}`, error as Error);
    }
  }

  private async generateQuoteNumber(): Promise<string> {
    const year = new Date().getFullYear();

    const sequence = await this.prisma.quoteSequence.upsert({
      where: { year },
      create: { year, lastSequence: 1 },
      update: { lastSequence: { increment: 1 } },
    });

    return `QUO-${year}-${String(sequence.lastSequence).padStart(5, '0')}`;
  }

  private calculateTotals(lineItems: Array<{ itemType: string; quantity: number; unitPrice: number }>, discountPercent?: number, taxRate?: number): QuoteTotals {
    let laborTotal = 0;
    let materialsTotal = 0;
    let travelTotal = 0;
    let otherTotal = 0;

    for (const item of lineItems) {
      const total = item.quantity * item.unitPrice;
      switch (item.itemType) {
        case LineItemType.LABOR:
          laborTotal += total;
          break;
        case LineItemType.MATERIAL:
          materialsTotal += total;
          break;
        case LineItemType.TRAVEL:
          travelTotal += total;
          break;
        default:
          otherTotal += total;
      }
    }

    const subtotal = laborTotal + materialsTotal + travelTotal + otherTotal;
    const discountAmount = discountPercent ? subtotal * (discountPercent / 100) : 0;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxRate ? taxableAmount * (taxRate / 100) : 0;
    const totalAmount = taxableAmount + taxAmount;

    return {
      subtotal,
      laborTotal,
      materialsTotal,
      travelTotal,
      discountAmount,
      taxAmount,
      totalAmount,
    };
  }

  async create(artisanId: string, dto: CreateQuoteDto) {
    // Anti-moisson d'emails : l'artisan doit avoir une relation vérifiable avec le client visé.
    await this.assertQuoteRelationAllowed(artisanId, dto.clientId, dto.missionId);

    const quoteNumber = await this.generateQuoteNumber();
    const totals = this.calculateTotals(dto.lineItems, dto.discountPercent, dto.taxRate);

    const quote = await this.prisma.quote.create({
      data: {
        quoteNumber,
        artisanId,
        clientId: dto.clientId,
        missionId: dto.missionId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        address: dto.address,
        city: dto.city,
        postalCode: dto.postalCode,
        country: dto.country,
        subtotal: totals.subtotal,
        laborTotal: totals.laborTotal,
        materialsTotal: totals.materialsTotal,
        travelTotal: totals.travelTotal,
        discountAmount: totals.discountAmount,
        discountPercent: dto.discountPercent,
        taxRate: dto.taxRate,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        currency: dto.currency || 'EUR',
        validUntil: new Date(dto.validUntil),
        templateId: dto.templateId,
        termsAndConditions: dto.termsAndConditions,
        notes: dto.notes,
        internalNotes: dto.internalNotes,
        lineItems: {
          create: dto.lineItems.map((item, index) => ({
            itemType: item.itemType,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit || 'unit',
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            catalogItemId: item.catalogItemId,
            position: item.position ?? index,
          })),
        },
      },
      include: {
        lineItems: true,
        client: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        artisan: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        mission: { select: QuoteService.MISSION_REVEAL_SELECT },
      },
    });

    // Masquage anti-désintermédiation avant renvoi (plus aucun email/téléphone brut avant escrow).
    return this.maskQuoteParties(quote, artisanId);
  }

  async findAll(artisanId: string, filters: QuoteFilterDto) {
    const { status, clientId, category, fromDate, toDate, page = 1, limit = 20 } = filters;

    const where: any = { artisanId };

    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (category) where.category = category;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const [quotes, total] = await Promise.all([
      this.prisma.quote.findMany({
        where,
        include: {
          client: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          },
          lineItems: true,
          mission: { select: QuoteService.MISSION_REVEAL_SELECT },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.quote.count({ where }),
    ]);

    // Masquage anti-désintermédiation sur chaque devis listé (l'artisan ne récupère plus l'email/
    // téléphone brut de ses clients tant que la mission n'est pas payée en escrow).
    const maskedQuotes = await Promise.all(
      quotes.map((q) => this.maskQuoteParties(q, artisanId)),
    );

    return {
      data: maskedQuotes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Inbox CLIENT : liste les devis REÇUS par le client connecté (clientId = utilisateur courant).
   * Endpoint dédié au rôle CLIENT (findAll ci-dessus est réservé à l'ARTISAN émetteur). Les BROUILLONS
   * (DRAFT, pas encore envoyés) sont exclus par défaut : le client ne doit voir que les devis qui lui
   * ont effectivement été transmis. Le masquage anti-désintermédiation s'applique comme ailleurs
   * (l'artisan émetteur reste masqué tant que la mission liée n'est pas payée en escrow). Défaut de
   * pagination volontairement large (100) : la page inbox n'a pas de contrôle de pagination.
   */
  async findAllForClient(clientId: string, filters: QuoteFilterDto) {
    const { status, category, fromDate, toDate, page = 1, limit = 100 } = filters;

    const where: any = { clientId };

    if (status) {
      where.status = status;
    } else {
      // Sans filtre explicite, on masque les brouillons non envoyés.
      where.status = { not: QuoteStatus.DRAFT };
    }
    if (category) where.category = category;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const [quotes, total] = await Promise.all([
      this.prisma.quote.findMany({
        where,
        include: {
          artisan: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          },
          lineItems: true,
          mission: { select: QuoteService.MISSION_REVEAL_SELECT },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.quote.count({ where }),
    ]);

    // Masquage anti-désintermédiation sur chaque devis (le client ne récupère pas l'email/téléphone
    // brut de l'artisan tant que la mission liée n'est pas payée en escrow).
    const maskedQuotes = await Promise.all(
      quotes.map((q) => this.maskQuoteParties(q, clientId)),
    );

    return {
      data: maskedQuotes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Statuts de mission qui prouvent qu'un paiement escrow a bien été engagé (fonds bloqués
   * ou mission déjà en cours/terminée). Utilisé, avec Transaction.status HELD/COMPLETED, pour
   * décider si les coordonnées réelles peuvent être révélées (politique « à la Uber »).
   */
  private static readonly PAID_MISSION_STATUSES = [
    'PAID',
    'DEPOSIT_PAID',
    'IN_TRANSIT',
    'IN_PROGRESS',
    'COMPLETED',
    'AUTO_VALIDATED',
  ];

  async findOne(id: string, userId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        lineItems: {
          orderBy: { position: 'asc' },
          include: { catalogItem: true },
        },
        client: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        artisan: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        template: true,
        mission: { select: QuoteService.MISSION_REVEAL_SELECT },
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.artisanId !== userId && quote.clientId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Révélation des coordonnées TIME-BOXÉE + AUDITÉE + RÉVOCABLE (façon Uber) : conditionnée au
    // paiement escrow ET à la fenêtre active de la mission (COMPLETED/AUTO_VALIDATED + 72h de grâce,
    // puis re-masquage), uniquement pour le client et l'artisan assigné. Email jamais exposé.
    return this.maskQuoteParties(quote, userId);
  }

  /**
   * Génère le PDF du devis (mêmes lignes/qté/PU/TVA/remise/totaux/conditions/mentions légales que
   * l'affichage). Réutilise le générateur PDF PROUVÉ `PdfService.generateQuotePdf` (celui exposé par
   * /documents/pdf/quote/:id — libellé « DEVIS », coordonnées entreprise, SIRET/TVA, remise, CGV),
   * SANS le modifier. Ownership : artisan émetteur OU client destinataire (OU admin) — le
   * générateur documents n'ayant AUCUN contrôle d'accès (route artisan-only), la garde est ici.
   * Renvoie le buffer + le numéro de devis pour nommer le fichier téléchargé.
   */
  async generatePdf(
    id: string,
    userId: string,
    isAdmin = false,
  ): Promise<{ buffer: Buffer; quoteNumber: string }> {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      select: { id: true, quoteNumber: true, artisanId: true, clientId: true },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (!isAdmin && quote.artisanId !== userId && quote.clientId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const buffer = await this.pdfService.generateQuotePdf(id);
    return { buffer, quoteNumber: quote.quoteNumber };
  }

  async update(id: string, artisanId: string, dto: UpdateQuoteDto) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    if (quote.status !== QuoteStatus.DRAFT) {
      throw new BadRequestException('Can only edit draft quotes');
    }

    let totals: QuoteTotals | null = null;
    if (dto.lineItems) {
      totals = this.calculateTotals(dto.lineItems, dto.discountPercent ?? Number(quote.discountPercent), dto.taxRate ?? Number(quote.taxRate));

      // Delete existing line items and create new ones
      await this.prisma.quoteLineItem.deleteMany({ where: { quoteId: id } });
    }

    const updated = await this.prisma.quote.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        address: dto.address,
        city: dto.city,
        postalCode: dto.postalCode,
        country: dto.country,
        ...(totals && {
          subtotal: totals.subtotal,
          laborTotal: totals.laborTotal,
          materialsTotal: totals.materialsTotal,
          travelTotal: totals.travelTotal,
          discountAmount: totals.discountAmount,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
        }),
        discountPercent: dto.discountPercent,
        taxRate: dto.taxRate,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        termsAndConditions: dto.termsAndConditions,
        notes: dto.notes,
        internalNotes: dto.internalNotes,
        ...(dto.lineItems && {
          lineItems: {
            create: dto.lineItems.map((item, index) => ({
              itemType: item.itemType,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit || 'unit',
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
              catalogItemId: item.catalogItemId,
              position: item.position ?? index,
            })),
          },
        }),
      },
      include: {
        lineItems: true,
        client: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        mission: { select: QuoteService.MISSION_REVEAL_SELECT },
      },
    });

    // Masquage anti-désintermédiation avant renvoi.
    return this.maskQuoteParties(updated, artisanId);
  }

  async send(id: string, artisanId: string, dto: SendQuoteDto) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    if (quote.status !== QuoteStatus.DRAFT) {
      throw new BadRequestException('Quote has already been sent');
    }

    const updated = await this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteStatus.SENT,
        sentAt: new Date(),
      },
    });

    await this.notifyQuoteEvent(
      quote.clientId,
      'Nouveau devis reçu',
      `Vous avez reçu le devis ${quote.quoteNumber}. Consultez-le et répondez.`,
      `/client/quotes/${quote.id}`,
    );

    return updated;
  }

  async markViewed(id: string, clientId: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.clientId !== clientId) {
      throw new ForbiddenException('Access denied');
    }

    if (quote.status === QuoteStatus.SENT) {
      await this.prisma.quote.update({
        where: { id },
        data: {
          status: QuoteStatus.VIEWED,
          viewedAt: new Date(),
        },
      });
    }

    return this.findOne(id, clientId);
  }

  async respond(id: string, clientId: string, dto: RespondToQuoteDto) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.clientId !== clientId) {
      throw new ForbiddenException('Access denied');
    }

    if (![QuoteStatus.SENT, QuoteStatus.VIEWED].includes(quote.status as QuoteStatus)) {
      throw new BadRequestException('Cannot respond to this quote');
    }

    if (new Date() > quote.validUntil) {
      throw new BadRequestException('Quote has expired');
    }

    const updated = await this.prisma.quote.update({
      where: { id },
      data: {
        status: dto.accepted ? QuoteStatus.ACCEPTED : QuoteStatus.REJECTED,
        clientSignature: dto.signature,
        clientSignedAt: dto.accepted ? new Date() : null,
        rejectionReason: dto.rejectionReason,
        respondedAt: new Date(),
      },
    });

    // Devis accepté et lié à une mission : fixer le prix convenu (sinon /payments/create-intent
    // échoue « Prix non défini » — le client ne peut pas payer après avoir accepté un devis).
    if (dto.accepted && quote.missionId) {
      await this.prisma.mission
        .update({
          where: { id: quote.missionId },
          data: { agreedPrice: quote.totalAmount, artisanId: quote.artisanId },
        })
        .catch(() => undefined);
    }

    await this.notifyQuoteEvent(
      quote.artisanId,
      dto.accepted ? 'Devis accepté' : 'Devis refusé',
      dto.accepted
        ? `Votre devis ${quote.quoteNumber} a été accepté par le client.`
        : `Votre devis ${quote.quoteNumber} a été refusé par le client.`,
      `/artisan/quotations`,
    );

    return updated;
  }

  async createNewVersion(id: string, artisanId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: { lineItems: true },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    const quoteNumber = await this.generateQuoteNumber();

    const newQuote = await this.prisma.quote.create({
      data: {
        quoteNumber,
        artisanId: quote.artisanId,
        clientId: quote.clientId,
        missionId: quote.missionId,
        title: quote.title,
        description: quote.description,
        category: quote.category,
        address: quote.address,
        city: quote.city,
        postalCode: quote.postalCode,
        country: quote.country,
        subtotal: quote.subtotal,
        laborTotal: quote.laborTotal,
        materialsTotal: quote.materialsTotal,
        travelTotal: quote.travelTotal,
        discountAmount: quote.discountAmount,
        discountPercent: quote.discountPercent,
        taxRate: quote.taxRate,
        taxAmount: quote.taxAmount,
        totalAmount: quote.totalAmount,
        currency: quote.currency,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        templateId: quote.templateId,
        termsAndConditions: quote.termsAndConditions,
        notes: quote.notes,
        internalNotes: quote.internalNotes,
        version: quote.version + 1,
        parentQuoteId: quote.id,
        lineItems: {
          create: quote.lineItems.map((item) => ({
            itemType: item.itemType,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            catalogItemId: item.catalogItemId,
            position: item.position,
          })),
        },
      },
      include: {
        lineItems: true,
        client: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        mission: { select: QuoteService.MISSION_REVEAL_SELECT },
      },
    });

    // Masquage anti-désintermédiation avant renvoi.
    return this.maskQuoteParties(newQuote, artisanId);
  }

  async delete(id: string, artisanId: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    if (quote.status !== QuoteStatus.DRAFT) {
      throw new BadRequestException('Can only delete draft quotes');
    }

    await this.prisma.quote.delete({ where: { id } });

    return { success: true };
  }

  async getStats(artisanId: string) {
    const [total, draft, sent, accepted, rejected, expired] = await Promise.all([
      this.prisma.quote.count({ where: { artisanId } }),
      this.prisma.quote.count({ where: { artisanId, status: QuoteStatus.DRAFT } }),
      this.prisma.quote.count({ where: { artisanId, status: QuoteStatus.SENT } }),
      this.prisma.quote.count({ where: { artisanId, status: QuoteStatus.ACCEPTED } }),
      this.prisma.quote.count({ where: { artisanId, status: QuoteStatus.REJECTED } }),
      this.prisma.quote.count({ where: { artisanId, status: QuoteStatus.EXPIRED } }),
    ]);

    const conversionRate = total > 0 ? (accepted / total) * 100 : 0;

    const totalValue = await this.prisma.quote.aggregate({
      where: { artisanId, status: QuoteStatus.ACCEPTED },
      _sum: { totalAmount: true },
    });

    return {
      total,
      draft,
      sent,
      accepted,
      rejected,
      expired,
      conversionRate: Math.round(conversionRate * 100) / 100,
      totalAcceptedValue: totalValue._sum.totalAmount || 0,
    };
  }
}
