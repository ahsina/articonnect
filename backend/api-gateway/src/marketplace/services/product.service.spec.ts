import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('ProductService', () => {
  let service: ProductService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    product: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    productVariant: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockProduct = {
    id: 'product-123',
    name: 'Handmade Vase',
    description: 'Beautiful ceramic vase',
    price: 49.99,
    vatRate: 17,
    categoryId: 'category-123',
    stock: 10,
    sku: 'VASE-001',
    status: 'ACTIVE',
    artisanId: 'artisan-123',
    artisan: {
      id: 'artisan-123',
      firstName: 'John',
      lastName: 'Doe',
      artisanProfile: {
        companyName: 'John Crafts',
        rating: 4.5,
      },
    },
    variants: [],
  };

  const mockVariant = {
    id: 'variant-123',
    productId: 'product-123',
    name: 'Large',
    priceAdjustment: 10,
    stock: 5,
    product: {
      id: 'product-123',
      name: 'Handmade Vase',
      price: 49.99,
      artisanId: 'artisan-123',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      name: 'Handmade Vase',
      description: 'Beautiful ceramic vase',
      price: 49.99,
      category: 'category-123',
      stock: 10,
      sku: 'VASE-001',
    };

    it('should create a product successfully', async () => {
      mockPrismaService.product.create.mockResolvedValue(mockProduct);

      const result = await service.create('artisan-123', createDto);

      expect(result).toEqual(mockProduct);
      expect(mockPrismaService.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          artisanId: 'artisan-123',
          name: createDto.name,
          price: createDto.price,
        }),
        include: expect.any(Object),
      });
    });

    it('should use default VAT rate if not provided', async () => {
      mockPrismaService.product.create.mockResolvedValue(mockProduct);

      await service.create('artisan-123', createDto);

      expect(mockPrismaService.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          vatRate: 17,
        }),
        include: expect.any(Object),
      });
    });

    it('should use default status DRAFT if not provided', async () => {
      mockPrismaService.product.create.mockResolvedValue(mockProduct);

      await service.create('artisan-123', createDto);

      expect(mockPrismaService.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'DRAFT',
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      mockPrismaService.product.count.mockResolvedValue(100);
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);

      const result = await service.findAll({ page: 1, limit: 12 });

      expect(result.data).toEqual([mockProduct]);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 12,
        total: 100,
        totalPages: 9,
        hasNextPage: true,
        hasPreviousPage: false,
      });
    });

    it('should filter by category', async () => {
      mockPrismaService.product.count.mockResolvedValue(10);
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.findAll({ category: 'category-123' });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId: 'category-123' }),
        }),
      );
    });

    it('should filter by artisan', async () => {
      mockPrismaService.product.count.mockResolvedValue(5);
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.findAll({ artisanId: 'artisan-123' });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ artisanId: 'artisan-123' }),
        }),
      );
    });

    it('should filter by search term', async () => {
      mockPrismaService.product.count.mockResolvedValue(3);
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.findAll({ search: 'vase' });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'vase', mode: 'insensitive' } },
              { description: { contains: 'vase', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should filter by price range', async () => {
      mockPrismaService.product.count.mockResolvedValue(5);
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.findAll({ minPrice: 20, maxPrice: 100 });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: { gte: 20, lte: 100 },
          }),
        }),
      );
    });

    it('should sort by price', async () => {
      mockPrismaService.product.count.mockResolvedValue(10);
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.findAll({ sortBy: 'price', sortOrder: 'asc' });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { price: 'asc' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findOne('product-123');

      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Vase',
      price: 59.99,
    };

    it('should update a product successfully', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.update.mockResolvedValue({
        ...mockProduct,
        ...updateDto,
      });

      const result = await service.update('product-123', updateDto);

      expect(result.name).toBe('Updated Vase');
      expect(result.price).toBe(59.99);
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should transform category to categoryId', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.update.mockResolvedValue(mockProduct);

      await service.update('product-123', { category: 'new-category' });

      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: 'product-123' },
        data: expect.objectContaining({ categoryId: 'new-category' }),
        include: expect.any(Object),
      });
    });
  });

  describe('delete', () => {
    it('should delete a product successfully', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.delete.mockResolvedValue(mockProduct);

      const result = await service.delete('product-123');

      expect(result.message).toBe('Produit supprimé avec succès');
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createVariant', () => {
    const createVariantDto = {
      name: 'Large',
      priceAdjustment: 10,
      stock: 5,
    };

    it('should create a variant successfully', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.productVariant.create.mockResolvedValue(mockVariant);

      const result = await service.createVariant(
        'product-123',
        'artisan-123',
        createVariantDto,
      );

      expect(result).toEqual(mockVariant);
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(
        service.createVariant('nonexistent', 'artisan-123', createVariantDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if artisan does not own product', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      await expect(
        service.createVariant('product-123', 'other-artisan', createVariantDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getVariants', () => {
    it('should return all variants for a product', async () => {
      mockPrismaService.productVariant.findMany.mockResolvedValue([mockVariant]);

      const result = await service.getVariants('product-123');

      expect(result).toEqual([mockVariant]);
      expect(mockPrismaService.productVariant.findMany).toHaveBeenCalledWith({
        where: { productId: 'product-123' },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('getVariant', () => {
    it('should return a variant by id', async () => {
      mockPrismaService.productVariant.findUnique.mockResolvedValue(mockVariant);

      const result = await service.getVariant('variant-123');

      expect(result).toEqual(mockVariant);
    });

    it('should throw NotFoundException if variant not found', async () => {
      mockPrismaService.productVariant.findUnique.mockResolvedValue(null);

      await expect(service.getVariant('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateVariant', () => {
    const updateVariantDto = {
      name: 'Extra Large',
      priceAdjustment: 15,
    };

    it('should update a variant successfully', async () => {
      mockPrismaService.productVariant.findUnique.mockResolvedValue(mockVariant);
      mockPrismaService.productVariant.update.mockResolvedValue({
        ...mockVariant,
        ...updateVariantDto,
      });

      const result = await service.updateVariant(
        'variant-123',
        'artisan-123',
        updateVariantDto,
      );

      expect(result.name).toBe('Extra Large');
    });

    it('should throw ForbiddenException if artisan does not own variant', async () => {
      mockPrismaService.productVariant.findUnique.mockResolvedValue(mockVariant);

      await expect(
        service.updateVariant('variant-123', 'other-artisan', updateVariantDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteVariant', () => {
    it('should delete a variant successfully', async () => {
      mockPrismaService.productVariant.findUnique.mockResolvedValue(mockVariant);
      mockPrismaService.productVariant.delete.mockResolvedValue(mockVariant);

      const result = await service.deleteVariant('variant-123', 'artisan-123');

      expect(result.message).toBe('Variante supprimée avec succès');
    });

    it('should throw ForbiddenException if artisan does not own variant', async () => {
      mockPrismaService.productVariant.findUnique.mockResolvedValue(mockVariant);

      await expect(
        service.deleteVariant('variant-123', 'other-artisan'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
