import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmployeeStatus, MissionStatus } from '@prisma/client';

interface EmployeeScore {
  employeeId: string;
  score: number;
  employee: any;
}

@Injectable()
export class AutoAssignmentService {
  private readonly logger = new Logger(AutoAssignmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async autoAssignMission(missionId: string): Promise<any> {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        company: {
          include: {
            settings: true,
            employees: {
              where: {
                status: EmployeeStatus.ACTIVE,
              },
              include: {
                user: true,
                specialties: true,
                assignedMissions: {
                  where: {
                    status: {
                      in: [MissionStatus.ACCEPTED, MissionStatus.IN_PROGRESS],
                    },
                  },
                },
              },
            },
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

    if (!mission.company.settings?.autoAssignMissions) {
      throw new BadRequestException('L\'auto-assignation n\'est pas activée pour cette entreprise');
    }

    if (mission.assignedToId) {
      throw new BadRequestException('La mission est déjà assignée');
    }

    const eligibleEmployees = mission.company.employees.filter(
      (emp) => emp.status === EmployeeStatus.ACTIVE
    );

    if (eligibleEmployees.length === 0) {
      throw new BadRequestException('Aucun employé actif disponible');
    }

    const scoredEmployees = await this.scoreEmployees(mission, eligibleEmployees);

    scoredEmployees.sort((a, b) => b.score - a.score);

    const bestEmployee = scoredEmployees[0];

    if (bestEmployee.score === 0) {
      this.logger.warn(`No suitable employee found for mission ${missionId}`);
      return null;
    }

    const updatedMission = await this.prisma.mission.update({
      where: { id: missionId },
      data: {
        assignedToId: bestEmployee.employeeId,
        status: MissionStatus.ACCEPTED,
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

    await this.prisma.companyEmployee.update({
      where: { id: bestEmployee.employeeId },
      data: {
        totalMissions: {
          increment: 1,
        },
      },
    });

    this.logger.log(
      `Mission ${missionId} auto-assigned to employee ${bestEmployee.employeeId} with score ${bestEmployee.score}`
    );

    return {
      mission: updatedMission,
      assignedEmployee: bestEmployee.employee,
      score: bestEmployee.score,
      method: 'auto-assignment',
    };
  }

  private async scoreEmployees(mission: any, employees: any[]): Promise<EmployeeScore[]> {
    // Parallelize availability score calculations (N+1 fix)
    const availabilityScores = await Promise.all(
      employees.map((employee) =>
        this.calculateAvailabilityScore(employee.id, mission.scheduledFor)
      )
    );

    // Calculate all scores with pre-fetched availability scores
    return employees.map((employee, index) => {
      let score = 0;

      const specialtyMatch = this.calculateSpecialtyMatch(mission.category, employee.specialties);
      score += specialtyMatch * 40;

      const workloadScore = this.calculateWorkloadScore(employee.assignedMissions.length);
      score += workloadScore * 20;

      const ratingScore = this.calculateRatingScore(employee.averageRating);
      score += ratingScore * 15;

      // Use pre-fetched availability score
      score += availabilityScores[index] * 15;

      const experienceScore = this.calculateExperienceScore(employee.totalMissions);
      score += experienceScore * 10;

      return {
        employeeId: employee.id,
        score,
        employee,
      };
    });
  }

  private calculateSpecialtyMatch(missionCategory: string, employeeSpecialties: any[]): number {
    if (!missionCategory || employeeSpecialties.length === 0) {
      return 0;
    }

    const hasMatch = employeeSpecialties.some(
      (specialty) => specialty.category === missionCategory || specialty.name.toLowerCase().includes(missionCategory.toLowerCase())
    );

    return hasMatch ? 1 : 0.3;
  }

  private calculateWorkloadScore(currentMissions: number): number {
    if (currentMissions === 0) return 1;
    if (currentMissions <= 2) return 0.8;
    if (currentMissions <= 4) return 0.6;
    if (currentMissions <= 6) return 0.4;
    return 0.2;
  }

  private calculateRatingScore(averageRating: any): number {
    const rating = Number(averageRating) || 0;
    if (rating >= 4.5) return 1;
    if (rating >= 4.0) return 0.9;
    if (rating >= 3.5) return 0.8;
    if (rating >= 3.0) return 0.7;
    if (rating > 0) return 0.5;
    return 0.8;
  }

  private async calculateAvailabilityScore(employeeId: string, scheduledFor: Date | null): Promise<number> {
    if (!scheduledFor) {
      return 1;
    }

    const conflictingMissions = await this.prisma.mission.count({
      where: {
        assignedToId: employeeId,
        scheduledFor: {
          gte: new Date(scheduledFor.getTime() - 2 * 60 * 60 * 1000),
          lte: new Date(scheduledFor.getTime() + 2 * 60 * 60 * 1000),
        },
        status: {
          in: [MissionStatus.ACCEPTED, MissionStatus.IN_PROGRESS],
        },
      },
    });

    if (conflictingMissions === 0) return 1;
    if (conflictingMissions === 1) return 0.5;
    return 0;
  }

  private calculateExperienceScore(totalMissions: number): number {
    if (totalMissions >= 50) return 1;
    if (totalMissions >= 30) return 0.9;
    if (totalMissions >= 20) return 0.8;
    if (totalMissions >= 10) return 0.7;
    if (totalMissions >= 5) return 0.6;
    return 0.5;
  }

  async autoAssignCompanyMissions(companyId: string): Promise<any> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        settings: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Entreprise non trouvée');
    }

    if (!company.settings?.autoAssignMissions) {
      throw new BadRequestException('L\'auto-assignation n\'est pas activée');
    }

    const unassignedMissions = await this.prisma.mission.findMany({
      where: {
        companyId,
        assignedToId: null,
        status: {
          in: [MissionStatus.PENDING, MissionStatus.ACCEPTED],
        },
      },
    });

    if (unassignedMissions.length === 0) {
      return {
        message: 'Aucune mission non assignée',
        assignedCount: 0,
      };
    }

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const mission of unassignedMissions) {
      try {
        const result = await this.autoAssignMission(mission.id);
        if (result) {
          results.push(result);
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        this.logger.error(`Failed to auto-assign mission ${mission.id}:`, error);
        failureCount++;
      }
    }

    this.logger.log(
      `Auto-assignment complete for company ${companyId}: ${successCount} assigned, ${failureCount} failed`
    );

    return {
      assignedCount: successCount,
      failedCount: failureCount,
      results,
    };
  }

  async getAutoAssignmentSuggestions(missionId: string): Promise<any[]> {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        company: {
          include: {
            employees: {
              where: {
                status: EmployeeStatus.ACTIVE,
              },
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
                assignedMissions: {
                  where: {
                    status: {
                      in: [MissionStatus.ACCEPTED, MissionStatus.IN_PROGRESS],
                    },
                  },
                },
              },
            },
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

    const eligibleEmployees = mission.company.employees.filter(
      (emp) => emp.status === EmployeeStatus.ACTIVE
    );

    const scoredEmployees = await this.scoreEmployees(mission, eligibleEmployees);

    scoredEmployees.sort((a, b) => b.score - a.score);

    return scoredEmployees.slice(0, 5).map((scored) => ({
      employee: {
        id: scored.employee.id,
        user: scored.employee.user,
        role: scored.employee.role,
        specialties: scored.employee.specialties,
        averageRating: scored.employee.averageRating,
        totalMissions: scored.employee.totalMissions,
        currentWorkload: scored.employee.assignedMissions.length,
      },
      score: scored.score,
      recommendation: this.getRecommendationLevel(scored.score),
    }));
  }

  private getRecommendationLevel(score: number): string {
    if (score >= 80) return 'HIGHLY_RECOMMENDED';
    if (score >= 60) return 'RECOMMENDED';
    if (score >= 40) return 'SUITABLE';
    if (score >= 20) return 'POSSIBLE';
    return 'NOT_RECOMMENDED';
  }
}
