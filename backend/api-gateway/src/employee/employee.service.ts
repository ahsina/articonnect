import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmailService } from '../email/services/email.service';
import { InviteEmployeeDto } from './dto/invite-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { EmployeeRole, EmployeeStatus, PaymentModel } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class EmployeeService {
  private readonly logger = new Logger(EmployeeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private generateInvitationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private getDefaultPermissions(role: EmployeeRole): string[] {
    const permissionsMap = {
      [EmployeeRole.OWNER]: [
        'canManageCompany',
        'canManageEmployees',
        'canViewAllMissions',
        'canAssignMissions',
        'canViewFinancials',
        'canManageSettings',
      ],
      [EmployeeRole.MANAGER]: [
        'canManageEmployees',
        'canViewAllMissions',
        'canAssignMissions',
        'canViewFinancials',
      ],
      [EmployeeRole.SUPERVISOR]: [
        'canViewAllMissions',
        'canAssignMissions',
      ],
      [EmployeeRole.TECHNICIAN]: [
        'canViewAssignedMissions',
      ],
      [EmployeeRole.CONTRACTOR]: [
        'canViewAssignedMissions',
      ],
    };

    return permissionsMap[role] || [];
  }

  async inviteEmployee(companyId: string, inviterId: string, inviteDto: InviteEmployeeDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        employees: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Entreprise non trouvée');
    }

    const inviterEmployee = company.employees.find((emp) => emp.userId === inviterId);
    if (!inviterEmployee) {
      throw new ForbiddenException("Vous n'êtes pas membre de cette entreprise");
    }

    const permissions = (Array.isArray(inviterEmployee.permissions) ? inviterEmployee.permissions : []);
    if (!permissions.includes('canManageEmployees')) {
      throw new ForbiddenException("Vous n'avez pas la permission d'inviter des employés");
    }

    if (inviteDto.role === EmployeeRole.OWNER) {
      throw new BadRequestException("Impossible d'inviter un autre propriétaire");
    }

    const user = await this.prisma.user.findUnique({
      where: { email: inviteDto.email },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé avec cet email');
    }

    if (user.role !== 'ARTISAN') {
      throw new BadRequestException('Seuls les artisans peuvent être invités comme employés');
    }

    const existingEmployment = await this.prisma.companyEmployee.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId: user.id,
        },
      },
    });

    if (existingEmployment) {
      if (existingEmployment.status === EmployeeStatus.ACTIVE) {
        throw new ConflictException('Cet utilisateur est déjà employé dans cette entreprise');
      }
      if (existingEmployment.status === EmployeeStatus.PENDING_INVITATION) {
        throw new ConflictException('Une invitation est déjà en attente pour cet utilisateur');
      }
    }

    if (inviteDto.paymentModel === PaymentModel.COMMISSION && !inviteDto.commissionRate) {
      inviteDto.commissionRate = 50;
    }

    if (
      (inviteDto.paymentModel === PaymentModel.SALARY || inviteDto.paymentModel === PaymentModel.HYBRID) &&
      !inviteDto.baseSalary
    ) {
      throw new BadRequestException('Le salaire de base est requis pour ce modèle de paiement');
    }

    const invitationToken = this.generateInvitationToken();

    const defaultPermissions = this.getDefaultPermissions(inviteDto.role);
    const finalPermissions = inviteDto.permissions || defaultPermissions;

    const employeeRecord = await this.prisma.companyEmployee.create({
      data: {
        companyId,
        userId: user.id,
        role: inviteDto.role,
        status: EmployeeStatus.PENDING_INVITATION,
        invitationToken,
        invitationSentAt: new Date(),
        paymentModel: inviteDto.paymentModel,
        commissionRate: inviteDto.commissionRate,
        baseSalary: inviteDto.baseSalary,
        hourlyRate: inviteDto.hourlyRate,
        permissions: JSON.stringify(finalPermissions),
        specialties: inviteDto.specialtyIds
          ? {
              connect: inviteDto.specialtyIds.map((id) => ({ id })),
            }
          : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        company: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    this.logger.log(
      `Employee invited: ${user.email} to company ${companyId} by ${inviterId}. Token: ${invitationToken}`
    );

    // Get inviter information for the email
    const inviter = await this.prisma.user.findUnique({
      where: { id: inviterId },
      select: { firstName: true, lastName: true },
    });

    const inviterName = inviter ? `${inviter.firstName} ${inviter.lastName}` : 'Un responsable';

    // Send invitation email
    try {
      await this.emailService.sendEmployeeInvitationEmail(
        user.email,
        `${user.firstName} ${user.lastName}`,
        employeeRecord.company.companyName,
        inviterName,
        inviteDto.role,
        invitationToken,
      );
      this.logger.log(`Invitation email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send invitation email to ${user.email}`, error);
      // Don't throw - invitation is still valid, email just failed
    }

    return {
      ...employeeRecord,
      invitationUrl: `/api/employee/accept-invitation?token=${invitationToken}`,
    };
  }

  async acceptInvitation(userId: string, invitationToken: string) {
    const employeeRecord = await this.prisma.companyEmployee.findUnique({
      where: { invitationToken },
      include: {
        company: true,
        user: true,
      },
    });

    if (!employeeRecord) {
      throw new NotFoundException('Invitation non trouvée ou invalide');
    }

    if (employeeRecord.userId !== userId) {
      throw new ForbiddenException("Cette invitation n'est pas pour vous");
    }

    if (employeeRecord.status !== EmployeeStatus.PENDING_INVITATION) {
      throw new BadRequestException('Cette invitation a déjà été acceptée ou est expirée');
    }

    const updatedEmployee = await this.prisma.companyEmployee.update({
      where: { id: employeeRecord.id },
      data: {
        status: EmployeeStatus.ACTIVE,
        invitationAcceptedAt: new Date(),
        startDate: new Date(),
      },
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
            logo: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        specialties: true,
      },
    });

    this.logger.log(`Employee ${userId} accepted invitation to company ${employeeRecord.companyId}`);

    // Notify company owner that a new employee joined
    try {
      const owner = await this.prisma.user.findUnique({
        where: { id: employeeRecord.company.ownerId },
        select: { email: true, firstName: true, lastName: true },
      });

      if (owner) {
        await this.emailService.sendCompanyEmployeeJoinedEmail(
          owner.email,
          `${owner.firstName} ${owner.lastName}`,
          updatedEmployee.company.companyName,
          `${updatedEmployee.user.firstName} ${updatedEmployee.user.lastName}`,
          updatedEmployee.role,
        );
        this.logger.log(`Employee joined notification sent to owner ${owner.email}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send employee joined notification`, error);
    }

    return updatedEmployee;
  }

  async getEmployeeById(employeeId: string, requesterId: string) {
    const employee = await this.prisma.companyEmployee.findUnique({
      where: { id: employeeId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        company: {
          select: {
            id: true,
            companyName: true,
            ownerId: true,
          },
        },
        specialties: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employé non trouvé');
    }

    const requesterEmployee = await this.prisma.companyEmployee.findFirst({
      where: {
        companyId: employee.companyId,
        userId: requesterId,
        status: EmployeeStatus.ACTIVE,
      },
    });

    if (!requesterEmployee && employee.company.ownerId !== requesterId) {
      throw new ForbiddenException("Vous n'avez pas accès aux informations de cet employé");
    }

    return employee;
  }

  async getCompanyEmployees(companyId: string, requesterId: string, queryDto: EmployeeQueryDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        employees: {
          where: { userId: requesterId },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Entreprise non trouvée');
    }

    const isEmployee = company.employees.length > 0;
    const isOwner = company.ownerId === requesterId;

    if (!isEmployee && !isOwner) {
      throw new ForbiddenException("Vous n'avez pas accès à la liste des employés");
    }

    const { page = 1, limit = 20, role, status, sortBy = 'createdAt', sortOrder = 'desc' } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (role) {
      where.role = role;
    }
    if (status) {
      where.status = status;
    }

    const [employees, total] = await Promise.all([
      this.prisma.companyEmployee.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          specialties: true,
        },
      }),
      this.prisma.companyEmployee.count({ where }),
    ]);

    return {
      data: employees,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateEmployee(
    employeeId: string,
    requesterId: string,
    updateDto: UpdateEmployeeDto
  ) {
    const employee = await this.prisma.companyEmployee.findUnique({
      where: { id: employeeId },
      include: {
        company: {
          include: {
            employees: {
              where: { userId: requesterId },
            },
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employé non trouvé');
    }

    const requesterEmployee = employee.company.employees[0];
    if (!requesterEmployee) {
      throw new ForbiddenException("Vous n'êtes pas membre de cette entreprise");
    }

    const permissions = (Array.isArray(requesterEmployee.permissions) ? requesterEmployee.permissions : []);
    if (!permissions.includes('canManageEmployees')) {
      throw new ForbiddenException("Vous n'avez pas la permission de modifier les employés");
    }

    if (employee.role === EmployeeRole.OWNER && updateDto.role !== EmployeeRole.OWNER) {
      throw new BadRequestException('Impossible de changer le rôle du propriétaire');
    }

    if (updateDto.role === EmployeeRole.OWNER && employee.role !== EmployeeRole.OWNER) {
      throw new BadRequestException("Impossible de promouvoir un employé en tant que propriétaire");
    }

    if (updateDto.status === EmployeeStatus.TERMINATED && !updateDto.endDate) {
      updateDto.endDate = new Date();
    }

    const updateData: any = {
      role: updateDto.role,
      status: updateDto.status,
      paymentModel: updateDto.paymentModel,
      commissionRate: updateDto.commissionRate,
      baseSalary: updateDto.baseSalary,
      hourlyRate: updateDto.hourlyRate,
      endDate: updateDto.endDate,
    };

    if (updateDto.permissions) {
      updateData.permissions = JSON.stringify(updateDto.permissions);
    }

    if (updateDto.specialtyIds) {
      updateData.specialties = {
        set: updateDto.specialtyIds.map((id) => ({ id })),
      };
    }

    const updatedEmployee = await this.prisma.companyEmployee.update({
      where: { id: employeeId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        specialties: true,
      },
    });

    this.logger.log(`Employee ${employeeId} updated by ${requesterId}`);

    return updatedEmployee;
  }

  async removeEmployee(employeeId: string, requesterId: string) {
    const employee = await this.prisma.companyEmployee.findUnique({
      where: { id: employeeId },
      include: {
        company: {
          include: {
            employees: {
              where: { userId: requesterId },
            },
          },
        },
        assignedMissions: {
          where: {
            status: {
              in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'],
            },
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employé non trouvé');
    }

    if (employee.role === EmployeeRole.OWNER) {
      throw new BadRequestException('Impossible de supprimer le propriétaire de l\'entreprise');
    }

    const requesterEmployee = employee.company.employees[0];
    if (!requesterEmployee) {
      throw new ForbiddenException("Vous n'êtes pas membre de cette entreprise");
    }

    const permissions = (Array.isArray(requesterEmployee.permissions) ? requesterEmployee.permissions : []);
    if (!permissions.includes('canManageEmployees')) {
      throw new ForbiddenException("Vous n'avez pas la permission de supprimer des employés");
    }

    if (employee.assignedMissions.length > 0) {
      throw new BadRequestException(
        'Impossible de supprimer un employé avec des missions en cours. Veuillez réassigner ou terminer les missions d\'abord.'
      );
    }

    await this.prisma.companyEmployee.update({
      where: { id: employeeId },
      data: {
        status: EmployeeStatus.TERMINATED,
        endDate: new Date(),
      },
    });

    this.logger.log(`Employee ${employeeId} terminated by ${requesterId}`);

    return { message: 'Employé supprimé avec succès' };
  }

  async resendInvitation(employeeId: string, requesterId: string) {
    const employee = await this.prisma.companyEmployee.findUnique({
      where: { id: employeeId },
      include: {
        company: {
          include: {
            employees: {
              where: { userId: requesterId },
            },
          },
        },
        user: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employé non trouvé');
    }

    if (employee.status !== EmployeeStatus.PENDING_INVITATION) {
      throw new BadRequestException('Cet employé a déjà accepté l\'invitation');
    }

    const requesterEmployee = employee.company.employees[0];
    if (!requesterEmployee) {
      throw new ForbiddenException("Vous n'êtes pas membre de cette entreprise");
    }

    const permissions = (Array.isArray(requesterEmployee.permissions) ? requesterEmployee.permissions : []);
    if (!permissions.includes('canManageEmployees')) {
      throw new ForbiddenException("Vous n'avez pas la permission de renvoyer des invitations");
    }

    const newToken = this.generateInvitationToken();

    const updatedEmployee = await this.prisma.companyEmployee.update({
      where: { id: employeeId },
      data: {
        invitationToken: newToken,
        invitationSentAt: new Date(),
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
    });

    this.logger.log(`Invitation resent for employee ${employeeId} by ${requesterId}`);

    // Get requester info for the email
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { firstName: true, lastName: true },
    });

    const requesterName = requester ? `${requester.firstName} ${requester.lastName}` : 'Un responsable';

    // Send invitation email
    try {
      await this.emailService.sendEmployeeInvitationEmail(
        updatedEmployee.user.email,
        `${updatedEmployee.user.firstName} ${updatedEmployee.user.lastName}`,
        employee.company.companyName,
        requesterName,
        employee.role,
        newToken,
      );
      this.logger.log(`Invitation email resent to ${updatedEmployee.user.email}`);
    } catch (error) {
      this.logger.error(`Failed to resend invitation email to ${updatedEmployee.user.email}`, error);
    }

    return {
      ...updatedEmployee,
      invitationUrl: `/api/employee/accept-invitation?token=${newToken}`,
    };
  }

  async getEmployeeStats(employeeId: string, requesterId: string) {
    const employee = await this.prisma.companyEmployee.findUnique({
      where: { id: employeeId },
      include: {
        company: {
          include: {
            employees: {
              where: { userId: requesterId },
            },
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employé non trouvé');
    }

    const requesterEmployee = employee.company.employees[0];
    const isOwner = employee.company.ownerId === requesterId;

    if (!requesterEmployee && !isOwner) {
      throw new ForbiddenException("Vous n'avez pas accès aux statistiques de cet employé");
    }

    const requesterPermissions = requesterEmployee ? (Array.isArray(requesterEmployee.permissions) ? requesterEmployee.permissions : []) : [];
    const canViewFinancials = isOwner || requesterPermissions.includes('canViewFinancials');

    if (!canViewFinancials && employee.userId !== requesterId) {
      throw new ForbiddenException("Vous n'avez pas accès aux statistiques financières");
    }

    const [completedMissions, activeMissions, totalEarnings] = await Promise.all([
      this.prisma.mission.count({
        where: {
          completedById: employeeId,
          status: 'COMPLETED',
        },
      }),
      this.prisma.mission.count({
        where: {
          assignedToId: employeeId,
          status: {
            in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'],
          },
        },
      }),
      this.prisma.employeeEarnings.aggregate({
        where: {
          employeeId,
          status: 'PAID',
        },
        _sum: {
          employeeCommission: true,
        },
      }),
    ]);

    return {
      totalMissions: employee.totalMissions,
      completedMissions,
      activeMissions,
      totalEarnings: canViewFinancials ? (totalEarnings._sum.employeeCommission || 0) : null,
      averageRating: employee.averageRating,
      totalReviews: employee.totalReviews,
      role: employee.role,
      status: employee.status,
      paymentModel: employee.paymentModel,
      commissionRate: canViewFinancials ? employee.commissionRate : null,
    };
  }
}
