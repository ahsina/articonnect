import { Test, TestingModule } from '@nestjs/testing';
import { BusinessVerificationService } from './business-verification.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SiretVerificationService } from './siret-verification.service';
import { RcsVerificationService } from './rcs-verification.service';
import { KboVerificationService } from './kbo-verification.service';
import { BadRequestException } from '@nestjs/common';
import { Country, VerificationStatus } from '../dto/verification.dto';

describe('BusinessVerificationService', () => {
  let service: BusinessVerificationService;
  let prismaService: PrismaService;
  let siretService: SiretVerificationService;
  let rcsService: RcsVerificationService;
  let kboService: KboVerificationService;

  const mockPrismaService = {
    artisanProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockSiretService = {
    verifySiret: jest.fn(),
  };

  const mockRcsService = {
    verifyRcs: jest.fn(),
  };

  const mockKboService = {
    verifyKbo: jest.fn(),
  };

  const mockFrenchVerificationResult = {
    verified: true,
    siret: '12345678901234',
    companyName: 'Test Company FR',
    legalForm: 'SARL',
    address: '123 Rue de Paris, 75001 Paris',
    isActive: true,
    creationDate: '2020-01-01',
    nafCode: '43.21A',
    nafLabel: 'Plomberie',
    employeeCount: '1-9',
    errors: [],
    warnings: [],
  };

  const mockLuxembourgVerificationResult = {
    verified: true,
    rcsNumber: 'B123456',
    companyName: 'Test Company LU',
    legalForm: 'SARL',
    address: '123 Grand Rue, L-1234 Luxembourg',
    isActive: true,
    registrationDate: '2020-01-01',
    naceCode: '43.21',
    errors: [],
    warnings: [],
  };

  const mockBelgianVerificationResult = {
    verified: true,
    kboNumber: '0123.456.789',
    companyName: 'Test Company BE',
    legalForm: 'SPRL',
    address: '123 Rue de Bruxelles, 1000 Bruxelles',
    isActive: true,
    startDate: '2020-01-01',
    naceCode: '43.21',
    vatNumber: 'BE0123456789',
    errors: [],
    warnings: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessVerificationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SiretVerificationService, useValue: mockSiretService },
        { provide: RcsVerificationService, useValue: mockRcsService },
        { provide: KboVerificationService, useValue: mockKboService },
      ],
    }).compile();

    service = module.get<BusinessVerificationService>(BusinessVerificationService);
    prismaService = module.get<PrismaService>(PrismaService);
    siretService = module.get<SiretVerificationService>(SiretVerificationService);
    rcsService = module.get<RcsVerificationService>(RcsVerificationService);
    kboService = module.get<KboVerificationService>(KboVerificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyBusiness', () => {
    it('should verify French business using SIRET', async () => {
      mockSiretService.verifySiret.mockResolvedValue(mockFrenchVerificationResult);

      const result = await service.verifyBusiness({
        country: Country.FRANCE,
        registrationNumber: '12345678901234',
        companyName: 'Test Company FR',
      });

      expect(result.verified).toBe(true);
      expect(result.country).toBe(Country.FRANCE);
      expect(result.companyName).toBe('Test Company FR');
      expect(mockSiretService.verifySiret).toHaveBeenCalledWith(
        '12345678901234',
        'Test Company FR',
      );
    });

    it('should verify Luxembourg business using RCS', async () => {
      mockRcsService.verifyRcs.mockResolvedValue(mockLuxembourgVerificationResult);

      const result = await service.verifyBusiness({
        country: Country.LUXEMBOURG,
        registrationNumber: 'B123456',
        companyName: 'Test Company LU',
      });

      expect(result.verified).toBe(true);
      expect(result.country).toBe(Country.LUXEMBOURG);
      expect(mockRcsService.verifyRcs).toHaveBeenCalledWith(
        'B123456',
        'Test Company LU',
      );
    });

    it('should verify Belgian business using KBO', async () => {
      mockKboService.verifyKbo.mockResolvedValue(mockBelgianVerificationResult);

      const result = await service.verifyBusiness({
        country: Country.BELGIUM,
        registrationNumber: '0123.456.789',
        companyName: 'Test Company BE',
      });

      expect(result.verified).toBe(true);
      expect(result.country).toBe(Country.BELGIUM);
      expect(result.vatNumber).toBe('BE0123456789');
      expect(mockKboService.verifyKbo).toHaveBeenCalledWith(
        '0123.456.789',
        'Test Company BE',
      );
    });

    it('should throw BadRequestException for unsupported country', async () => {
      await expect(
        service.verifyBusiness({
          country: 'GERMANY' as Country,
          registrationNumber: '123456',
          companyName: 'Test Company',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return verification failure for invalid business', async () => {
      mockSiretService.verifySiret.mockResolvedValue({
        verified: false,
        errors: ['SIRET not found'],
      });

      const result = await service.verifyBusiness({
        country: Country.FRANCE,
        registrationNumber: 'invalid',
        companyName: 'Invalid Company',
      });

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('SIRET not found');
    });
  });

  describe('verifyArtisan', () => {
    it('should verify and update artisan profile', async () => {
      mockSiretService.verifySiret.mockResolvedValue(mockFrenchVerificationResult);
      mockPrismaService.artisanProfile.update.mockResolvedValue({});

      await service.verifyArtisan('artisan-123', {
        country: Country.FRANCE,
        registrationNumber: '12345678901234',
        companyName: 'Test Company',
      });

      expect(mockPrismaService.artisanProfile.update).toHaveBeenCalledWith({
        where: { userId: 'artisan-123' },
        data: expect.objectContaining({
          businessVerified: true,
          businessVerificationStatus: VerificationStatus.VERIFIED,
          businessRegistrationNumber: '12345678901234',
          businessCountry: Country.FRANCE,
        }),
      });
    });

    it('should mark as rejected when verification fails', async () => {
      mockSiretService.verifySiret.mockResolvedValue({
        verified: false,
        errors: ['SIRET not found'],
      });
      mockPrismaService.artisanProfile.update.mockResolvedValue({});

      await service.verifyArtisan('artisan-123', {
        country: Country.FRANCE,
        registrationNumber: 'invalid',
        companyName: 'Test',
      });

      expect(mockPrismaService.artisanProfile.update).toHaveBeenCalledWith({
        where: { userId: 'artisan-123' },
        data: expect.objectContaining({
          businessVerified: false,
          businessVerificationStatus: VerificationStatus.REJECTED,
        }),
      });
    });
  });

  describe('getVerificationStatus', () => {
    it('should return verification status for artisan', async () => {
      mockPrismaService.artisanProfile.findUnique.mockResolvedValue({
        businessVerified: true,
        businessVerifiedAt: new Date(),
        businessVerificationStatus: VerificationStatus.VERIFIED,
        businessRegistrationNumber: '12345678901234',
        businessCountry: Country.FRANCE,
        companyName: 'Test Company',
        businessVerificationErrors: [],
        businessVerificationWarnings: [],
      });

      const result = await service.getVerificationStatus('artisan-123');

      expect(result.verified).toBe(true);
      expect(result.status).toBe(VerificationStatus.VERIFIED);
    });

    it('should throw BadRequestException if profile not found', async () => {
      mockPrismaService.artisanProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.getVerificationStatus('nonexistent'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return pending status for unverified artisan', async () => {
      mockPrismaService.artisanProfile.findUnique.mockResolvedValue({
        businessVerified: null,
        businessVerifiedAt: null,
        businessVerificationStatus: null,
        companyName: 'Test Company',
        siret: '12345678901234',
      });

      const result = await service.getVerificationStatus('artisan-123');

      expect(result.verified).toBe(false);
      expect(result.status).toBe(VerificationStatus.PENDING);
    });
  });

  describe('reverifyArtisan', () => {
    it('should re-verify existing artisan', async () => {
      mockPrismaService.artisanProfile.findUnique.mockResolvedValue({
        userId: 'artisan-123',
        businessRegistrationNumber: '12345678901234',
        businessCountry: Country.FRANCE,
        companyName: 'Test Company',
      });
      mockSiretService.verifySiret.mockResolvedValue(mockFrenchVerificationResult);
      mockPrismaService.artisanProfile.update.mockResolvedValue({});

      const result = await service.reverifyArtisan('artisan-123');

      expect(result.verified).toBe(true);
      expect(mockSiretService.verifySiret).toHaveBeenCalled();
    });

    it('should throw BadRequestException if profile not found', async () => {
      mockPrismaService.artisanProfile.findUnique.mockResolvedValue(null);

      await expect(service.reverifyArtisan('nonexistent')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if missing verification info', async () => {
      mockPrismaService.artisanProfile.findUnique.mockResolvedValue({
        userId: 'artisan-123',
        businessRegistrationNumber: null,
        businessCountry: null,
        companyName: 'Test Company',
      });

      await expect(service.reverifyArtisan('artisan-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getUnverifiedArtisans', () => {
    it('should return unverified artisans', async () => {
      const unverifiedArtisans = [
        {
          id: 'profile-1',
          userId: 'artisan-1',
          businessVerified: false,
          user: { email: 'artisan1@example.com' },
        },
        {
          id: 'profile-2',
          userId: 'artisan-2',
          businessVerified: null,
          user: { email: 'artisan2@example.com' },
        },
      ];
      mockPrismaService.artisanProfile.findMany.mockResolvedValue(unverifiedArtisans);

      const result = await service.getUnverifiedArtisans();

      expect(result).toHaveLength(2);
      expect(mockPrismaService.artisanProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );
    });

    it('should respect custom limit', async () => {
      mockPrismaService.artisanProfile.findMany.mockResolvedValue([]);

      await service.getUnverifiedArtisans(10);

      expect(mockPrismaService.artisanProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });
  });

  describe('getArtisansNeedingReverification', () => {
    it('should return artisans verified over 1 year ago', async () => {
      const oldVerification = new Date();
      oldVerification.setFullYear(oldVerification.getFullYear() - 2);

      mockPrismaService.artisanProfile.findMany.mockResolvedValue([
        {
          id: 'profile-1',
          businessVerified: true,
          businessVerifiedAt: oldVerification,
          user: { email: 'old@example.com' },
        },
      ]);

      const result = await service.getArtisansNeedingReverification();

      expect(result).toHaveLength(1);
      expect(mockPrismaService.artisanProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            businessVerified: true,
            businessVerifiedAt: expect.any(Object),
          }),
        }),
      );
    });
  });
});
