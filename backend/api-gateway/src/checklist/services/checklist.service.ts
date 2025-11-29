import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateChecklistTemplateDto,
  UpdateChecklistTemplateDto,
  CreateChecklistInstanceDto,
  UpdateChecklistInstanceDto,
  CompleteChecklistDto,
  ChecklistFilterDto,
  InstanceFilterDto,
  CloneTemplateDto,
  AddPhotoDto,
  ChecklistStatus,
  ChecklistCategory,
} from '../dto/checklist.dto';

interface ChecklistTemplateData {
  name: string;
  description?: string;
  category: string;
  trade?: string;
  sections: any[];
  requiresSignature: boolean;
  requiresPhotos: boolean;
  requiresClientApproval: boolean;
  isGlobal: boolean;
  tags: string[];
  status: string;
  createdBy: string;
  createdAt: string;
  usageCount: number;
}

interface ChecklistInstanceData {
  templateId: string;
  templateName: string;
  missionId: string;
  artisanId: string;
  sections: any[];
  responses: any;
  status: string;
  progress: number;
  artisanSignature?: string;
  clientSignature?: string;
  notes?: string;
  photos: string[];
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

@Injectable()
export class ChecklistService {
  constructor(private prisma: PrismaService) {}

  private generateTemplateKey(artisanId: string | null): string {
    const prefix = artisanId ? `checklist_template_${artisanId}` : 'checklist_template_global';
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateInstanceKey(missionId: string): string {
    return `checklist_instance_${missionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Template Management
  async createTemplate(userId: string, dto: CreateChecklistTemplateDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { artisanProfile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Only artisans or admins can create templates
    if (user.role !== 'ARTISAN' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only artisans or admins can create checklist templates');
    }

    const templateData: ChecklistTemplateData = {
      name: dto.name,
      description: dto.description,
      category: dto.category,
      trade: dto.trade,
      sections: dto.sections.map((section, sIdx) => ({
        id: `section_${sIdx}_${Date.now()}`,
        title: section.title,
        description: section.description,
        position: section.position ?? sIdx,
        items: section.items.map((item, iIdx) => ({
          id: `item_${sIdx}_${iIdx}_${Date.now()}`,
          title: item.title,
          description: item.description,
          type: item.type,
          required: item.required ?? false,
          position: item.position ?? iIdx,
          options: item.options,
          unit: item.unit,
          minValue: item.minValue,
          maxValue: item.maxValue,
          requiresPhoto: item.requiresPhoto ?? false,
          requiresNote: item.requiresNote ?? false,
          helpText: item.helpText,
          validationRule: item.validationRule,
        })),
      })),
      requiresSignature: dto.requiresSignature ?? false,
      requiresPhotos: dto.requiresPhotos ?? false,
      requiresClientApproval: dto.requiresClientApproval ?? false,
      isGlobal: dto.isGlobal ?? false,
      tags: dto.tags ?? [],
      status: ChecklistStatus.ACTIVE,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      usageCount: 0,
    };

    const template = await this.prisma.platformConfig.create({
      data: {
        key: this.generateTemplateKey(dto.isGlobal ? null : userId),
        value: JSON.stringify(templateData),
        dataType: 'JSON',
        category: 'GENERAL',
        description: `Checklist template: ${dto.name}`,
        isPublic: dto.isGlobal ?? false,
        isActive: true,
      },
    });

    return {
      id: template.id,
      ...templateData,
    };
  }

  async findAllTemplates(userId: string, filters: ChecklistFilterDto) {
    const { category, trade, status, search, isGlobal, page = 1, limit = 20 } = filters;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Get all templates (global + user's own)
    const templates = await this.prisma.platformConfig.findMany({
      where: {
        OR: [
          { key: { startsWith: 'checklist_template_global' } },
          { key: { startsWith: `checklist_template_${userId}` } },
        ],
        isActive: true,
      },
    });

    let parsed = templates.map((t) => ({
      id: t.id,
      key: t.key,
      ...(JSON.parse(t.value) as ChecklistTemplateData),
    }));

    // Apply filters
    if (category) {
      parsed = parsed.filter((t) => t.category === category);
    }
    if (trade) {
      parsed = parsed.filter((t) => t.trade === trade);
    }
    if (status) {
      parsed = parsed.filter((t) => t.status === status);
    }
    if (isGlobal !== undefined) {
      parsed = parsed.filter((t) => t.isGlobal === isGlobal);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      parsed = parsed.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.description?.toLowerCase().includes(searchLower) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(searchLower)),
      );
    }

    // Sort by usage count and creation date
    parsed.sort((a, b) => {
      if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const total = parsed.length;
    const paginatedData = parsed.slice((page - 1) * limit, page * limit);

    return {
      data: paginatedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findTemplateById(templateId: string, userId: string) {
    const template = await this.prisma.platformConfig.findUnique({
      where: { id: templateId },
    });

    if (!template || !template.key.startsWith('checklist_template_')) {
      throw new NotFoundException('Template not found');
    }

    const data = JSON.parse(template.value) as ChecklistTemplateData;

    // Check access - user can access global templates or their own
    if (!data.isGlobal && data.createdBy !== userId) {
      throw new ForbiddenException('Not authorized to access this template');
    }

    return {
      id: template.id,
      ...data,
    };
  }

  async updateTemplate(templateId: string, userId: string, dto: UpdateChecklistTemplateDto) {
    const template = await this.prisma.platformConfig.findUnique({
      where: { id: templateId },
    });

    if (!template || !template.key.startsWith('checklist_template_')) {
      throw new NotFoundException('Template not found');
    }

    const data = JSON.parse(template.value) as ChecklistTemplateData;

    // Only creator or admin can update
    if (data.createdBy !== userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== 'ADMIN') {
        throw new ForbiddenException('Not authorized to update this template');
      }
    }

    const updatedData: ChecklistTemplateData = {
      ...data,
      name: dto.name ?? data.name,
      description: dto.description ?? data.description,
      category: dto.category ?? data.category,
      trade: dto.trade ?? data.trade,
      sections: dto.sections
        ? dto.sections.map((section, sIdx) => ({
            id: `section_${sIdx}_${Date.now()}`,
            title: section.title,
            description: section.description,
            position: section.position ?? sIdx,
            items: section.items.map((item, iIdx) => ({
              id: `item_${sIdx}_${iIdx}_${Date.now()}`,
              title: item.title,
              description: item.description,
              type: item.type,
              required: item.required ?? false,
              position: item.position ?? iIdx,
              options: item.options,
              unit: item.unit,
              minValue: item.minValue,
              maxValue: item.maxValue,
              requiresPhoto: item.requiresPhoto ?? false,
              requiresNote: item.requiresNote ?? false,
              helpText: item.helpText,
              validationRule: item.validationRule,
            })),
          }))
        : data.sections,
      status: dto.status ?? data.status,
      requiresSignature: dto.requiresSignature ?? data.requiresSignature,
      requiresPhotos: dto.requiresPhotos ?? data.requiresPhotos,
      requiresClientApproval: dto.requiresClientApproval ?? data.requiresClientApproval,
      tags: dto.tags ?? data.tags,
    };

    await this.prisma.platformConfig.update({
      where: { id: templateId },
      data: {
        value: JSON.stringify(updatedData),
        description: `Checklist template: ${updatedData.name}`,
      },
    });

    return {
      id: templateId,
      ...updatedData,
    };
  }

  async deleteTemplate(templateId: string, userId: string) {
    const template = await this.prisma.platformConfig.findUnique({
      where: { id: templateId },
    });

    if (!template || !template.key.startsWith('checklist_template_')) {
      throw new NotFoundException('Template not found');
    }

    const data = JSON.parse(template.value) as ChecklistTemplateData;

    if (data.createdBy !== userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== 'ADMIN') {
        throw new ForbiddenException('Not authorized to delete this template');
      }
    }

    // Soft delete by marking inactive
    await this.prisma.platformConfig.update({
      where: { id: templateId },
      data: { isActive: false },
    });

    return { success: true, message: 'Template deleted successfully' };
  }

  async cloneTemplate(templateId: string, userId: string, dto: CloneTemplateDto) {
    const original = await this.findTemplateById(templateId, userId);

    const newTemplate = await this.createTemplate(userId, {
      name: dto.newName,
      description: dto.newDescription ?? original.description,
      category: original.category as ChecklistCategory,
      trade: original.trade,
      sections: original.sections,
      requiresSignature: original.requiresSignature,
      requiresPhotos: original.requiresPhotos,
      requiresClientApproval: original.requiresClientApproval,
      isGlobal: false,
      tags: original.tags,
    });

    return newTemplate;
  }

  // Instance Management
  async createInstance(userId: string, dto: CreateChecklistInstanceDto) {
    // Verify mission exists and user has access
    const mission = await this.prisma.mission.findUnique({
      where: { id: dto.missionId },
      include: { artisan: true },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    if (mission.artisanId !== userId) {
      throw new ForbiddenException('Not authorized to create checklist for this mission');
    }

    // Get template
    const template = await this.findTemplateById(dto.templateId, userId);

    // Check for existing instance
    const existingInstances = await this.prisma.platformConfig.findMany({
      where: {
        key: { startsWith: `checklist_instance_${dto.missionId}` },
        isActive: true,
      },
    });

    const existingForTemplate = existingInstances.find((i) => {
      const data = JSON.parse(i.value) as ChecklistInstanceData;
      return data.templateId === dto.templateId;
    });

    if (existingForTemplate) {
      throw new ConflictException('A checklist instance already exists for this template and mission');
    }

    // Increment template usage count
    await this.prisma.platformConfig.update({
      where: { id: dto.templateId },
      data: {
        value: JSON.stringify({
          ...template,
          usageCount: (template.usageCount || 0) + 1,
        }),
      },
    });

    const instanceData: ChecklistInstanceData = {
      templateId: dto.templateId,
      templateName: template.name,
      missionId: dto.missionId,
      artisanId: userId,
      sections: template.sections,
      responses: {},
      status: 'IN_PROGRESS',
      progress: 0,
      notes: dto.notes,
      photos: [],
      createdAt: new Date().toISOString(),
    };

    const instance = await this.prisma.platformConfig.create({
      data: {
        key: this.generateInstanceKey(dto.missionId),
        value: JSON.stringify(instanceData),
        dataType: 'JSON',
        category: 'GENERAL',
        description: `Checklist instance: ${template.name} for mission ${dto.missionId}`,
        isPublic: false,
        isActive: true,
      },
    });

    return {
      id: instance.id,
      ...instanceData,
    };
  }

  async findInstanceById(instanceId: string, userId: string) {
    const instance = await this.prisma.platformConfig.findUnique({
      where: { id: instanceId },
    });

    if (!instance || !instance.key.startsWith('checklist_instance_')) {
      throw new NotFoundException('Checklist instance not found');
    }

    const data = JSON.parse(instance.value) as ChecklistInstanceData;

    // Verify access
    if (data.artisanId !== userId) {
      const mission = await this.prisma.mission.findUnique({
        where: { id: data.missionId },
      });
      if (mission?.clientId !== userId) {
        throw new ForbiddenException('Not authorized to access this checklist');
      }
    }

    return {
      id: instance.id,
      ...data,
    };
  }

  async findInstancesByMission(missionId: string, userId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    if (mission.artisanId !== userId && mission.clientId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const instances = await this.prisma.platformConfig.findMany({
      where: {
        key: { startsWith: `checklist_instance_${missionId}` },
        isActive: true,
      },
    });

    return instances.map((i) => ({
      id: i.id,
      ...(JSON.parse(i.value) as ChecklistInstanceData),
    }));
  }

  async findAllInstances(userId: string, filters: InstanceFilterDto) {
    const { missionId, templateId, status, startDate, endDate, page = 1, limit = 20 } = filters;

    // Get user's missions
    const userMissions = await this.prisma.mission.findMany({
      where: {
        OR: [{ artisanId: userId }, { clientId: userId }],
      },
      select: { id: true },
    });

    const missionIds = userMissions.map((m) => m.id);

    if (missionIds.length === 0) {
      return {
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 },
      };
    }

    // Get all instances for user's missions
    const allInstances = await this.prisma.platformConfig.findMany({
      where: {
        key: { startsWith: 'checklist_instance_' },
        isActive: true,
      },
    });

    let parsed = allInstances
      .map((i) => ({
        id: i.id,
        ...(JSON.parse(i.value) as ChecklistInstanceData),
      }))
      .filter((i) => missionIds.includes(i.missionId));

    // Apply filters
    if (missionId) {
      parsed = parsed.filter((i) => i.missionId === missionId);
    }
    if (templateId) {
      parsed = parsed.filter((i) => i.templateId === templateId);
    }
    if (status) {
      parsed = parsed.filter((i) => i.status === status);
    }
    if (startDate) {
      parsed = parsed.filter((i) => new Date(i.createdAt) >= new Date(startDate));
    }
    if (endDate) {
      parsed = parsed.filter((i) => new Date(i.createdAt) <= new Date(endDate));
    }

    // Sort by creation date
    parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = parsed.length;
    const paginatedData = parsed.slice((page - 1) * limit, page * limit);

    return {
      data: paginatedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateInstance(instanceId: string, userId: string, dto: UpdateChecklistInstanceDto) {
    const instance = await this.prisma.platformConfig.findUnique({
      where: { id: instanceId },
    });

    if (!instance || !instance.key.startsWith('checklist_instance_')) {
      throw new NotFoundException('Checklist instance not found');
    }

    const data = JSON.parse(instance.value) as ChecklistInstanceData;

    if (data.artisanId !== userId) {
      throw new ForbiddenException('Only the artisan can update this checklist');
    }

    if (data.status === 'COMPLETED') {
      throw new BadRequestException('Cannot update a completed checklist');
    }

    // Merge responses
    let responses = { ...data.responses };
    if (dto.responses) {
      for (const section of dto.responses) {
        if (!responses[section.sectionId]) {
          responses[section.sectionId] = {};
        }
        for (const item of section.items) {
          responses[section.sectionId][item.itemId] = {
            value: item.value,
            note: item.note,
            photos: item.photos ?? [],
            completedAt: item.completedAt ?? new Date().toISOString(),
          };
        }
      }
    }

    // Calculate progress
    const progress = this.calculateProgress(data.sections, responses);

    const updatedData: ChecklistInstanceData = {
      ...data,
      responses,
      progress,
      artisanSignature: dto.artisanSignature ?? data.artisanSignature,
      clientSignature: dto.clientSignature ?? data.clientSignature,
      notes: dto.notes ?? data.notes,
      startedAt: data.startedAt ?? new Date().toISOString(),
    };

    await this.prisma.platformConfig.update({
      where: { id: instanceId },
      data: { value: JSON.stringify(updatedData) },
    });

    return {
      id: instanceId,
      ...updatedData,
    };
  }

  private calculateProgress(sections: any[], responses: any): number {
    let totalItems = 0;
    let completedItems = 0;

    for (const section of sections) {
      for (const item of section.items) {
        totalItems++;
        if (responses[section.id]?.[item.id]?.value !== undefined) {
          completedItems++;
        }
      }
    }

    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  }

  private validateResponses(sections: any[], responses: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const section of sections) {
      for (const item of section.items) {
        const response = responses[section.id]?.[item.id];

        if (item.required && (!response || response.value === undefined || response.value === null || response.value === '')) {
          errors.push(`"${item.title}" in "${section.title}" is required`);
          continue;
        }

        if (response?.value !== undefined && response.value !== null) {
          // Type-specific validation
          switch (item.type) {
            case 'NUMBER':
            case 'MEASUREMENT':
              if (item.minValue !== undefined && response.value < item.minValue) {
                errors.push(`"${item.title}" must be at least ${item.minValue}`);
              }
              if (item.maxValue !== undefined && response.value > item.maxValue) {
                errors.push(`"${item.title}" must be at most ${item.maxValue}`);
              }
              break;
            case 'PHOTO':
              if (item.required && (!response.photos || response.photos.length === 0)) {
                errors.push(`"${item.title}" requires at least one photo`);
              }
              break;
          }

          if (item.requiresPhoto && (!response.photos || response.photos.length === 0)) {
            errors.push(`"${item.title}" requires a photo`);
          }

          if (item.requiresNote && !response.note) {
            errors.push(`"${item.title}" requires a note`);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async completeChecklist(instanceId: string, userId: string, dto: CompleteChecklistDto) {
    const instance = await this.prisma.platformConfig.findUnique({
      where: { id: instanceId },
    });

    if (!instance || !instance.key.startsWith('checklist_instance_')) {
      throw new NotFoundException('Checklist instance not found');
    }

    const data = JSON.parse(instance.value) as ChecklistInstanceData;

    if (data.artisanId !== userId) {
      throw new ForbiddenException('Only the artisan can complete this checklist');
    }

    if (data.status === 'COMPLETED') {
      throw new BadRequestException('Checklist already completed');
    }

    // Merge all responses
    let responses = { ...data.responses };
    for (const section of dto.responses) {
      if (!responses[section.sectionId]) {
        responses[section.sectionId] = {};
      }
      for (const item of section.items) {
        responses[section.sectionId][item.itemId] = {
          value: item.value,
          note: item.note,
          photos: item.photos ?? [],
          completedAt: item.completedAt ?? new Date().toISOString(),
        };
      }
    }

    // Validate all required fields
    const validation = this.validateResponses(data.sections, responses);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Checklist validation failed',
        errors: validation.errors,
      });
    }

    // Get template to check signature requirements
    const template = await this.prisma.platformConfig.findUnique({
      where: { id: data.templateId },
    });

    if (template) {
      const templateData = JSON.parse(template.value) as ChecklistTemplateData;
      if (templateData.requiresSignature && !dto.artisanSignature) {
        throw new BadRequestException('Artisan signature is required');
      }
      if (templateData.requiresClientApproval && !dto.clientSignature) {
        throw new BadRequestException('Client signature is required');
      }
    }

    const completedData: ChecklistInstanceData = {
      ...data,
      responses,
      progress: 100,
      status: 'COMPLETED',
      artisanSignature: dto.artisanSignature ?? data.artisanSignature,
      clientSignature: dto.clientSignature ?? data.clientSignature,
      notes: dto.completionNotes ?? data.notes,
      photos: [...data.photos, ...(dto.finalPhotos ?? [])],
      completedAt: new Date().toISOString(),
    };

    await this.prisma.platformConfig.update({
      where: { id: instanceId },
      data: { value: JSON.stringify(completedData) },
    });

    // Create notification for client
    const mission = await this.prisma.mission.findUnique({
      where: { id: data.missionId },
    });

    if (mission) {
      await this.prisma.notification.create({
        data: {
          userId: mission.clientId,
          type: 'SYSTEM',
          title: 'Checklist Completed',
          message: `The ${data.templateName} checklist has been completed for your mission.`,
          link: `/missions/${mission.id}/checklists/${instanceId}`,
        },
      });
    }

    return {
      id: instanceId,
      ...completedData,
    };
  }

  async addPhoto(instanceId: string, userId: string, dto: AddPhotoDto) {
    const instance = await this.prisma.platformConfig.findUnique({
      where: { id: instanceId },
    });

    if (!instance || !instance.key.startsWith('checklist_instance_')) {
      throw new NotFoundException('Checklist instance not found');
    }

    const data = JSON.parse(instance.value) as ChecklistInstanceData;

    if (data.artisanId !== userId) {
      throw new ForbiddenException('Only the artisan can add photos');
    }

    if (data.status === 'COMPLETED') {
      throw new BadRequestException('Cannot add photos to a completed checklist');
    }

    // Find the section containing the item
    let sectionId: string | null = null;
    for (const section of data.sections) {
      if (section.items.find((i: any) => i.id === dto.itemId)) {
        sectionId = section.id;
        break;
      }
    }

    if (!sectionId) {
      throw new NotFoundException('Item not found in checklist');
    }

    // Add photo to item response
    if (!data.responses[sectionId]) {
      data.responses[sectionId] = {};
    }
    if (!data.responses[sectionId][dto.itemId]) {
      data.responses[sectionId][dto.itemId] = { photos: [] };
    }
    if (!data.responses[sectionId][dto.itemId].photos) {
      data.responses[sectionId][dto.itemId].photos = [];
    }

    data.responses[sectionId][dto.itemId].photos.push({
      url: dto.photoUrl,
      caption: dto.caption,
      metadata: dto.metadata,
      uploadedAt: new Date().toISOString(),
    });

    await this.prisma.platformConfig.update({
      where: { id: instanceId },
      data: { value: JSON.stringify(data) },
    });

    return {
      success: true,
      photoCount: data.responses[sectionId][dto.itemId].photos.length,
    };
  }

  async deleteInstance(instanceId: string, userId: string) {
    const instance = await this.prisma.platformConfig.findUnique({
      where: { id: instanceId },
    });

    if (!instance || !instance.key.startsWith('checklist_instance_')) {
      throw new NotFoundException('Checklist instance not found');
    }

    const data = JSON.parse(instance.value) as ChecklistInstanceData;

    if (data.artisanId !== userId) {
      throw new ForbiddenException('Only the artisan can delete this checklist');
    }

    if (data.status === 'COMPLETED') {
      throw new BadRequestException('Cannot delete a completed checklist');
    }

    await this.prisma.platformConfig.update({
      where: { id: instanceId },
      data: { isActive: false },
    });

    return { success: true, message: 'Checklist deleted successfully' };
  }

  // Analytics
  async getChecklistAnalytics(userId: string, startDate?: Date, endDate?: Date) {
    const instances = await this.prisma.platformConfig.findMany({
      where: {
        key: { startsWith: 'checklist_instance_' },
        isActive: true,
      },
    });

    let parsed = instances
      .map((i) => JSON.parse(i.value) as ChecklistInstanceData)
      .filter((i) => i.artisanId === userId);

    if (startDate) {
      parsed = parsed.filter((i) => new Date(i.createdAt) >= startDate);
    }
    if (endDate) {
      parsed = parsed.filter((i) => new Date(i.createdAt) <= endDate);
    }

    const total = parsed.length;
    const completed = parsed.filter((i) => i.status === 'COMPLETED').length;
    const inProgress = parsed.filter((i) => i.status === 'IN_PROGRESS').length;

    const avgProgress = parsed.length > 0
      ? parsed.reduce((sum, i) => sum + i.progress, 0) / parsed.length
      : 0;

    const byTemplate: Record<string, { count: number; completed: number }> = {};
    for (const instance of parsed) {
      if (!byTemplate[instance.templateName]) {
        byTemplate[instance.templateName] = { count: 0, completed: 0 };
      }
      byTemplate[instance.templateName].count++;
      if (instance.status === 'COMPLETED') {
        byTemplate[instance.templateName].completed++;
      }
    }

    return {
      total,
      completed,
      inProgress,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      averageProgress: Math.round(avgProgress),
      byTemplate: Object.entries(byTemplate).map(([name, data]) => ({
        templateName: name,
        ...data,
        completionRate: data.count > 0 ? Math.round((data.completed / data.count) * 100) : 0,
      })),
    };
  }

  // Get global templates for reference
  async getGlobalTemplates(category?: ChecklistCategory) {
    const templates = await this.prisma.platformConfig.findMany({
      where: {
        key: { startsWith: 'checklist_template_global' },
        isActive: true,
      },
    });

    let parsed = templates.map((t) => ({
      id: t.id,
      ...(JSON.parse(t.value) as ChecklistTemplateData),
    }));

    if (category) {
      parsed = parsed.filter((t) => t.category === category);
    }

    return parsed.sort((a, b) => b.usageCount - a.usageCount);
  }
}
