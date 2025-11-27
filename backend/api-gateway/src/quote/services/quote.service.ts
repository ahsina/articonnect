import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
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

@Injectable()
export class QuoteService {
  constructor(private prisma: PrismaService) {}

  private async generateQuoteNumber(): Promise<string> {
    const year = new Date().getFullYear();

    const sequence = await this.prisma.quoteSequence.upsert({
      where: { year },
      create: { year, lastSequence: 1 },
      update: { lastSequence: { increment: 1 } },
    });

    return `QUO-${year}-${String(sequence.lastSequence).padStart(5, '0')}`;
  }

  private calculateTotals(lineItems: any[], discountPercent?: number, taxRate?: number) {
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
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        artisan: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return quote;
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
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          lineItems: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.quote.count({ where }),
    ]);

    return {
      data: quotes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

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
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        template: true,
        mission: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.artisanId !== userId && quote.clientId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return quote;
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

    let totals = {};
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
        ...(dto.lineItems && {
          subtotal: (totals as any).subtotal,
          laborTotal: (totals as any).laborTotal,
          materialsTotal: (totals as any).materialsTotal,
          travelTotal: (totals as any).travelTotal,
          discountAmount: (totals as any).discountAmount,
          taxAmount: (totals as any).taxAmount,
          totalAmount: (totals as any).totalAmount,
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
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return updated;
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

    // TODO: Send notification to client

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

    // TODO: Send notification to artisan

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
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return newQuote;
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
