import { Test, TestingModule } from '@nestjs/testing';
import { SpecialtyService } from './specialty.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('SpecialtyService', () => {
  let service: SpecialtyService;
  let prismaService: PrismaService;
  let redisService: RedisService;

  const mockPrismaService = {
    specialty: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockRedisService = {
    getOrSet: jest.fn(),
    invalidateByPattern: jest.fn(),
  };

  const mockSpecialty = {
    id: 'specialty-123',
    name: 'Plomberie',
    description: 'Plumbing services',
    category: 'TRAVAUX',
    icon: 'wrench',
    _count: {
      artisans: 50,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpecialtyService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<SpecialtyService>(SpecialtyService);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      name: 'Électricité',
      description: 'Electrical services',
      category: 'TRAVAUX',
      icon: 'bolt',
    };

    it('should create a specialty successfully', async () => {
      mockPrismaService.specialty.findUnique.mockResolvedValue(null);
      mockPrismaService.specialty.create.mockResolvedValue({
        id: 'new-specialty',
        ...createDto,
      });
      mockRedisService.invalidateByPattern.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result.name).toBe('Électricité');
      expect(mockRedisService.invalidateByPattern).toHaveBeenCalledWith('specialties:*');
    });

    it('should throw ConflictException if specialty name exists', async () => {
      mockPrismaService.specialty.findUnique.mockResolvedValue(mockSpecialty);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all specialties from cache', async () => {
      const specialties = [mockSpecialty];
      mockRedisService.getOrSet.mockResolvedValue(specialties);

      const result = await service.findAll();

      expect(result).toEqual(specialties);
      expect(mockRedisService.getOrSet).toHaveBeenCalledWith(
        'specialties:all',
        expect.any(Function),
        3600,
      );
    });

    it('should filter by category', async () => {
      const specialties = [mockSpecialty];
      mockRedisService.getOrSet.mockResolvedValue(specialties);

      const result = await service.findAll('TRAVAUX');

      expect(result).toEqual(specialties);
      expect(mockRedisService.getOrSet).toHaveBeenCalledWith(
        'specialties:category:TRAVAUX',
        expect.any(Function),
        3600,
      );
    });

    it('should fetch from database when cache miss', async () => {
      mockPrismaService.specialty.findMany.mockResolvedValue([mockSpecialty]);
      mockRedisService.getOrSet.mockImplementation(async (key, fetcher) => {
        return fetcher();
      });

      await service.findAll();

      expect(mockPrismaService.specialty.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a specialty by id', async () => {
      mockPrismaService.specialty.findUnique.mockResolvedValue(mockSpecialty);

      const result = await service.findOne('specialty-123');

      expect(result).toEqual(mockSpecialty);
      expect(result._count.artisans).toBe(50);
    });

    it('should throw NotFoundException if specialty not found', async () => {
      mockPrismaService.specialty.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Plomberie Pro',
      description: 'Professional plumbing services',
    };

    it('should update a specialty successfully', async () => {
      mockPrismaService.specialty.findUnique
        .mockResolvedValueOnce(mockSpecialty) // findOne check
        .mockResolvedValueOnce(null); // name conflict check
      mockPrismaService.specialty.update.mockResolvedValue({
        ...mockSpecialty,
        ...updateDto,
      });
      mockRedisService.invalidateByPattern.mockResolvedValue(undefined);

      const result = await service.update('specialty-123', updateDto);

      expect(result.name).toBe('Plomberie Pro');
      expect(mockRedisService.invalidateByPattern).toHaveBeenCalledWith('specialties:*');
    });

    it('should throw NotFoundException if specialty not found', async () => {
      mockPrismaService.specialty.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if new name already exists', async () => {
      mockPrismaService.specialty.findUnique
        .mockResolvedValueOnce(mockSpecialty) // findOne check
        .mockResolvedValueOnce({ id: 'other-specialty', name: 'Plomberie Pro' }); // name conflict

      await expect(service.update('specialty-123', updateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow update if name unchanged', async () => {
      mockPrismaService.specialty.findUnique
        .mockResolvedValueOnce(mockSpecialty)
        .mockResolvedValueOnce({ ...mockSpecialty, name: 'Plomberie' }); // same specialty
      mockPrismaService.specialty.update.mockResolvedValue(mockSpecialty);
      mockRedisService.invalidateByPattern.mockResolvedValue(undefined);

      await expect(
        service.update('specialty-123', { name: 'Plomberie' }),
      ).resolves.not.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete a specialty successfully', async () => {
      mockPrismaService.specialty.findUnique.mockResolvedValue(mockSpecialty);
      mockPrismaService.specialty.delete.mockResolvedValue(mockSpecialty);
      mockRedisService.invalidateByPattern.mockResolvedValue(undefined);

      const result = await service.delete('specialty-123');

      expect(result.message).toBe('Spécialité supprimée avec succès');
      expect(mockRedisService.invalidateByPattern).toHaveBeenCalledWith('specialties:*');
    });

    it('should throw NotFoundException if specialty not found', async () => {
      mockPrismaService.specialty.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getCategories', () => {
    it('should return distinct categories from cache', async () => {
      const categories = ['TRAVAUX', 'SERVICES', 'RENOVATION'];
      mockRedisService.getOrSet.mockResolvedValue(categories);

      const result = await service.getCategories();

      expect(result).toEqual(categories);
      expect(mockRedisService.getOrSet).toHaveBeenCalledWith(
        'specialties:categories',
        expect.any(Function),
        3600,
      );
    });

    it('should fetch categories from database when cache miss', async () => {
      mockPrismaService.specialty.findMany.mockResolvedValue([
        { category: 'TRAVAUX' },
        { category: 'SERVICES' },
      ]);
      mockRedisService.getOrSet.mockImplementation(async (key, fetcher) => {
        return fetcher();
      });

      const result = await service.getCategories();

      expect(result).toEqual(['TRAVAUX', 'SERVICES']);
    });
  });
});
