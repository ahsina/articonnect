import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateEmployeeEarningsDto, UpdateEarningsStatusDto, EmployeeEarningsQueryDto, ProcessPayoutDto } from '../dto/employee-earnings.dto';
import { EmployeeStatus, PaymentModel, Prisma } from '@prisma/client';
import { PlatformConfigService } from '../../config/services/platform-config.service';

@Injectable()
export class EmployeeEarningsService {
  private readonly logger = new Logger(EmployeeEarningsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly platformConfig: PlatformConfigService,
  ) {}

  async createEarningsFromMission(missionId: string, employeeId: string, notes?: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        company: {
          include: {
            settings: true,
          },
        },
        assignedTo: true,
        completedBy: true,
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission non trouvée');
    }

    if (!mission.completedById) {
      throw new BadRequestException('La mission doit être marquée comme terminée');
    }

    if (!mission.finalPrice) {
      throw new BadRequestException('Le prix final de la mission doit être défini');
    }

    const employee = await this.prisma.companyEmployee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employé non trouvé');
    }

    if (employee.companyId !== mission.companyId) {
      throw new BadRequestException("L'employé n'appartient pas à l'entreprise de la mission");
    }

    const existingEarnings = await this.prisma.employeeEarnings.findFirst({
      where: {
        missionId,
        employeeId,
      },
    });

    if (existingEarnings) {
      throw new BadRequestException('Des gains existent déjà pour cette mission et cet employé');
    }

    // Get configurable commission rate
    const feeSettings = await this.platformConfig.getFeeSettings();
    const platformCommissionRate = feeSettings.platformCommissionRate / 100;

    const missionRevenue = new Prisma.Decimal(mission.finalPrice.toString());
    const platformCommission = missionRevenue.mul(platformCommissionRate);
    const companyRevenue = missionRevenue.sub(platformCommission);

    let employeeCommission: Prisma.Decimal;
    let employeeCommissionRate: Prisma.Decimal;

    if (employee.paymentModel === PaymentModel.SALARY) {
      employeeCommission = new Prisma.Decimal(0);
      employeeCommissionRate = new Prisma.Decimal(0);
    } else if (employee.paymentModel === PaymentModel.COMMISSION) {
      employeeCommissionRate = employee.commissionRate || new Prisma.Decimal(50);
      employeeCommission = companyRevenue.mul(employeeCommissionRate.div(100));
    } else {
      employeeCommissionRate = employee.commissionRate || new Prisma.Decimal(50);
      employeeCommission = companyRevenue.mul(employeeCommissionRate.div(100));
    }

    const earnings = await this.prisma.employeeEarnings.create({
      data: {
        employeeId,
        missionId,
        missionRevenue,
        platformCommission,
        companyRevenue,
        employeeCommission,
        employeeCommissionRate,
        status: 'PENDING',
        payoutMethod: 'STRIPE_TRANSFER',
        notes,
      },
      include: {
        employee: {
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
        mission: {
          select: {
            id: true,
            title: true,
            finalPrice: true,
          },
        },
      },
    });

    await this.prisma.companyEmployee.update({
      where: { id: employeeId },
      data: {
        totalEarnings: {
          increment: employeeCommission,
        },
      },
    });

    this.logger.log(
      `Earnings created for employee ${employeeId} from mission ${missionId}. ` +
      `Amount: ${employeeCommission.toString()}`
    );

    return earnings;
  }

  async getEmployeeEarnings(queryDto: EmployeeEarningsQueryDto, requesterId: string) {
    const { employeeId, status, startDate, endDate, page = 1, limit = 20 } = queryDto;
    const skip = (page - 1) * limit;

    if (employeeId) {
      const employee = await this.prisma.companyEmployee.findUnique({
        where: { id: employeeId },
        include: {
          company: {
            include: {
              employees: {
                where: {
                  userId: requesterId,
                  status: EmployeeStatus.ACTIVE,
                },
              },
            },
          },
        },
      });

      if (!employee) {
        throw new NotFoundException('Employé non trouvé');
      }

      const isOwner = employee.company.ownerId === requesterId;
      const isManager = employee.company.employees.some((emp) => {
        const permissions = (Array.isArray(emp.permissions) ? emp.permissions : []);
        return permissions.includes('canViewFinancials');
      });
      const isSelf = employee.userId === requesterId;

      if (!isOwner && !isManager && !isSelf) {
        throw new ForbiddenException("Vous n'avez pas accès aux gains de cet employé");
      }
    }

    const where: any = {};
    if (employeeId) {
      where.employeeId = employeeId;
    }
    if (status) {
      where.status = status;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [earnings, total] = await Promise.all([
      this.prisma.employeeEarnings.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          employee: {
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
          mission: {
            select: {
              id: true,
              title: true,
              finalPrice: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.employeeEarnings.count({ where }),
    ]);

    return {
      data: earnings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getEarningsById(earningsId: string, requesterId: string) {
    const earnings = await this.prisma.employeeEarnings.findUnique({
      where: { id: earningsId },
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            company: {
              select: {
                id: true,
                companyName: true,
                ownerId: true,
              },
            },
          },
        },
        mission: {
          select: {
            id: true,
            title: true,
            description: true,
            finalPrice: true,
            status: true,
          },
        },
      },
    });

    if (!earnings) {
      throw new NotFoundException('Gains non trouvés');
    }

    const isOwner = earnings.employee.company.ownerId === requesterId;
    const isSelf = earnings.employee.userId === requesterId;

    const requesterEmployee = await this.prisma.companyEmployee.findFirst({
      where: {
        companyId: earnings.employee.companyId,
        userId: requesterId,
        status: EmployeeStatus.ACTIVE,
      },
    });

    const hasFinancialAccess = requesterEmployee
      ? (Array.isArray(requesterEmployee.permissions) ? requesterEmployee.permissions : []).includes('canViewFinancials')
      : false;

    if (!isOwner && !hasFinancialAccess && !isSelf) {
      throw new ForbiddenException("Vous n'avez pas accès à ces gains");
    }

    return earnings;
  }

  async updateEarningsStatus(earningsId: string, requesterId: string, updateDto: UpdateEarningsStatusDto) {
    const earnings = await this.prisma.employeeEarnings.findUnique({
      where: { id: earningsId },
      include: {
        employee: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!earnings) {
      throw new NotFoundException('Gains non trouvés');
    }

    const requesterEmployee = await this.prisma.companyEmployee.findFirst({
      where: {
        companyId: earnings.employee.companyId,
        userId: requesterId,
        status: EmployeeStatus.ACTIVE,
      },
    });

    const isOwner = earnings.employee.company.ownerId === requesterId;
    const hasFinancialAccess = requesterEmployee
      ? (Array.isArray(requesterEmployee.permissions) ? requesterEmployee.permissions : []).includes('canViewFinancials')
      : false;

    if (!isOwner && !hasFinancialAccess) {
      throw new ForbiddenException("Vous n'avez pas la permission de modifier les gains");
    }

    const updatedEarnings = await this.prisma.employeeEarnings.update({
      where: { id: earningsId },
      data: {
        status: updateDto.status,
        payoutDate: updateDto.payoutDate ? new Date(updateDto.payoutDate) : undefined,
        stripeTransferId: updateDto.stripeTransferId,
        notes: updateDto.notes,
      },
      include: {
        employee: {
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
    });

    this.logger.log(`Earnings ${earningsId} status updated to ${updateDto.status} by ${requesterId}`);

    return updatedEarnings;
  }

  async processPendingPayouts(companyId: string, requesterId: string, processDto: ProcessPayoutDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        employees: {
          where: {
            userId: requesterId,
            status: EmployeeStatus.ACTIVE,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Entreprise non trouvée');
    }

    const isOwner = company.ownerId === requesterId;
    const hasFinancialAccess = company.employees.some((emp) => {
      const permissions = (Array.isArray(emp.permissions) ? emp.permissions : []);
      return permissions.includes('canViewFinancials');
    });

    if (!isOwner && !hasFinancialAccess) {
      throw new ForbiddenException("Vous n'avez pas la permission de traiter les paiements");
    }

    const earnings = await this.prisma.employeeEarnings.findMany({
      where: {
        id: { in: processDto.earningIds },
        status: 'PENDING',
        employee: {
          companyId,
        },
      },
    });

    if (earnings.length !== processDto.earningIds.length) {
      throw new BadRequestException('Certains gains sont invalides ou déjà traités');
    }

    const updatedEarnings = await this.prisma.$transaction(
      processDto.earningIds.map((earningId) =>
        this.prisma.employeeEarnings.update({
          where: { id: earningId },
          data: {
            status: 'PROCESSING',
            payoutMethod: processDto.payoutMethod,
          },
        })
      )
    );

    this.logger.log(
      `${processDto.earningIds.length} payouts initiated for company ${companyId} by ${requesterId}`
    );

    return {
      processedCount: updatedEarnings.length,
      earnings: updatedEarnings,
    };
  }

  async getCompanyEarningsSummary(companyId: string, requesterId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        employees: {
          where: {
            userId: requesterId,
            status: EmployeeStatus.ACTIVE,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Entreprise non trouvée');
    }

    const isOwner = company.ownerId === requesterId;
    const hasFinancialAccess = company.employees.some((emp) => {
      const permissions = (Array.isArray(emp.permissions) ? emp.permissions : []);
      return permissions.includes('canViewFinancials');
    });

    if (!isOwner && !hasFinancialAccess) {
      throw new ForbiddenException("Vous n'avez pas accès aux statistiques financières");
    }

    const [totalEarnings, pendingPayouts, paidOut, employeesCount] = await Promise.all([
      this.prisma.employeeEarnings.aggregate({
        where: {
          employee: {
            companyId,
          },
        },
        _sum: {
          employeeCommission: true,
          companyRevenue: true,
          platformCommission: true,
        },
      }),
      this.prisma.employeeEarnings.aggregate({
        where: {
          employee: {
            companyId,
          },
          status: 'PENDING',
        },
        _sum: {
          employeeCommission: true,
        },
        _count: true,
      }),
      this.prisma.employeeEarnings.aggregate({
        where: {
          employee: {
            companyId,
          },
          status: 'PAID',
        },
        _sum: {
          employeeCommission: true,
        },
        _count: true,
      }),
      this.prisma.companyEmployee.count({
        where: {
          companyId,
          status: EmployeeStatus.ACTIVE,
        },
      }),
    ]);

    return {
      totalRevenue: totalEarnings._sum.companyRevenue || 0,
      totalPlatformFees: totalEarnings._sum.platformCommission || 0,
      totalEmployeeEarnings: totalEarnings._sum.employeeCommission || 0,
      pendingPayouts: {
        amount: pendingPayouts._sum.employeeCommission || 0,
        count: pendingPayouts._count,
      },
      paidOut: {
        amount: paidOut._sum.employeeCommission || 0,
        count: paidOut._count,
      },
      activeEmployees: employeesCount,
    };
  }
}
