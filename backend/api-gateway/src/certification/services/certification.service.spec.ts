import { Test, TestingModule } from '@nestjs/testing';
import { CertificationService } from './certification.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('CertificationService', () => {
  let service: CertificationService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    certification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockArtisanUser = {
    id: 'artisan-123',
    email: 'artisan@example.com',
    role: 'ARTISAN',
    firstName: 'John',
    lastName: 'Doe',
    artisanProfile: {
      id: 'artisan-profile-123',
    },
  };

  const mockCertification = {
    id: 'cert-123',
    artisanId: 'artisan-profile-123',
    name: 'Certified Electrician',
    issuer: 'Luxembourg Trade Association',
    issueDate: new Date('2023-01-15'),
    expiryDate: new Date('2028-01-15'),
    document: 'https://s3.example.com/cert.pdf',
    verified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    artisan: {
      id: 'artisan-profile-123',
      user: {
        id: 'artisan-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'artisan@example.com',
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificationService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CertificationService>(CertificationService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      name: 'Master Plumber',
      issuer: 'Plumbing Board',
      issueDate: '2024-01-01',
      expiryDate: '2029-01-01',
      document: 'https://s3.example.com/plumber-cert.pdf',
    };

    it('should create a certification successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockArtisanUser);
      mockPrismaService.certification.create.mockResolvedValue({
        ...mockCertification,
        name: createDto.name,
      });

      const result = await service.create('artisan-123', createDto);

      expect(result.name).toBe('Master Plumber');
      expect(mockPrismaService.certification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          artisanId: 'artisan-profile-123',
          name: 'Master Plumber',
          verified: false,
        }),
      });
    });

    it('should create certification without expiry date', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockArtisanUser);
      mockPrismaService.certification.create.mockResolvedValue(mockCertification);

      await service.create('artisan-123', {
        ...createDto,
        expiryDate: undefined,
      });

      expect(mockPrismaService.certification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiryDate: null,
        }),
      });
    });

    it('should throw ForbiddenException if user has no artisan profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        role: 'CLIENT',
        artisanProfile: null,
      });

      await expect(service.create('user-123', createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.create('nonexistent', createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if user is not an artisan', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        role: 'CLIENT',
        artisanProfile: { id: 'profile-123' },
      });

      await expect(service.create('user-123', createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findAll', () => {
    it('should return certifications for a specific artisan', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockArtisanUser);
      mockPrismaService.certification.findMany.mockResolvedValue([mockCertification]);

      const result = await service.findAll('artisan-123');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.certification.findMany).toHaveBeenCalledWith({
        where: { artisanId: 'artisan-profile-123' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if artisan has no profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        artisanProfile: null,
      });

      const result = await service.findAll('user-123');

      expect(result).toEqual([]);
    });

    it('should return all certifications for admin (no userId)', async () => {
      mockPrismaService.certification.findMany.mockResolvedValue([mockCertification]);

      const result = await service.findAll();

      expect(mockPrismaService.certification.findMany).toHaveBeenCalledWith({
        include: expect.objectContaining({
          artisan: expect.any(Object),
        }),
        orderBy: [{ verified: 'asc' }, { createdAt: 'desc' }],
      });
    });
  });

  describe('findOne', () => {
    it('should return a certification by id', async () => {
      mockPrismaService.certification.findUnique.mockResolvedValue(mockCertification);

      const result = await service.findOne('cert-123');

      expect(result).toEqual(mockCertification);
    });

    it('should throw NotFoundException if certification not found', async () => {
      mockPrismaService.certification.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Certification',
      issuer: 'Updated Issuer',
    };

    it('should update a certification successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockArtisanUser);
      mockPrismaService.certification.findUnique.mockResolvedValue(mockCertification);
      mockPrismaService.certification.update.mockResolvedValue({
        ...mockCertification,
        ...updateDto,
        verified: false,
      });

      const result = await service.update('artisan-123', 'cert-123', updateDto);

      expect(result.name).toBe('Updated Certification');
      expect(result.verified).toBe(false);
    });

    it('should mark certification as unverified after update', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockArtisanUser);
      mockPrismaService.certification.findUnique.mockResolvedValue({
        ...mockCertification,
        verified: true,
      });
      mockPrismaService.certification.update.mockResolvedValue({
        ...mockCertification,
        verified: false,
      });

      await service.update('artisan-123', 'cert-123', updateDto);

      expect(mockPrismaService.certification.update).toHaveBeenCalledWith({
        where: { id: 'cert-123' },
        data: expect.objectContaining({
          verified: false,
        }),
      });
    });

    it('should convert date strings to Date objects', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockArtisanUser);
      mockPrismaService.certification.findUnique.mockResolvedValue(mockCertification);
      mockPrismaService.certification.update.mockResolvedValue(mockCertification);

      await service.update('artisan-123', 'cert-123', {
        issueDate: '2024-06-01',
        expiryDate: '2029-06-01',
      });

      expect(mockPrismaService.certification.update).toHaveBeenCalledWith({
        where: { id: 'cert-123' },
        data: expect.objectContaining({
          issueDate: expect.any(Date),
          expiryDate: expect.any(Date),
        }),
      });
    });

    it('should throw ForbiddenException if no artisan profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        artisanProfile: null,
      });

      await expect(
        service.update('user-123', 'cert-123', updateDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if certification not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockArtisanUser);
      mockPrismaService.certification.findUnique.mockResolvedValue(null);

      await expect(
        service.update('artisan-123', 'nonexistent', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if certification belongs to another artisan', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockArtisanUser);
      mockPrismaService.certification.findUnique.mockResolvedValue({
        ...mockCertification,
        artisanId: 'other-artisan',
      });

      await expect(
        service.update('artisan-123', 'cert-123', updateDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should delete a certification successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockArtisanUser);
      mockPrismaService.certification.findUnique.mockResolvedValue(mockCertification);
      mockPrismaService.certification.delete.mockResolvedValue(mockCertification);

      const result = await service.delete('artisan-123', 'cert-123');

      expect(result.message).toBe('Certification supprimée avec succès');
    });

    it('should throw ForbiddenException if no artisan profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        artisanProfile: null,
      });

      await expect(
        service.delete('user-123', 'cert-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if certification not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockArtisanUser);
      mockPrismaService.certification.findUnique.mockResolvedValue(null);

      await expect(
        service.delete('artisan-123', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if certification belongs to another artisan', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockArtisanUser);
      mockPrismaService.certification.findUnique.mockResolvedValue({
        ...mockCertification,
        artisanId: 'other-artisan',
      });

      await expect(
        service.delete('artisan-123', 'cert-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('verify', () => {
    it('should verify a certification successfully', async () => {
      mockPrismaService.certification.findUnique.mockResolvedValue(mockCertification);
      mockPrismaService.certification.update.mockResolvedValue({
        ...mockCertification,
        verified: true,
      });

      const result = await service.verify('admin-123', 'cert-123');

      expect(result.verified).toBe(true);
      expect(mockPrismaService.certification.update).toHaveBeenCalledWith({
        where: { id: 'cert-123' },
        data: { verified: true },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if certification not found', async () => {
      mockPrismaService.certification.findUnique.mockResolvedValue(null);

      await expect(
        service.verify('admin-123', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('unverify', () => {
    it('should unverify a certification successfully', async () => {
      mockPrismaService.certification.findUnique.mockResolvedValue({
        ...mockCertification,
        verified: true,
      });
      mockPrismaService.certification.update.mockResolvedValue({
        ...mockCertification,
        verified: false,
      });

      const result = await service.unverify('admin-123', 'cert-123');

      expect(result.verified).toBe(false);
      expect(mockPrismaService.certification.update).toHaveBeenCalledWith({
        where: { id: 'cert-123' },
        data: { verified: false },
      });
    });

    it('should throw NotFoundException if certification not found', async () => {
      mockPrismaService.certification.findUnique.mockResolvedValue(null);

      await expect(
        service.unverify('admin-123', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
