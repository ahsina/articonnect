import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AssignMissionToEmployeeDto, ReassignMissionDto, AssignMissionToCompanyDto, BulkAssignMissionsDto, MarkMissionCompletedDto } from '../dto/mission-assignment.dto';
import { EmployeeRole, EmployeeStatus, MissionStatus } from '@prisma/client';

@Injectable()
export class MissionAssignmentService {
  private readonly logger = new Logger(MissionAssignmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async checkAssignmentPermission(userId: string, companyId: string): Promise<boolean> {
    const employee = await this.prisma.companyEmployee.findFirst({
      where: {
        companyId,
        userId,
        status: EmployeeStatus.ACTIVE,
      },
    });

    if (!employee) {
      return false;
    }

    const permissions = JSON.parse(employee.permissions as string);
    return permissions.includes('canAssignMissions');
  }

  async assignMissionToCompany(missionId: string, assignerId: string, assignDto: AssignMissionToCompanyDto) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        client: true,
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission non trouvée');
    }

    if (mission.status !== MissionStatus.PENDING && mission.status !== MissionStatus.NEGOTIATING) {
      throw new BadRequestException('Cette mission a déjà été assignée ou est en cours');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: assignDto.companyId },
      include: {
        employees: {
          where: { status: EmployeeStatus.ACTIVE },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Entreprise non trouvée');
    }

    let assignedEmployee = null;
    if (assignDto.employeeId) {
      assignedEmployee = company.employees.find((emp) => emp.id === assignDto.employeeId);
      if (!assignedEmployee) {
        throw new NotFoundException('Employé non trouvé dans cette entreprise');
      }
    }

    const updatedMission = await this.prisma.mission.update({
      where: { id: missionId },
      data: {
        companyId: assignDto.companyId,
        assignedToId: assignedEmployee?.id,
        status: assignedEmployee ? MissionStatus.ACCEPTED : MissionStatus.PENDING,
      },
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
          },
        },
        assignedTo: {
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

    this.logger.log(
      `Mission ${missionId} assigned to company ${assignDto.companyId}` +
      (assignedEmployee ? ` and employee ${assignedEmployee.id}` : '')
    );

    return updatedMission;
  }

  async assignMissionToEmployee(missionId: string, assignerId: string, assignDto: AssignMissionToEmployeeDto) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        company: {
          include: {
            employees: true,
            settings: true,
          },
        },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission non trouvée');
    }

    if (!mission.companyId) {
      throw new BadRequestException('La mission doit être assignée à une entreprise d\'abord');
    }

    const hasPermission = await this.checkAssignmentPermission(assignerId, mission.companyId);
    if (!hasPermission) {
      throw new ForbiddenException("Vous n'avez pas la permission d'assigner des missions");
    }

