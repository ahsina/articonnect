import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from '../dto/address.dto';

@Injectable()
export class AddressService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createDto: CreateAddressDto) {
    // Get client profile
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { clientProfile: true },
    });

    if (!user || !user.clientProfile) {
      throw new ForbiddenException('Profil client introuvable');
    }

    // If this is set as default, unset all other default addresses
    if (createDto.isDefault) {
      await this.prisma.address.updateMany({
        where: { clientId: user.clientProfile.id },
        data: { isDefault: false },
      });
    }

    // Auto-geocode if lat/lng not provided
    const latitude = createDto.latitude || 49.6116; // Default to Luxembourg
    const longitude = createDto.longitude || 6.1319;

    // Create address
    return this.prisma.address.create({
      data: {
        clientId: user.clientProfile.id,
        label: createDto.label,
        street: createDto.street,
        city: createDto.city,
        postalCode: createDto.postalCode,
        country: createDto.country,
        latitude,
        longitude,
        isDefault: createDto.isDefault || false,
      },
    });
  }

  async findAll(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { clientProfile: true },
    });

    if (!user || !user.clientProfile) {
      return [];
    }

    return this.prisma.address.findMany({
      where: { clientId: user.clientProfile.id },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(userId: string, addressId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { clientProfile: true },
    });

    if (!user || !user.clientProfile) {
      throw new ForbiddenException('Profil client introuvable');
    }

    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new NotFoundException('Adresse introuvable');
    }

    // Check ownership
    if (address.clientId !== user.clientProfile.id) {
      throw new ForbiddenException('Accès refusé à cette adresse');
    }

    return address;
  }

  async update(userId: string, addressId: string, updateDto: UpdateAddressDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { clientProfile: true },
    });

    if (!user || !user.clientProfile) {
      throw new ForbiddenException('Profil client introuvable');
    }

    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new NotFoundException('Adresse introuvable');
    }

    // Check ownership
    if (address.clientId !== user.clientProfile.id) {
      throw new ForbiddenException('Accès refusé à cette adresse');
    }

    // If setting as default, unset other defaults
    if (updateDto.isDefault === true) {
      await this.prisma.address.updateMany({
        where: {
          clientId: user.clientProfile.id,
          id: { not: addressId },
        },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({
      where: { id: addressId },
      data: updateDto,
    });
  }

  async delete(userId: string, addressId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { clientProfile: true },
    });

    if (!user || !user.clientProfile) {
      throw new ForbiddenException('Profil client introuvable');
    }

    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new NotFoundException('Adresse introuvable');
    }

    // Check ownership
    if (address.clientId !== user.clientProfile.id) {
      throw new ForbiddenException('Accès refusé à cette adresse');
    }

    // If deleting default address, check if there are others
    if (address.isDefault) {
      const otherAddresses = await this.prisma.address.findMany({
        where: {
          clientId: user.clientProfile.id,
          id: { not: addressId },
        },
        take: 1,
      });

      // Set another address as default if exists
      if (otherAddresses.length > 0) {
        await this.prisma.address.update({
          where: { id: otherAddresses[0].id },
          data: { isDefault: true },
        });
      }
    }

    await this.prisma.address.delete({
      where: { id: addressId },
    });

    return { message: 'Adresse supprimée avec succès' };
  }

  async setDefault(userId: string, addressId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { clientProfile: true },
    });

    if (!user || !user.clientProfile) {
      throw new ForbiddenException('Profil client introuvable');
    }

    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new NotFoundException('Adresse introuvable');
    }

    // Check ownership
    if (address.clientId !== user.clientProfile.id) {
      throw new ForbiddenException('Accès refusé à cette adresse');
    }

    // Unset all other defaults
    await this.prisma.address.updateMany({
      where: {
        clientId: user.clientProfile.id,
        id: { not: addressId },
      },
      data: { isDefault: false },
    });

    // Set this one as default
    return this.prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });
  }
}
