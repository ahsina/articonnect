import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ServiceCategory } from '@prisma/client';

export interface VatCalculation {
  countryCode: string;
  category: ServiceCategory;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
}

@Injectable()
export class VatService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get VAT rate for a specific country and service category
   */
  async getTaxRate(countryCode: string, category: ServiceCategory): Promise<number> {
    // Get current date for effective date check
    const now = new Date();

    // Find applicable tax rate
    const taxRate = await this.prisma.taxRate.findFirst({
      where: {
        country: {
          code: countryCode.toUpperCase(),
        },
        category,
        effectiveFrom: {
          lte: now,
        },
        OR: [
          {
            effectiveTo: null,
          },
          {
            effectiveTo: {
              gte: now,
            },
          },
        ],
      },
      include: {
        country: true,
      },
      orderBy: {
        effectiveFrom: 'desc',
      },
    });

    if (!taxRate) {
      // Fallback to country standard rate
      const country = await this.prisma.country.findUnique({
        where: { code: countryCode.toUpperCase() },
      });

      if (!country) {
        throw new NotFoundException(`Country ${countryCode} not found`);
      }

      return parseFloat(country.standardRate.toString());
    }

    return parseFloat(taxRate.rate.toString());
  }

  /**
   * Calculate VAT for a given amount
   */
  async calculateVat(
    countryCode: string,
    category: ServiceCategory,
    subtotal: number,
  ): Promise<VatCalculation> {
    const vatRate = await this.getTaxRate(countryCode, category);
    const vatAmount = (subtotal * vatRate) / 100;
    const totalAmount = subtotal + vatAmount;

    return {
      countryCode,
      category,
      subtotal,
      vatRate,
      vatAmount: parseFloat(vatAmount.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
    };
  }

  /**
   * Determine service category from mission type and urgency
   */
  determineCategoryFromMission(missionType: string, isEmergency: boolean): ServiceCategory {
    if (isEmergency) {
      return ServiceCategory.EMERGENCY;
    }

    // Map mission types to categories
    const categoryMap: Record<string, ServiceCategory> = {
      INSTALLATION: ServiceCategory.INSTALLATION,
      MAINTENANCE: ServiceCategory.MAINTENANCE,
      REPAIR: ServiceCategory.RENOVATION,
      RENOVATION: ServiceCategory.RENOVATION,
    };

    return categoryMap[missionType] || ServiceCategory.OTHER;
  }

  /**
   * Get all tax rates for a country
   */
  async getTaxRatesByCountry(countryCode: string) {
    const country = await this.prisma.country.findUnique({
      where: { code: countryCode.toUpperCase() },
      include: {
        taxRates: {
          where: {
            effectiveTo: null, // Only current rates
          },
          orderBy: {
            category: 'asc',
          },
        },
      },
    });

    if (!country) {
      throw new NotFoundException(`Country ${countryCode} not found`);
    }

    return country;
  }

  /**
   * Get all supported countries with their tax rates
   */
  async getAllCountries() {
    return this.prisma.country.findMany({
      include: {
        taxRates: {
          where: {
            effectiveTo: null,
          },
          orderBy: {
            category: 'asc',
          },
        },
      },
      orderBy: {
        code: 'asc',
      },
    });
  }

  /**
   * Check if artisan is eligible for VAT exemption (franchise en base)
   * This is a simplified check - in reality, this depends on annual turnover
   */
  async checkVatExemption(artisanId: string, countryCode: string): Promise<boolean> {
    // Get artisan's total annual revenue
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);

    const revenue = await this.prisma.transaction.aggregate({
      where: {
        mission: {
          artisanId,
          completedAt: {
            gte: startOfYear,
          },
        },
        status: 'COMPLETED',
      },
      _sum: {
        amount: true,
      },
    });

    const annualRevenue = parseFloat(revenue._sum.amount?.toString() || '0');

    // VAT exemption thresholds (simplified)
    const thresholds: Record<string, number> = {
      LU: 35000, // €35k
      FR: 37500, // €37.5k for services
      BE: 25000, // €25k
    };

    const threshold = thresholds[countryCode.toUpperCase()] || 0;

    return annualRevenue < threshold;
  }

  /**
   * Generate VAT declaration for a period
   */
  async generateVatDeclaration(
    artisanId: string,
    period: string, // e.g., "2025-Q1" or "2025-01"
    countryCode: string,
  ) {
    // Parse period
    const periodRegex = /^(\d{4})-(Q[1-4]|0[1-9]|1[0-2])$/;
    const match = period.match(periodRegex);

    if (!match) {
      throw new NotFoundException('Invalid period format. Use YYYY-QX or YYYY-MM');
    }

    const [, year, periodPart] = match;
    let startDate: Date;
    let endDate: Date;

    if (periodPart.startsWith('Q')) {
      // Quarterly
      const quarter = parseInt(periodPart[1]);
      const startMonth = (quarter - 1) * 3;
      startDate = new Date(parseInt(year), startMonth, 1);
      endDate = new Date(parseInt(year), startMonth + 3, 0); // Last day of quarter
    } else {
      // Monthly
      const month = parseInt(periodPart) - 1;
      startDate = new Date(parseInt(year), month, 1);
      endDate = new Date(parseInt(year), month + 1, 0); // Last day of month
    }

    // Get all completed transactions for this period
    const transactions = await this.prisma.transaction.findMany({
      where: {
        mission: {
          artisanId,
          completedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        status: 'COMPLETED',
      },
      include: {
        mission: true,
      },
    });

    // Calculate totals
    let totalSales = 0;
    let totalTax = 0;

    for (const transaction of transactions) {
      const subtotal = parseFloat(transaction.artisanAmount.toString());
      const vatRate = parseFloat(transaction.mission.vatRate.toString());
      const vatAmount = (subtotal * vatRate) / 100;

      totalSales += subtotal;
      totalTax += vatAmount;
    }

    // Check if declaration already exists
    const existing = await this.prisma.vatDeclaration.findUnique({
      where: {
        artisanId_period_countryCode: {
          artisanId,
          period,
          countryCode: countryCode.toUpperCase(),
        },
      },
    });

    if (existing) {
      // Update existing
      return this.prisma.vatDeclaration.update({
        where: { id: existing.id },
        data: {
          totalSales,
          totalTax,
          netTaxDue: totalTax, // Simplified - doesn't account for tax credits
        },
      });
    }

    // Create new declaration
    return this.prisma.vatDeclaration.create({
      data: {
        artisanId,
        period,
        countryCode: countryCode.toUpperCase(),
        totalSales,
        totalTax,
        netTaxDue: totalTax,
        status: 'DRAFT',
      },
    });
  }

  /**
   * Get VAT declarations for an artisan
   */
  async getVatDeclarations(artisanId: string, filters?: {
    year?: number;
    countryCode?: string;
    status?: string;
  }) {
    const where: any = { artisanId };

    if (filters?.year) {
      where.period = {
        startsWith: filters.year.toString(),
      };
    }

    if (filters?.countryCode) {
      where.countryCode = filters.countryCode.toUpperCase();
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.vatDeclaration.findMany({
      where,
      orderBy: {
        period: 'desc',
      },
    });
  }
}
