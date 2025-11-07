import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSpecialtyDto, UpdateSpecialtyDto } from '../dto/specialty.dto';

@Injectable()
export class SpecialtyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateSpecialtyDto) {
    // Check if specialty with same name already exists
    const existing = await this.prisma.specialty.findUnique({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException('Une spécialité avec ce nom existe déjà');
    }

    return this.prisma.specialty.create({
      data: createDto,
    });
  }

  async findAll(category?: string) {
    const where = category ? { category } : {};

    return this.prisma.specialty.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    const specialty = await this.prisma.specialty.findUnique({
      where: { id },
      include: {
        _count: {
          select: { artisans: true },
        },
      },
    });

    if (!specialty) {
      throw new NotFoundException('Spécialité introuvable');
    }

    return specialty;
  }

  async update(id: string, updateDto: UpdateSpecialtyDto) {
    // Check if specialty exists
    await this.findOne(id);

    // If name is being updated, check for conflicts
    if (updateDto.name) {
      const existing = await this.prisma.specialty.findUnique({
        where: { name: updateDto.name },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Une spécialité avec ce nom existe déjà');
      }
    }

    return this.prisma.specialty.update({
      where: { id },
      data: updateDto,
    });
  }

  async delete(id: string) {
    // Check if specialty exists
    await this.findOne(id);

    // Delete the specialty (artisan connections will be handled by Prisma cascade)
    await this.prisma.specialty.delete({
      where: { id },
    });

    return { message: 'Spécialité supprimée avec succès' };
  }

  async getCategories() {
    const specialties = await this.prisma.specialty.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    return specialties.map((s) => s.category);
  }
}
