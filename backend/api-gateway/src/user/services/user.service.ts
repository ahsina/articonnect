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
        address: updateDto.address,
        city: updateDto.city,
        postalCode: updateDto.postalCode,
        country: updateDto.country,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        address: true,
        city: true,
        postalCode: true,
        country: true,
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

  /**
   * WHITELIST stricte des champs artisan exposables AVANT paiement escrow (annuaire / fiche
   * publique). Politique « à la Uber » : on ne révèle JAMAIS les coordonnées réelles
   * (phone/email/website + adresse exacte lat/lng) tant qu'une mission n'est pas payée en escrow
   * entre ce client et cet artisan. Approche liste blanche (et non liste noire) : tout nouveau
   * champ ajouté au modèle User reste masqué par défaut au lieu de fuiter.
   *
   * `baseAddress` est sélectionné UNIQUEMENT pour en dériver une ville approximative
   * (cf. toPublicArtisan) et n'est jamais renvoyé tel quel.
   */
  private static readonly ARTISAN_PUBLIC_SELECT = {
    id: true,
    firstName: true,
    avatar: true,
    role: true,
    createdAt: true,
    artisanProfile: {
      select: {
        id: true,
        companyName: true,
        description: true,
        rating: true,
        reviewCount: true,
        missionCount: true,
        serviceRadius: true,
        available: true,
        hourlyRate: true,
        emergencyRate: true,
        businessVerified: true,
        businessVerificationStatus: true,
        baseAddress: true, // -> converti en ville approximative, retiré du payload public
        specialties: true,
      },
    },
  } satisfies Prisma.UserSelect;

  // Mots-clés qui trahissent un segment « rue » (à ne JAMAIS exposer comme ville).
  private static readonly STREET_KEYWORDS = [
    'rue',
    'avenue',
    'av.',
    'ave',
    'boulevard',
    'bd',
    'blvd',
    'chemin',
    'route',
    'rte',
    'impasse',
    'allee',
    'allée',
    'place',
    'quai',
    'chaussee',
    'chaussée',
    'passage',
    'square',
    'cours',
    'voie',
    'sentier',
    'lot',
    'lotissement',
    'residence',
    'résidence',
    'zone',
    'zi',
    'za',
    'street',
    'st.',
    'road',
    'rd.',
    'lane',
    'drive',
    'straße',
    'strasse',
    'str.',
    'weg',
  ];

  // Pays connus : jamais retenus comme « ville », mais servent de repli non-identifiant.
  private static readonly KNOWN_COUNTRIES = [
    'france',
    'fr',
    'luxembourg',
    'lu',
    'belgique',
    'belgium',
    'belgie',
    'belgië',
    'be',
    'allemagne',
    'germany',
    'deutschland',
    'de',
  ];

  /** Un segment ressemble-t-il à une rue (numéro et/ou mot-clé de voie) ? */
  private looksLikeStreet(seg: string): boolean {
    const s = seg.trim().toLowerCase();
    if (!s) return true;
    // Commence par un chiffre (« 5 Boulevard Voltaire », « 10 Rue de l'Artisan ») -> rue.
    if (/^\d/.test(s)) return true;
    // Contient un chiffre suivi d'un espace (numéro de voirie intégré).
    if (/\d/.test(s) && !/^[a-z]?-?\s*\d{4,5}\b/.test(s)) return true;
    // Contient un mot-clé de voie.
    const tokens = s.split(/[\s'’-]+/);
    return UserService.STREET_KEYWORDS.some((kw) => tokens.includes(kw) || s.includes(kw + ' '));
  }

  /**
   * Dérive une ville approximative à partir d'une adresse libre, sans JAMAIS exposer la rue.
   * Stratégie liste blanche : on ne retient un segment comme ville que s'il ne ressemble PAS à
   * une rue (pas de numéro, pas de mot-clé de voie) et n'est pas un pays. À défaut d'une ville
   * fiable on renvoie null (valeur non-identifiante) plutôt que de risquer de fuiter la rue.
   */
  private approximateCity(baseAddress?: string | null): string | null {
    if (!baseAddress) return null;
    const parts = baseAddress
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return null;

    // Format « 75002 Paris » / « L-1855 Luxembourg » -> on isole la partie ville, purgée du CP.
    for (const seg of parts) {
      const m = seg.match(/^[A-Z]?-?\s*\d{4,5}\s+(.+)$/);
      if (m) {
        const city = m[1].trim();
        if (city && !this.looksLikeStreet(city)) return city;
      }
    }

    // Sinon : on cherche, en partant de la fin, le dernier segment qui n'est ni un pays ni une
    // rue. On ne retient jamais un segment qui ressemble à une rue (numéro + voie).
    for (let i = parts.length - 1; i >= 0; i--) {
      const seg = parts[i];
      const norm = seg.trim().toLowerCase();
      if (UserService.KNOWN_COUNTRIES.includes(norm)) continue;
      if (this.looksLikeStreet(seg)) continue;
      return seg;
    }

    // Aucune ville fiable isolable -> ne rien renvoyer plutôt que de fuiter la rue.
    return null;
  }

  /**
   * Transforme un User artisan sélectionné via ARTISAN_PUBLIC_SELECT en payload public :
   * remplace l'adresse de base exacte par une ville approximative.
   */
  private toPublicArtisan<T extends { artisanProfile?: { baseAddress?: string | null } | null }>(
    user: T,
  ) {
    if (!user) return user;
    const profile = user.artisanProfile;
    if (!profile) return user;
    const { baseAddress, ...restProfile } = profile as Record<string, unknown> & {
      baseAddress?: string | null;
    };
    return {
      ...user,
      artisanProfile: {
        ...restProfile,
        city: this.approximateCity(baseAddress),
      },
    };
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
      select: UserService.ARTISAN_PUBLIC_SELECT,
      take: 50,
    });

    return artisans.map((user) => this.toPublicArtisan(user));
  }

  async getArtisan(artisanId: string) {
    const profileSelect = UserService.ARTISAN_PUBLIC_SELECT.artisanProfile.select;

    const user = await this.prisma.user.findUnique({
      where: { id: artisanId, role: 'ARTISAN' },
      select: {
        ...UserService.ARTISAN_PUBLIC_SELECT,
        artisanProfile: {
          select: {
            ...profileSelect,
            certifications: true,
          },
        },
        receivedReviews: {
          select: {
            id: true,
            overallRating: true,
            comment: true,
            photos: true,
            helpful: true,
            verified: true,
            createdAt: true,
            // Auteur de l'avis : prénom + avatar uniquement (pas de nom complet ni de contact).
            reviewer: {
              select: {
                firstName: true,
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

    // Whitelist stricte : aucun champ de contact réel (phone/email/website/adresse exacte) n'est
    // sélectionné ; on ne renvoie qu'une ville approximative.
    return this.toPublicArtisan(user);
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) {
      // Un fichier manquant est une requête invalide (400), pas une 404.
      throw new BadRequestException('Aucun fichier fourni');
    }

    // Validate file type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Type de fichier non autorisé. Utilisez JPEG, PNG, GIF ou WebP');
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Fichier trop volumineux. Maximum 5MB');
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
