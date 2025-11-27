import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateMaterialCatalogItemDto } from '../dto/quote.dto';

@Injectable()
export class MaterialCatalogService {
  constructor(private prisma: PrismaService) {}

  async create(artisanId: string, dto: CreateMaterialCatalogItemDto) {
    return this.prisma.materialCatalogItem.create({
      data: {
        artisanId,
        name: dto.name,
        description: dto.description,
        sku: dto.sku,
        category: dto.category,
        trade: dto.trade,
        unitPrice: dto.unitPrice,
        unit: dto.unit || 'unit',
        currency: dto.currency || 'EUR',
        supplierPrice: dto.supplierPrice,
        supplierName: dto.supplierName,
        supplierRef: dto.supplierRef,
        trackStock: dto.trackStock || false,
        currentStock: dto.currentStock,
        minStockLevel: dto.minStockLevel,
      },
    });
  }

  async findAll(artisanId: string, category?: string, trade?: string) {
    const where: any = {
      isActive: true,
      OR: [
        { artisanId },
        { isGlobal: true },
      ],
    };

    if (category) where.category = category;
    if (trade) where.trade = trade;

    return this.prisma.materialCatalogItem.findMany({
      where,
      orderBy: [{ isGlobal: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string, artisanId: string) {
    const item = await this.prisma.materialCatalogItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Catalog item not found');
    }

    if (item.artisanId !== artisanId && !item.isGlobal) {
      throw new ForbiddenException('Access denied');
    }

    return item;
  }

  async update(id: string, artisanId: string, dto: CreateMaterialCatalogItemDto) {
    const item = await this.prisma.materialCatalogItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Catalog item not found');
    }

    if (item.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.materialCatalogItem.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        sku: dto.sku,
        category: dto.category,
        trade: dto.trade,
        unitPrice: dto.unitPrice,
        unit: dto.unit,
        currency: dto.currency,
        supplierPrice: dto.supplierPrice,
        supplierName: dto.supplierName,
        supplierRef: dto.supplierRef,
        trackStock: dto.trackStock,
        currentStock: dto.currentStock,
        minStockLevel: dto.minStockLevel,
      },
    });
  }

  async delete(id: string, artisanId: string) {
    const item = await this.prisma.materialCatalogItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Catalog item not found');
    }

    if (item.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.materialCatalogItem.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true };
  }

  async updateStock(id: string, artisanId: string, quantity: number) {
    const item = await this.findOne(id, artisanId);

    if (!item.trackStock) {
      return item;
    }

    return this.prisma.materialCatalogItem.update({
      where: { id },
      data: { currentStock: quantity },
    });
  }

  async decrementStock(id: string, quantity: number) {
    const item = await this.prisma.materialCatalogItem.findUnique({
      where: { id },
    });

    if (!item || !item.trackStock) return;

    await this.prisma.materialCatalogItem.update({
      where: { id },
      data: { currentStock: { decrement: quantity } },
    });
  }
}
