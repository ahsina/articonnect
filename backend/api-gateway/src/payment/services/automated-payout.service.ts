import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmployeeStatus, Prisma } from '@prisma/client';

@Injectable()
export class AutomatedPayoutService {
  private readonly logger = new Logger(AutomatedPayoutService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async processDailyPayouts() {
    this.logger.log('Starting daily automated payout processing...');
    await this.processPayoutsByFrequency('DAILY');
  }

  @Cron(CronExpression.EVERY_WEEK)
  async processWeeklyPayouts() {
    this.logger.log('Starting weekly automated payout processing...');
    await this.processPayoutsByFrequency('WEEKLY');
  }

  @Cron('0 2 1,15 * *')
  async processBiweeklyPayouts() {
    this.logger.log('Starting biweekly automated payout processing...');
    await this.processPayoutsByFrequency('BIWEEKLY');
  }

  @Cron('0 2 1 * *')
  async processMonthlyPayouts() {
    this.logger.log('Starting monthly automated payout processing...');
    await this.processPayoutsByFrequency('MONTHLY');
  }

  private async processPayoutsByFrequency(frequency: string) {
    try {
      const companies = await this.prisma.company.findMany({
        where: {
          settings: {
            payoutFrequency: frequency,
          },
        },
        include: {
          settings: true,
          employees: {
            where: {
              status: EmployeeStatus.ACTIVE,
            },
          },
        },
      });

      this.logger.log(`Found ${companies.length} companies with ${frequency} payout frequency`);

      let totalProcessed = 0;
      let totalAmount = new Prisma.Decimal(0);

      for (const company of companies) {
        try {
          const result = await this.processCompanyPayouts(company);
          totalProcessed += result.processedCount;
          totalAmount = totalAmount.add(result.totalAmount);
        } catch (error) {
          this.logger.error(`Failed to process payouts for company ${company.id}:`, error);
        }
      }

      this.logger.log(
        `${frequency} payout processing complete: ${totalProcessed} payouts, total: ${totalAmount.toString()}`
      );

      return {
        frequency,
        companiesProcessed: companies.length,
        payoutsProcessed: totalProcessed,
        totalAmount: totalAmount.toString(),
      };
    } catch (error) {
      this.logger.error(`Error processing ${frequency} payouts:`, error);
      throw error;
    }
  }

  async processCompanyPayouts(company: any) {
    const minimumPayout = company.settings?.minimumPayout || new Prisma.Decimal(50);

    const pendingEarnings = await this.prisma.employeeEarnings.findMany({
      where: {
        status: 'PENDING',
        employee: {
          companyId: company.id,
          status: EmployeeStatus.ACTIVE,
        },
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

    const earningsByEmployee = new Map<string, typeof pendingEarnings>();

    for (const earning of pendingEarnings) {
      const employeeId = earning.employeeId;
      if (!earningsByEmployee.has(employeeId)) {
        earningsByEmployee.set(employeeId, []);
      }
      earningsByEmployee.get(employeeId)!.push(earning);
    }

    let processedCount = 0;
    let totalAmount = new Prisma.Decimal(0);

    for (const [employeeId, earnings] of earningsByEmployee) {
      const employeeTotal = earnings.reduce(
        (sum, earning) => sum.add(earning.employeeCommission),
        new Prisma.Decimal(0)
      );

      if (employeeTotal.gte(minimumPayout)) {
        try {
          await this.prisma.$transaction(
            earnings.map((earning) =>
              this.prisma.employeeEarnings.update({
                where: { id: earning.id },
                data: {
                  status: 'PROCESSING',
                  payoutMethod: 'STRIPE_TRANSFER',
                },
              })
            )
          );

          processedCount += earnings.length;
          totalAmount = totalAmount.add(employeeTotal);

          this.logger.log(
            `Initiated payout for employee ${employeeId}: ${earnings.length} earnings, total: ${employeeTotal.toString()}`
          );
        } catch (error) {
          this.logger.error(`Failed to process payout for employee ${employeeId}:`, error);
        }
      } else {
        this.logger.debug(
          `Skipping payout for employee ${employeeId}: amount ${employeeTotal.toString()} below minimum ${minimumPayout.toString()}`
        );
      }
    }

    return {
      companyId: company.id,
      processedCount,
      totalAmount,
    };
  }

  async processCompanyPayoutsManually(companyId: string) {
    this.logger.log(`Manual payout processing initiated for company ${companyId}`);

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        settings: true,
        employees: {
          where: {
            status: EmployeeStatus.ACTIVE,
          },
        },
      },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    return await this.processCompanyPayouts(company);
  }

  async getPayoutSchedule(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        settings: true,
      },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    const pendingEarnings = await this.prisma.employeeEarnings.findMany({
      where: {
        status: 'PENDING',
        employee: {
          companyId,
          status: EmployeeStatus.ACTIVE,
        },
      },
      include: {
        employee: {
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

    const earningsByEmployee = new Map<string, { earnings: any[]; total: Prisma.Decimal; employee: any }>();

    for (const earning of pendingEarnings) {
      const employeeId = earning.employeeId;
      if (!earningsByEmployee.has(employeeId)) {
        earningsByEmployee.set(employeeId, {
          earnings: [],
          total: new Prisma.Decimal(0),
          employee: earning.employee,
        });
      }
      const data = earningsByEmployee.get(employeeId)!;
      data.earnings.push(earning);
      data.total = data.total.add(earning.employeeCommission);
    }

    const minimumPayout = company.settings?.minimumPayout || new Prisma.Decimal(50);
    const frequency = company.settings?.payoutFrequency || 'WEEKLY';

    const schedule = Array.from(earningsByEmployee.entries()).map(([employeeId, data]) => ({
      employee: {
        id: data.employee.id,
        name: `${data.employee.user.firstName} ${data.employee.user.lastName}`,
        userId: data.employee.userId,
      },
      pendingAmount: data.total.toString(),
      earningsCount: data.earnings.length,
      meetsMinimum: data.total.gte(minimumPayout),
      willBeProcessed: data.total.gte(minimumPayout),
      nextPayoutDate: this.calculateNextPayoutDate(frequency),
    }));

    return {
      companyId,
      payoutFrequency: frequency,
      minimumPayout: minimumPayout.toString(),
      nextPayoutDate: this.calculateNextPayoutDate(frequency),
      employeeSchedules: schedule,
      totalPendingPayouts: schedule
        .filter((s) => s.willBeProcessed)
        .reduce((sum, s) => sum + parseFloat(s.pendingAmount), 0),
      employeesAboveMinimum: schedule.filter((s) => s.meetsMinimum).length,
      employeesBelowMinimum: schedule.filter((s) => !s.meetsMinimum).length,
    };
  }

  private calculateNextPayoutDate(frequency: string): Date {
    const now = new Date();
    const result = new Date();

    switch (frequency) {
      case 'DAILY':
        result.setDate(now.getDate() + 1);
        result.setHours(2, 0, 0, 0);
        break;

      case 'WEEKLY':
        result.setDate(now.getDate() + (7 - now.getDay()));
        result.setHours(2, 0, 0, 0);
        break;

      case 'BIWEEKLY':
        const day = now.getDate();
        if (day < 15) {
          result.setDate(15);
        } else {
          result.setMonth(now.getMonth() + 1, 1);
        }
        result.setHours(2, 0, 0, 0);
        break;

      case 'MONTHLY':
        result.setMonth(now.getMonth() + 1, 1);
        result.setHours(2, 0, 0, 0);
        break;

      default:
        result.setDate(now.getDate() + 7);
        result.setHours(2, 0, 0, 0);
    }

    return result;
  }

  async getPayoutStatistics() {
    const [pendingTotal, processingTotal, paidTotal] = await Promise.all([
      this.prisma.employeeEarnings.aggregate({
        where: { status: 'PENDING' },
        _sum: { employeeCommission: true },
        _count: true,
      }),
      this.prisma.employeeEarnings.aggregate({
        where: { status: 'PROCESSING' },
        _sum: { employeeCommission: true },
        _count: true,
      }),
      this.prisma.employeeEarnings.aggregate({
        where: { status: 'PAID' },
        _sum: { employeeCommission: true },
        _count: true,
      }),
    ]);

    return {
      pending: {
        amount: pendingTotal._sum.employeeCommission || 0,
        count: pendingTotal._count,
      },
      processing: {
        amount: processingTotal._sum.employeeCommission || 0,
        count: processingTotal._count,
      },
      paid: {
        amount: paidTotal._sum.employeeCommission || 0,
        count: paidTotal._count,
      },
    };
  }
}
