import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { BusinessVerificationService } from '../services/business-verification.service';
import { VerifyBusinessDto, ManualVerificationRequestDto } from '../dto/verification.dto';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('verification')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VerificationController {
  constructor(
    private businessVerificationService: BusinessVerificationService,
    private prisma: PrismaService,
  ) {}

  /**
   * POST /verification/business
   * Verify a business registration number (SIRET/RCS/KBO)
   * Public endpoint for initial verification check
   */
  @Post('business')
  @HttpCode(HttpStatus.OK)
  async verifyBusiness(@Body() dto: VerifyBusinessDto) {
    return this.businessVerificationService.verifyBusiness(dto);
  }

  /**
   * POST /verification/artisan/verify
   * Verify and update artisan profile with business information
   * Artisan only
   */
  @Post('artisan/verify')
  @Roles(UserRole.ARTISAN)
  @HttpCode(HttpStatus.OK)
  async verifyArtisan(@Request() req, @Body() dto: VerifyBusinessDto) {
    const artisanId = req.user.userId;
    await this.businessVerificationService.verifyArtisan(artisanId, dto);

    return {
      message: 'Vérification effectuée avec succès',
      status: await this.businessVerificationService.getVerificationStatus(artisanId),
    };
  }

  /**
   * GET /verification/artisan/status
   * Get verification status for current artisan
   * Artisan only
   */
  @Get('artisan/status')
  @Roles(UserRole.ARTISAN)
  async getMyVerificationStatus(@Request() req) {
    const artisanId = req.user.userId;
    return this.businessVerificationService.getVerificationStatus(artisanId);
  }

  /**
   * GET /verification/artisan/:artisanId/status
   * Get verification status for specific artisan
   * Admin only
   */
  @Get('artisan/:artisanId/status')
  @Roles(UserRole.ADMIN)
  async getArtisanVerificationStatus(@Param('artisanId') artisanId: string) {
    return this.businessVerificationService.getVerificationStatus(artisanId);
  }

  /**
   * POST /verification/artisan/:artisanId/reverify
   * Re-verify an artisan's business information
   * Admin only
   */
  @Post('artisan/:artisanId/reverify')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async reverifyArtisan(@Param('artisanId') artisanId: string) {
    const result = await this.businessVerificationService.reverifyArtisan(artisanId);

    return {
      message: 'Re-vérification effectuée',
      result,
    };
  }

  /**
   * GET /verification/admin/unverified
   * Get list of unverified artisans
   * Admin only
   */
  @Get('admin/unverified')
  @Roles(UserRole.ADMIN)
  async getUnverifiedArtisans() {
    return this.businessVerificationService.getUnverifiedArtisans();
  }

  /**
   * GET /verification/admin/reverification-needed
   * Get artisans needing annual re-verification (> 1 year)
   * Admin only
   */
  @Get('admin/reverification-needed')
  @Roles(UserRole.ADMIN)
  async getArtisansNeedingReverification() {
    return this.businessVerificationService.getArtisansNeedingReverification();
  }

  /**
   * POST /verification/admin/manual-review
   * Request manual verification review
   * Admin only
   */
  @Post('admin/manual-review')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async requestManualReview(@Body() dto: ManualVerificationRequestDto) {
    // Accept either the artisan profile id or the userId (same convention as
    // getVerificationStatus).
    const profile = await this.prisma.artisanProfile.findFirst({
      where: { OR: [{ id: dto.artisanId }, { userId: dto.artisanId }] },
      select: { id: true, businessVerificationWarnings: true },
    });

    if (!profile) {
      throw new NotFoundException('Artisan profile not found');
    }

    // Real persistence: flag the profile as pending manual review and record
    // the reason/notes in the warnings array (existing field), so the admin
    // queue (getVerificationStatus / MANUAL_REVIEW status) actually reflects it.
    const note = dto.notes ? ` (${dto.notes})` : '';
    const reviewNote = `MANUAL_REVIEW_REQUESTED: ${dto.reason}${note}`;

    await this.prisma.artisanProfile.update({
      where: { id: profile.id },
      data: {
        businessVerificationStatus: 'MANUAL_REVIEW',
        businessVerificationWarnings: [
          ...(profile.businessVerificationWarnings || []),
          reviewNote,
        ],
        businessVerificationLastCheck: new Date(),
      },
    });

    return {
      message: 'Demande de vérification manuelle créée',
      artisanId: dto.artisanId,
      reason: dto.reason,
      status: 'MANUAL_REVIEW',
    };
  }
}
