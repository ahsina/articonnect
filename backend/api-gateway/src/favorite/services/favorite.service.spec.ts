import { Test, TestingModule } from '@nestjs/testing';
import { FavoriteService } from './favorite.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('FavoriteService', () => {
  let service: FavoriteService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    savedArtisan: {
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockClientUser = {
    id: 'client-123',
    role: 'CLIENT',
    clientProfile: {
      id: 'client-profile-123',
    },
  };

  const mockArtisanUser = {
    id: 'artisan-123',
    firstName: 'John',
    lastName: 'Doe',
    role: 'ARTISAN',
    artisanProfile: {
      companyName: 'John Crafts',
      rating: 4.5,
      reviewCount: 20,
      specialties: [],
    },
  };

  const mockSavedArtisan = {
    clientId: 'client-profile-123',
    artisanId: 'artisan-123',
    createdAt: new Date(),
    artisan: mockArtisanUser,
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

  describe('addFavorite', () => {
    it('should add artisan to favorites successfully', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockClientUser) // Client lookup
        .mockResolvedValueOnce(mockArtisanUser); // Artisan lookup
      mockPrismaService.savedArtisan.findUnique.mockResolvedValue(null);
      mockPrismaService.savedArtisan.create.mockResolvedValue(mockSavedArtisan);

      const result = await service.addFavorite('client-123', 'artisan-123');

      expect(result).toEqual(mockSavedArtisan);
      expect(mockPrismaService.savedArtisan.create).toHaveBeenCalledWith({
        data: {
          clientId: 'client-profile-123',
          artisanId: 'artisan-123',
        },
        include: expect.any(Object),
      });
    });

    it('should throw ForbiddenException if user has no client profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        clientProfile: null,
      });

      await expect(
        service.addFavorite('user-123', 'artisan-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if artisan not found', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockClientUser)
        .mockResolvedValueOnce(null);

      await expect(
        service.addFavorite('client-123', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user is not an artisan', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockClientUser)
        .mockResolvedValueOnce({ id: 'user-123', role: 'CLIENT' });

      await expect(
        service.addFavorite('client-123', 'not-artisan'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already in favorites', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockClientUser)
        .mockResolvedValueOnce(mockArtisanUser);
      mockPrismaService.savedArtisan.findUnique.mockResolvedValue(mockSavedArtisan);

      await expect(
        service.addFavorite('client-123', 'artisan-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeFavorite', () => {
    it('should remove artisan from favorites successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockClientUser);
      mockPrismaService.savedArtisan.findUnique.mockResolvedValue(mockSavedArtisan);
      mockPrismaService.savedArtisan.delete.mockResolvedValue(mockSavedArtisan);

      const result = await service.removeFavorite('client-123', 'artisan-123');

      expect(result.message).toBe('Artisan retiré des favoris');
      expect(mockPrismaService.savedArtisan.delete).toHaveBeenCalledWith({
        where: {
          clientId_artisanId: {
            clientId: 'client-profile-123',
            artisanId: 'artisan-123',
          },
        },
      });
    });

    it('should throw ForbiddenException if user has no client profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        clientProfile: null,
      });

      await expect(
        service.removeFavorite('user-123', 'artisan-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if artisan not in favorites', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockClientUser);
      mockPrismaService.savedArtisan.findUnique.mockResolvedValue(null);

      await expect(
        service.removeFavorite('client-123', 'artisan-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFavorites', () => {
    it('should return list of favorite artisans', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockClientUser);
      mockPrismaService.savedArtisan.findMany.mockResolvedValue([mockSavedArtisan]);

      const result = await service.getFavorites('client-123');

      expect(result).toEqual([mockSavedArtisan]);
      expect(mockPrismaService.savedArtisan.findMany).toHaveBeenCalledWith({
        where: { clientId: 'client-profile-123' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if no client profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        clientProfile: null,
      });

      const result = await service.getFavorites('user-123');

      expect(result).toEqual([]);
    });

    it('should return empty array if no favorites', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockClientUser);
      mockPrismaService.savedArtisan.findMany.mockResolvedValue([]);

      const result = await service.getFavorites('client-123');

      expect(result).toEqual([]);
    });
  });

  describe('isFavorite', () => {
    it('should return true if artisan is in favorites', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockClientUser);
      mockPrismaService.savedArtisan.findUnique.mockResolvedValue(mockSavedArtisan);

      const result = await service.isFavorite('client-123', 'artisan-123');

      expect(result.isFavorite).toBe(true);
    });

    it('should return false if artisan not in favorites', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockClientUser);
      mockPrismaService.savedArtisan.findUnique.mockResolvedValue(null);

      const result = await service.isFavorite('client-123', 'artisan-456');

      expect(result.isFavorite).toBe(false);
    });

    it('should return false if no client profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        clientProfile: null,
      });

      const result = await service.isFavorite('user-123', 'artisan-123');

      expect(result.isFavorite).toBe(false);
    });
  });
});
