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

    const { password: _password, twoFactorSecret: _twoFactorSecret, ...sanitized } = user;
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

  async getArtisans(_filters?: {
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
      const { password: _password, twoFactorSecret: _twoFactorSecret, ...sanitized } = user;
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

    const { password: _password, twoFactorSecret: _twoFactorSecret, ...sanitized } = user;
    return sanitized;
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new NotFoundException('Fichier non fourni');
    }

    // Validate file type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new NotFoundException('Type de fichier non autorisé. Utilisez JPEG, PNG, GIF ou WebP');
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new NotFoundException('Fichier trop volumineux. Maximum 5MB');
    }

    // For now, we'll use a DiceBear avatar URL
    // In production, you would upload to S3/CloudFlare/etc and store the URL
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    // Generate avatar URL using DiceBear (placeholder for actual upload)
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.firstName}${user.lastName}`;

    // Update user avatar
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
      },
    });

    return updatedUser;
  }
}
