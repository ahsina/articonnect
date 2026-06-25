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
          permissions: JSON.stringify([
            'canManageCompany',
            'canManageEmployees',
            'canViewAllMissions',
            'canAssignMissions',
            'canViewFinancials',
            'canManageSettings',
          ]),
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

    const permissions = JSON.parse(employeeRecord.permissions as string);
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

    const permissions = JSON.parse(employeeRecord.permissions as string);
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

    const [totalMissions, completedMissions, activeMissions, totalRevenue, employeeCount] = await Promise.all([
      this.prisma.mission.count({
        where: { companyId },
      }),
      this.prisma.mission.count({
        where: {
          companyId,
          status: 'COMPLETED',
        },
      }),
      this.prisma.mission.count({
        where: {
          companyId,
          status: {
            in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'],
          },
        },
      }),
      this.prisma.mission.aggregate({
        where: {
          companyId,
          status: 'COMPLETED',
        },
        _sum: {
          finalPrice: true,
        },
      }),
      this.prisma.companyEmployee.count({
        where: {
          companyId,
          status: EmployeeStatus.ACTIVE,
        },
      }),
    ]);

    return {
      totalMissions,
      completedMissions,
      activeMissions,
      totalRevenue: totalRevenue._sum.finalPrice || 0,
      averageRating: company.averageRating,
      totalReviews: company.totalReviews,
      employeeCount,
    };
  }
}
