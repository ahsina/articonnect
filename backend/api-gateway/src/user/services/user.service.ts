import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateProfileDto, CreateArtisanProfileDto, UpdateClientProfileDto } from '../dto/user.dto';
import { Prisma } from '@prisma/client';
import { BusinessVerificationService } from '../../verification/services/business-verification.service';
import { FeatureToggleService } from '../../fraud/services/feature-toggle.service';
import { Country } from '../../verification/dto/verification.dto';
import { S3Service, FileType } from '../../upload/services/s3.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private prisma: PrismaService,
    private businessVerificationService: BusinessVerificationService,
    private featureToggle: FeatureToggleService,
    private configService: ConfigService,
    private s3Service: S3Service,
  ) {}

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

  /** Profil client (B2C/B2B). Renvoie null si l'utilisateur n'a pas (encore) de profil client. */
  async getClientProfile(userId: string) {
    return this.prisma.clientProfile.findUnique({
      where: { userId },
      include: { addresses: true },
    });
  }

  /** Crée ou met à jour le profil client (upsert). */
  async updateClientProfile(userId: string, dto: UpdateClientProfileDto) {
    const data = {
      clientType: dto.clientType,
      companyName: dto.companyName,
      siret: dto.siret,
      vatNumber: dto.vatNumber,
      industry: dto.industry,
    };
    return this.prisma.clientProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
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

    // Business Verification (if enabled and registration number provided)
    const isBusinessVerificationRequired = await this.featureToggle.isBusinessVerificationRequired();
    let businessVerified = false;
    let businessCountry: string | null = null;
    let verificationErrors: string[] = [];

    if (isBusinessVerificationRequired && dto.siret) {
      try {
        // Infer country from registration number format
        const cleanSiret = dto.siret.replace(/\s/g, '');
        let country: Country;

        if (/^\d{14}$/.test(cleanSiret)) {
          // 14 digits = French SIRET
          country = Country.FRANCE;
        } else if (/^[A-Z]\d{5,7}$/.test(cleanSiret)) {
          // Letter + digits = Luxembourg RCS
          country = Country.LUXEMBOURG;
        } else if (/^\d{10}$/.test(cleanSiret)) {
          // 10 digits = Belgian KBO
          country = Country.BELGIUM;
        } else {
          throw new Error('Format de numéro d\'enregistrement non reconnu');
        }

        // Verify business registration
        const verificationResult = await this.businessVerificationService.verifyBusiness({
          country,
          registrationNumber: dto.siret,
          companyName: dto.companyName,
        });

        businessVerified = verificationResult.verified;
        businessCountry = country;

        if (!verificationResult.verified) {
          verificationErrors = verificationResult.errors || [];
          this.logger.warn(
            `Business verification failed for user ${userId}: ${verificationErrors.join(', ')}`
          );

          // Auto-reject if enabled
          const autoRejectEnabled = await this.featureToggle.isBusinessVerificationAutoReject();
          if (autoRejectEnabled) {
            throw new BadRequestException(
              `La vérification de votre entreprise a échoué: ${verificationErrors.join(', ')}. ` +
              'Veuillez vérifier vos informations.'
            );
          }
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error; // Re-throw rejection errors
        }

        this.logger.error(`Business verification error for user ${userId}:`, error);
        verificationErrors.push(error.message || 'Erreur de vérification');

        // Auto-reject if enabled
        const autoRejectEnabled = await this.featureToggle.isBusinessVerificationAutoReject();
        if (autoRejectEnabled) {
          throw new BadRequestException(
            'La vérification de votre entreprise est obligatoire pour créer un profil artisan.'
          );
        }
      }
    }

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
        businessVerified,
        businessVerifiedAt: businessVerified ? new Date() : null,
        businessVerificationStatus: businessVerified ? 'VERIFIED' : 'PENDING',
        businessRegistrationNumber: dto.siret,
        businessCountry,
        businessVerificationErrors: verificationErrors,
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

    // Log warning if verification required but failed
    if (isBusinessVerificationRequired && !businessVerified) {
      this.logger.warn(
        `Artisan profile created for user ${userId} without business verification (status: PENDING)`
      );
    }

    return artisanProfile;
  }

  async getArtisans(_filters?: {
    specialtyId?: string;
    city?: string;
    minRating?: number;
  }) {
    const where: Prisma.UserWhereInput = {
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

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    // Upload réel du fichier vers S3/MinIO ; fallback DiceBear si l'upload échoue
    let avatarUrl: string;
    try {
      avatarUrl = await this.s3Service.uploadFile(file, FileType.AVATAR, userId);
    } catch (err) {
      this.logger.error('Avatar upload to S3 failed, falling back to DiceBear', err as Error);
      const avatarApiUrl =
        this.configService.get<string>('AVATAR_API_URL') ||
        'https://api.dicebear.com/7.x/avataaars/svg';
      avatarUrl = `${avatarApiUrl}?seed=${user.firstName}${user.lastName}`;
    }

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
