import { employeeApi } from '../employee';
import apiClient from '../client';

// Mock the apiClient
jest.mock('../client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('employeeApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('invite', () => {
    it('should invite an employee to join the company', async () => {
      const inviteData = {
        email: 'employee@example.com',
        role: 'TECHNICIAN' as const,
        paymentModel: 'COMMISSION' as const,
        commissionRate: 50,
      };
      const mockResponse = {
        id: 'employee-1',
        ...inviteData,
        status: 'PENDING_INVITATION',
        invitationUrl: 'https://example.com/invite/token123',
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await employeeApi.invite('company-1', inviteData);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/employees/company-1/invite', inviteData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('acceptInvitation', () => {
    it('should accept an employment invitation', async () => {
      const mockResponse = {
        id: 'employee-1',
        status: 'ACTIVE',
        role: 'TECHNICIAN',
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await employeeApi.acceptInvitation('token123');

      expect(mockedApiClient.post).toHaveBeenCalledWith('/employees/accept-invitation', {
        invitationToken: 'token123',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getByCompany', () => {
    it('should fetch all employees for a company', async () => {
      const mockResponse = {
        data: [
          { id: 'emp-1', role: 'MANAGER', status: 'ACTIVE' },
          { id: 'emp-2', role: 'TECHNICIAN', status: 'ACTIVE' },
        ],
        meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockResponse });

      const params = { page: 1, limit: 10, role: 'TECHNICIAN' as const };
      const result = await employeeApi.getByCompany('company-1', params);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/employees/company/company-1', { params });
      expect(result).toEqual(mockResponse);
    });

    it('should fetch employees without params', async () => {
      const mockResponse = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await employeeApi.getByCompany('company-1');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/employees/company/company-1', {
        params: undefined,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getById', () => {
    it('should fetch an employee by ID', async () => {
      const mockEmployee = {
        id: 'employee-1',
        role: 'TECHNICIAN',
        status: 'ACTIVE',
        paymentModel: 'COMMISSION',
        commissionRate: 50,
        user: {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockEmployee });

      const result = await employeeApi.getById('employee-1');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/employees/employee-1');
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('update', () => {
    it('should update employee information', async () => {
      const updateData = {
        role: 'SUPERVISOR' as const,
        commissionRate: 60,
        permissions: ['VIEW_FINANCIALS', 'MANAGE_TEAM'],
      };
      const mockResponse = { id: 'employee-1', ...updateData };

      mockedApiClient.put.mockResolvedValueOnce({ data: mockResponse });

      const result = await employeeApi.update('employee-1', updateData);

      expect(mockedApiClient.put).toHaveBeenCalledWith('/employees/employee-1', updateData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('remove', () => {
    it('should remove/terminate an employee', async () => {
      const mockResponse = { message: 'Employee terminated successfully' };

      mockedApiClient.delete.mockResolvedValueOnce({ data: mockResponse });

      const result = await employeeApi.remove('employee-1');

      expect(mockedApiClient.delete).toHaveBeenCalledWith('/employees/employee-1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('resendInvitation', () => {
    it('should resend invitation to pending employee', async () => {
      const mockResponse = {
        id: 'employee-1',
        status: 'PENDING_INVITATION',
        invitationUrl: 'https://example.com/invite/newtoken',
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await employeeApi.resendInvitation('employee-1');

      expect(mockedApiClient.post).toHaveBeenCalledWith('/employees/employee-1/resend-invitation');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getStats', () => {
    it('should fetch employee statistics', async () => {
      const mockStats = {
        totalMissions: 25,
        completedMissions: 23,
        activeMissions: 2,
        totalEarnings: 5000,
        averageRating: 4.8,
        totalReviews: 20,
        role: 'TECHNICIAN',
        status: 'ACTIVE',
        paymentModel: 'COMMISSION',
        commissionRate: 50,
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockStats });

      const result = await employeeApi.getStats('employee-1');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/employees/employee-1/stats');
      expect(result).toEqual(mockStats);
    });
  });

  describe('getEarnings', () => {
    it('should fetch employee earnings', async () => {
      const mockResponse = {
        data: [
          {
            id: 'earning-1',
            missionId: 'mission-1',
            missionRevenue: 500,
            employeeCommission: 250,
            status: 'PAID',
          },
        ],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockResponse });

      const params = { page: 1, limit: 10, status: 'PAID' };
      const result = await employeeApi.getEarnings('employee-1', params);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/employees/employee-1/earnings', {
        params,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getShifts', () => {
    it('should fetch employee shifts', async () => {
      const mockShifts = [
        {
          id: 'shift-1',
          employeeId: 'employee-1',
          startTime: '2024-01-15T09:00:00Z',
          endTime: '2024-01-15T17:00:00Z',
          shiftType: 'REGULAR',
          status: 'SCHEDULED',
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({ data: mockShifts });

      const params = { startDate: '2024-01-01', endDate: '2024-01-31' };
      const result = await employeeApi.getShifts('employee-1', params);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/employees/employee-1/shifts', { params });
      expect(result).toEqual(mockShifts);
    });
  });

  describe('createShift', () => {
    it('should create a shift for an employee', async () => {
      const shiftData = {
        employeeId: 'employee-1',
        startTime: '2024-01-20T08:00:00Z',
        endTime: '2024-01-20T16:00:00Z',
        shiftType: 'REGULAR' as const,
        notes: 'Regular shift',
      };
      const mockResponse = { id: 'shift-2', ...shiftData, status: 'SCHEDULED' };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await employeeApi.createShift(shiftData);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/employees/shifts', shiftData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateShift', () => {
    it('should update a shift', async () => {
      const updateData = {
        startTime: '2024-01-20T09:00:00Z',
        status: 'CONFIRMED' as const,
      };
      const mockResponse = { id: 'shift-1', ...updateData };

      mockedApiClient.put.mockResolvedValueOnce({ data: mockResponse });

      const result = await employeeApi.updateShift('shift-1', updateData);

      expect(mockedApiClient.put).toHaveBeenCalledWith('/employees/shifts/shift-1', updateData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteShift', () => {
    it('should delete a shift', async () => {
      const mockResponse = { message: 'Shift deleted successfully' };

      mockedApiClient.delete.mockResolvedValueOnce({ data: mockResponse });

      const result = await employeeApi.deleteShift('shift-1');

      expect(mockedApiClient.delete).toHaveBeenCalledWith('/employees/shifts/shift-1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error handling', () => {
    it('should propagate errors from the API', async () => {
      const error = new Error('Network error');
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(employeeApi.getById('employee-1')).rejects.toThrow('Network error');
    });

    it('should handle 403 forbidden errors', async () => {
      const error = {
        response: {
          status: 403,
          data: { message: 'You do not have permission to view this employee' },
        },
      };
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(employeeApi.getById('employee-1')).rejects.toEqual(error);
    });

    it('should handle invitation already accepted error', async () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Invitation has already been accepted' },
        },
      };
      mockedApiClient.post.mockRejectedValueOnce(error);

      await expect(employeeApi.acceptInvitation('expired-token')).rejects.toEqual(error);
    });
  });
});
