import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  Country,
  VerifyBusinessDto,
  BusinessVerificationResult,
  VerificationStatus,
} from '../dto/verification.dto';
import {
  SiretVerificationService,
  MANUAL_REVIEW_MARKER,
} from './siret-verification.service';
import { RcsVerificationService } from './rcs-verification.service';
import { KboVerificationService } from './kbo-verification.service';

/**
 * Unified business verification orchestrator
 * Routes verification requests to country-specific services
 */
@Injectable()
export class BusinessVerificationService {
  private readonly logger = new Logger(BusinessVerificationService.name);

  constructor(
    private prisma: PrismaService,
    private siretService: SiretVerificationService,
    private rcsService: RcsVerificationService,
    private kboService: KboVerificationService,
  ) {}

  /**
   * Verify business registration number based on country
   */
  async verifyBusiness(dto: VerifyBusinessDto): Promise<BusinessVerificationResult> {
    this.logger.log(
      `Verifying business for ${dto.country}: ${dto.registrationNumber}`,
    );

    let result: BusinessVerificationResult;

    switch (dto.country) {
      case Country.FRANCE:
        result = await this.verifyFrenchBusiness(dto);
        break;

      case Country.LUXEMBOURG:
        result = await this.verifyLuxembourgBusiness(dto);
        break;

      case Country.BELGIUM:
        result = await this.verifyBelgianBusiness(dto);
        break;

      default:
        throw new BadRequestException(`Pays non supporté: ${dto.country}`);
    }

    return result;
  }

  /**
   * Verify French business (SIRET)
   */
  private async verifyFrenchBusiness(
    dto: VerifyBusinessDto,
  ): Promise<BusinessVerificationResult> {
    const siretResult = await this.siretService.verifySiret(
      dto.registrationNumber,
      dto.companyName,
    );

    return {
      verified: siretResult.verified,
      country: Country.FRANCE,
      registrationNumber: siretResult.siret,
      companyName: siretResult.companyName,
      legalForm: siretResult.legalForm,
      address: siretResult.address,
      isActive: siretResult.isActive,
      creationDate: siretResult.creationDate,
      activityCode: siretResult.nafCode,
      activityDescription: siretResult.nafLabel,
      employeeCount: siretResult.employeeCount,
      errors: siretResult.errors,
      warnings: siretResult.warnings,
      lastVerifiedAt: new Date(),
    };
  }

  /**
   * Verify Luxembourg business (RCS)
   */
  private async verifyLuxembourgBusiness(
    dto: VerifyBusinessDto,
  ): Promise<BusinessVerificationResult> {
    const rcsResult = await this.rcsService.verifyRcs(
      dto.registrationNumber,
      dto.companyName,
    );

    return {
      verified: rcsResult.verified,
      country: Country.LUXEMBOURG,
      registrationNumber: rcsResult.rcsNumber,
      companyName: rcsResult.companyName,
      legalForm: rcsResult.legalForm,
      address: rcsResult.address,
      isActive: rcsResult.isActive,
      creationDate: rcsResult.registrationDate,
      activityCode: rcsResult.naceCode,
      errors: rcsResult.errors,
      warnings: rcsResult.warnings,
      lastVerifiedAt: new Date(),
    };
  }

  /**
   * Verify Belgian business (KBO/BCE)
   */
  private async verifyBelgianBusiness(
    dto: VerifyBusinessDto,
  ): Promise<BusinessVerificationResult> {
    const kboResult = await this.kboService.verifyKbo(
      dto.registrationNumber,
      dto.companyName,
    );

    return {
      verified: kboResult.verified,
      country: Country.BELGIUM,
      registrationNumber: kboResult.kboNumber,
      companyName: kboResult.companyName,
      legalForm: kboResult.legalForm,
      address: kboResult.address,
      isActive: kboResult.isActive,
      creationDate: kboResult.startDate,
      activityCode: kboResult.naceCode,
      vatNumber: kboResult.vatNumber,
      errors: kboResult.errors,
      warnings: kboResult.warnings,
      lastVerifiedAt: new Date(),
    };
  }

