import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { CompanyQueryDto } from './dto/company-query.dto';
import { EmployeeRole, EmployeeStatus, PaymentModel } from '@prisma/client';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lit les permissions d'un employé de façon robuste. La colonne Prisma est de type Json et doit
   * stocker un vrai tableau. On accepte aussi une string JSON (lignes historiques doublement
   * encodées) pour ne pas perdre les permissions à la relecture.
   */
  private normalizePermissions(raw: unknown): string[] {
    if (Array.isArray(raw)) return raw as string[];
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as string[]) : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  async createCompany(ownerId: string, createCompanyDto: CreateCompanyDto) {
    const existingCompany = await this.prisma.company.findUnique({
      where: { ownerId },
    });

    if (existingCompany) {
      throw new ConflictException('Vous avez déjà une entreprise enregistrée');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: ownerId },
      include: { artisanProfile: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (user.role !== 'ARTISAN') {
      throw new ForbiddenException('Seuls les artisans peuvent créer une entreprise');
    }

    const siretExists = await this.prisma.company.findUnique({
      where: { siret: createCompanyDto.siret },
    });

    if (siretExists) {
      throw new ConflictException('Ce numéro SIRET est déjà enregistré');
    }

    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          companyName: createCompanyDto.companyName,
          siret: createCompanyDto.siret,
          vatNumber: createCompanyDto.vatNumber,
          description: createCompanyDto.description,
          website: createCompanyDto.website,
          baseAddress: createCompanyDto.baseAddress,
          city: createCompanyDto.city,
          postalCode: createCompanyDto.postalCode,
          country: createCompanyDto.country,
          latitude: createCompanyDto.latitude,
          longitude: createCompanyDto.longitude,
          serviceRadius: createCompanyDto.serviceRadius || 20,
          businessRegistrationNumber: createCompanyDto.businessRegistrationNumber,
          businessLegalForm: createCompanyDto.businessLegalForm,
          businessActivityCode: createCompanyDto.businessActivityCode,
          ownerId,
        },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      await tx.companySettings.create({
        data: {
          companyId: company.id,
        },
      });

      const employeeRecord = await tx.companyEmployee.create({
        data: {
          companyId: company.id,
          userId: ownerId,
          role: EmployeeRole.OWNER,
          status: EmployeeStatus.ACTIVE,
          paymentModel: PaymentModel.COMMISSION,
          commissionRate: 100,
          // Colonne Prisma Json : stocker le TABLEAU directement (pas de JSON.stringify -> sinon
          // double-encodage relu comme string, Array.isArray()=false, toutes les permissions perdues).
          permissions: [
            'canManageCompany',
            'canManageEmployees',
            'canViewAllMissions',
            'canAssignMissions',
            'canViewFinancials',
            'canManageSettings',
          ],
        },
      });

      if (user.artisanProfile) {
        await tx.artisanProfile.update({
          where: { id: user.artisanProfile.id },
          data: { companyId: company.id },
        });
      }

      this.logger.log(`Company created: ${company.id} by owner ${ownerId}`);

      return {
        ...company,
        employeeRecord,
      };
    });
  }

  async getCompanyById(companyId: string, userId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        employees: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true,
              },
            },
            specialties: true,
          },
        },
        settings: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Entreprise non trouvée');
    }

    const isEmployee = company.employees.some((emp) => emp.userId === userId);
    const isOwner = company.ownerId === userId;

    if (!isEmployee && !isOwner) {
      throw new ForbiddenException("Vous n'avez pas accès aux informations de cette entreprise");
    }

    return company;
  }

  async getMyCompany(userId: string) {
    const company = await this.prisma.company.findUnique({
      where: { ownerId: userId },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        employees: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true,
              },
            },
            specialties: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        settings: true,
      },
    });

    if (!company) {
      const employment = await this.prisma.companyEmployee.findFirst({
        where: {
          userId,
          status: EmployeeStatus.ACTIVE,
        },
        include: {
          company: {
            include: {
              owner: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              employees: {
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                      avatar: true,
                    },
                  },
                  specialties: true,
                },
              },
              settings: true,
            },
          },
        },
      });

      if (!employment) {
        // Pas d'entreprise : on renvoie null (le front gère l'absence) plutôt qu'un 404 bruyant.
        return null;
      }

      return employment.company;
    }

    return company;
  }

  async getAllCompanies(queryDto: CompanyQueryDto) {
    const { page = 1, limit = 20, country, verificationStatus, sortBy = 'createdAt', sortOrder = 'desc' } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (country) {
      where.country = country;
    }
    if (verificationStatus) {
      where.businessVerificationStatus = verificationStatus;
    }

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              employees: true,
              missions: true,
            },
          },
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      data: companies,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateLogo(companyId: string, userId: string, logo: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { employees: true },
    });
    if (!company) {
      throw new NotFoundException('Entreprise non trouvée');
    }
    const employeeRecord = company.employees.find((emp) => emp.userId === userId);
    if (!employeeRecord) {
      throw new ForbiddenException("Vous n'êtes pas membre de cette entreprise");
    }
    return this.prisma.company.update({
      where: { id: companyId },
      data: { logo },
    });
  }

  async updateCompany(companyId: string, userId: string, updateCompanyDto: UpdateCompanyDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        employees: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Entreprise non trouvée');
    }

    const employeeRecord = company.employees.find((emp) => emp.userId === userId);
    if (!employeeRecord) {
      throw new ForbiddenException("Vous n'êtes pas membre de cette entreprise");
    }

    const permissions = this.normalizePermissions(employeeRecord.permissions);
    if (!permissions.includes('canManageCompany')) {
      throw new ForbiddenException("Vous n'avez pas la permission de modifier cette entreprise");
    }

    if (updateCompanyDto.siret && updateCompanyDto.siret !== company.siret) {
      const siretExists = await this.prisma.company.findUnique({
        where: { siret: updateCompanyDto.siret },
      });

      if (siretExists) {
        throw new ConflictException('Ce numéro SIRET est déjà enregistré');
      }
    }

    const updatedCompany = await this.prisma.company.update({
      where: { id: companyId },
      data: updateCompanyDto,
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        settings: true,
      },
    });

    this.logger.log(`Company updated: ${companyId} by user ${userId}`);

    return updatedCompany;
  }

  async updateCompanySettings(companyId: string, userId: string, updateSettingsDto: UpdateCompanySettingsDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        employees: true,
        settings: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Entreprise non trouvée');
    }

    const employeeRecord = company.employees.find((emp) => emp.userId === userId);
    if (!employeeRecord) {
      throw new ForbiddenException("Vous n'êtes pas membre de cette entreprise");
    }

    const permissions = this.normalizePermissions(employeeRecord.permissions);
    if (!permissions.includes('canManageSettings')) {
      throw new ForbiddenException("Vous n'avez pas la permission de modifier les paramètres");
    }

    const updatedSettings = await this.prisma.companySettings.update({
      where: { companyId },
      data: updateSettingsDto,
    });

    this.logger.log(`Company settings updated: ${companyId} by user ${userId}`);

    return updatedSettings;
  }

  async deleteCompany(companyId: string, userId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        employees: true,
        missions: {
          where: {
            status: {
              in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'],
            },
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Entreprise non trouvée');
    }

    if (company.ownerId !== userId) {
      throw new ForbiddenException('Seul le propriétaire peut supprimer cette entreprise');
    }

    if (company.missions.length > 0) {
      throw new BadRequestException(
        'Impossible de supprimer une entreprise avec des missions en cours. Veuillez terminer ou annuler toutes les missions actives.'
      );
    }

    await this.prisma.company.delete({
      where: { id: companyId },
    });

    this.logger.log(`Company deleted: ${companyId} by owner ${userId}`);

    return { message: 'Entreprise supprimée avec succès' };
  }

  async getCompanyStats(companyId: string, userId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        employees: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Entreprise non trouvée');
    }

    const isEmployee = company.employees.some((emp) => emp.userId === userId);
    if (!isEmployee && company.ownerId !== userId) {
      throw new ForbiddenException("Vous n'avez pas accès aux statistiques de cette entreprise");
    }

    // Les missions productives de l'entreprise sont rattachées soit à la company (companyId),
    // soit — cas historique/solo — à l'un de ses membres via artisanId. On agrège sur l'UNION
    // des deux pour ne pas renvoyer completedMissions:0 / totalRevenue:0 alors que les membres
    // ont réalisé des missions (le rattachement companyId n'a été posé que tardivement).
    const memberIds = [
      ...new Set([
        company.ownerId,
        ...company.employees
          .filter((emp) => emp.status === EmployeeStatus.ACTIVE)
          .map((emp) => emp.userId),
      ]),
    ];
    const scopeWhere: any = {
      OR: [{ companyId }, { artisanId: { in: memberIds } }],
    };

    const [totalMissions, completedMissions, activeMissions, completedRows, employeeCount] = await Promise.all([
      this.prisma.mission.count({ where: scopeWhere }),
      this.prisma.mission.count({ where: { ...scopeWhere, status: 'COMPLETED' } }),
      this.prisma.mission.count({
        where: {
          ...scopeWhere,
          status: {
            in: ['PENDING', 'NEGOTIATING', 'ACCEPTED', 'PENDING_DEPOSIT', 'DEPOSIT_PAID', 'IN_TRANSIT', 'PAID', 'IN_PROGRESS'],
          },
        },
      }),
      // finalPrice est souvent null → on somme finalPrice ?? agreedPrice (revenu réel convenu).
      this.prisma.mission.findMany({
        where: { ...scopeWhere, status: 'COMPLETED' },
        select: { finalPrice: true, agreedPrice: true },
      }),
      this.prisma.companyEmployee.count({
        where: { companyId, status: EmployeeStatus.ACTIVE },
      }),
    ]);

    const totalRevenue = completedRows.reduce(
      (sum, m) => sum + Number(m.finalPrice ?? m.agreedPrice ?? 0),
      0,
    );

    // Note/avis : agrégés en réel depuis les profils artisans des membres (les compteurs
    // dénormalisés Company.averageRating/totalReviews restent à 0 faute d'alimentation).
    const memberProfiles = await this.prisma.artisanProfile.findMany({
      where: { userId: { in: memberIds } },
      select: { rating: true, reviewCount: true },
    });
    const totalReviews = memberProfiles.reduce((s, p) => s + (p.reviewCount || 0), 0);
    const weightedRating = memberProfiles.reduce((s, p) => s + Number(p.rating || 0) * (p.reviewCount || 0), 0);
    const averageRating = totalReviews ? +(weightedRating / totalReviews).toFixed(2) : Number(company.averageRating || 0);

    return {
      totalMissions,
      completedMissions,
      activeMissions,
      totalRevenue: +totalRevenue.toFixed(2),
      averageRating,
      totalReviews,
      employeeCount,
    };
  }
}
