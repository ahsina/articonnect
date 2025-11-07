import apiClient from './client';

export interface DashboardStats {
  totalUsers: number;
  totalClients: number;
  totalArtisans: number;
  totalMissions: number;
  pendingMissions: number;
  completedMissions: number;
  totalRevenue: number;
  platformRevenue: number;
  activeUsers30d: number;
  newUsers7d: number;
}

export interface UserWithStats {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified: boolean;
  suspended: boolean;
  createdAt: string;
  lastLoginAt?: string;
  _count?: {
    missions: number;
    reviews: number;
  };
}

export const adminApi = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get('/admin/dashboard/stats');
    return response.data;
  },

  getUsers: async (filters?: {
    role?: string;
    suspended?: boolean;
    search?: string;
  }): Promise<UserWithStats[]> => {
    const response = await apiClient.get('/admin/users', { params: filters });
    return response.data;
  },

  suspendUser: async (userId: string, reason: string): Promise<void> => {
    await apiClient.post(`/admin/users/${userId}/suspend`, { reason });
  },

  unsuspendUser: async (userId: string): Promise<void> => {
    await apiClient.post(`/admin/users/${userId}/unsuspend`);
  },

  getUserDetails: async (userId: string): Promise<Record<string, unknown>> => {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return response.data;
  },

  getMissionStats: async (): Promise<Record<string, unknown>> => {
    const response = await apiClient.get('/admin/missions/stats');
    return response.data;
  },
};
