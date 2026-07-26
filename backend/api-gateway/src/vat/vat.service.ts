import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ServiceCategory } from '@prisma/client';
import { VAT_RULES, FALLBACK_STANDARD, WorkType } from './vat.rules';

export interface VatCalculation {
  countryCode: string;
  category: ServiceCategory;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
}

export type VatRegime =
  | 'STANDARD'
  | 'REDUCED'
  | 'SUPER_REDUCED'
  | 'REVERSE_CHARGE'
  | 'EXEMPT_FRANCHISE';

export interface VatResolveInput {
  /** Pays du chantier (adresse de la mission) — DÉCISIF (art. 47 directive TVA). */
  propertyCountry?: string | null;
  artisanCountry?: string | null;
  artisanVatCountries?: string[];
  artisanFranchise?: boolean;
  clientIsBusiness?: boolean;
  clientVatValid?: boolean;
  clientCountry?: string | null;
  workType?: WorkType | string | null;
  buildingAgeYears?: number | null;
  residential?: boolean | null;
  primaryResidence?: boolean | null;
}

export interface VatResolution {
  rate: number;
  regime: VatRegime;
  legalMention?: string;
  requiresAttestation: boolean;
  taxCountry: string;
  reason: string;
}

@Injectable()
export class VatService {
  private readonly logger = new Logger(VatService.name);
  constructor(private prisma: PrismaService) {}

  private normCountry(c?: string | null): string {
    return (c || '').trim().toUpperCase();
  }

  /**
   * MOTEUR TVA (haut-niveau) : calcule LE taux applicable — l'artisan ne le choisit pas.
   * Ordre : franchise en base → autoliquidation (B2B transfrontalier immeuble) → taux local
   * (réduit si conditions du pays remplies : type de travaux + âge bâtiment + résidence, sinon standard).
   */
  resolve(input: VatResolveInput): VatResolution {
    const taxCountry =
      this.normCountry(input.propertyCountry) || this.normCountry(input.artisanCountry) || 'LU';
    const rules = VAT_RULES[taxCountry];
    const standard = rules?.standard ?? FALLBACK_STANDARD;

    if (input.artisanFranchise) {
      return {
        rate: 0,
        regime: 'EXEMPT_FRANCHISE',
        legalMention: 'TVA non applicable — franchise en base (art. 293 B du CGI / équivalent).',
        requiresAttestation: false,
        taxCountry,
        reason: 'Artisan en franchise en base.',
      };
    }

    const registered = (input.artisanVatCountries || []).map((c) => this.normCountry(c));
    const artisanCountry = this.normCountry(input.artisanCountry);
    const hasEstablishmentInfo = registered.length > 0 || !!artisanCountry;
    // Sans info d'immatriculation, on suppose l'artisan ÉTABLI dans le pays du chantier (cas domestique
    // dominant) → on taxe localement plutôt que de zéro-noter à tort.
    const artisanEstablishedHere =
      !hasEstablishmentInfo || artisanCountry === taxCountry || registered.includes(taxCountry);
    if (input.clientIsBusiness && input.clientVatValid && !artisanEstablishedHere) {
      return {
        rate: 0,
        regime: 'REVERSE_CHARGE',
        legalMention: 'Autoliquidation — art. 194 de la directive 2006/112/CE (preneur redevable de la TVA).',
        requiresAttestation: false,
        taxCountry,
        reason: 'B2B transfrontalier sur bien immeuble, artisan non établi dans le pays du chantier.',
      };
    }

    const wt = (this.normCountry(input.workType) || 'OTHER') as WorkType;
    const residential = input.residential !== false;
    for (const r of rules?.reduced || []) {
      if (!r.workTypes.includes(wt)) continue;
      if (r.requiresResidential && !residential) continue;
      if (r.requiresPrimaryResidence && !input.primaryResidence) continue;
      if (r.minBuildingAge != null && !(Number(input.buildingAgeYears ?? -1) >= r.minBuildingAge)) continue;
      return {
        rate: r.rate,
        regime: r.rate <= 5.5 ? 'SUPER_REDUCED' : 'REDUCED',
        legalMention: r.mention,
        requiresAttestation: !!r.requiresAttestation,
        taxCountry,
        reason: `Taux réduit ${r.rate} % (${taxCountry}) : conditions remplies.`,
      };
    }

    return {
      rate: standard,
      regime: 'STANDARD',
      requiresAttestation: false,
      taxCountry,
      reason: `Taux standard ${standard} % (${taxCountry}).`,
    };
  }

  /**
   * Validation d'un n° TVA intracommunautaire via VIES (best-effort). Renvoie false si invalide OU si
   * le service est indisponible → on n'appliquera PAS l'autoliquidation (sécurité : on taxe localement).
   */
  async validateVatNumber(vatNumber?: string | null): Promise<boolean> {
    const raw = (vatNumber || '').replace(/[\s.]/g, '').toUpperCase();
    const m = raw.match(/^([A-Z]{2})(.+)$/);
    if (!m) return false;
    const [, country, number] = m;
    try {
      const resp = await fetch('https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode: country, vatNumber: number }),
        signal: AbortSignal.timeout(4000),
      });
      if (!resp.ok) return false;
      const data: any = await resp.json();
      return data?.valid === true;
    } catch (e) {
      this.logger.warn(`VIES indisponible pour ${raw}: ${(e as Error)?.message}`);
      return false;
    }
  }

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
