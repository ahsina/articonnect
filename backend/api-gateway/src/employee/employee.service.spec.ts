import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeService } from './employee.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmailService } from '../email/services/email.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EmployeeRole, EmployeeStatus, PaymentModel } from '@prisma/client';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    company: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    companyEmployee: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    mission: {
      count: jest.fn(),
    },
    employeeEarnings: {
      aggregate: jest.fn(),
    },
  };

  const mockEmailService = {
    sendEmployeeInvitationEmail: jest.fn().mockResolvedValue(undefined),
    sendCompanyEmployeeJoinedEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockCompany = {
    id: 'company-123',
    companyName: 'Test Company',
    ownerId: 'owner-123',
    employees: [
      {
        userId: 'owner-123',
        role: EmployeeRole.OWNER,
        permissions: JSON.stringify(['canManageEmployees', 'canManageCompany']),
      },
    ],
  };

  const mockUser = {
    id: 'user-456',
    email: 'employee@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'ARTISAN',
  };

  const mockEmployee = {
    id: 'employee-123',
    companyId: 'company-123',
    userId: 'user-456',
    role: EmployeeRole.TECHNICIAN,
    status: EmployeeStatus.ACTIVE,
    paymentModel: PaymentModel.COMMISSION,
    commissionRate: 50,
    permissions: JSON.stringify(['canViewAssignedMissions']),
    user: mockUser,
    company: mockCompany,
    totalMissions: 10,
    averageRating: 4.5,
    totalReviews: 8,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<EmployeeService>(EmployeeService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('inviteEmployee', () => {
    const inviteDto = {
      email: 'employee@example.com',
      role: EmployeeRole.TECHNICIAN,
      paymentModel: PaymentModel.COMMISSION,
      commissionRate: 50,
    };

    it('should invite an employee successfully', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(mockCompany);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue(null);
      mockPrismaService.companyEmployee.create.mockResolvedValue({
        ...mockEmployee,
        status: EmployeeStatus.PENDING_INVITATION,
        invitationToken: 'token-123',
      });

      const result = await service.inviteEmployee('company-123', 'owner-123', inviteDto);

      expect(result).toHaveProperty('invitationUrl');
      expect(mockPrismaService.companyEmployee.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if company not found', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(null);

      await expect(service.inviteEmployee('nonexistent', 'owner-123', inviteDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if inviter is not a member', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue({
        ...mockCompany,
        employees: [],
      });

      await expect(service.inviteEmployee('company-123', 'outsider', inviteDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if inviter lacks permission', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue({
        ...mockCompany,
        employees: [{ userId: 'user-123', permissions: JSON.stringify([]) }],
      });

      await expect(service.inviteEmployee('company-123', 'user-123', inviteDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when inviting as OWNER', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(mockCompany);

      await expect(
        service.inviteEmployee('company-123', 'owner-123', {
          ...inviteDto,
          role: EmployeeRole.OWNER,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user email not found', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(mockCompany);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.inviteEmployee('company-123', 'owner-123', inviteDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if user already employed', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(mockCompany);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue({
        status: EmployeeStatus.ACTIVE,
      });

      await expect(service.inviteEmployee('company-123', 'owner-123', inviteDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation successfully', async () => {
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue({
        ...mockEmployee,
        status: EmployeeStatus.PENDING_INVITATION,
        invitationToken: 'valid-token',
      });
      mockPrismaService.companyEmployee.update.mockResolvedValue({
        ...mockEmployee,
        status: EmployeeStatus.ACTIVE,
      });

      const result = await service.acceptInvitation('user-456', 'valid-token');

      expect(result.status).toBe(EmployeeStatus.ACTIVE);
    });

    it('should throw NotFoundException if invitation not found', async () => {
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue(null);

      await expect(service.acceptInvitation('user-456', 'invalid-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if invitation is for different user', async () => {
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue({
        ...mockEmployee,
        status: EmployeeStatus.PENDING_INVITATION,
      });

      await expect(service.acceptInvitation('wrong-user', 'token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if invitation already accepted', async () => {
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue({
        ...mockEmployee,
        userId: 'user-456',
        status: EmployeeStatus.ACTIVE,
      });

      await expect(service.acceptInvitation('user-456', 'token')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getEmployeeById', () => {
    it('should return employee details', async () => {
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue(mockEmployee);
      mockPrismaService.companyEmployee.findFirst.mockResolvedValue({
        userId: 'requester-123',
      });

      const result = await service.getEmployeeById('employee-123', 'requester-123');

      expect(result).toEqual(mockEmployee);
    });

    it('should throw NotFoundException if employee not found', async () => {
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue(null);

      await expect(service.getEmployeeById('nonexistent', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if requester has no access', async () => {
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue({
        ...mockEmployee,
        company: { ...mockCompany, ownerId: 'other-owner' },
      });
      mockPrismaService.companyEmployee.findFirst.mockResolvedValue(null);

      await expect(service.getEmployeeById('employee-123', 'unauthorized')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getCompanyEmployees', () => {
    it('should return paginated employees', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue({
        ...mockCompany,
        employees: [{ userId: 'owner-123' }],
      });
      mockPrismaService.companyEmployee.findMany.mockResolvedValue([mockEmployee]);
      mockPrismaService.companyEmployee.count.mockResolvedValue(1);

      const result = await service.getCompanyEmployees('company-123', 'owner-123', {
        page: 1,
        limit: 20,
      });

      expect(result.data).toEqual([mockEmployee]);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by role', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue({
        ...mockCompany,
        employees: [{ userId: 'owner-123' }],
      });
      mockPrismaService.companyEmployee.findMany.mockResolvedValue([]);
      mockPrismaService.companyEmployee.count.mockResolvedValue(0);

      await service.getCompanyEmployees('company-123', 'owner-123', {
        role: EmployeeRole.TECHNICIAN,
      });

      expect(mockPrismaService.companyEmployee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: EmployeeRole.TECHNICIAN }),
        }),
      );
    });
  });

  describe('updateEmployee', () => {
    const updateDto = {
      role: EmployeeRole.SUPERVISOR,
      commissionRate: 60,
    };

    it('should update employee successfully', async () => {
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue({
        ...mockEmployee,
        company: {
          ...mockCompany,
          employees: [
            {
              userId: 'owner-123',
              permissions: JSON.stringify(['canManageEmployees']),
            },
          ],
        },
      });
      mockPrismaService.companyEmployee.update.mockResolvedValue({
        ...mockEmployee,
        ...updateDto,
      });

      const result = await service.updateEmployee('employee-123', 'owner-123', updateDto);

      expect(result.role).toBe(EmployeeRole.SUPERVISOR);
    });

    it('should throw BadRequestException when changing owner role', async () => {
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue({
        ...mockEmployee,
        role: EmployeeRole.OWNER,
        company: {
          ...mockCompany,
          employees: [
            {
              userId: 'owner-123',
              permissions: JSON.stringify(['canManageEmployees']),
            },
          ],
        },
      });

      await expect(
        service.updateEmployee('employee-123', 'owner-123', {
          role: EmployeeRole.MANAGER,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeEmployee', () => {
    it('should terminate employee successfully', async () => {
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue({
        ...mockEmployee,
        assignedMissions: [],
        company: {
          ...mockCompany,
          employees: [
            {
              userId: 'owner-123',
              permissions: JSON.stringify(['canManageEmployees']),
            },
          ],
        },
      });
      mockPrismaService.companyEmployee.update.mockResolvedValue({
        ...mockEmployee,
        status: EmployeeStatus.TERMINATED,
      });

      const result = await service.removeEmployee('employee-123', 'owner-123');

      expect(result.message).toBe('Employé supprimé avec succès');
    });

    it('should throw BadRequestException when removing owner', async () => {
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue({
        ...mockEmployee,
        role: EmployeeRole.OWNER,
        assignedMissions: [],
        company: mockCompany,
      });

      await expect(service.removeEmployee('employee-123', 'owner-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException with active missions', async () => {
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue({
        ...mockEmployee,
        assignedMissions: [{ id: 'mission-1' }],
        company: {
          ...mockCompany,
          employees: [
            {
              userId: 'owner-123',
              permissions: JSON.stringify(['canManageEmployees']),
            },
          ],
        },
      });

      await expect(service.removeEmployee('employee-123', 'owner-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getEmployeeStats', () => {
    it('should return employee statistics', async () => {
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue({
        ...mockEmployee,
        company: {
          ...mockCompany,
          employees: [
            {
              userId: 'owner-123',
              permissions: JSON.stringify(['canViewFinancials']),
            },
          ],
        },
      });
      mockPrismaService.mission.count.mockResolvedValue(10);
      mockPrismaService.employeeEarnings.aggregate.mockResolvedValue({
        _sum: { employeeCommission: 5000 },
      });

      const result = await service.getEmployeeStats('employee-123', 'owner-123');

      expect(result).toHaveProperty('totalMissions');
      expect(result).toHaveProperty('completedMissions');
      expect(result).toHaveProperty('totalEarnings');
    });
  });
});
