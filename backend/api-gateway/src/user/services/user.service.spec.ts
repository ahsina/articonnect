import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BusinessVerificationService } from '../../verification/services/business-verification.service';
import { FeatureToggleService } from '../../fraud/services/feature-toggle.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('UserService', () => {
  let service: UserService;
  let prismaService: PrismaService;
  let businessVerificationService: BusinessVerificationService;
  let featureToggleService: FeatureToggleService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    artisanProfile: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockBusinessVerificationService = {
    verifyBusiness: jest.fn(),
  };

  const mockFeatureToggleService = {
    isBusinessVerificationRequired: jest.fn(),
    isBusinessVerificationAutoReject: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: BusinessVerificationService, useValue: mockBusinessVerificationService },
        { provide: FeatureToggleService, useValue: mockFeatureToggleService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prismaService = module.get<PrismaService>(PrismaService);
    businessVerificationService = module.get<BusinessVerificationService>(BusinessVerificationService);
    featureToggleService = module.get<FeatureToggleService>(FeatureToggleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    const userId = 'user-123';

    it('should return user profile without sensitive data', async () => {
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'hashed-password',
        twoFactorSecret: 'secret-key',
        clientProfile: { id: 'cp-1', addresses: [] },
        artisanProfile: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile(userId);

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('twoFactorSecret');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile(userId)).rejects.toThrow(NotFoundException);
    });

    it('should include client profile with addresses', async () => {
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        password: 'hashed',
        twoFactorSecret: null,
        clientProfile: {
          id: 'cp-1',
          addresses: [{ id: 'addr-1', street: '123 Main St' }],
        },
        artisanProfile: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile(userId);

      expect(result.clientProfile.addresses).toHaveLength(1);
    });

    it('should include artisan profile with specialties', async () => {
      const mockUser = {
        id: userId,
        email: 'artisan@example.com',
        password: 'hashed',
        twoFactorSecret: null,
        clientProfile: null,
        artisanProfile: {
          id: 'ap-1',
          specialties: [{ id: 'spec-1', name: 'Plumbing' }],
          certifications: [{ id: 'cert-1', name: 'Master Plumber' }],
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile(userId);

      expect(result.artisanProfile.specialties).toHaveLength(1);
      expect(result.artisanProfile.certifications).toHaveLength(1);
    });
  });

  describe('updateProfile', () => {
    const userId = 'user-123';
    const updateDto = {
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+352123456789',
    };

    it('should update user profile', async () => {
      const updatedUser = {
        id: userId,
        email: 'test@example.com',
        ...updateDto,
        avatar: null,
        role: 'CLIENT',
      };

      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(userId, updateDto);

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          firstName: updateDto.firstName,
          lastName: updateDto.lastName,
          phone: updateDto.phone,
        },
        select: expect.any(Object),
      });
    });

    it('should only update provided fields', async () => {
      const partialUpdate = { firstName: 'NewName' };
      mockPrismaService.user.update.mockResolvedValue({ id: userId, ...partialUpdate });

      await service.updateProfile(userId, partialUpdate);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ firstName: 'NewName' }),
        }),
      );
    });
  });

  describe('createArtisanProfile', () => {
    const userId = 'user-123';
    const createDto = {
      companyName: 'Test Company',
      siret: '12345678901234', // French SIRET format
      description: 'Best plumber in town',
      baseAddress: '123 Main St',
      latitude: 49.6116,
      longitude: 6.1319,
      serviceRadius: 25,
      hourlyRate: 50,
      specialtyIds: ['spec-1', 'spec-2'],
    };

    it('should create artisan profile with business verification', async () => {
      mockFeatureToggleService.isBusinessVerificationRequired.mockResolvedValue(true);
      mockBusinessVerificationService.verifyBusiness.mockResolvedValue({
        verified: true,
        errors: [],
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.artisanProfile.create.mockResolvedValue({
        id: 'ap-123',
        ...createDto,
        businessVerified: true,
      });
      mockPrismaService.artisanProfile.update.mockResolvedValue({});

      const result = await service.createArtisanProfile(userId, createDto);

      expect(result.businessVerified).toBe(true);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { role: 'ARTISAN' },
      });
    });

    it('should detect French SIRET format', async () => {
      mockFeatureToggleService.isBusinessVerificationRequired.mockResolvedValue(true);
      mockBusinessVerificationService.verifyBusiness.mockResolvedValue({
        verified: true,
        errors: [],
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.artisanProfile.create.mockResolvedValue({
        id: 'ap-123',
        businessCountry: 'FRANCE',
      });
      mockPrismaService.artisanProfile.update.mockResolvedValue({});

      await service.createArtisanProfile(userId, createDto);

      expect(mockBusinessVerificationService.verifyBusiness).toHaveBeenCalledWith(
        expect.objectContaining({
          country: 'FR',
        }),
      );
    });

    it('should detect Luxembourg RCS format', async () => {
      const luxDto = { ...createDto, siret: 'B123456' };
      mockFeatureToggleService.isBusinessVerificationRequired.mockResolvedValue(true);
      mockBusinessVerificationService.verifyBusiness.mockResolvedValue({
        verified: true,
        errors: [],
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.artisanProfile.create.mockResolvedValue({ id: 'ap-123' });
      mockPrismaService.artisanProfile.update.mockResolvedValue({});

      await service.createArtisanProfile(userId, luxDto);

      expect(mockBusinessVerificationService.verifyBusiness).toHaveBeenCalledWith(
        expect.objectContaining({
          country: 'LU',
        }),
      );
    });

    it('should detect Belgian KBO format', async () => {
      const beDto = { ...createDto, siret: '1234567890' };
      mockFeatureToggleService.isBusinessVerificationRequired.mockResolvedValue(true);
      mockBusinessVerificationService.verifyBusiness.mockResolvedValue({
        verified: true,
        errors: [],
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.artisanProfile.create.mockResolvedValue({ id: 'ap-123' });
      mockPrismaService.artisanProfile.update.mockResolvedValue({});

      await service.createArtisanProfile(userId, beDto);

      expect(mockBusinessVerificationService.verifyBusiness).toHaveBeenCalledWith(
        expect.objectContaining({
          country: 'BE', // Country.BELGIUM enum value is 'BE'
        }),
      );
    });

    it('should reject unverified business when auto-reject is enabled', async () => {
      mockFeatureToggleService.isBusinessVerificationRequired.mockResolvedValue(true);
      mockFeatureToggleService.isBusinessVerificationAutoReject.mockResolvedValue(true);
      mockBusinessVerificationService.verifyBusiness.mockResolvedValue({
        verified: false,
        errors: ['Invalid registration number'],
      });
      mockPrismaService.user.update.mockResolvedValue({});

      await expect(
        service.createArtisanProfile(userId, createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create profile with pending status when verification fails but auto-reject disabled', async () => {
      mockFeatureToggleService.isBusinessVerificationRequired.mockResolvedValue(true);
      mockFeatureToggleService.isBusinessVerificationAutoReject.mockResolvedValue(false);
      mockBusinessVerificationService.verifyBusiness.mockResolvedValue({
        verified: false,
        errors: ['Invalid registration number'],
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.artisanProfile.create.mockResolvedValue({
        id: 'ap-123',
        businessVerified: false,
        businessVerificationStatus: 'PENDING',
      });
      mockPrismaService.artisanProfile.update.mockResolvedValue({});

      const result = await service.createArtisanProfile(userId, createDto);

      expect(mockPrismaService.artisanProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          businessVerified: false,
          businessVerificationStatus: 'PENDING',
        }),
      });
    });

    it('should skip verification when not required', async () => {
      mockFeatureToggleService.isBusinessVerificationRequired.mockResolvedValue(false);
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.artisanProfile.create.mockResolvedValue({ id: 'ap-123' });
      mockPrismaService.artisanProfile.update.mockResolvedValue({});

      await service.createArtisanProfile(userId, createDto);

      expect(mockBusinessVerificationService.verifyBusiness).not.toHaveBeenCalled();
    });

    it('should connect specialties to profile', async () => {
      mockFeatureToggleService.isBusinessVerificationRequired.mockResolvedValue(false);
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.artisanProfile.create.mockResolvedValue({ id: 'ap-123' });
      mockPrismaService.artisanProfile.update.mockResolvedValue({});

      await service.createArtisanProfile(userId, createDto);

      expect(mockPrismaService.artisanProfile.update).toHaveBeenCalledWith({
        where: { id: 'ap-123' },
        data: {
          specialties: {
            connect: [{ id: 'spec-1' }, { id: 'spec-2' }],
          },
        },
      });
    });
  });

  describe('getArtisans', () => {
    it('should return list of active artisans', async () => {
      const mockArtisans = [
        {
          id: 'artisan-1',
          email: 'artisan1@example.com',
          password: 'hashed',
          twoFactorSecret: null,
          role: 'ARTISAN',
          status: 'ACTIVE',
          artisanProfile: { specialties: [] },
        },
        {
          id: 'artisan-2',
          email: 'artisan2@example.com',
          password: 'hashed',
          twoFactorSecret: null,
          role: 'ARTISAN',
          status: 'ACTIVE',
          artisanProfile: { specialties: [] },
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockArtisans);

      const result = await service.getArtisans();

      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('password');
      expect(result[0]).not.toHaveProperty('twoFactorSecret');
    });

    it('should limit results to 50', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.getArtisans();

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });
  });

  describe('getArtisan', () => {
    const artisanId = 'artisan-123';

    it('should return artisan with profile and reviews', async () => {
      const mockArtisan = {
        id: artisanId,
        email: 'artisan@example.com',
        password: 'hashed',
        twoFactorSecret: null,
        role: 'ARTISAN',
        artisanProfile: {
          specialties: [{ id: 'spec-1', name: 'Plumbing' }],
          certifications: [],
        },
        receivedReviews: [
          {
            id: 'review-1',
            overallRating: 5,
            reviewer: { firstName: 'John', lastName: 'Doe', avatar: null },
          },
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockArtisan);

      const result = await service.getArtisan(artisanId);

      expect(result.artisanProfile).toBeDefined();
      expect(result.receivedReviews).toHaveLength(1);
      expect(result).not.toHaveProperty('password');
    });

    it('should throw NotFoundException if artisan not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getArtisan(artisanId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadAvatar', () => {
    const userId = 'user-123';
    const mockFile = {
      mimetype: 'image/jpeg',
      size: 1024 * 1024, // 1MB
    } as Express.Multer.File;

    it('should update user avatar', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        firstName: 'John',
        lastName: 'Doe',
      });
      mockConfigService.get.mockReturnValue('https://api.dicebear.com/7.x/avataaars/svg');
      mockPrismaService.user.update.mockResolvedValue({
        id: userId,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JohnDoe',
      });

      const result = await service.uploadAvatar(userId, mockFile);

      expect(result.avatar).toContain('dicebear');
    });

    it('should throw error if no file provided', async () => {
      await expect(service.uploadAvatar(userId, null as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error for invalid mime type', async () => {
      const invalidFile = { mimetype: 'text/plain', size: 1024 } as Express.Multer.File;

      await expect(service.uploadAvatar(userId, invalidFile)).rejects.toThrow(
        'Type de fichier non autorisé',
      );
    });

    it('should throw error for file too large', async () => {
      const largeFile = { mimetype: 'image/jpeg', size: 10 * 1024 * 1024 } as Express.Multer.File;

      await expect(service.uploadAvatar(userId, largeFile)).rejects.toThrow(
        'Fichier trop volumineux',
      );
    });

    it('should throw error if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.uploadAvatar(userId, mockFile)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should accept PNG files', async () => {
      const pngFile = { mimetype: 'image/png', size: 1024 } as Express.Multer.File;
      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId, firstName: 'John', lastName: 'Doe' });
      mockPrismaService.user.update.mockResolvedValue({ id: userId, avatar: 'url' });

      await expect(service.uploadAvatar(userId, pngFile)).resolves.toBeDefined();
    });

    it('should accept WebP files', async () => {
      const webpFile = { mimetype: 'image/webp', size: 1024 } as Express.Multer.File;
      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId, firstName: 'John', lastName: 'Doe' });
      mockPrismaService.user.update.mockResolvedValue({ id: userId, avatar: 'url' });

      await expect(service.uploadAvatar(userId, webpFile)).resolves.toBeDefined();
    });
  });
});
