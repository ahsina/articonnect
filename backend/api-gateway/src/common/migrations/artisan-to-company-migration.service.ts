import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmployeeRole, EmployeeStatus, PaymentModel } from '@prisma/client';

export interface MigrationResult {
  success: boolean;
  companyId?: string;
  employeeId?: string;
  errors?: string[];
}

@Injectable()
export class ArtisanToCompanyMigrationService {
  private readonly logger = new Logger(ArtisanToCompanyMigrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async convertSoloArtisanToCompany(userId: string): Promise<MigrationResult> {
    const errors: string[] = [];

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          artisanProfile: {
            include: {
              specialties: true,
              certifications: true,
            },
          },
        },
      });

      if (!user) {
        errors.push('Utilisateur non trouvé');
        return { success: false, errors };
      }

      if (!user.artisanProfile) {
        errors.push('Profil artisan non trouvé');
        return { success: false, errors };
      }

      const existingCompany = await this.prisma.company.findUnique({
        where: { ownerId: userId },
      });

      if (existingCompany) {
        errors.push('Une entreprise existe déjà pour cet utilisateur');
        return { success: false, errors };
      }

      const artisanProfile = user.artisanProfile;

      const result = await this.prisma.$transaction(async (tx) => {
        const company = await tx.company.create({
          data: {
            companyName: artisanProfile.companyName || `${user.firstName} ${user.lastName}`,
            siret: artisanProfile.siret || this.generateTemporarySiret(),
            vatNumber: artisanProfile.vatNumber,
            description: artisanProfile.description,
            baseAddress: artisanProfile.baseAddress || 'À définir',
            city: 'À définir',
            postalCode: '00000',
            country: artisanProfile.businessCountry || 'FR',
            latitude: artisanProfile.latitude || 0,
            longitude: artisanProfile.longitude || 0,
            serviceRadius: artisanProfile.serviceRadius || 20,
            businessVerified: artisanProfile.businessVerified,
            businessVerifiedAt: artisanProfile.businessVerifiedAt,
            businessVerificationStatus: artisanProfile.businessVerificationStatus || 'PENDING',
            businessRegistrationNumber: artisanProfile.businessRegistrationNumber,
            businessCountry: artisanProfile.businessCountry,
            businessVerificationErrors: artisanProfile.businessVerificationErrors || [],
            businessVerificationWarnings: artisanProfile.businessVerificationWarnings || [],
            businessLegalForm: artisanProfile.businessLegalForm,
            businessActivityCode: artisanProfile.businessActivityCode,
            businessVerificationLastCheck: artisanProfile.businessVerificationLastCheck,
            stripeAccountId: artisanProfile.stripeAccountId,
            stripeOnboarded: artisanProfile.stripeOnboarded,
            totalMissions: artisanProfile.missionCount,
            totalRevenue: 0,
            averageRating: artisanProfile.rating,
            totalReviews: artisanProfile.reviewCount,
            ownerId: userId,
          },
        });

        await tx.companySettings.create({
          data: {
            companyId: company.id,
            defaultCommissionRate: 50,
            ownerCommissionRate: 100,
            autoAssignMissions: false,
            requireManagerApproval: false,
            allowEmployeeSelfAssignment: true,
            payoutFrequency: 'WEEKLY',
            minimumPayout: 50,
            notifyOwnerOnNewMission: true,
            notifyManagerOnNewMission: true,
            notifyEmployeeOnAssignment: true,
          },
        });

        const employee = await tx.companyEmployee.create({
          data: {
            companyId: company.id,
            userId: userId,
            role: EmployeeRole.OWNER,
            status: EmployeeStatus.ACTIVE,
            startDate: new Date(),
            paymentModel: PaymentModel.COMMISSION,
            commissionRate: 100,
            permissions: [
              'canManageCompany',
              'canManageEmployees',
              'canViewAllMissions',
              'canAssignMissions',
              'canViewFinancials',
              'canManageSettings',
            ],
            totalMissions: artisanProfile.missionCount,
            totalEarnings: 0,
            averageRating: artisanProfile.rating,
            totalReviews: artisanProfile.reviewCount,
            specialties: {
              connect: artisanProfile.specialties.map((s) => ({ id: s.id })),
            },
          },
        });

        await tx.artisanProfile.update({
          where: { id: artisanProfile.id },
          data: {
            companyId: company.id,
          },
        });

        await tx.mission.updateMany({
          where: {
            artisanId: userId,
            companyId: null,
          },
          data: {
            companyId: company.id,
            assignedToId: employee.id,
            completedById: employee.id,
          },
        });

        return { company, employee };
      });

      this.logger.log(
        `Successfully converted solo artisan ${userId} to company owner. ` +
        `Company ID: ${result.company.id}, Employee ID: ${result.employee.id}`
      );

      return {
        success: true,
        companyId: result.company.id,
        employeeId: result.employee.id,
      };
    } catch (error) {
      this.logger.error(`Failed to convert artisan ${userId} to company:`, error);
      errors.push(`Échec de la conversion: ${error.message}`);
      return { success: false, errors };
    }
  }

  async bulkConvertArtisansToCompanies(userIds: string[]): Promise<{
    successCount: number;
    failureCount: number;
    results: Record<string, MigrationResult>;
  }> {
    const results: Record<string, MigrationResult> = {};
    let successCount = 0;
    let failureCount = 0;

    for (const userId of userIds) {
      const result = await this.convertSoloArtisanToCompany(userId);
      results[userId] = result;

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    this.logger.log(
      `Bulk conversion complete: ${successCount} successes, ${failureCount} failures`
    );

    return { successCount, failureCount, results };
  }

  async getAllSoloArtisansWithoutCompany(): Promise<string[]> {
    const artisans = await this.prisma.user.findMany({
      where: {
        role: 'ARTISAN',
        artisanProfile: {
          isNot: null,
        },
        ownedCompany: null,
      },
      select: {
        id: true,
      },
    });

    return artisans.map((a) => a.id);
  }

  private generateTemporarySiret(): string {
    const timestamp = Date.now().toString().slice(-9);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TEMP${timestamp}${random}`;
  }
}
