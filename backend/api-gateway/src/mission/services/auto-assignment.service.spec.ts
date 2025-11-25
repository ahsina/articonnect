import { Test, TestingModule } from '@nestjs/testing';
import { AutoAssignmentService } from './auto-assignment.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MissionStatus, EmployeeStatus } from '@prisma/client';

describe('AutoAssignmentService', () => {
  let service: AutoAssignmentService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    mission: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
    },
    companyEmployee: {
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoAssignmentService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AutoAssignmentService>(AutoAssignmentService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockMission = (overrides = {}) => ({
    id: 'mission-123',
    title: 'Fix plumbing',
    category: 'PLUMBING',
    companyId: 'company-123',
    assignedToId: null,
    scheduledFor: new Date(),
    company: {
      id: 'company-123',
      settings: { autoAssignMissions: true },
      employees: [
        {
          id: 'emp-1',
          status: EmployeeStatus.ACTIVE,
          user: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
          specialties: [{ category: 'PLUMBING', name: 'Plumber' }],
          assignedMissions: [],
          averageRating: 4.5,
          totalMissions: 25,
        },
        {
          id: 'emp-2',
          status: EmployeeStatus.ACTIVE,
          user: { id: 'user-2', firstName: 'Jane', lastName: 'Smith' },
          specialties: [{ category: 'ELECTRICAL', name: 'Electrician' }],
          assignedMissions: [{ id: 'm-1' }, { id: 'm-2' }],
          averageRating: 4.0,
          totalMissions: 15,
        },
      ],
    },
    ...overrides,
  });

  describe('autoAssignMission', () => {
    it('should auto-assign mission to best employee', async () => {
      const mission = createMockMission();
      mockPrismaService.mission.findUnique.mockResolvedValue(mission);
      mockPrismaService.mission.count.mockResolvedValue(0); // No conflicts
      mockPrismaService.mission.update.mockResolvedValue({
        ...mission,
        assignedToId: 'emp-1',
        assignedTo: mission.company.employees[0],
      });
      mockPrismaService.companyEmployee.update.mockResolvedValue({});

      const result = await service.autoAssignMission('mission-123');

      expect(result).toHaveProperty('mission');
      expect(result).toHaveProperty('score');
      expect(result.method).toBe('auto-assignment');
    });

    it('should throw NotFoundException if mission not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      await expect(service.autoAssignMission('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if mission has no company', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        id: 'mission-123',
        companyId: null,
      });

      await expect(service.autoAssignMission('mission-123')).rejects.toThrow(
        'La mission doit être assignée à une entreprise',
      );
    });

    it('should throw if auto-assignment not enabled', async () => {
      const mission = createMockMission({
        company: {
          ...createMockMission().company,
          settings: { autoAssignMissions: false },
        },
      });
      mockPrismaService.mission.findUnique.mockResolvedValue(mission);

      await expect(service.autoAssignMission('mission-123')).rejects.toThrow(
        "L'auto-assignation n'est pas activée",
      );
    });

    it('should throw if mission already assigned', async () => {
      const mission = createMockMission({ assignedToId: 'emp-existing' });
      mockPrismaService.mission.findUnique.mockResolvedValue(mission);

      await expect(service.autoAssignMission('mission-123')).rejects.toThrow(
        'La mission est déjà assignée',
      );
    });

    it('should throw if no active employees available', async () => {
      const mission = createMockMission({
        company: {
          ...createMockMission().company,
          employees: [],
        },
      });
      mockPrismaService.mission.findUnique.mockResolvedValue(mission);

      await expect(service.autoAssignMission('mission-123')).rejects.toThrow(
        'Aucun employé actif disponible',
      );
    });

    it('should return null if best score is 0', async () => {
      const mission = createMockMission({
        company: {
          ...createMockMission().company,
          employees: [
            {
              id: 'emp-1',
              status: EmployeeStatus.ACTIVE,
              specialties: [],
              assignedMissions: Array(10).fill({}), // Very high workload
              averageRating: 0,
              totalMissions: 0,
            },
          ],
        },
      });
      mockPrismaService.mission.findUnique.mockResolvedValue(mission);
      mockPrismaService.mission.count.mockResolvedValue(5); // Conflicts

      const result = await service.autoAssignMission('mission-123');

      expect(result).toBeNull();
    });

    it('should prioritize employees with matching specialty', async () => {
      const mission = createMockMission();
      mockPrismaService.mission.findUnique.mockResolvedValue(mission);
      mockPrismaService.mission.count.mockResolvedValue(0);
      mockPrismaService.mission.update.mockResolvedValue({
        ...mission,
        assignedToId: 'emp-1', // Plumber should be selected for PLUMBING
      });
      mockPrismaService.companyEmployee.update.mockResolvedValue({});

      const result = await service.autoAssignMission('mission-123');

      // First employee (plumber) should be selected for plumbing mission
      expect(mockPrismaService.mission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignedToId: 'emp-1',
          }),
        }),
      );
    });

    it('should increment employee total missions count', async () => {
      const mission = createMockMission();
      mockPrismaService.mission.findUnique.mockResolvedValue(mission);
      mockPrismaService.mission.count.mockResolvedValue(0);
      mockPrismaService.mission.update.mockResolvedValue(mission);
      mockPrismaService.companyEmployee.update.mockResolvedValue({});

      await service.autoAssignMission('mission-123');

      expect(mockPrismaService.companyEmployee.update).toHaveBeenCalledWith({
        where: { id: expect.any(String) },
        data: { totalMissions: { increment: 1 } },
      });
    });
  });

  describe('autoAssignCompanyMissions', () => {
    const mockCompany = {
      id: 'company-123',
      settings: { autoAssignMissions: true },
    };

    it('should auto-assign all unassigned missions for company', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(mockCompany);
      mockPrismaService.mission.findMany.mockResolvedValue([
        { id: 'mission-1' },
        { id: 'mission-2' },
      ]);
      mockPrismaService.mission.findUnique.mockResolvedValue(createMockMission());
      mockPrismaService.mission.count.mockResolvedValue(0);
      mockPrismaService.mission.update.mockResolvedValue({});
      mockPrismaService.companyEmployee.update.mockResolvedValue({});

      const result = await service.autoAssignCompanyMissions('company-123');

      expect(result).toHaveProperty('assignedCount');
      expect(result).toHaveProperty('failedCount');
    });

    it('should throw if company not found', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(null);

      await expect(
        service.autoAssignCompanyMissions('invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if auto-assignment not enabled', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue({
        id: 'company-123',
        settings: { autoAssignMissions: false },
      });

      await expect(
        service.autoAssignCompanyMissions('company-123'),
      ).rejects.toThrow("L'auto-assignation n'est pas activée");
    });

    it('should return message when no unassigned missions', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(mockCompany);
      mockPrismaService.mission.findMany.mockResolvedValue([]);

      const result = await service.autoAssignCompanyMissions('company-123');

      expect(result.assignedCount).toBe(0);
      expect(result.message).toBe('Aucune mission non assignée');
    });
  });

  describe('getAutoAssignmentSuggestions', () => {
    it('should return top 5 employee suggestions', async () => {
      const mission = createMockMission();
      mockPrismaService.mission.findUnique.mockResolvedValue(mission);
      mockPrismaService.mission.count.mockResolvedValue(0);

      const result = await service.getAutoAssignmentSuggestions('mission-123');

      expect(result.length).toBeLessThanOrEqual(5);
      expect(result[0]).toHaveProperty('employee');
      expect(result[0]).toHaveProperty('score');
      expect(result[0]).toHaveProperty('recommendation');
    });

    it('should throw if mission not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      await expect(
        service.getAutoAssignmentSuggestions('invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if mission has no company', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        id: 'mission-123',
        companyId: null,
        company: null,
      });

      await expect(
        service.getAutoAssignmentSuggestions('mission-123'),
      ).rejects.toThrow('La mission doit être assignée à une entreprise');
    });

    it('should sort suggestions by score', async () => {
      const mission = createMockMission();
      mockPrismaService.mission.findUnique.mockResolvedValue(mission);
      mockPrismaService.mission.count.mockResolvedValue(0);

      const result = await service.getAutoAssignmentSuggestions('mission-123');

      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
      }
    });

    it('should include recommendation level', async () => {
      const mission = createMockMission();
      mockPrismaService.mission.findUnique.mockResolvedValue(mission);
      mockPrismaService.mission.count.mockResolvedValue(0);

      const result = await service.getAutoAssignmentSuggestions('mission-123');

      expect(result[0].recommendation).toMatch(
        /^(HIGHLY_RECOMMENDED|RECOMMENDED|SUITABLE|POSSIBLE|NOT_RECOMMENDED)$/,
      );
    });
  });

  describe('scoring methods', () => {
    it('should give higher score for lower workload', async () => {
      const mission = createMockMission({
        company: {
          ...createMockMission().company,
          employees: [
            {
              id: 'emp-low',
              status: EmployeeStatus.ACTIVE,
              specialties: [{ category: 'PLUMBING' }],
              assignedMissions: [],
              averageRating: 4.0,
              totalMissions: 10,
            },
            {
              id: 'emp-high',
              status: EmployeeStatus.ACTIVE,
              specialties: [{ category: 'PLUMBING' }],
              assignedMissions: Array(7).fill({}),
              averageRating: 4.0,
              totalMissions: 10,
            },
          ],
        },
      });
      mockPrismaService.mission.findUnique.mockResolvedValue(mission);
      mockPrismaService.mission.count.mockResolvedValue(0);

      const result = await service.getAutoAssignmentSuggestions('mission-123');

      // Employee with lower workload should score higher
      expect(result[0].employee.id).toBe('emp-low');
    });

    it('should give higher score for better rating', async () => {
      const mission = createMockMission({
        company: {
          ...createMockMission().company,
          employees: [
            {
              id: 'emp-good',
              status: EmployeeStatus.ACTIVE,
              specialties: [{ category: 'PLUMBING' }],
              assignedMissions: [],
              averageRating: 4.8,
              totalMissions: 10,
            },
            {
              id: 'emp-avg',
              status: EmployeeStatus.ACTIVE,
              specialties: [{ category: 'PLUMBING' }],
              assignedMissions: [],
              averageRating: 3.2,
              totalMissions: 10,
            },
          ],
        },
      });
      mockPrismaService.mission.findUnique.mockResolvedValue(mission);
      mockPrismaService.mission.count.mockResolvedValue(0);

      const result = await service.getAutoAssignmentSuggestions('mission-123');

      expect(result[0].employee.id).toBe('emp-good');
    });

    it('should give higher score for more experience', async () => {
      const mission = createMockMission({
        company: {
          ...createMockMission().company,
          employees: [
            {
              id: 'emp-exp',
              status: EmployeeStatus.ACTIVE,
              specialties: [{ category: 'PLUMBING' }],
              assignedMissions: [],
              averageRating: 4.0,
              totalMissions: 60,
            },
            {
              id: 'emp-new',
              status: EmployeeStatus.ACTIVE,
              specialties: [{ category: 'PLUMBING' }],
              assignedMissions: [],
              averageRating: 4.0,
              totalMissions: 2,
            },
          ],
        },
      });
      mockPrismaService.mission.findUnique.mockResolvedValue(mission);
      mockPrismaService.mission.count.mockResolvedValue(0);

      const result = await service.getAutoAssignmentSuggestions('mission-123');

      expect(result[0].employee.id).toBe('emp-exp');
    });
  });
});
