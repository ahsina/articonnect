import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateQuoteTemplateDto } from '../dto/quote.dto';

@Injectable()
export class QuoteTemplateService {
  constructor(private prisma: PrismaService) {}

  async create(artisanId: string, dto: CreateQuoteTemplateDto) {
    return this.prisma.quoteTemplate.create({
      data: {
        artisanId,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        trade: dto.trade,
        defaultLineItems: dto.defaultLineItems,
        defaultTerms: dto.defaultTerms,
        defaultValidityDays: dto.defaultValidityDays || 30,
      },
    });
  }

  async findAll(artisanId: string) {
    return this.prisma.quoteTemplate.findMany({
      where: { artisanId, isActive: true },
      orderBy: { usageCount: 'desc' },
    });
  }

  async findOne(id: string, artisanId: string) {
    const template = await this.prisma.quoteTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (template.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    return template;
  }

  async update(id: string, artisanId: string, dto: CreateQuoteTemplateDto) {
    const template = await this.findOne(id, artisanId);

    return this.prisma.quoteTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        trade: dto.trade,
        defaultLineItems: dto.defaultLineItems,
        defaultTerms: dto.defaultTerms,
        defaultValidityDays: dto.defaultValidityDays,
      },
    });
  }

  async delete(id: string, artisanId: string) {
    await this.findOne(id, artisanId);

    await this.prisma.quoteTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true };
  }

  async incrementUsage(id: string) {
    await this.prisma.quoteTemplate.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }
}
