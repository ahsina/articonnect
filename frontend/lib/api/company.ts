import apiClient from './client';

// Types
export type EmployeeRole = 'OWNER' | 'MANAGER' | 'SUPERVISOR' | 'TECHNICIAN' | 'CONTRACTOR';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'PENDING_INVITATION';
export type PaymentModel = 'SALARY' | 'COMMISSION' | 'HYBRID';

export interface Company {
  id: string;
  companyName: string;
  siret: string;
  vatNumber?: string;
  description?: string;
  website?: string;
  logo?: string;
  baseAddress: string;
  city: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  serviceRadius: number;
  businessVerified: boolean;
  businessVerifiedAt?: string;
  businessVerificationStatus: string;
  stripeAccountId?: string;
  stripeOnboarded: boolean;
  totalMissions: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
  ownerId: string;
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  employees?: CompanyEmployee[];
  settings?: CompanySettings;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyEmployee {
  id: string;
  companyId: string;
  userId: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  invitationToken?: string;
  invitationSentAt?: string;
  invitationAcceptedAt?: string;
  startDate: string;
  endDate?: string;
  paymentModel: PaymentModel;
  baseSalary?: number;
  commissionRate?: number;
  hourlyRate?: number;
  permissions: string[];
  totalMissions: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  specialties?: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface CompanySettings {
  id: string;
  companyId: string;
  defaultCommissionRate: number;
  ownerCommissionRate: number;
  autoAssignMissions: boolean;
  requireManagerApproval: boolean;
  allowEmployeeSelfAssignment: boolean;
  payoutFrequency: string;
  minimumPayout: number;
  notifyOwnerOnNewMission: boolean;
  notifyManagerOnNewMission: boolean;
  notifyEmployeeOnAssignment: boolean;
  defaultWorkingHoursStart?: string;
  defaultWorkingHoursEnd?: string;
}

export interface CompanyStats {
  totalMissions: number;
  completedMissions: number;
  activeMissions: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
  employeeCount: number;
}

export interface CreateCompanyDto {
  companyName: string;
  siret: string;
  vatNumber?: string;
  description?: string;
  website?: string;
  baseAddress: string;
  city: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  serviceRadius?: number;
  businessRegistrationNumber?: string;
  businessLegalForm?: string;
  businessActivityCode?: string;
}

export interface UpdateCompanyDto {
  companyName?: string;
  siret?: string;
  vatNumber?: string;
  description?: string;
  website?: string;
  logo?: string;
  baseAddress?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  serviceRadius?: number;
}

export interface UpdateCompanySettingsDto {
  defaultCommissionRate?: number;
  ownerCommissionRate?: number;
  autoAssignMissions?: boolean;
  requireManagerApproval?: boolean;
  allowEmployeeSelfAssignment?: boolean;
  payoutFrequency?: string;
  minimumPayout?: number;
  notifyOwnerOnNewMission?: boolean;
  notifyManagerOnNewMission?: boolean;
  notifyEmployeeOnAssignment?: boolean;
  defaultWorkingHoursStart?: string;
  defaultWorkingHoursEnd?: string;
}

export interface CompanyQueryParams {
  page?: number;
  limit?: number;
  country?: string;
  verificationStatus?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const companyApi = {
  // Create a new company
  create: async (data: CreateCompanyDto): Promise<Company> => {
    const response = await apiClient.post('/companies', data);
    return response.data;
  },

  // Get all companies with pagination
  getAll: async (params?: CompanyQueryParams): Promise<PaginatedResponse<Company>> => {
    const response = await apiClient.get('/companies', { params });
    return response.data;
  },

  // Get my company (as owner or employee)
  getMyCompany: async (): Promise<Company> => {
    const response = await apiClient.get('/companies/my-company');
    return response.data;
  },

  // Get company by ID
  getById: async (id: string): Promise<Company> => {
    const response = await apiClient.get(`/companies/${id}`);
    return response.data;
  },

  // Update company information
  update: async (id: string, data: UpdateCompanyDto): Promise<Company> => {
    const response = await apiClient.put(`/companies/${id}`, data);
    return response.data;
  },

  // Update company settings
  updateSettings: async (id: string, data: UpdateCompanySettingsDto): Promise<CompanySettings> => {
    const response = await apiClient.put(`/companies/${id}/settings`, data);
    return response.data;
  },

  // Get company statistics
  getStats: async (id: string): Promise<CompanyStats> => {
    const response = await apiClient.get(`/companies/${id}/stats`);
    return response.data;
  },

  // Delete company
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/companies/${id}`);
    return response.data;
  },

  // Upload company logo
  uploadLogo: async (id: string, file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/companies/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
