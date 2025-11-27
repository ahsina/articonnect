import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'crypto';
import {
  CreateSubcontractorDto,
  UpdateSubcontractorDto,
  CreateSubcontractorAssignmentDto,
  UpdateAssignmentDto,
  SubcontractorStatus,
} from '../dto/subcontractor.dto';

@Injectable()
export class SubcontractorService {
  constructor(private prisma: PrismaService) {}

  async create(artisanId: string, dto: CreateSubcontractorDto) {
    if (!dto.subcontractorUserId && !dto.externalEmail) {
      throw new BadRequestException('Either subcontractorUserId or externalEmail is required');
    }

    const invitationToken = randomBytes(32).toString('hex');

    const subcontractor = await this.prisma.subcontractor.create({
      data: {
        artisanId,
        subcontractorUserId: dto.subcontractorUserId,
        externalName: dto.externalName,
        externalEmail: dto.externalEmail,
        externalPhone: dto.externalPhone,
        externalCompany: dto.externalCompany,
        externalSiret: dto.externalSiret,
        invitationToken,
        invitedAt: new Date(),
        defaultCommissionRate: dto.defaultCommissionRate,
        paymentTerms: dto.paymentTerms,
        specialties: dto.specialties || [],
        certifications: dto.certifications || [],
        notes: dto.notes,
      },
      include: {
        subcontractorUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // TODO: Send invitation email

    return subcontractor;
  }

  async findAll(artisanId: string, status?: SubcontractorStatus) {
    const where: any = { artisanId };
    if (status) where.status = status;

    return this.prisma.subcontractor.findMany({
      where,
      include: {
        subcontractorUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: { assignments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, artisanId: string) {
    const subcontractor = await this.prisma.subcontractor.findUnique({
      where: { id },
      include: {
        subcontractorUser: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        assignments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            mission: {
              select: { id: true, title: true, status: true, finalPrice: true },
            },
          },
        },
      },
    });

    if (!subcontractor) {
      throw new NotFoundException('Subcontractor not found');
    }

    if (subcontractor.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    return subcontractor;
  }

  async update(id: string, artisanId: string, dto: UpdateSubcontractorDto) {
    await this.findOne(id, artisanId);

    return this.prisma.subcontractor.update({
      where: { id },
      data: {
        defaultCommissionRate: dto.defaultCommissionRate,
        paymentTerms: dto.paymentTerms,
        specialties: dto.specialties,
        insuranceVerified: dto.insuranceVerified,
        insuranceExpiryDate: dto.insuranceExpiryDate ? new Date(dto.insuranceExpiryDate) : undefined,
        certifications: dto.certifications,
        notes: dto.notes,
        status: dto.status,
      },
    });
  }

  async acceptInvitation(token: string, userId: string) {
    const subcontractor = await this.prisma.subcontractor.findUnique({
      where: { invitationToken: token },
    });

    if (!subcontractor) {
      throw new NotFoundException('Invalid invitation token');
    }

    if (subcontractor.status !== SubcontractorStatus.PENDING_INVITATION) {
      throw new BadRequestException('Invitation already processed');
    }

    return this.prisma.subcontractor.update({
      where: { id: subcontractor.id },
      data: {
        subcontractorUserId: userId,
        status: SubcontractorStatus.ACTIVE,
        acceptedAt: new Date(),
        invitationToken: null,
      },
    });
  }

  async terminate(id: string, artisanId: string) {
    await this.findOne(id, artisanId);

    return this.prisma.subcontractor.update({
      where: { id },
      data: { status: SubcontractorStatus.TERMINATED },
    });
  }

  // Assignments

  async createAssignment(artisanId: string, dto: CreateSubcontractorAssignmentDto) {
    const subcontractor = await this.findOne(dto.subcontractorId, artisanId);

    if (subcontractor.status !== SubcontractorStatus.ACTIVE) {
      throw new BadRequestException('Subcontractor is not active');
    }

    const mission = await this.prisma.mission.findUnique({
      where: { id: dto.missionId },
    });

    if (!mission || mission.artisanId !== artisanId) {
      throw new ForbiddenException('Mission not found or access denied');
    }

    return this.prisma.subcontractorAssignment.create({
      data: {
        subcontractorId: dto.subcontractorId,
        missionId: dto.missionId,
        role: dto.role,
        description: dto.description,
        agreedAmount: dto.agreedAmount,
        commissionRate: dto.commissionRate,
      },
      include: {
        mission: {
          select: { id: true, title: true, status: true },
        },
        subcontractor: {
          select: { id: true, externalName: true, subcontractorUser: { select: { firstName: true, lastName: true } } },
        },
      },
    });
  }

  async getAssignments(artisanId: string, subcontractorId?: string, missionId?: string) {
    const where: any = {
      subcontractor: { artisanId },
    };

    if (subcontractorId) where.subcontractorId = subcontractorId;
    if (missionId) where.missionId = missionId;

    return this.prisma.subcontractorAssignment.findMany({
      where,
      include: {
        mission: {
          select: { id: true, title: true, status: true, finalPrice: true },
        },
        subcontractor: {
          select: {
            id: true,
            externalName: true,
            externalEmail: true,
            subcontractorUser: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateAssignment(id: string, artisanId: string, dto: UpdateAssignmentDto) {
    const assignment = await this.prisma.subcontractorAssignment.findUnique({
      where: { id },
      include: { subcontractor: true },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.subcontractor.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    const updated = await this.prisma.subcontractorAssignment.update({
      where: { id },
      data: {
        role: dto.role,
        description: dto.description,
        agreedAmount: dto.agreedAmount,
        paymentStatus: dto.paymentStatus,
        status: dto.status,
        rating: dto.rating,
        feedback: dto.feedback,
        paidAt: dto.paymentStatus === 'PAID' ? new Date() : undefined,
      },
    });

    // Update subcontractor stats if assignment is completed
    if (dto.status === 'COMPLETED') {
      await this.updateSubcontractorStats(assignment.subcontractorId);
    }

    return updated;
  }

  async deleteAssignment(id: string, artisanId: string) {
    const assignment = await this.prisma.subcontractorAssignment.findUnique({
      where: { id },
      include: { subcontractor: true },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.subcontractor.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.subcontractorAssignment.delete({ where: { id } });

    return { success: true };
  }

  private async updateSubcontractorStats(subcontractorId: string) {
    const assignments = await this.prisma.subcontractorAssignment.findMany({
      where: { subcontractorId, status: 'COMPLETED' },
    });

    const totalMissions = assignments.length;
    const totalEarnings = assignments.reduce((sum, a) => sum + Number(a.agreedAmount), 0);
    const ratings = assignments.filter(a => a.rating).map(a => a.rating!);
    const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

    await this.prisma.subcontractor.update({
      where: { id: subcontractorId },
      data: {
        totalMissions,
        totalEarnings,
        averageRating,
      },
    });
  }
}
