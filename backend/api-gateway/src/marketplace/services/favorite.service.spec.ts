import { Test, TestingModule } from '@nestjs/testing';
import { FavoriteService } from './favorite.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('FavoriteService', () => {
  let service: FavoriteService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    favorite: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockProduct = {
    id: 'product-123',
    name: 'Handmade Table',
    price: 500,
  };

  const mockArtisan = {
    id: 'artisan-123',
    firstName: 'Pierre',
    lastName: 'Artisan',
    role: 'ARTISAN',
  };

  const mockFavorite = {
    id: 'favorite-123',
    userId: 'user-123',
    productId: 'product-123',
    createdAt: new Date(),
    product: {
      ...mockProduct,
      artisan: {
        firstName: 'Pierre',
        lastName: 'Artisan',
        artisanProfile: {
          companyName: 'Pierre Menuiserie',
          rating: 4.5,
        },
      },
    },
    artisan: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoriteService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FavoriteService>(FavoriteService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addProductFavorite', () => {
    it('should add product to favorites', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.favorite.findUnique.mockResolvedValue(null);
      mockPrismaService.favorite.create.mockResolvedValue(mockFavorite);

      const result = await service.addProductFavorite('user-123', 'product-123');

      expect(result).toEqual(mockFavorite);
      expect(mockPrismaService.favorite.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          productId: 'product-123',
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(
        service.addProductFavorite('user-123', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if product already favorited', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.favorite.findUnique.mockResolvedValue(mockFavorite);

      await expect(
        service.addProductFavorite('user-123', 'product-123'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('addArtisanFavorite', () => {
    it('should add artisan to favorites', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockArtisan);
      mockPrismaService.favorite.findUnique.mockResolvedValue(null);
      mockPrismaService.favorite.create.mockResolvedValue({
        ...mockFavorite,
        productId: null,
        artisanId: 'artisan-123',
        artisan: mockArtisan,
      });

      const result = await service.addArtisanFavorite('user-123', 'artisan-123');

      expect(result.artisanId).toBe('artisan-123');
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'artisan-123',
          role: 'ARTISAN',
        },
      });
    });

    it('should throw NotFoundException if artisan not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.addArtisanFavorite('user-123', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if artisan already favorited', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockArtisan);
      mockPrismaService.favorite.findUnique.mockResolvedValue({
        id: 'favorite-123',
        artisanId: 'artisan-123',
      });

      await expect(
        service.addArtisanFavorite('user-123', 'artisan-123'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getUserFavorites', () => {
    it('should return all user favorites separated by type', async () => {
      mockPrismaService.favorite.findMany.mockResolvedValue([
        { ...mockFavorite, product: mockProduct, artisan: null },
        {
          id: 'favorite-124',
          userId: 'user-123',
          productId: null,
          artisanId: 'artisan-123',
          createdAt: new Date(),
          product: null,
          artisan: mockArtisan,
        },
      ]);

      const result = await service.getUserFavorites('user-123');

      expect(result.products).toHaveLength(1);
      expect(result.artisans).toHaveLength(1);
      expect(result.total).toBe(2);
    });

    it('should return empty arrays when no favorites', async () => {
      mockPrismaService.favorite.findMany.mockResolvedValue([]);

      const result = await service.getUserFavorites('user-123');

      expect(result.products).toHaveLength(0);
      expect(result.artisans).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getFavoriteProducts', () => {
    it('should return only product favorites', async () => {
      mockPrismaService.favorite.findMany.mockResolvedValue([mockFavorite]);

      const result = await service.getFavoriteProducts('user-123');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.favorite.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          productId: { not: null },
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getFavoriteArtisans', () => {
    it('should return only artisan favorites', async () => {
      mockPrismaService.favorite.findMany.mockResolvedValue([
        {
          id: 'favorite-124',
          artisanId: 'artisan-123',
          artisan: mockArtisan,
        },
      ]);

      const result = await service.getFavoriteArtisans('user-123');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.favorite.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          artisanId: { not: null },
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('removeFavorite', () => {
    it('should remove a favorite', async () => {
      mockPrismaService.favorite.findFirst.mockResolvedValue(mockFavorite);
      mockPrismaService.favorite.delete.mockResolvedValue(mockFavorite);

      const result = await service.removeFavorite('user-123', 'favorite-123');

      expect(result.message).toBe('Favorite removed successfully');
      expect(mockPrismaService.favorite.delete).toHaveBeenCalledWith({
        where: { id: 'favorite-123' },
      });
    });

    it('should throw NotFoundException if favorite not found', async () => {
      mockPrismaService.favorite.findFirst.mockResolvedValue(null);

      await expect(
        service.removeFavorite('user-123', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should verify ownership before removing', async () => {
      mockPrismaService.favorite.findFirst.mockResolvedValue(null);

      await expect(
        service.removeFavorite('user-123', 'favorite-123'),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.favorite.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'favorite-123',
          userId: 'user-123',
        },
      });
    });
  });

  describe('isProductFavorite', () => {
    it('should return true if product is favorited', async () => {
      mockPrismaService.favorite.findUnique.mockResolvedValue(mockFavorite);

      const result = await service.isProductFavorite('user-123', 'product-123');

      expect(result).toBe(true);
    });

    it('should return false if product is not favorited', async () => {
      mockPrismaService.favorite.findUnique.mockResolvedValue(null);

      const result = await service.isProductFavorite('user-123', 'product-123');

      expect(result).toBe(false);
    });
  });

  describe('isArtisanFavorite', () => {
    it('should return true if artisan is favorited', async () => {
      mockPrismaService.favorite.findUnique.mockResolvedValue({
        id: 'favorite-124',
        artisanId: 'artisan-123',
      });

      const result = await service.isArtisanFavorite('user-123', 'artisan-123');

      expect(result).toBe(true);
    });

    it('should return false if artisan is not favorited', async () => {
      mockPrismaService.favorite.findUnique.mockResolvedValue(null);

      const result = await service.isArtisanFavorite('user-123', 'artisan-123');

      expect(result).toBe(false);
    });
  });

  describe('getFavoritesStats', () => {
    it('should return favorites statistics', async () => {
      mockPrismaService.favorite.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(6) // products
        .mockResolvedValueOnce(4); // artisans

      const result = await service.getFavoritesStats('user-123');

      expect(result.total).toBe(10);
      expect(result.products).toBe(6);
      expect(result.artisans).toBe(4);
    });

    it('should return zeros for new user', async () => {
      mockPrismaService.favorite.count.mockResolvedValue(0);

      const result = await service.getFavoritesStats('new-user');

      expect(result.total).toBe(0);
      expect(result.products).toBe(0);
      expect(result.artisans).toBe(0);
    });
  });
});
