import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(artisanId: string, data: any) {
    return this.prisma.product.create({
      data: {
        artisanId,
        ...data,
      },
    });
  }

  async findAll(filters?: { category?: string; search?: string }) {
    const where: any = { status: 'ACTIVE' };

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }

    return this.prisma.product.findMany({
      where,
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
      take: 50,
    });
  }

  async findOne(id: string) {
    return this.prisma.product.findUnique({
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
  }
}
