import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

interface CreateCategoryDto {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parentId?: string;
}

interface UpdateCategoryDto {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  active?: boolean;
}

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateCategoryDto) {
    // Check if slug already exists
    const existing = await this.prisma.category.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      throw new ConflictException('Une catégorie avec ce slug existe déjà');
    }

    // If parentId provided, validate it exists
    if (data.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: data.parentId },
      });

      if (!parent) {
        throw new NotFoundException('Catégorie parente introuvable');
      }
    }

    return this.prisma.category.create({
      data,
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async findAll(includeInactive = false) {
    return this.prisma.category.findMany({
      where: includeInactive ? {} : { active: true },
      include: {
        parent: true,
        children: {
          where: { active: true },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        parent: true,
        children: {
          where: { active: true },
        },
        products: {
          where: { status: 'ACTIVE' },
          take: 10,
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Catégorie introuvable');
    }

    return category;
  }

  async findById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Catégorie introuvable');
    }

    return category;
  }

  async update(id: string, data: UpdateCategoryDto) {
    const category = await this.findById(id);

    // If slug is being updated, check uniqueness
    if (data.slug && data.slug !== category.slug) {
      const existing = await this.prisma.category.findUnique({
        where: { slug: data.slug },
      });

      if (existing) {
        throw new ConflictException('Une catégorie avec ce slug existe déjà');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data,
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async delete(id: string) {
    const category = await this.findById(id);

    // Check if category has children
    const childrenCount = await this.prisma.category.count({
      where: { parentId: id },
    });

    if (childrenCount > 0) {
      throw new ConflictException(
        'Impossible de supprimer une catégorie qui contient des sous-catégories'
      );
    }

    // Check if category has products
    const productsCount = await this.prisma.product.count({
      where: { categoryId: id },
    });

    if (productsCount > 0) {
      throw new ConflictException(
        'Impossible de supprimer une catégorie qui contient des produits'
      );
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }

  /**
   * Get category tree (hierarchical structure)
   */
  async getTree() {
    const categories = await this.prisma.category.findMany({
      where: { active: true, parentId: null },
      include: {
        children: {
          where: { active: true },
          include: {
            children: {
              where: { active: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories;
  }
}
