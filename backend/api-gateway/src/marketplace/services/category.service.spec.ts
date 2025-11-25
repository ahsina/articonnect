import { Test, TestingModule } from '@nestjs/testing';
import { CategoryService } from './category.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('CategoryService', () => {
  let service: CategoryService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    category: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
  };

  const mockCategory = {
    id: 'category-123',
    name: 'Menuiserie',
    slug: 'menuiserie',
    description: 'Travaux de menuiserie',
    icon: 'hammer',
    active: true,
    parentId: null,
    parent: null,
    children: [],
  };

  const mockChildCategory = {
    id: 'category-124',
    name: 'Tables',
    slug: 'tables',
    description: 'Tables sur mesure',
    icon: 'table',
    active: true,
    parentId: 'category-123',
    parent: mockCategory,
    children: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a category', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);
      mockPrismaService.category.create.mockResolvedValue(mockCategory);

      const result = await service.create({
        name: 'Menuiserie',
        slug: 'menuiserie',
        description: 'Travaux de menuiserie',
      });

      expect(result).toEqual(mockCategory);
      expect(mockPrismaService.category.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if slug exists', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);

      await expect(
        service.create({
          name: 'Menuiserie',
          slug: 'menuiserie',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create child category with valid parent', async () => {
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce(null) // slug check
        .mockResolvedValueOnce(mockCategory); // parent check
      mockPrismaService.category.create.mockResolvedValue(mockChildCategory);

      const result = await service.create({
        name: 'Tables',
        slug: 'tables',
        parentId: 'category-123',
      });

      expect(result).toEqual(mockChildCategory);
    });

    it('should throw NotFoundException if parent not found', async () => {
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce(null) // slug check
        .mockResolvedValueOnce(null); // parent check

      await expect(
        service.create({
          name: 'Tables',
          slug: 'tables',
          parentId: 'nonexistent',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all active categories', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([mockCategory]);

      const result = await service.findAll();

      expect(result).toEqual([mockCategory]);
      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith({
        where: { active: true },
        include: expect.any(Object),
        orderBy: { name: 'asc' },
      });
    });

    it('should include inactive categories when requested', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([
        mockCategory,
        { ...mockCategory, id: 'cat-2', active: false },
      ]);

      const result = await service.findAll(true);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findBySlug', () => {
    it('should return category by slug', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.findBySlug('menuiserie');

      expect(result).toEqual(mockCategory);
      expect(mockPrismaService.category.findUnique).toHaveBeenCalledWith({
        where: { slug: 'menuiserie' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findById', () => {
    it('should return category by id', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.findById('category-123');

      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.category.update.mockResolvedValue({
        ...mockCategory,
        name: 'Menuiserie Bois',
      });

      const result = await service.update('category-123', {
        name: 'Menuiserie Bois',
      });

      expect(result.name).toBe('Menuiserie Bois');
    });

    it('should allow slug update if unique', async () => {
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce(mockCategory) // findById
        .mockResolvedValueOnce(null); // slug uniqueness check
      mockPrismaService.category.update.mockResolvedValue({
        ...mockCategory,
        slug: 'new-slug',
      });

      const result = await service.update('category-123', { slug: 'new-slug' });

      expect(result.slug).toBe('new-slug');
    });

    it('should throw ConflictException if new slug exists', async () => {
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce(mockCategory) // findById
        .mockResolvedValueOnce({ id: 'other', slug: 'existing-slug' }); // slug check

      await expect(
        service.update('category-123', { slug: 'existing-slug' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if category not found', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a category', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.category.count.mockResolvedValue(0);
      mockPrismaService.product.count.mockResolvedValue(0);
      mockPrismaService.category.delete.mockResolvedValue(mockCategory);

      const result = await service.delete('category-123');

      expect(result).toEqual(mockCategory);
      expect(mockPrismaService.category.delete).toHaveBeenCalledWith({
        where: { id: 'category-123' },
      });
    });

    it('should throw ConflictException if has children', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.category.count.mockResolvedValue(2);

      await expect(service.delete('category-123')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if has products', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.category.count.mockResolvedValue(0);
      mockPrismaService.product.count.mockResolvedValue(5);

      await expect(service.delete('category-123')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if category not found', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTree', () => {
    it('should return hierarchical category tree', async () => {
      const tree = [
        {
          ...mockCategory,
          children: [mockChildCategory],
        },
      ];
      mockPrismaService.category.findMany.mockResolvedValue(tree);

      const result = await service.getTree();

      expect(result).toEqual(tree);
      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith({
        where: { active: true, parentId: null },
        include: expect.any(Object),
        orderBy: { name: 'asc' },
      });
    });

    it('should return empty array when no categories', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([]);

      const result = await service.getTree();

      expect(result).toEqual([]);
    });
  });
});
