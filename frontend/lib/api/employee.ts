import apiClient from './client';
import {
  EmployeeRole,
  EmployeeStatus,
  PaymentModel,
  CompanyEmployee,
  PaginatedResponse,
} from './company';

// Re-export types for convenience
export type { EmployeeRole, EmployeeStatus, PaymentModel, CompanyEmployee, PaginatedResponse };

export interface InviteEmployeeDto {
  email: string;
  role: EmployeeRole;
  paymentModel: PaymentModel;
  commissionRate?: number;
  baseSalary?: number;
  hourlyRate?: number;
  permissions?: string[];
  specialtyIds?: string[];
}

export interface UpdateEmployeeDto {
  role?: EmployeeRole;
  status?: EmployeeStatus;
  paymentModel?: PaymentModel;
  commissionRate?: number;
  baseSalary?: number;
  hourlyRate?: number;
  permissions?: string[];
  specialtyIds?: string[];
  endDate?: Date;
  canAcceptMissions?: boolean;
  canViewFinancials?: boolean;
  canManageTeam?: boolean;
}

export interface EmployeeQueryParams {
  page?: number;
  limit?: number;
  role?: EmployeeRole;
  status?: EmployeeStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EmployeeStats {
  totalMissions: number;
  completedMissions: number;
  activeMissions: number;
  totalEarnings: number | null;
  pendingEarnings: number | null;
  averageRating: number;
  totalReviews: number;
  role: EmployeeRole;
  status: EmployeeStatus;
  paymentModel: PaymentModel;
  commissionRate: number | null;
}

export interface EmployeeEarning {
  id: string;
  employeeId: string;
  missionId: string;
  missionTitle: string;
  missionRevenue: number;
  grossAmount: number;
  netAmount: number;
  platformCommission: number;
  companyRevenue: number;
  employeeCommission: number;
  employeeCommissionRate: number;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED';
  payoutDate?: string;
  payoutMethod?: string;
  stripeTransferId?: string;
  notes?: string;
  mission?: {
    id: string;
    title: string;
    status: string;
    completedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeShift {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'REGULAR' | 'OVERTIME' | 'ON_CALL' | 'TRAINING';
  shiftType: 'REGULAR' | 'OVERTIME' | 'ONCALL' | 'BREAK';
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftDto {
  employeeId: string;
  startTime: string;
  endTime: string;
  shiftType?: 'REGULAR' | 'OVERTIME' | 'ONCALL' | 'BREAK';
  notes?: string;
}

export interface UpdateShiftDto {
  startTime?: string;
  endTime?: string;
  shiftType?: 'REGULAR' | 'OVERTIME' | 'ONCALL' | 'BREAK';
  status?: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

export const employeeApi = {
  // Invite an employee to join the company
  invite: async (
    companyId: string,
    data: InviteEmployeeDto,
  ): Promise<CompanyEmployee & { invitationUrl: string }> => {
    const response = await apiClient.post(`/employees/${companyId}/invite`, data);
    return response.data;
  },

  // Accept an employment invitation
  acceptInvitation: async (invitationToken: string): Promise<CompanyEmployee> => {
    const response = await apiClient.post('/employees/accept-invitation', { invitationToken });
    return response.data;
  },

  // Get all employees for a company
  getByCompany: async (
    companyId: string,
    params?: EmployeeQueryParams,
  ): Promise<PaginatedResponse<CompanyEmployee>> => {
    const response = await apiClient.get(`/employees/company/${companyId}`, { params });
    return response.data;
  },

  // Get employee by ID
  getById: async (id: string): Promise<CompanyEmployee> => {
    const response = await apiClient.get(`/employees/${id}`);
    return response.data;
  },

  // Update employee information
  update: async (id: string, data: UpdateEmployeeDto): Promise<CompanyEmployee> => {
    const response = await apiClient.put(`/employees/${id}`, data);
    return response.data;
  },

  // Remove/terminate an employee
  remove: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/employees/${id}`);
    return response.data;
  },

  // Resend invitation to pending employee
  resendInvitation: async (id: string): Promise<CompanyEmployee & { invitationUrl: string }> => {
    const response = await apiClient.post(`/employees/${id}/resend-invitation`);
    return response.data;
  },

  // Get employee statistics
  getStats: async (id: string): Promise<EmployeeStats> => {
    const response = await apiClient.get(`/employees/${id}/stats`);
    return response.data;
  },

  // Get employee earnings
  getEarnings: async (
    id: string,
    params?: { page?: number; limit?: number; status?: string },
  ): Promise<PaginatedResponse<EmployeeEarning>> => {
    const response = await apiClient.get(`/employees/${id}/earnings`, { params });
    return response.data;
  },

  // Get employee shifts
  getShifts: async (
    id: string,
    params?: { startDate?: string; endDate?: string },
  ): Promise<EmployeeShift[]> => {
    const response = await apiClient.get(`/employees/${id}/shifts`, { params });
    return response.data;
  },

  // Create a shift for an employee
  createShift: async (data: CreateShiftDto): Promise<EmployeeShift> => {
    const response = await apiClient.post('/employees/shifts', data);
    return response.data;
  },

  // Update a shift
  updateShift: async (shiftId: string, data: UpdateShiftDto): Promise<EmployeeShift> => {
    const response = await apiClient.put(`/employees/shifts/${shiftId}`, data);
    return response.data;
  },

  // Delete a shift
  deleteShift: async (shiftId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/employees/shifts/${shiftId}`);
    return response.data;
  },
};
