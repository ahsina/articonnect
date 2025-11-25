import { Test, TestingModule } from '@nestjs/testing';
import { MissionTemplateService } from './mission-template.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('MissionTemplateService', () => {
  let service: MissionTemplateService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    missionTemplate: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockTemplate = {
    id: 'template-123',
    name: 'Plumbing Repair',
    category: 'plumbing',
    description: 'Standard plumbing repair service',
    estimatedDuration: 120,
    defaultBudgetRange: JSON.stringify({ min: 100, max: 300 }),
    requiredSkills: JSON.stringify(['plumbing', 'pipe repair']),
    checklistItems: JSON.stringify(['Inspect pipes', 'Fix leak', 'Test flow']),
    isPublic: true,
    createdBy: 'user-123',
    usageCount: 15,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrivateTemplate = {
    ...mockTemplate,
    id: 'template-456',
    isPublic: false,
    createdBy: 'other-user',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionTemplateService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MissionTemplateService>(MissionTemplateService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTemplate', () => {
    it('should create a new template', async () => {
      mockPrismaService.missionTemplate.create.mockResolvedValue(mockTemplate);

      const result = await service.createTemplate('user-123', {
        name: 'Plumbing Repair',
        category: 'plumbing',
        description: 'Standard plumbing repair service',
        estimatedDuration: 120,
        defaultBudgetMin: 100,
        defaultBudgetMax: 300,
        requiredSkills: ['plumbing', 'pipe repair'],
        checklistItems: ['Inspect pipes', 'Fix leak', 'Test flow'],
        isPublic: true,
      });

      expect(result.name).toBe('Plumbing Repair');
      expect(result.category).toBe('plumbing');
      expect(result.isPublic).toBe(true);
      expect(mockPrismaService.missionTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Plumbing Repair',
          category: 'plumbing',
          createdBy: 'user-123',
          usageCount: 0,
        }),
      });
    });

    it('should create template without optional fields', async () => {
      const simpleTemplate = {
        ...mockTemplate,
        defaultBudgetRange: null,
        requiredSkills: null,
        checklistItems: null,
      };
      mockPrismaService.missionTemplate.create.mockResolvedValue(simpleTemplate);

      const result = await service.createTemplate('user-123', {
        name: 'Simple Task',
        category: 'general',
      });

      expect(result.name).toBe('Plumbing Repair');
    });

    it('should default isPublic to false', async () => {
      mockPrismaService.missionTemplate.create.mockResolvedValue({
        ...mockTemplate,
        isPublic: false,
      });

      await service.createTemplate('user-123', {
        name: 'Private Template',
        category: 'general',
      });

      expect(mockPrismaService.missionTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isPublic: false,
        }),
      });
    });
  });

  describe('getTemplates', () => {
    it('should return public templates and user templates', async () => {
      mockPrismaService.missionTemplate.findMany.mockResolvedValue([mockTemplate]);

      const result = await service.getTemplates('user-123');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.missionTemplate.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ isPublic: true }, { createdBy: 'user-123' }],
        },
        orderBy: [{ usageCount: 'desc' }, { createdAt: 'desc' }],
      });
    });

    it('should filter by category', async () => {
      mockPrismaService.missionTemplate.findMany.mockResolvedValue([mockTemplate]);

      await service.getTemplates('user-123', 'plumbing');

      expect(mockPrismaService.missionTemplate.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          category: 'plumbing',
        }),
        orderBy: expect.any(Array),
      });
    });

    it('should return only public templates when no user', async () => {
      mockPrismaService.missionTemplate.findMany.mockResolvedValue([mockTemplate]);

      await service.getTemplates();

      expect(mockPrismaService.missionTemplate.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ isPublic: true }],
        },
        orderBy: expect.any(Array),
      });
    });
  });

  describe('getTemplate', () => {
    it('should return template by ID', async () => {
      mockPrismaService.missionTemplate.findUnique.mockResolvedValue(mockTemplate);

      const result = await service.getTemplate('template-123', 'user-123');

      expect(result.id).toBe('template-123');
      expect(result.name).toBe('Plumbing Repair');
    });

    it('should throw NotFoundException if template not found', async () => {
      mockPrismaService.missionTemplate.findUnique.mockResolvedValue(null);

      await expect(service.getTemplate('nonexistent', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for private template not owned by user', async () => {
      mockPrismaService.missionTemplate.findUnique.mockResolvedValue(mockPrivateTemplate);

      await expect(service.getTemplate('template-456', 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow access to own private template', async () => {
      const ownPrivateTemplate = { ...mockPrivateTemplate, createdBy: 'user-123' };
      mockPrismaService.missionTemplate.findUnique.mockResolvedValue(ownPrivateTemplate);

      const result = await service.getTemplate('template-456', 'user-123');

      expect(result.id).toBe('template-456');
    });

    it('should parse JSON fields correctly', async () => {
      mockPrismaService.missionTemplate.findUnique.mockResolvedValue(mockTemplate);

      const result = await service.getTemplate('template-123', 'user-123');

      expect(result.defaultBudgetRange).toEqual({ min: 100, max: 300 });
      expect(result.requiredSkills).toEqual(['plumbing', 'pipe repair']);
      expect(result.checklistItems).toEqual(['Inspect pipes', 'Fix leak', 'Test flow']);
    });
  });

  describe('getPopularTemplates', () => {
    it('should return popular public templates', async () => {
      mockPrismaService.missionTemplate.findMany.mockResolvedValue([mockTemplate]);

      const result = await service.getPopularTemplates(10);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.missionTemplate.findMany).toHaveBeenCalledWith({
        where: { isPublic: true },
        orderBy: { usageCount: 'desc' },
        take: 10,
      });
    });

    it('should use default limit of 10', async () => {
      mockPrismaService.missionTemplate.findMany.mockResolvedValue([]);

      await service.getPopularTemplates();

      expect(mockPrismaService.missionTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });
  });

  describe('getUserTemplates', () => {
    it('should return templates created by user', async () => {
      mockPrismaService.missionTemplate.findMany.mockResolvedValue([mockTemplate]);

      const result = await service.getUserTemplates('user-123');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.missionTemplate.findMany).toHaveBeenCalledWith({
        where: { createdBy: 'user-123' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('updateTemplate', () => {
    it('should update template', async () => {
      mockPrismaService.missionTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrismaService.missionTemplate.update.mockResolvedValue({
        ...mockTemplate,
        name: 'Updated Plumbing',
      });

      const result = await service.updateTemplate('template-123', 'user-123', {
        name: 'Updated Plumbing',
      });

      expect(result.name).toBe('Updated Plumbing');
    });

    it('should throw NotFoundException if template not found', async () => {
      mockPrismaService.missionTemplate.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTemplate('nonexistent', 'user-123', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if not owner', async () => {
      mockPrismaService.missionTemplate.findUnique.mockResolvedValue(mockPrivateTemplate);

      await expect(
        service.updateTemplate('template-456', 'user-123', { name: 'Test' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update budget range partially', async () => {
      mockPrismaService.missionTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrismaService.missionTemplate.update.mockResolvedValue(mockTemplate);

      await service.updateTemplate('template-123', 'user-123', {
        defaultBudgetMin: 150,
      });

      expect(mockPrismaService.missionTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-123' },
        data: expect.objectContaining({
          defaultBudgetRange: JSON.stringify({ min: 150, max: 300 }),
        }),
      });
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template', async () => {
      mockPrismaService.missionTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrismaService.missionTemplate.delete.mockResolvedValue(mockTemplate);

      await service.deleteTemplate('template-123', 'user-123');

      expect(mockPrismaService.missionTemplate.delete).toHaveBeenCalledWith({
        where: { id: 'template-123' },
      });
    });

    it('should throw NotFoundException if template not found', async () => {
      mockPrismaService.missionTemplate.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteTemplate('nonexistent', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if not owner', async () => {
      mockPrismaService.missionTemplate.findUnique.mockResolvedValue(mockPrivateTemplate);

      await expect(
        service.deleteTemplate('template-456', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createMissionFromTemplate', () => {
    it('should create mission data from template', async () => {
      mockPrismaService.missionTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrismaService.missionTemplate.update.mockResolvedValue({
        ...mockTemplate,
        usageCount: 16,
      });

      const result = await service.createMissionFromTemplate('template-123', 'user-123');

      expect(result.title).toBe('Plumbing Repair');
      expect(result.description).toBe('Standard plumbing repair service');
      expect(result.category).toBe('plumbing');
      expect(result.estimatedDuration).toBe(120);
      expect(result.clientBudget).toBe(200); // (100 + 300) / 2
    });

    it('should increment usage count', async () => {
      mockPrismaService.missionTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrismaService.missionTemplate.update.mockResolvedValue(mockTemplate);

      await service.createMissionFromTemplate('template-123', 'user-123');

      expect(mockPrismaService.missionTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-123' },
        data: { usageCount: { increment: 1 } },
      });
    });

    it('should allow customizations', async () => {
      mockPrismaService.missionTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrismaService.missionTemplate.update.mockResolvedValue(mockTemplate);

      const result = await service.createMissionFromTemplate(
        'template-123',
        'user-123',
        {
          title: 'Custom Title',
          clientBudget: 500,
        },
      );

      expect(result.title).toBe('Custom Title');
      expect(result.clientBudget).toBe(500);
    });
  });

  describe('duplicateTemplate', () => {
    it('should create a copy of template', async () => {
      mockPrismaService.missionTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrismaService.missionTemplate.create.mockResolvedValue({
        ...mockTemplate,
        id: 'template-copy',
        name: 'Plumbing Repair (Copy)',
        isPublic: false,
        createdBy: 'user-456',
      });

      const result = await service.duplicateTemplate('template-123', 'user-456');

      expect(result.name).toBe('Plumbing Repair (Copy)');
      expect(result.isPublic).toBe(false);
    });

    it('should allow custom name for copy', async () => {
      mockPrismaService.missionTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrismaService.missionTemplate.create.mockResolvedValue({
        ...mockTemplate,
        name: 'My Custom Name',
      });

      const result = await service.duplicateTemplate(
        'template-123',
        'user-456',
        'My Custom Name',
      );

      expect(mockPrismaService.missionTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'My Custom Name',
        }),
      });
    });

    it('should always create as private', async () => {
      mockPrismaService.missionTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrismaService.missionTemplate.create.mockResolvedValue({
        ...mockTemplate,
        isPublic: false,
      });

      await service.duplicateTemplate('template-123', 'user-456');

      expect(mockPrismaService.missionTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isPublic: false,
        }),
      });
    });
  });
});
