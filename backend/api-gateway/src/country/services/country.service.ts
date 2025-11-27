import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CountryService {
  constructor(private prisma: PrismaService) {}

  // ============ COUNTRY CONFIGURATIONS ============

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
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!config) {
      throw new NotFoundException('Country configuration not found');
    }

    return config;
  }

  async updateCountryConfig(countryCode: string, data: any) {
    await this.getCountryConfig(countryCode);

    return this.prisma.countryConfig.update({
      where: { countryCode: countryCode.toUpperCase() },
      data,
      include: {
        complianceRequirements: true,
      },
    });
  }

  // ============ COMPLIANCE REQUIREMENTS ============

  async getComplianceRequirements(countryCode: string) {
    return this.prisma.countryComplianceRequirement.findMany({
      where: {
        countryConfig: { countryCode: countryCode.toUpperCase() },
        isActive: true,
      },
      orderBy: { displayOrder: 'asc' },
    });
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

  async createComplianceRequirement(countryCode: string, data: any) {
    const config = await this.getCountryConfig(countryCode);

    return this.prisma.countryComplianceRequirement.create({
      data: {
        ...data,
        countryConfigId: config.id,
      },
    });
  }

  async updateComplianceRequirement(id: string, data: any) {
    await this.getComplianceRequirement(id);

    return this.prisma.countryComplianceRequirement.update({
      where: { id },
      data,
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

  async submitComplianceRecord(artisanId: string, requirementId: string, data: any) {
    await this.getComplianceRequirement(requirementId);

    // Check if record already exists
    const existing = await this.prisma.artisanComplianceRecord.findUnique({
      where: {
        artisanId_requirementId: {
          artisanId,
          requirementId,
        },
      },
    });

    if (existing) {
      // Update existing record
      return this.prisma.artisanComplianceRecord.update({
        where: { id: existing.id },
        data: {
          ...data,
          status: 'SUBMITTED',
          submittedAt: new Date(),
          verifiedAt: null,
          verifiedBy: null,
        },
        include: { requirement: true },
      });
    }

    return this.prisma.artisanComplianceRecord.create({
      data: {
        artisanId,
        requirementId,
        ...data,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      include: { requirement: true },
    });
  }

  async getArtisanComplianceRecords(artisanId: string, countryCode?: string) {
    const where: any = { artisanId };

    if (countryCode) {
      where.requirement = {
        countryConfig: { countryCode: countryCode.toUpperCase() },
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
      let complianceStatus = 'NOT_SUBMITTED';

      if (record) {
        if (record.status === 'VERIFIED') {
          // Check expiry
          if (record.expiryDate && new Date(record.expiryDate) < new Date()) {
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

  async updateComplianceRecord(artisanId: string, recordId: string, data: any) {
    const record = await this.prisma.artisanComplianceRecord.findUnique({
      where: { id: recordId },
    });

    if (!record || record.artisanId !== artisanId) {
      throw new NotFoundException('Compliance record not found');
    }

    return this.prisma.artisanComplianceRecord.update({
      where: { id: recordId },
      data: {
        ...data,
        status: 'SUBMITTED',
        submittedAt: new Date(),
        verifiedAt: null,
        verifiedBy: null,
      },
      include: { requirement: true },
    });
  }

  async verifyComplianceRecord(adminId: string, recordId: string, status: string, rejectionReason?: string) {
    const record = await this.prisma.artisanComplianceRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      throw new NotFoundException('Compliance record not found');
    }

    return this.prisma.artisanComplianceRecord.update({
      where: { id: recordId },
      data: {
        status,
        verifiedAt: new Date(),
        verifiedBy: adminId,
        rejectionReason: rejectionReason || null,
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
        expiryDate: {
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
      orderBy: { expiryDate: 'asc' },
    });
  }
}