    const employee = await this.prisma.companyEmployee.findUnique({
      where: { id: assignDto.employeeId },
      include: {
        user: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employé non trouvé');
    }

    if (employee.companyId !== mission.companyId) {
      throw new BadRequestException("Cet employé n'appartient pas à l'entreprise de la mission");
    }

    if (employee.status !== EmployeeStatus.ACTIVE) {
      throw new BadRequestException('Cet employé n\'est pas actif');
    }

    if (mission.company.settings?.requireManagerApproval && mission.status === MissionStatus.PENDING) {
      throw new BadRequestException('Cette mission nécessite l\'approbation d\'un manager');
    }

    const updatedMission = await this.prisma.mission.update({
      where: { id: missionId },
      data: {
        assignedToId: assignDto.employeeId,
        status: MissionStatus.ACCEPTED,
      },
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
          },
        },
        assignedTo: {
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

    await this.prisma.companyEmployee.update({
      where: { id: assignDto.employeeId },
      data: {
        totalMissions: {
          increment: 1,
        },
      },
    });

    this.logger.log(`Mission ${missionId} assigned to employee ${assignDto.employeeId} by ${assignerId}`);

    return updatedMission;
  }

  async reassignMission(missionId: string, requesterId: string, reassignDto: ReassignMissionDto) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        company: true,
        assignedTo: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission non trouvée');
    }

    if (!mission.companyId) {
      throw new BadRequestException('La mission doit être assignée à une entreprise');
    }

    const hasPermission = await this.checkAssignmentPermission(requesterId, mission.companyId);
    if (!hasPermission) {
      throw new ForbiddenException("Vous n'avez pas la permission de réassigner des missions");
    }

    if (mission.status === MissionStatus.COMPLETED || mission.status === MissionStatus.CANCELLED) {
      throw new BadRequestException('Impossible de réassigner une mission terminée ou annulée');
    }

    const newEmployee = await this.prisma.companyEmployee.findUnique({
      where: { id: reassignDto.newEmployeeId },
      include: {
        user: true,
      },
    });

    if (!newEmployee) {
      throw new NotFoundException('Nouvel employé non trouvé');
    }

    if (newEmployee.companyId !== mission.companyId) {
      throw new BadRequestException("Le nouvel employé n'appartient pas à la même entreprise");
    }

    if (newEmployee.status !== EmployeeStatus.ACTIVE) {
      throw new BadRequestException('Le nouvel employé n\'est pas actif');
    }

    const oldEmployeeId = mission.assignedToId;

    const updatedMission = await this.prisma.mission.update({
      where: { id: missionId },
      data: {
        assignedToId: reassignDto.newEmployeeId,
      },
      include: {
        assignedTo: {
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

    if (oldEmployeeId) {
      await this.prisma.companyEmployee.update({
        where: { id: oldEmployeeId },
        data: {
          totalMissions: {
            decrement: 1,
          },
        },
      });
    }

    await this.prisma.companyEmployee.update({
      where: { id: reassignDto.newEmployeeId },
      data: {
        totalMissions: {
          increment: 1,
        },
      },
    });

    this.logger.log(
      `Mission ${missionId} reassigned from ${oldEmployeeId || 'unassigned'} to ${reassignDto.newEmployeeId}. Reason: ${reassignDto.reason}`
    );

    return updatedMission;
  }

  async bulkAssignMissions(requesterId: string, bulkDto: BulkAssignMissionsDto) {
    const employee = await this.prisma.companyEmployee.findUnique({
      where: { id: bulkDto.employeeId },
      include: {
        company: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employé non trouvé');
    }

    if (employee.status !== EmployeeStatus.ACTIVE) {
      throw new BadRequestException('L\'employé n\'est pas actif');
    }

    const hasPermission = await this.checkAssignmentPermission(requesterId, employee.companyId);
    if (!hasPermission) {
      throw new ForbiddenException("Vous n'avez pas la permission d'assigner des missions");
    }

    const missions = await this.prisma.mission.findMany({
      where: {
        id: { in: bulkDto.missionIds },
        companyId: employee.companyId,
        status: {
          in: [MissionStatus.PENDING, MissionStatus.ACCEPTED],
        },
      },
    });

    if (missions.length !== bulkDto.missionIds.length) {
      throw new BadRequestException('Certaines missions sont invalides ou déjà assignées');
    }

    const updatedMissions = await this.prisma.$transaction(
      bulkDto.missionIds.map((missionId) =>
        this.prisma.mission.update({
          where: { id: missionId },
          data: {
            assignedToId: bulkDto.employeeId,
            status: MissionStatus.ACCEPTED,
          },
        })
      )
    );

    await this.prisma.companyEmployee.update({
      where: { id: bulkDto.employeeId },
      data: {
        totalMissions: {
          increment: bulkDto.missionIds.length,
        },
      },
    });

    this.logger.log(
      `${bulkDto.missionIds.length} missions bulk assigned to employee ${bulkDto.employeeId} by ${requesterId}`
    );

    return {
      assignedCount: updatedMissions.length,
      missions: updatedMissions,
    };
  }

  async unassignMission(missionId: string, requesterId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        company: true,
        assignedTo: true,
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission non trouvée');
    }

    if (!mission.companyId) {
      throw new BadRequestException('La mission n\'est pas assignée à une entreprise');
    }

    const hasPermission = await this.checkAssignmentPermission(requesterId, mission.companyId);
    if (!hasPermission) {
      throw new ForbiddenException("Vous n'avez pas la permission de désassigner des missions");
    }

    if (mission.status === MissionStatus.IN_PROGRESS) {
      throw new BadRequestException('Impossible de désassigner une mission en cours');
    }

    const oldEmployeeId = mission.assignedToId;

    const updatedMission = await this.prisma.mission.update({
      where: { id: missionId },
      data: {
        assignedToId: null,
        status: MissionStatus.PENDING,
      },
    });

    if (oldEmployeeId) {
      await this.prisma.companyEmployee.update({
        where: { id: oldEmployeeId },
        data: {
          totalMissions: {
            decrement: 1,
          },
        },
      });
    }

    this.logger.log(`Mission ${missionId} unassigned from employee ${oldEmployeeId} by ${requesterId}`);

    return updatedMission;
  }

  async markMissionCompleted(missionId: string, employeeId: string, completionDto: MarkMissionCompletedDto) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        assignedTo: true,
        company: true,
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission non trouvée');
    }

    if (mission.assignedToId !== employeeId) {
      throw new ForbiddenException('Vous n\'êtes pas assigné à cette mission');
    }

    if (mission.status !== MissionStatus.IN_PROGRESS) {
      throw new BadRequestException('La mission doit être en cours pour être marquée comme terminée');
    }

    const updatedMission = await this.prisma.mission.update({
      where: { id: missionId },
      data: {
        status: MissionStatus.COMPLETED,
        completedById: employeeId,
      },
      include: {
        assignedTo: {
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
        completedBy: {
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

    this.logger.log(`Mission ${missionId} marked as completed by employee ${employeeId}`);

    return updatedMission;
  }

  async getEmployeeAssignedMissions(employeeId: string, requesterId: string) {
    const employee = await this.prisma.companyEmployee.findUnique({
      where: { id: employeeId },
      include: {
        company: true,
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

    if (!requesterEmployee && employee.userId !== requesterId) {
      throw new ForbiddenException("Vous n'avez pas accès aux missions de cet employé");
    }

    const missions = await this.prisma.mission.findMany({
      where: {
        assignedToId: employeeId,
        status: {
          in: [MissionStatus.PENDING, MissionStatus.ACCEPTED, MissionStatus.IN_PROGRESS],
        },
      },
      include: {
        client: {
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
          },
        },
      },
      orderBy: {
        scheduledFor: 'asc',
      },
    });

    return missions;
  }

  async getUnassignedCompanyMissions(companyId: string, requesterId: string) {
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

    if (company.employees.length === 0 && company.ownerId !== requesterId) {
      throw new ForbiddenException("Vous n'avez pas accès aux missions de cette entreprise");
    }

    const missions = await this.prisma.mission.findMany({
      where: {
        companyId,
        assignedToId: null,
        status: {
          in: [MissionStatus.PENDING, MissionStatus.ACCEPTED],
        },
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return missions;
  }
}