  /**
   * Verify and update artisan profile
   */
  async verifyArtisan(artisanId: string, dto: VerifyBusinessDto): Promise<void> {
    const result = await this.verifyBusiness(dto);

    // Un contrôle qui n'a PAS pu être tranché automatiquement (clé absente = mock,
    // ou panne API) porte le marqueur MANUAL_REVIEW_MARKER dans ses warnings : on
    // route alors vers MANUAL_REVIEW (revue admin) plutôt qu'un rejet ferme. Seul un
    // registre officiel disant « fermé / introuvable » produit un vrai REJECTED.
    const warnings = result.warnings || [];
    const needsManualReview =
      !result.verified && warnings.includes(MANUAL_REVIEW_MARKER);

    const status = result.verified
      ? VerificationStatus.VERIFIED
      : needsManualReview
        ? VerificationStatus.MANUAL_REVIEW
        : VerificationStatus.REJECTED;

    // Le marqueur est interne : on ne le persiste pas dans les warnings affichés.
    const persistedWarnings = warnings.filter((w) => w !== MANUAL_REVIEW_MARKER);

    // Update artisan profile with verification result
    await this.prisma.artisanProfile.update({
      where: { userId: artisanId },
      data: {
        // `businessVerified` (badge) n'est vrai que sur un VERIFIED avéré.
        businessVerified: result.verified,
        businessVerifiedAt: result.verified ? new Date() : null,
        businessVerificationStatus: status,
        // Trace d'audit : on horodate CHAQUE (re-)contrôle, qu'il soit accepté
        // ou rejeté, pour que le rapport de re-vérification annuelle dispose
        // toujours d'un timestamp de dernier contrôle.
        businessVerificationLastCheck: new Date(),
        businessRegistrationNumber: result.registrationNumber,
        businessCountry: dto.country,
        businessVerificationErrors: result.errors || [],
        businessVerificationWarnings: persistedWarnings,
      },
    });

    this.logger.log(
      `Artisan ${artisanId} verification ${status}: ${result.companyName}`,
    );
  }

  /**
   * Get verification status for an artisan
   */
  async getVerificationStatus(artisanId: string) {
    // artisanId peut être l'id du profil OU l'userId (selon l'appelant) → on accepte les deux.
    const profile = await this.prisma.artisanProfile.findFirst({
      where: { OR: [{ id: artisanId }, { userId: artisanId }] },
      select: {
        businessVerified: true,
        businessVerifiedAt: true,
        businessVerificationStatus: true,
        businessRegistrationNumber: true,
        businessCountry: true,
        businessVerificationErrors: true,
        businessVerificationWarnings: true,
        companyName: true,
        siret: true,
      },
    });

    if (!profile) {
      throw new BadRequestException('Profil artisan introuvable');
    }

    return {
      verified: profile.businessVerified || false,
      verifiedAt: profile.businessVerifiedAt,
      status: profile.businessVerificationStatus || VerificationStatus.PENDING,
      registrationNumber: profile.businessRegistrationNumber || profile.siret,
      country: profile.businessCountry,
      companyName: profile.companyName,
      errors: profile.businessVerificationErrors || [],
      warnings: profile.businessVerificationWarnings || [],
    };
  }

  /**
   * Re-verify an artisan (for annual checks)
   */
  async reverifyArtisan(artisanId: string): Promise<BusinessVerificationResult> {
    // artisanId peut être l'id du profil OU l'userId → on accepte les deux.
    const profile = await this.prisma.artisanProfile.findFirst({
      where: { OR: [{ id: artisanId }, { userId: artisanId }] },
    });

    if (!profile) {
      throw new BadRequestException('Profil artisan introuvable');
    }

    const registrationNumber = profile.businessRegistrationNumber || profile.siret;
    const country = profile.businessCountry;

    if (!registrationNumber || !country) {
      throw new BadRequestException('Informations de vérification manquantes');
    }

    const dto: VerifyBusinessDto = {
      country: country as Country,
      registrationNumber,
      companyName: profile.companyName,
    };

    const result = await this.verifyBusiness(dto);

    // Update verification status
    await this.verifyArtisan(artisanId, dto);

    return result;
  }

