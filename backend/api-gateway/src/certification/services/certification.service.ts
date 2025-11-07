import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCertificationDto, UpdateCertificationDto } from '../dto/certification.dto';

@Injectable()
export class CertificationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createDto: CreateCertificationDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { artisanProfile: true },
    });

    if (!user || user.role !== 'ARTISAN' || !user.artisanProfile) {
      throw new ForbiddenException('Profil artisan requis');
    }

    return this.prisma.certification.create({
      data: {
        artisanId: user.artisanProfile.id,
        name: createDto.name,
        issuer: createDto.issuer,
        issueDate: new Date(createDto.issueDate),
        expiryDate: createDto.expiryDate ? new Date(createDto.expiryDate) : null,
        document: createDto.document,
        verified: false,
      },
    });
  }

  async findAll(artisanUserId?: string) {
    if (artisanUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: artisanUserId },
        include: { artisanProfile: true },
      });

      if (!user || !user.artisanProfile) {
        return [];
      }

      return this.prisma.certification.findMany({
        where: { artisanId: user.artisanProfile.id },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Admin view: all certifications
    return this.prisma.certification.findMany({
      include: {
        artisan: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [
        { verified: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(certificationId: string) {
    const certification = await this.prisma.certification.findUnique({
      where: { id: certificationId },
      include: {
        artisan: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!certification) {
      throw new NotFoundException('Certification introuvable');
    }

    return certification;
  }

  async update(userId: string, certificationId: string, updateDto: UpdateCertificationDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { artisanProfile: true },
    });

    if (!user || !user.artisanProfile) {
      throw new ForbiddenException('Profil artisan requis');
    }

    const certification = await this.prisma.certification.findUnique({
      where: { id: certificationId },
    });

    if (!certification) {
      throw new NotFoundException('Certification introuvable');
    }

    if (certification.artisanId !== user.artisanProfile.id) {
      throw new ForbiddenException('Accès refusé à cette certification');
    }

    const data: any = { ...updateDto };
    if (updateDto.issueDate) {
      data.issueDate = new Date(updateDto.issueDate);
    }
    if (updateDto.expiryDate) {
      data.expiryDate = new Date(updateDto.expiryDate);
    }

    // If updating, mark as unverified again
    data.verified = false;

    return this.prisma.certification.update({
      where: { id: certificationId },
      data,
    });
  }

  async delete(userId: string, certificationId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { artisanProfile: true },
    });

    if (!user || !user.artisanProfile) {
      throw new ForbiddenException('Profil artisan requis');
    }

    const certification = await this.prisma.certification.findUnique({
      where: { id: certificationId },
    });

    if (!certification) {
      throw new NotFoundException('Certification introuvable');
    }

    if (certification.artisanId !== user.artisanProfile.id) {
      throw new ForbiddenException('Accès refusé à cette certification');
    }

    await this.prisma.certification.delete({
      where: { id: certificationId },
    });

    return { message: 'Certification supprimée avec succès' };
  }

  async verify(adminId: string, certificationId: string) {
    const certification = await this.prisma.certification.findUnique({
      where: { id: certificationId },
    });

    if (!certification) {
      throw new NotFoundException('Certification introuvable');
    }

    return this.prisma.certification.update({
      where: { id: certificationId },
      data: { verified: true },
      include: {
        artisan: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async unverify(adminId: string, certificationId: string) {
    const certification = await this.prisma.certification.findUnique({
      where: { id: certificationId },
    });

    if (!certification) {
      throw new NotFoundException('Certification introuvable');
    }

    return this.prisma.certification.update({
      where: { id: certificationId },
      data: { verified: false },
    });
  }
}
