import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCountryConfigDto,
  UpdateCountryConfigDto,
  CreateComplianceRequirementDto,
  UpdateComplianceRequirementDto,
  SubmitComplianceRecordDto,
  UpdateComplianceRecordDto,
  VerifyComplianceRecordDto,
  ComplianceStatus,
} from '../dto/country.dto';

@Injectable()
export class CountryService {
  constructor(private prisma: PrismaService) {}

  // ============ COUNTRY CONFIGURATIONS ============

  async createCountryConfig(dto: CreateCountryConfigDto) {
    const existing = await this.prisma.countryConfig.findUnique({
      where: { countryCode: dto.countryCode.toUpperCase() },
    });

    if (existing) {
      throw new BadRequestException('Country configuration already exists');
    }

    return this.prisma.countryConfig.create({
      data: {
        countryCode: dto.countryCode.toUpperCase(),
        name: dto.name,
        defaultCurrency: dto.defaultCurrency.toUpperCase(),
        defaultLanguage: dto.defaultLanguage,
        timezone: dto.timezone || 'UTC',
        dateFormat: dto.dateFormat || 'DD/MM/YYYY',
        defaultVatRate: dto.defaultVatRate,
        vatRates: dto.vatRates || {},
        vatNumberFormat: dto.vatNumberFormat,
        phoneFormat: dto.phoneFormat,
        postalCodeFormat: dto.postalCodeFormat,
        invoiceRequirements: dto.invoiceRequirements || {},
        paymentMethods: dto.paymentMethods || {},
        supportedTrades: dto.supportedTrades || [],
        isActive: dto.isActive ?? true,
      },
      include: {
        complianceRequirements: true,
      },
    });
  }

