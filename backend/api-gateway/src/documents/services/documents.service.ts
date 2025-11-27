import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateDocumentTemplateDto,
  CreateJobDocumentDto,
  UpdateJobDocumentDto,
  DocumentTemplateType,
} from '../dto/documents.dto';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  // ============ TEMPLATES ============

  async createTemplate(artisanId: string, dto: CreateDocumentTemplateDto) {
    const template = await this.prisma.documentTemplate.create({
      data: {
        artisanId,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        category: dto.category,
        trade: dto.trade,
        requiresSignature: dto.requiresSignature ?? false,
        requiresPhotos: dto.requiresPhotos ?? false,
        requiresClientApproval: dto.requiresClientApproval ?? false,
        locale: dto.locale || 'en',
        sections: {
          create: dto.sections.map((section, sIndex) => ({
            title: section.title,
            description: section.description,
            position: sIndex,
            fields: {
              create: section.fields.map((field, fIndex) => ({
                label: field.label,
                fieldType: field.fieldType,
                placeholder: field.placeholder,
                helpText: field.helpText,
                options: field.options || null,
                isRequired: field.isRequired ?? false,
                position: fIndex,
              })),
            },
          })),
        },
      },
      include: {
        sections: {
          orderBy: { position: 'asc' },
          include: {
            fields: { orderBy: { position: 'asc' } },
          },
        },
      },
    });

    return template;
  }

  async getTemplates(artisanId: string, type?: DocumentTemplateType, category?: string) {
    const where: any = {
      isActive: true,
      OR: [
        { artisanId },
        { isGlobal: true },
      ],
    };

    if (type) where.type = type;
    if (category) where.category = category;

    return this.prisma.documentTemplate.findMany({
      where,
      include: {
        sections: {
          orderBy: { position: 'asc' },
          include: {
            fields: { orderBy: { position: 'asc' } },
          },
        },
      },
      orderBy: [{ isGlobal: 'desc' }, { usageCount: 'desc' }],
    });
  }

  async getTemplate(id: string, artisanId: string) {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { position: 'asc' },
          include: {
            fields: { orderBy: { position: 'asc' } },
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (template.artisanId !== artisanId && !template.isGlobal) {
      throw new ForbiddenException('Access denied');
    }

    return template;
  }

  async updateTemplate(id: string, artisanId: string, dto: CreateDocumentTemplateDto) {
    const template = await this.prisma.documentTemplate.findUnique({ where: { id } });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (template.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    // Delete existing sections and fields
    await this.prisma.documentTemplateSection.deleteMany({
      where: { templateId: id },
    });

    // Update template with new sections
    return this.prisma.documentTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        category: dto.category,
        trade: dto.trade,
        requiresSignature: dto.requiresSignature,
        requiresPhotos: dto.requiresPhotos,
        requiresClientApproval: dto.requiresClientApproval,
        sections: {
          create: dto.sections.map((section, sIndex) => ({
            title: section.title,
            description: section.description,
            position: sIndex,
            fields: {
              create: section.fields.map((field, fIndex) => ({
                label: field.label,
                fieldType: field.fieldType,
                placeholder: field.placeholder,
                helpText: field.helpText,
                options: field.options || null,
                isRequired: field.isRequired ?? false,
                position: fIndex,
              })),
            },
          })),
        },
      },
      include: {
        sections: {
          orderBy: { position: 'asc' },
          include: {
            fields: { orderBy: { position: 'asc' } },
          },
        },
      },
    });
  }

  async deleteTemplate(id: string, artisanId: string) {
    const template = await this.prisma.documentTemplate.findUnique({ where: { id } });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (template.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.documentTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true };
  }

  // ============ JOB DOCUMENTS ============

  async createDocument(artisanId: string, dto: CreateJobDocumentDto) {
    // Verify mission access
    const mission = await this.prisma.mission.findUnique({
      where: { id: dto.missionId },
    });

    if (!mission || mission.artisanId !== artisanId) {
      throw new ForbiddenException('Mission not found or access denied');
    }

    // Increment template usage if using one
    if (dto.templateId) {
      await this.prisma.documentTemplate.update({
        where: { id: dto.templateId },
        data: { usageCount: { increment: 1 } },
      });
    }

    return this.prisma.jobDocument.create({
      data: {
        missionId: dto.missionId,
        templateId: dto.templateId,
        name: dto.name,
        type: dto.type,
        data: dto.data,
        photos: dto.photos || [],
        notes: dto.notes,
      },
      include: {
        template: {
          select: { name: true, type: true },
        },
      },
    });
  }

  async getDocuments(artisanId: string, missionId?: string) {
    const where: any = {
      mission: { artisanId },
    };

    if (missionId) where.missionId = missionId;

    return this.prisma.jobDocument.findMany({
      where,
      include: {
        mission: {
          select: { id: true, title: true, clientId: true },
        },
        template: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDocument(id: string, userId: string) {
    const document = await this.prisma.jobDocument.findUnique({
      where: { id },
      include: {
        mission: {
          select: { id: true, title: true, artisanId: true, clientId: true },
        },
        template: {
          include: {
            sections: {
              orderBy: { position: 'asc' },
              include: {
                fields: { orderBy: { position: 'asc' } },
              },
            },
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Check access (artisan or client)
    if (document.mission.artisanId !== userId && document.mission.clientId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return document;
  }

  async updateDocument(id: string, artisanId: string, dto: UpdateJobDocumentDto) {
    const document = await this.prisma.jobDocument.findUnique({
      where: { id },
      include: { mission: true },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.mission.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    if (document.status === 'SIGNED') {
      throw new BadRequestException('Cannot modify signed documents');
    }

    return this.prisma.jobDocument.update({
      where: { id },
      data: {
        data: dto.data,
        photos: dto.photos,
        notes: dto.notes,
        status: dto.status,
      },
    });
  }

  async signDocument(id: string, userId: string, signature: string) {
    const document = await this.prisma.jobDocument.findUnique({
      where: { id },
      include: { mission: true },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const isArtisan = document.mission.artisanId === userId;
    const isClient = document.mission.clientId === userId;

    if (!isArtisan && !isClient) {
      throw new ForbiddenException('Access denied');
    }

    const updateData: any = {};

    if (isArtisan) {
      updateData.artisanSignature = signature;
      updateData.artisanSignedAt = new Date();
    } else {
      updateData.clientSignature = signature;
      updateData.clientSignedAt = new Date();
    }

    // If both signatures are present, mark as signed
    const updated = await this.prisma.jobDocument.update({
      where: { id },
      data: updateData,
    });

    // Check if fully signed
    if (updated.artisanSignature && updated.clientSignature) {
      await this.prisma.jobDocument.update({
        where: { id },
        data: { status: 'SIGNED' },
      });
    } else if (updated.artisanSignature || updated.clientSignature) {
      await this.prisma.jobDocument.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });
    }

    return this.getDocument(id, userId);
  }

  async deleteDocument(id: string, artisanId: string) {
    const document = await this.prisma.jobDocument.findUnique({
      where: { id },
      include: { mission: true },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.mission.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    if (document.status === 'SIGNED') {
      throw new BadRequestException('Cannot delete signed documents');
    }

    await this.prisma.jobDocument.delete({ where: { id } });

    return { success: true };
  }

  // Get global templates for a trade/category
  async getGlobalTemplates(type?: DocumentTemplateType, trade?: string) {
    const where: any = {
      isGlobal: true,
      isActive: true,
    };

    if (type) where.type = type;
    if (trade) where.trade = trade;

    return this.prisma.documentTemplate.findMany({
      where,
      include: {
        sections: {
          orderBy: { position: 'asc' },
          include: {
            fields: { orderBy: { position: 'asc' } },
          },
        },
      },
      orderBy: { usageCount: 'desc' },
    });
  }
}
