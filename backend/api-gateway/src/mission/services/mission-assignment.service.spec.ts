import { Test, TestingModule } from '@nestjs/testing';
import { MissionAssignmentService } from './mission-assignment.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { MissionStatus, EmployeeStatus } from '@prisma/client';

describe('MissionAssignmentService', () => {
  let service: MissionAssignmentService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    mission: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
    },
    companyEmployee: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockMission = {
    id: 'mission-123',
    title: 'Fix plumbing',
    status: MissionStatus.PENDING,
    clientId: 'client-123',
    companyId: null,
    artisanId: null,
    assignedToId: null,
    client: { id: 'client-123' },
    company: null,
    assignedTo: null,
  };

  const mockCompany = {
    id: 'company-123',
    companyName: 'Test Company',
    ownerId: 'owner-123',
    employees: [
      {
        id: 'employee-123',
        userId: 'user-123',
        status: EmployeeStatus.ACTIVE,
        permissions: JSON.stringify(['canAssignMissions']),
      },
    ],
    settings: { requireManagerApproval: false },
  };

  const mockEmployee = {
    id: 'employee-123',
    userId: 'user-123',
    companyId: 'company-123',
    status: EmployeeStatus.ACTIVE,
    permissions: JSON.stringify(['canAssignMissions']),
    user: { id: 'user-123', firstName: 'John', lastName: 'Employee' },
    company: mockCompany,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionAssignmentService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MissionAssignmentService>(MissionAssignmentService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assignMissionToCompany', () => {
    it('should assign mission to company', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.company.findUnique.mockResolvedValue(mockCompany);
      mockPrismaService.mission.update.mockResolvedValue({
        ...mockMission,
        companyId: 'company-123',
      });

      const result = await service.assignMissionToCompany(
        'mission-123',
        'user-123',
        { companyId: 'company-123' },
      );

      expect(result.companyId).toBe('company-123');
    });

    it('should throw NotFoundException if mission not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      await expect(
        service.assignMissionToCompany('nonexistent', 'user-123', {
          companyId: 'company-123',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if mission already assigned', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        status: MissionStatus.ACCEPTED,
      });

      await expect(
        service.assignMissionToCompany('mission-123', 'user-123', {
          companyId: 'company-123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if company not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.company.findUnique.mockResolvedValue(null);

      await expect(
        service.assignMissionToCompany('mission-123', 'user-123', {
          companyId: 'nonexistent',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should assign to employee if employeeId provided', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.company.findUnique.mockResolvedValue(mockCompany);
      mockPrismaService.mission.update.mockResolvedValue({
        ...mockMission,
        companyId: 'company-123',
        assignedToId: 'employee-123',
        status: MissionStatus.ACCEPTED,
      });

      const result = await service.assignMissionToCompany(
        'mission-123',
        'user-123',
        { companyId: 'company-123', employeeId: 'employee-123' },
      );

      expect(result.status).toBe(MissionStatus.ACCEPTED);
    });

    it('should throw NotFoundException if employee not in company', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.company.findUnique.mockResolvedValue({
        ...mockCompany,
        employees: [],
      });

      await expect(
        service.assignMissionToCompany('mission-123', 'user-123', {
          companyId: 'company-123',
          employeeId: 'nonexistent',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignMissionToEmployee', () => {
    it('should assign mission to employee', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        companyId: 'company-123',
        company: mockCompany,
      });
      mockPrismaService.companyEmployee.findFirst.mockResolvedValue(mockEmployee);
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue(mockEmployee);
      mockPrismaService.mission.update.mockResolvedValue({
        ...mockMission,
        assignedToId: 'employee-123',
        status: MissionStatus.ACCEPTED,
      });
      mockPrismaService.companyEmployee.update.mockResolvedValue(mockEmployee);

      const result = await service.assignMissionToEmployee(
        'mission-123',
        'user-123',
        { employeeId: 'employee-123' },
      );

      expect(result.status).toBe(MissionStatus.ACCEPTED);
    });

    it('should throw NotFoundException if mission not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      await expect(
        service.assignMissionToEmployee('nonexistent', 'user-123', {
          employeeId: 'employee-123',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if mission not assigned to company', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);

      await expect(
        service.assignMissionToEmployee('mission-123', 'user-123', {
          employeeId: 'employee-123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if no permission', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        companyId: 'company-123',
        company: mockCompany,
      });
      mockPrismaService.companyEmployee.findFirst.mockResolvedValue(null);

      await expect(
        service.assignMissionToEmployee('mission-123', 'unauthorized', {
          employeeId: 'employee-123',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if employee not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        companyId: 'company-123',
        company: mockCompany,
      });
      mockPrismaService.companyEmployee.findFirst.mockResolvedValue(mockEmployee);
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue(null);

      await expect(
        service.assignMissionToEmployee('mission-123', 'user-123', {
          employeeId: 'nonexistent',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if employee not active', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        companyId: 'company-123',
        company: mockCompany,
      });
      mockPrismaService.companyEmployee.findFirst.mockResolvedValue(mockEmployee);
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue({
        ...mockEmployee,
        status: EmployeeStatus.INACTIVE,
      });

      await expect(
        service.assignMissionToEmployee('mission-123', 'user-123', {
          employeeId: 'employee-123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reassignMission', () => {
    it('should reassign mission to new employee', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        companyId: 'company-123',
        assignedToId: 'old-employee',
        company: mockCompany,
        status: MissionStatus.ACCEPTED,
      });
      mockPrismaService.companyEmployee.findFirst.mockResolvedValue(mockEmployee);
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue(mockEmployee);
      mockPrismaService.mission.update.mockResolvedValue({
        ...mockMission,
        assignedToId: 'employee-123',
      });
      mockPrismaService.companyEmployee.update.mockResolvedValue(mockEmployee);

      const result = await service.reassignMission('mission-123', 'user-123', {
        newEmployeeId: 'employee-123',
        reason: 'Availability conflict',
      });

      expect(result.assignedToId).toBe('employee-123');
    });

    it('should throw BadRequestException for completed missions', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        companyId: 'company-123',
        status: MissionStatus.COMPLETED,
        company: mockCompany,
      });
      mockPrismaService.companyEmployee.findFirst.mockResolvedValue(mockEmployee);

      await expect(
        service.reassignMission('mission-123', 'user-123', {
          newEmployeeId: 'employee-123',
          reason: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should decrement old employee mission count', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        companyId: 'company-123',
        assignedToId: 'old-employee',
        company: mockCompany,
        status: MissionStatus.ACCEPTED,
      });
      mockPrismaService.companyEmployee.findFirst.mockResolvedValue(mockEmployee);
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue(mockEmployee);
      mockPrismaService.mission.update.mockResolvedValue({
        ...mockMission,
        assignedToId: 'employee-123',
      });
      mockPrismaService.companyEmployee.update.mockResolvedValue(mockEmployee);

      await service.reassignMission('mission-123', 'user-123', {
        newEmployeeId: 'employee-123',
        reason: 'Test',
      });

      expect(mockPrismaService.companyEmployee.update).toHaveBeenCalledWith({
        where: { id: 'old-employee' },
        data: { totalMissions: { decrement: 1 } },
      });
    });
  });

  describe('bulkAssignMissions', () => {
    it('should bulk assign missions to employee', async () => {
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue(mockEmployee);
      mockPrismaService.companyEmployee.findFirst.mockResolvedValue(mockEmployee);
      mockPrismaService.mission.findMany.mockResolvedValue([
        { ...mockMission, id: 'mission-1' },
        { ...mockMission, id: 'mission-2' },
      ]);
      mockPrismaService.$transaction.mockResolvedValue([
        { ...mockMission, id: 'mission-1', assignedToId: 'employee-123' },
        { ...mockMission, id: 'mission-2', assignedToId: 'employee-123' },
      ]);
      mockPrismaService.companyEmployee.update.mockResolvedValue(mockEmployee);

      const result = await service.bulkAssignMissions('user-123', {
        missionIds: ['mission-1', 'mission-2'],
        employeeId: 'employee-123',
      });

      expect(result.assignedCount).toBe(2);
    });

    it('should throw NotFoundException if employee not found', async () => {
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue(null);

      await expect(
        service.bulkAssignMissions('user-123', {
          missionIds: ['mission-1'],
          employeeId: 'nonexistent',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if some missions invalid', async () => {
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue(mockEmployee);
      mockPrismaService.companyEmployee.findFirst.mockResolvedValue(mockEmployee);
      mockPrismaService.mission.findMany.mockResolvedValue([mockMission]); // Only 1 found

      await expect(
        service.bulkAssignMissions('user-123', {
          missionIds: ['mission-1', 'mission-2'],
          employeeId: 'employee-123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('unassignMission', () => {
    it('should unassign mission from employee', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        companyId: 'company-123',
        assignedToId: 'employee-123',
        status: MissionStatus.ACCEPTED,
        company: mockCompany,
      });
      mockPrismaService.companyEmployee.findFirst.mockResolvedValue(mockEmployee);
      mockPrismaService.mission.update.mockResolvedValue({
        ...mockMission,
        assignedToId: null,
        status: MissionStatus.PENDING,
      });
      mockPrismaService.companyEmployee.update.mockResolvedValue(mockEmployee);

      const result = await service.unassignMission('mission-123', 'user-123');

      expect(result.assignedToId).toBeNull();
      expect(result.status).toBe(MissionStatus.PENDING);
    });

    it('should throw BadRequestException for in-progress missions', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        companyId: 'company-123',
        status: MissionStatus.IN_PROGRESS,
        company: mockCompany,
      });
      mockPrismaService.companyEmployee.findFirst.mockResolvedValue(mockEmployee);

      await expect(
        service.unassignMission('mission-123', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('markMissionCompleted', () => {
    it('should mark mission as completed', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        assignedToId: 'employee-123',
        status: MissionStatus.IN_PROGRESS,
      });
      mockPrismaService.mission.update.mockResolvedValue({
        ...mockMission,
        status: MissionStatus.COMPLETED,
        completedById: 'employee-123',
      });

      const result = await service.markMissionCompleted(
        'mission-123',
        'employee-123',
        {},
      );

      expect(result.status).toBe(MissionStatus.COMPLETED);
    });

    it('should throw ForbiddenException if not assigned to mission', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        assignedToId: 'other-employee',
        status: MissionStatus.IN_PROGRESS,
      });

      await expect(
        service.markMissionCompleted('mission-123', 'employee-123', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if mission not in progress', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        assignedToId: 'employee-123',
        status: MissionStatus.PENDING,
      });

      await expect(
        service.markMissionCompleted('mission-123', 'employee-123', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getEmployeeAssignedMissions', () => {
    it('should return missions assigned to employee', async () => {
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue(mockEmployee);
      mockPrismaService.companyEmployee.findFirst.mockResolvedValue(mockEmployee);
      mockPrismaService.mission.findMany.mockResolvedValue([mockMission]);

      const result = await service.getEmployeeAssignedMissions(
        'employee-123',
        'user-123',
      );

      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException if employee not found', async () => {
      mockPrismaService.companyEmployee.findUnique.mockResolvedValue(null);

      await expect(
        service.getEmployeeAssignedMissions('nonexistent', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUnassignedCompanyMissions', () => {
    it('should return unassigned missions for company', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(mockCompany);
      mockPrismaService.mission.findMany.mockResolvedValue([mockMission]);

      const result = await service.getUnassignedCompanyMissions(
        'company-123',
        'user-123',
      );

      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException if company not found', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(null);

      await expect(
        service.getUnassignedCompanyMissions('nonexistent', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if no access', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue({
        ...mockCompany,
        employees: [],
        ownerId: 'other-owner',
      });

      await expect(
        service.getUnassignedCompanyMissions('company-123', 'user-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