  /**
   * DÉCISION ADMIN — Approuver la vérification d'un artisan.
   * Passe le profil à VERIFIED + pose le badge (businessVerified=true) + horodate.
   * Accepte l'id du profil OU l'userId (même convention que getVerificationStatus).
   */
  async adminApprove(artisanId: string) {
    const profile = await this.prisma.artisanProfile.findFirst({
      where: { OR: [{ id: artisanId }, { userId: artisanId }] },
      select: { id: true, businessVerificationWarnings: true, companyName: true },
    });
    if (!profile) {
      throw new BadRequestException('Profil artisan introuvable');
    }

    const now = new Date();
    const decisionNote = `ADMIN_APPROVED: vérification validée manuellement`;

    await this.prisma.artisanProfile.update({
      where: { id: profile.id },
      data: {
        businessVerified: true,
        businessVerifiedAt: now,
        businessVerificationStatus: VerificationStatus.VERIFIED,
        businessVerificationLastCheck: now,
        // On purge les erreurs (la décision admin fait autorité) et on trace la décision.
        businessVerificationErrors: [],
        businessVerificationWarnings: [
          ...(profile.businessVerificationWarnings || []),
          decisionNote,
        ],
      },
    });

    this.logger.log(
      `Artisan ${artisanId} APPROVED by admin: ${profile.companyName}`,
    );

    return {
      message: 'Vérification approuvée',
      artisanId,
      status: VerificationStatus.VERIFIED,
      verified: true,
    };
  }

  /**
   * DÉCISION ADMIN — Rejeter la vérification d'un artisan.
   * Passe le profil à REJECTED, retire le badge (businessVerified=false) et trace le motif.
   * Accepte l'id du profil OU l'userId.
   */
  async adminReject(artisanId: string, reason: string) {
    const profile = await this.prisma.artisanProfile.findFirst({
      where: { OR: [{ id: artisanId }, { userId: artisanId }] },
      select: { id: true, businessVerificationWarnings: true, companyName: true },
    });
    if (!profile) {
      throw new BadRequestException('Profil artisan introuvable');
    }

    const now = new Date();
    const decisionNote = `ADMIN_REJECTED: ${reason}`;

    await this.prisma.artisanProfile.update({
      where: { id: profile.id },
      data: {
        businessVerified: false,
        businessVerifiedAt: null,
        businessVerificationStatus: VerificationStatus.REJECTED,
        businessVerificationLastCheck: now,
        businessVerificationWarnings: [
          ...(profile.businessVerificationWarnings || []),
          decisionNote,
        ],
      },
    });

    this.logger.log(
      `Artisan ${artisanId} REJECTED by admin (${reason}): ${profile.companyName}`,
    );

    return {
      message: 'Vérification rejetée',
      artisanId,
      status: VerificationStatus.REJECTED,
      verified: false,
      reason,
    };
  }

  /**
   * Get all unverified artisans (for admin review)
   */
  async getUnverifiedArtisans(limit: number = 50) {
    return this.prisma.artisanProfile.findMany({
      where: {
        // businessVerified est non-nullable (default false) : pas de clause `null` (sinon Prisma 500).
        OR: [
          { businessVerified: false },
          { businessVerificationStatus: VerificationStatus.PENDING },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            createdAt: true,
          },
        },
      },
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get artisans needing re-verification (> 1 year)
   */
  async getArtisansNeedingReverification() {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    return this.prisma.artisanProfile.findMany({
      where: {
        businessVerified: true,
        businessVerifiedAt: {
          lt: oneYearAgo,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        businessVerifiedAt: 'asc',
      },
    });
  }
}