  async getCountryConfigs(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return this.prisma.countryConfig.findMany({
      where,
      include: {
        complianceRequirements: {
          where: { isActive: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getCountryConfig(countryCode: string) {
    const config = await this.prisma.countryConfig.findUnique({
      where: { countryCode: countryCode.toUpperCase() },
      include: {
        complianceRequirements: {
          where: { isActive: true },
          orderBy: [{ isMandatory: 'desc' }, { name: 'asc' }],
        },
      },
    });

    if (!config) {
      throw new NotFoundException('Country configuration not found');
    }

    return config;
  }

  async updateCountryConfig(countryCode: string, dto: UpdateCountryConfigDto) {
    await this.getCountryConfig(countryCode);

    return this.prisma.countryConfig.update({
      where: { countryCode: countryCode.toUpperCase() },
      data: dto,
      include: {
        complianceRequirements: true,
      },
    });
  }

  async deleteCountryConfig(countryCode: string) {
    await this.getCountryConfig(countryCode);

    await this.prisma.countryConfig.update({
      where: { countryCode: countryCode.toUpperCase() },
      data: { isActive: false },
    });

    return { success: true };
  }

  // ============ COMPLIANCE REQUIREMENTS ============

  async createComplianceRequirement(dto: CreateComplianceRequirementDto) {
    await this.getCountryConfig(dto.countryCode);

    return this.prisma.countryComplianceRequirement.create({
      data: {
        countryCode: dto.countryCode.toUpperCase(),
        name: dto.name,
        description: dto.description,
        category: dto.category,
        applicableTrades: dto.applicableTrades || [],
        isMandatory: dto.isMandatory,
        requiresDocument: dto.requiresDocument ?? true,
        hasExpiry: dto.hasExpiry ?? false,
        validityPeriodMonths: dto.validityPeriodMonths,
        reminderDaysBefore: dto.reminderDaysBefore ?? 30,
        verificationUrl: dto.verificationUrl,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async getComplianceRequirements(countryCode: string, trade?: string) {
    const where: any = {
      countryCode: countryCode.toUpperCase(),
      isActive: true,
    };

    const requirements = await this.prisma.countryComplianceRequirement.findMany({
      where,
      orderBy: [{ isMandatory: 'desc' }, { name: 'asc' }],
    });

    // Filter by trade if specified
    if (trade) {
      return requirements.filter(
        (req) =>
          req.applicableTrades.length === 0 ||
          req.applicableTrades.includes(trade),
      );
    }

    return requirements;
  }

  async getComplianceRequirement(id: string) {
    const requirement = await this.prisma.countryComplianceRequirement.findUnique({
      where: { id },
    });

    if (!requirement) {
      throw new NotFoundException('Compliance requirement not found');
    }

    return requirement;
  }

  async updateComplianceRequirement(id: string, dto: UpdateComplianceRequirementDto) {
    await this.getComplianceRequirement(id);

    return this.prisma.countryComplianceRequirement.update({
      where: { id },
      data: dto,
    });
  }

  async deleteComplianceRequirement(id: string) {
    await this.getComplianceRequirement(id);

    await this.prisma.countryComplianceRequirement.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true };
  }

  // ============ ARTISAN COMPLIANCE RECORDS ============

  async submitComplianceRecord(artisanId: string, dto: SubmitComplianceRecordDto) {
    const requirement = await this.getComplianceRequirement(dto.requirementId);

    // Check if record already exists
    const existing = await this.prisma.artisanComplianceRecord.findUnique({
      where: {
        artisanId_requirementId: {
          artisanId,
          requirementId: dto.requirementId,
        },
      },
    });

    if (existing) {
      // Update existing record
      return this.prisma.artisanComplianceRecord.update({
        where: { id: existing.id },
        data: {
          documentNumber: dto.documentNumber,
          documentUrl: dto.documentUrl,
          issuedAt: dto.issuedAt,
          expiresAt: dto.expiresAt,
          notes: dto.notes,
          status: 'SUBMITTED',
          verifiedAt: null,
          verifiedBy: null,
        },
        include: { requirement: true },
      });
    }

    return this.prisma.artisanComplianceRecord.create({
      data: {
        artisanId,
        requirementId: dto.requirementId,
        documentNumber: dto.documentNumber,
        documentUrl: dto.documentUrl,
        issuedAt: dto.issuedAt,
        expiresAt: dto.expiresAt,
        notes: dto.notes,
        status: 'SUBMITTED',
      },
      include: { requirement: true },
    });
  }

  async getArtisanComplianceRecords(artisanId: string, countryCode?: string) {
    const where: any = { artisanId };

    if (countryCode) {
      where.requirement = {
        countryCode: countryCode.toUpperCase(),
      };
    }

    return this.prisma.artisanComplianceRecord.findMany({
      where,
      include: {
        requirement: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getArtisanComplianceStatus(artisanId: string, countryCode: string) {
    const requirements = await this.getComplianceRequirements(countryCode);
    const records = await this.getArtisanComplianceRecords(artisanId, countryCode);

    const recordMap = new Map(
      records.map((r) => [r.requirementId, r]),
    );

    const status = requirements.map((req) => {
      const record = recordMap.get(req.id);
      let complianceStatus: string = 'NOT_SUBMITTED';

      if (record) {
        if (record.status === 'VERIFIED') {
          // Check expiry
          if (req.hasExpiry && record.expiresAt && new Date(record.expiresAt) < new Date()) {
            complianceStatus = 'EXPIRED';
          } else {
            complianceStatus = 'COMPLIANT';
          }
        } else {
          complianceStatus = record.status;
        }
      }

      return {
        requirement: req,
        record,
        status: complianceStatus,
        isMandatory: req.isMandatory,
      };
    });

    const mandatoryCompliant = status
      .filter((s) => s.isMandatory)
      .every((s) => s.status === 'COMPLIANT');

    const totalCompliant = status.filter((s) => s.status === 'COMPLIANT').length;
    const totalRequired = status.length;

    return {
      countryCode,
      isFullyCompliant: mandatoryCompliant,
      mandatoryComplete: mandatoryCompliant,
      compliancePercentage: totalRequired > 0 ? Math.round((totalCompliant / totalRequired) * 100) : 100,
      requirements: status,
    };
  }

  async updateComplianceRecord(
    artisanId: string,
    recordId: string,
    dto: UpdateComplianceRecordDto,
  ) {
    const record = await this.prisma.artisanComplianceRecord.findUnique({
      where: { id: recordId },
    });

    if (!record || record.artisanId !== artisanId) {
      throw new NotFoundException('Compliance record not found');
    }

    return this.prisma.artisanComplianceRecord.update({
      where: { id: recordId },
      data: {
        ...dto,
        status: 'SUBMITTED', // Reset to submitted when updated
        verifiedAt: null,
        verifiedBy: null,
      },
      include: { requirement: true },
    });
  }

  async verifyComplianceRecord(
    adminId: string,
    recordId: string,
    dto: VerifyComplianceRecordDto,
  ) {
    const record = await this.prisma.artisanComplianceRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      throw new NotFoundException('Compliance record not found');
    }

    return this.prisma.artisanComplianceRecord.update({
      where: { id: recordId },
      data: {
        status: dto.status,
        verifiedAt: new Date(),
        verifiedBy: adminId,
        notes: dto.verificationNotes || record.notes,
      },
      include: { requirement: true },
    });
  }

  async getExpiringCompliance(daysAhead = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.prisma.artisanComplianceRecord.findMany({
      where: {
        status: 'VERIFIED',
        expiresAt: {
          lte: futureDate,
          gte: new Date(),
        },
      },
      include: {
        requirement: true,
        artisan: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { expiresAt: 'asc' },
    });
  }

  // ============ SEED DEFAULT COUNTRY CONFIGS ============

  async seedDefaultCountries() {
    const countries = [
      {
        countryCode: 'FR',
        name: 'France',
        defaultCurrency: 'EUR',
        defaultLanguage: 'fr',
        timezone: 'Europe/Paris',
        dateFormat: 'DD/MM/YYYY',
        defaultVatRate: 20,
        vatRates: { standard: 20, intermediate: 10, reduced: 5.5, super_reduced: 2.1 },
        vatNumberFormat: '^FR[0-9A-Z]{2}[0-9]{9}$',
        phoneFormat: '+33',
        postalCodeFormat: '^[0-9]{5}$',
        invoiceRequirements: {
          requireSiret: true,
          requireDecennale: true,
          mentionObligatoire: true,
        },
      },
      {
        countryCode: 'DE',
        name: 'Germany',
        defaultCurrency: 'EUR',
        defaultLanguage: 'de',
        timezone: 'Europe/Berlin',
        dateFormat: 'DD.MM.YYYY',
        defaultVatRate: 19,
        vatRates: { standard: 19, reduced: 7 },
        vatNumberFormat: '^DE[0-9]{9}$',
        phoneFormat: '+49',
        postalCodeFormat: '^[0-9]{5}$',
        invoiceRequirements: {
          requireSteuernummer: true,
          requireHandwerksrolle: true,
        },
      },
      {
        countryCode: 'GB',
        name: 'United Kingdom',
        defaultCurrency: 'GBP',
        defaultLanguage: 'en',
        timezone: 'Europe/London',
        dateFormat: 'DD/MM/YYYY',
        defaultVatRate: 20,
        vatRates: { standard: 20, reduced: 5, zero: 0 },
        vatNumberFormat: '^GB[0-9]{9}$|^GB[0-9]{12}$|^GBGD[0-9]{3}$|^GBHA[0-9]{3}$',
        phoneFormat: '+44',
        postalCodeFormat: '^[A-Z]{1,2}[0-9][0-9A-Z]?\\s?[0-9][A-Z]{2}$',
        invoiceRequirements: {
          requireVatNumber: true,
          requireCompaniesHouse: false,
        },
      },
      {
        countryCode: 'CH',
        name: 'Switzerland',
        defaultCurrency: 'CHF',
        defaultLanguage: 'de',
        timezone: 'Europe/Zurich',
        dateFormat: 'DD.MM.YYYY',
        defaultVatRate: 8.1,
        vatRates: { standard: 8.1, reduced: 2.6, special: 3.8 },
        vatNumberFormat: '^CHE-[0-9]{3}\\.[0-9]{3}\\.[0-9]{3}$',
        phoneFormat: '+41',
        postalCodeFormat: '^[0-9]{4}$',
        invoiceRequirements: {
          requireUid: true,
        },
      },
      {
        countryCode: 'ES',
        name: 'Spain',
        defaultCurrency: 'EUR',
        defaultLanguage: 'es',
        timezone: 'Europe/Madrid',
        dateFormat: 'DD/MM/YYYY',
        defaultVatRate: 21,
        vatRates: { standard: 21, reduced: 10, super_reduced: 4 },
        vatNumberFormat: '^ES[A-Z0-9][0-9]{7}[A-Z0-9]$',
        phoneFormat: '+34',
        postalCodeFormat: '^[0-9]{5}$',
        invoiceRequirements: {
          requireNif: true,
          requireIae: true,
        },
      },
      {
        countryCode: 'IT',
        name: 'Italy',
        defaultCurrency: 'EUR',
        defaultLanguage: 'it',
        timezone: 'Europe/Rome',
        dateFormat: 'DD/MM/YYYY',
        defaultVatRate: 22,
        vatRates: { standard: 22, reduced: 10, super_reduced: 4 },
        vatNumberFormat: '^IT[0-9]{11}$',
        phoneFormat: '+39',
        postalCodeFormat: '^[0-9]{5}$',
        invoiceRequirements: {
          requirePartitaIva: true,
          requireCodiceFiscale: true,
          electronicInvoicing: true,
        },
      },
    ];

    for (const country of countries) {
      await this.prisma.countryConfig.upsert({
        where: { countryCode: country.countryCode },
        update: country,
        create: { ...country, isActive: true, supportedTrades: [], paymentMethods: {} },
      });
    }

    return { success: true, count: countries.length };
  }
}
