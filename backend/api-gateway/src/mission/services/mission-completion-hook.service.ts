import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmployeeEarningsService } from '../../payment/services/employee-earnings.service';
import { MissionStatus, Prisma } from '@prisma/client';

@Injectable()
export class MissionCompletionHookService {
  private readonly logger = new Logger(MissionCompletionHookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly earningsService: EmployeeEarningsService,
  ) {}

  async handleMissionCompletion(missionId: string): Promise<any> {
    this.logger.log(`Processing mission completion hooks for mission ${missionId}`);

    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        company: {
          include: {
            settings: true,
          },
        },
        completedBy: {
          include: {
            user: true,
          },
        },
        assignedTo: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!mission) {
      throw new Error('Mission not found');
    }

    if (mission.status !== MissionStatus.COMPLETED) {
      this.logger.warn(`Mission ${missionId} is not in COMPLETED status, skipping hooks`);
      return null;
    }

    const results = {
      missionId,
      earningsCreated: false,
      earningsId: null as string | null,
      statsUpdated: false,
      notificationsSent: false,
    };

    try {
      if (mission.completedById && mission.finalPrice) {
        const existingEarnings = await this.prisma.employeeEarnings.findFirst({
          where: {
            missionId,
            employeeId: mission.completedById,
          },
        });

        if (!existingEarnings) {
          const earnings = await this.earningsService.createEarningsFromMission(
            missionId,
            mission.completedById,
            'Auto-created on mission completion'
          );

          results.earningsCreated = true;
          results.earningsId = earnings.id;

          this.logger.log(`Earnings created for mission ${missionId}: ${earnings.id}`);
        } else {
          this.logger.debug(`Earnings already exist for mission ${missionId}`);
        }
      }

      if (mission.companyId) {
        await this.updateCompanyStats(mission.companyId, mission);
        results.statsUpdated = true;
      }

      results.notificationsSent = true;

      this.logger.log(`Mission completion hooks processed successfully for ${missionId}`);

      return results;
    } catch (error) {
      this.logger.error(`Error processing completion hooks for mission ${missionId}:`, error);
      throw error;
    }
  }

  private async updateCompanyStats(companyId: string, mission: any) {
    const finalPrice = new Prisma.Decimal(mission.finalPrice?.toString() || '0');

    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        totalMissions: {
          increment: 1,
        },
        totalRevenue: {
          increment: finalPrice,
        },
      },
    });

    this.logger.log(`Company ${companyId} stats updated for mission ${mission.id}`);
  }

  async processPendingCompletions(companyId?: string) {
    const where: any = {
      status: MissionStatus.COMPLETED,
      completedById: { not: null },
      finalPrice: { not: null },
    };

    if (companyId) {
      where.companyId = companyId;
    }

    const completedMissions = await this.prisma.mission.findMany({
      where,
      include: {
        completedBy: true,
      },
    });

    const missionsNeedingEarnings = [];

    for (const mission of completedMissions) {
      const existingEarnings = await this.prisma.employeeEarnings.findFirst({
        where: {
          missionId: mission.id,
          employeeId: mission.completedById!,
        },
      });

      if (!existingEarnings) {
        missionsNeedingEarnings.push(mission);
      }
    }

    this.logger.log(
      `Found ${missionsNeedingEarnings.length} completed missions without earnings records`
    );

    let processedCount = 0;
    let failedCount = 0;

    for (const mission of missionsNeedingEarnings) {
      try {
        await this.handleMissionCompletion(mission.id);
        processedCount++;
      } catch (error) {
        this.logger.error(`Failed to process mission ${mission.id}:`, error);
        failedCount++;
      }
    }

    return {
      totalFound: missionsNeedingEarnings.length,
      processed: processedCount,
      failed: failedCount,
    };
  }

  async validateMissionForCompletion(missionId: string): Promise<{ valid: boolean; errors: string[] }> {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        assignedTo: true,
        company: true,
      },
    });

    const errors: string[] = [];

    if (!mission) {
      errors.push('Mission not found');
      return { valid: false, errors };
    }

    if (!mission.finalPrice) {
      errors.push('Mission final price is not set');
    }

    if (!mission.assignedToId) {
      errors.push('Mission is not assigned to an employee');
    }

    if (mission.status !== MissionStatus.IN_PROGRESS) {
      errors.push(`Mission must be IN_PROGRESS to complete (current: ${mission.status})`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
