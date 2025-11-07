import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateProfileDto, CreateArtisanProfileDto } from '../dto/user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        clientProfile: {
          include: {
            addresses: true,
          },
        },
        artisanProfile: {
          include: {
            specialties: true,
            certifications: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const { password, twoFactorSecret, ...sanitized } = user;
    return sanitized;
  }

  async updateProfile(userId: string, updateDto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: updateDto.firstName,
        lastName: updateDto.lastName,
        phone: updateDto.phone,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
      },
    });

    return user;
  }

  async createArtisanProfile(userId: string, dto: CreateArtisanProfileDto) {
    // Update user role to ARTISAN
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: 'ARTISAN' },
    });

    // Create artisan profile
    const artisanProfile = await this.prisma.artisanProfile.create({
      data: {
        userId,
        companyName: dto.companyName,
        siret: dto.siret,
        description: dto.description,
        baseAddress: dto.baseAddress,
        latitude: dto.latitude,
        longitude: dto.longitude,
        serviceRadius: dto.serviceRadius || 20,
        hourlyRate: dto.hourlyRate,
      },
    });

    // Connect specialties
    if (dto.specialtyIds && dto.specialtyIds.length > 0) {
      await this.prisma.artisanProfile.update({
        where: { id: artisanProfile.id },
        data: {
          specialties: {
            connect: dto.specialtyIds.map((id) => ({ id })),
          },
        },
      });
    }

    return artisanProfile;
  }

  async getArtisans(filters?: {
    specialtyId?: string;
    city?: string;
    minRating?: number;
  }) {
    const where: any = {
      role: 'ARTISAN',
      status: 'ACTIVE',
    };

    const artisans = await this.prisma.user.findMany({
      where,
      include: {
        artisanProfile: {
          include: {
            specialties: true,
          },
        },
      },
      take: 50,
    });

    return artisans.map((user) => {
      const { password, twoFactorSecret, ...sanitized } = user;
      return sanitized;
    });
  }

  async getArtisan(artisanId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: artisanId, role: 'ARTISAN' },
      include: {
        artisanProfile: {
          include: {
            specialties: true,
            certifications: true,
          },
        },
        receivedReviews: {
          include: {
            reviewer: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Artisan introuvable');
    }

    const { password, twoFactorSecret, ...sanitized } = user;
    return sanitized;
  }
}
