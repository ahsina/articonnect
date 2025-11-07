import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProductDto, UpdateProductDto, ProductFilters } from '../dto/product.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(artisanId: string, data: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        artisan: { connect: { id: artisanId } },
        name: data.name,
        description: data.description,
        price: data.price,
        vatRate: data.vatRate || 17, // Luxembourg standard VAT rate
        category: data.category,
        stock: data.stock,
        sku: data.sku,
        status: data.status || 'DRAFT',
      },
      include: {
        artisan: {
          select: {
            firstName: true,
            lastName: true,
            artisanProfile: {
              select: {
                companyName: true,
                rating: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll(filters?: ProductFilters) {
    const where: Prisma.ProductWhereInput = {
      status: filters?.status || 'ACTIVE',
    };

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.artisanId) {
      where.artisanId = filters.artisanId;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.product.findMany({
      where,
      include: {
        artisan: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            artisanProfile: {
              select: {
                companyName: true,
                rating: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        artisan: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            artisanProfile: true,
          },
        },
        variants: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    return product;
  }

  async update(id: string, data: UpdateProductDto) {
    // Verify product exists
    await this.findOne(id);

    return this.prisma.product.update({
      where: { id },
      data,
      include: {
        artisan: {
          select: {
            firstName: true,
            lastName: true,
            artisanProfile: {
              select: {
                companyName: true,
                rating: true,
              },
            },
          },
        },
      },
    });
  }

  async delete(id: string) {
    // Verify product exists
    await this.findOne(id);

    await this.prisma.product.delete({
      where: { id },
    });

    return { message: 'Produit supprimé avec succès' };
  }
}
