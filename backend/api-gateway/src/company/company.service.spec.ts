import { Test, TestingModule } from '@nestjs/testing';
import { CompanyService } from './company.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { EmployeeRole, EmployeeStatus, PaymentModel } from '@prisma/client';

describe('CompanyService', () => {
  let service: CompanyService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    company: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    companySettings: {
      create: jest.fn(),
      update: jest.fn(),
    },
    companyEmployee: {
      create: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    artisanProfile: {
      update: jest.fn(),
    },
    mission: {
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'owner@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'ARTISAN',
    artisanProfile: { id: 'profile-123' },
  };

  const mockCompany = {
    id: 'company-123',
    companyName: 'Test Company',
    siret: '12345678901234',
    ownerId: 'user-123',
    averageRating: 4.5,
    totalReviews: 100,
    owner: {
      id: 'user-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'owner@example.com',
    },
    employees: [
      {
        userId: 'user-123',
        role: EmployeeRole.OWNER,
        permissions: JSON.stringify(['canManageCompany', 'canManageSettings']),
      },
    ],
    settings: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCompany', () => {
    const createCompanyDto = {
      companyName: 'New Company',
      siret: '98765432109876',
      vatNumber: 'FR12345678901',
      baseAddress: '123 Main St',
      city: 'Luxembourg',
      postalCode: '1234',
      country: 'LU',
    };

    it('should create a company successfully', async () => {
      mockPrismaService.company.findUnique
        .mockResolvedValueOnce(null) // No existing company for owner
        .mockResolvedValueOnce(null); // SIRET not taken
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const createdCompany = { id: 'new-company-123', ...createCompanyDto };
      const employeeRecord = { id: 'employee-123', role: EmployeeRole.OWNER };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          company: { create: jest.fn().mockResolvedValue(createdCompany) },
          companySettings: { create: jest.fn().mockResolvedValue({}) },
          companyEmployee: { create: jest.fn().mockResolvedValue(employeeRecord) },
          artisanProfile: { update: jest.fn().mockResolvedValue({}) },
        };
        return callback(tx);
      });

      const result = await service.createCompany('user-123', createCompanyDto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('employeeRecord');
    });

    it('should throw ConflictException if owner already has a company', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(mockCompany);

      await expect(
        service.createCompany('user-123', createCompanyDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createCompany('nonexistent-user', createCompanyDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not an artisan', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        role: 'CLIENT',
      });

      await expect(
        service.createCompany('user-123', createCompanyDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if SIRET already exists', async () => {
      mockPrismaService.company.findUnique
        .mockResolvedValueOnce(null) // No existing company for owner
        .mockResolvedValueOnce(mockCompany); // SIRET exists
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.createCompany('user-123', createCompanyDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getCompanyById', () => {
    it('should return company for owner', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(mockCompany);

      const result = await service.getCompanyById('company-123', 'user-123');

      expect(result).toEqual(mockCompany);
    });

    it('should return company for employee', async () => {
      const companyWithEmployee = {
        ...mockCompany,
        employees: [{ userId: 'employee-456' }],
      };
      mockPrismaService.company.findUnique.mockResolvedValue(companyWithEmployee);

      const result = await service.getCompanyById('company-123', 'employee-456');

      expect(result).toEqual(companyWithEmployee);
    });

    it('should throw NotFoundException if company not found', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(null);

      await expect(
        service.getCompanyById('nonexistent', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user has no access', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue({
        ...mockCompany,
        ownerId: 'other-owner',
        employees: [{ userId: 'other-employee' }],
      });

      await expect(
        service.getCompanyById('company-123', 'unauthorized-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getMyCompany', () => {
    it('should return company for owner', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(mockCompany);

      const result = await service.getMyCompany('user-123');

      expect(result).toEqual(mockCompany);
    });

    it('should return company for employee if not owner', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(null);
      mockPrismaService.companyEmployee.findFirst.mockResolvedValue({
        company: mockCompany,
      });

      const result = await service.getMyCompany('employee-123');

      expect(result).toEqual(mockCompany);
    });

    it('should throw NotFoundException if user has no company', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(null);
      mockPrismaService.companyEmployee.findFirst.mockResolvedValue(null);

      await expect(service.getMyCompany('user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAllCompanies', () => {
    it('should return paginated companies', async () => {
      const companies = [mockCompany];
      mockPrismaService.company.findMany.mockResolvedValue(companies);
      mockPrismaService.company.count.mockResolvedValue(1);

      const result = await service.getAllCompanies({ page: 1, limit: 20 });

      expect(result.data).toEqual(companies);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should filter by country', async () => {
      mockPrismaService.company.findMany.mockResolvedValue([]);
      mockPrismaService.company.count.mockResolvedValue(0);

      await service.getAllCompanies({ country: 'LU' });

      expect(mockPrismaService.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ country: 'LU' }),
        }),
      );
    });

    it('should filter by verification status', async () => {
      mockPrismaService.company.findMany.mockResolvedValue([]);
      mockPrismaService.company.count.mockResolvedValue(0);

      await service.getAllCompanies({ verificationStatus: 'VERIFIED' });

      expect(mockPrismaService.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ businessVerificationStatus: 'VERIFIED' }),
        }),
      );
    });
  });

  describe('updateCompany', () => {
    const updateDto = { companyName: 'Updated Company' };

    it('should update company successfully', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(mockCompany);
      mockPrismaService.company.update.mockResolvedValue({
        ...mockCompany,
        ...updateDto,
      });

      const result = await service.updateCompany('company-123', 'user-123', updateDto);

      expect(result.companyName).toBe('Updated Company');
    });

    it('should throw NotFoundException if company not found', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCompany('nonexistent', 'user-123', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not a member', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue({
        ...mockCompany,
        employees: [],
      });

      await expect(
        service.updateCompany('company-123', 'outsider', updateDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue({
        ...mockCompany,
        employees: [
          { userId: 'user-123', permissions: JSON.stringify([]) },
        ],
      });

      await expect(
        service.updateCompany('company-123', 'user-123', updateDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should check SIRET uniqueness when updating SIRET', async () => {
      mockPrismaService.company.findUnique
        .mockResolvedValueOnce(mockCompany) // Company lookup
        .mockResolvedValueOnce({ id: 'other-company' }); // SIRET already taken

      await expect(
        service.updateCompany('company-123', 'user-123', { siret: 'new-siret' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateCompanySettings', () => {
    const updateSettingsDto = { allowAutoAssignment: true };

    it('should update settings successfully', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(mockCompany);
      mockPrismaService.companySettings.update.mockResolvedValue({
        ...updateSettingsDto,
        companyId: 'company-123',
      });

      const result = await service.updateCompanySettings(
        'company-123',
        'user-123',
        updateSettingsDto,
      );

      expect(result.allowAutoAssignment).toBe(true);
    });

    it('should throw ForbiddenException without canManageSettings permission', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue({
        ...mockCompany,
        employees: [
          { userId: 'user-123', permissions: JSON.stringify(['canManageCompany']) },
        ],
      });

      await expect(
        service.updateCompanySettings('company-123', 'user-123', updateSettingsDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteCompany', () => {
    it('should delete company successfully', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue({
        ...mockCompany,
        missions: [],
      });
      mockPrismaService.company.delete.mockResolvedValue(mockCompany);

      const result = await service.deleteCompany('company-123', 'user-123');

      expect(result.message).toBe('Entreprise supprimée avec succès');
    });

    it('should throw NotFoundException if company not found', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteCompany('nonexistent', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue({
        ...mockCompany,
        ownerId: 'other-owner',
      });

      await expect(
        service.deleteCompany('company-123', 'user-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if company has active missions', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue({
        ...mockCompany,
        missions: [{ id: 'mission-1', status: 'IN_PROGRESS' }],
      });

      await expect(
        service.deleteCompany('company-123', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCompanyStats', () => {
    it('should return company statistics', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(mockCompany);
      mockPrismaService.mission.count
        .mockResolvedValueOnce(100) // totalMissions
        .mockResolvedValueOnce(80) // completedMissions
        .mockResolvedValueOnce(20); // activeMissions
      mockPrismaService.mission.aggregate.mockResolvedValue({
        _sum: { finalPrice: 50000 },
      });
      mockPrismaService.companyEmployee.count.mockResolvedValue(5);

      const result = await service.getCompanyStats('company-123', 'user-123');

      expect(result).toEqual({
        totalMissions: 100,
        completedMissions: 80,
        activeMissions: 20,
        totalRevenue: 50000,
        averageRating: 4.5,
        totalReviews: 100,
        employeeCount: 5,
      });
    });

    it('should throw ForbiddenException if user has no access', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue({
        ...mockCompany,
        ownerId: 'other-owner',
        employees: [],
      });

      await expect(
        service.getCompanyStats('company-123', 'unauthorized'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle null revenue sum', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(mockCompany);
      mockPrismaService.mission.count.mockResolvedValue(0);
      mockPrismaService.mission.aggregate.mockResolvedValue({
        _sum: { finalPrice: null },
      });
      mockPrismaService.companyEmployee.count.mockResolvedValue(1);

      const result = await service.getCompanyStats('company-123', 'user-123');

      expect(result.totalRevenue).toBe(0);
    });
  });
});
