import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface MissionTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  estimatedDuration?: number;
  defaultBudgetRange?: {
    min: number;
    max: number;
  };
  requiredSkills?: string[];
  checklistItems?: string[];
  isPublic: boolean;
  createdBy: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTemplateDto {
  name: string;
  category: string;
  description?: string;
  estimatedDuration?: number;
  defaultBudgetMin?: number;
  defaultBudgetMax?: number;
  requiredSkills?: string[];
  checklistItems?: string[];
  isPublic?: boolean;
}

export interface MissionFromTemplate {
  title: string;
  description: string;
  category: string;
  estimatedDuration?: number;
  clientBudget?: number;
}

@Injectable()
export class MissionTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new mission template
   */
  async createTemplate(
    userId: string,
    dto: CreateTemplateDto,
  ): Promise<MissionTemplate> {
    const templateData = {
      name: dto.name,
      category: dto.category,
      description: dto.description || '',
      estimatedDuration: dto.estimatedDuration,
      defaultBudgetRange: dto.defaultBudgetMin && dto.defaultBudgetMax
        ? JSON.stringify({
            min: dto.defaultBudgetMin,
            max: dto.defaultBudgetMax,
          })
        : null,
      requiredSkills: dto.requiredSkills ? JSON.stringify(dto.requiredSkills) : null,
      checklistItems: dto.checklistItems ? JSON.stringify(dto.checklistItems) : null,
      isPublic: dto.isPublic || false,
      createdBy: userId,
      usageCount: 0,
    };

    const template = await this.prisma.missionTemplate.create({
      data: templateData,
    });

    return this.formatTemplate(template);
  }

  /**
   * Get all templates (public + user's private templates)
   */
  async getTemplates(userId?: string, category?: string): Promise<MissionTemplate[]> {
    const where: any = {
      OR: [
        { isPublic: true },
        ...(userId ? [{ createdBy: userId }] : []),
      ],
    };

    if (category) {
      where.category = category;
    }

    const templates = await this.prisma.missionTemplate.findMany({
      where,
      orderBy: [
        { usageCount: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return templates.map(this.formatTemplate);
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(templateId: string, userId?: string): Promise<MissionTemplate> {
    const template = await this.prisma.missionTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Check access: must be public or created by user
    if (!template.isPublic && template.createdBy !== userId) {
      throw new BadRequestException('Access denied to this template');
    }

    return this.formatTemplate(template);
  }

  /**
   * Get popular templates
   */
  async getPopularTemplates(limit: number = 10): Promise<MissionTemplate[]> {
    const templates = await this.prisma.missionTemplate.findMany({
      where: { isPublic: true },
      orderBy: { usageCount: 'desc' },
      take: limit,
    });

    return templates.map(this.formatTemplate);
  }

  /**
   * Get user's templates
   */
  async getUserTemplates(userId: string): Promise<MissionTemplate[]> {
    const templates = await this.prisma.missionTemplate.findMany({
      where: { createdBy: userId },
      orderBy: { createdAt: 'desc' },
    });

    return templates.map(this.formatTemplate);
  }

  /**
   * Update a template
   */
  async updateTemplate(
    templateId: string,
    userId: string,
    updates: Partial<CreateTemplateDto>,
  ): Promise<MissionTemplate> {
    const template = await this.prisma.missionTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (template.createdBy !== userId) {
      throw new BadRequestException('You can only update your own templates');
    }

    const updateData: any = {};

    if (updates.name) updateData.name = updates.name;
    if (updates.category) updateData.category = updates.category;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.estimatedDuration !== undefined) updateData.estimatedDuration = updates.estimatedDuration;
    if (updates.isPublic !== undefined) updateData.isPublic = updates.isPublic;

    if (updates.defaultBudgetMin !== undefined || updates.defaultBudgetMax !== undefined) {
      const currentRange = template.defaultBudgetRange
        ? JSON.parse(template.defaultBudgetRange as string)
        : {};
      updateData.defaultBudgetRange = JSON.stringify({
        min: updates.defaultBudgetMin ?? currentRange.min,
        max: updates.defaultBudgetMax ?? currentRange.max,
      });
    }

    if (updates.requiredSkills) {
      updateData.requiredSkills = JSON.stringify(updates.requiredSkills);
    }

    if (updates.checklistItems) {
      updateData.checklistItems = JSON.stringify(updates.checklistItems);
    }

    const updated = await this.prisma.missionTemplate.update({
      where: { id: templateId },
      data: updateData,
    });

    return this.formatTemplate(updated);
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string, userId: string): Promise<void> {
    const template = await this.prisma.missionTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (template.createdBy !== userId) {
      throw new BadRequestException('You can only delete your own templates');
    }

    await this.prisma.missionTemplate.delete({
      where: { id: templateId },
    });
  }

  /**
   * Create a mission from a template
   */
  async createMissionFromTemplate(
    templateId: string,
    userId: string,
    customizations?: Partial<MissionFromTemplate>,
  ): Promise<MissionFromTemplate> {
    const template = await this.getTemplate(templateId, userId);

    // Increment usage count
    await this.prisma.missionTemplate.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } },
    });

    const budgetRange = template.defaultBudgetRange;
    const defaultBudget = budgetRange
      ? (budgetRange.min + budgetRange.max) / 2
      : undefined;

    return {
      title: customizations?.title || template.name,
      description: customizations?.description || template.description || '',
      category: customizations?.category || template.category,
      estimatedDuration: customizations?.estimatedDuration || template.estimatedDuration,
      clientBudget: customizations?.clientBudget || defaultBudget,
    };
  }

  /**
   * Duplicate a template (creates a personal copy of a public template)
   */
  async duplicateTemplate(
    templateId: string,
    userId: string,
    newName?: string,
  ): Promise<MissionTemplate> {
    const original = await this.getTemplate(templateId, userId);

    const duplicateData = {
      name: newName || `${original.name} (Copy)`,
      category: original.category,
      description: original.description,
      estimatedDuration: original.estimatedDuration,
      defaultBudgetMin: original.defaultBudgetRange?.min,
      defaultBudgetMax: original.defaultBudgetRange?.max,
      requiredSkills: original.requiredSkills,
      checklistItems: original.checklistItems,
      isPublic: false, // Always create as private
    };

    return this.createTemplate(userId, duplicateData);
  }

  /**
   * Private: Format template from database
   */
  private formatTemplate(template: any): MissionTemplate {
    return {
      id: template.id,
      name: template.name,
      category: template.category,
      description: template.description,
      estimatedDuration: template.estimatedDuration,
      defaultBudgetRange: template.defaultBudgetRange
        ? JSON.parse(template.defaultBudgetRange)
        : undefined,
      requiredSkills: template.requiredSkills
        ? JSON.parse(template.requiredSkills)
        : undefined,
      checklistItems: template.checklistItems
        ? JSON.parse(template.checklistItems)
        : undefined,
      isPublic: template.isPublic,
      createdBy: template.createdBy,
      usageCount: template.usageCount,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}
