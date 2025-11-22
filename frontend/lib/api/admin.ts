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

export interface BusinessMetrics {
  revenue: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    growth: number;
  };
  missions: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    completionRate: number;
    averageValue: number;
  };
  users: {
    total: number;
    clients: number;
    artisans: number;
    newToday: number;
    newThisWeek: number;
    activeUsers: number;
  };
  payments: {
    successRate: number;
    totalTransactions: number;
    averageTransaction: number;
    failedTransactions: number;
  };
  disputes: {
    total: number;
    pending: number;
    resolved: number;
    resolutionRate: number;
    averageResolutionTime: number;
  };
  noShows: {
    total: number;
    validated: number;
    rejected: number;
    pending: number;
    validationRate: number;
  };
}

export interface TimeSeriesData {
  date: string;
  revenue: number;
  missions: number;
  newUsers: number;
}

export interface TopArtisan {
  id: string;
  name: string;
  completedMissions: number;
  rating: number;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedType: string;
  reportedId: string;
  reason: string;
  description: string;
  status: string;
  createdAt: string;
  reporter: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export const adminApi = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get('/admin/dashboard/stats');
    return response.data;
  },

  // Analytics
  getBusinessMetrics: async (): Promise<BusinessMetrics> => {
    const response = await apiClient.get('/admin/analytics/metrics');
    return response.data.data;
  },

  getTimeSeriesData: async (days: number = 30): Promise<TimeSeriesData[]> => {
    const response = await apiClient.get('/admin/analytics/time-series', {
      params: { days },
    });
    return response.data.data;
  },

  getTopArtisans: async (limit: number = 10): Promise<TopArtisan[]> => {
    const response = await apiClient.get('/admin/analytics/top-artisans', {
      params: { limit },
    });
    return response.data.data;
  },

  // Users
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

  // Moderation
  getReports: async (filters?: {
    status?: string;
    type?: string;
  }): Promise<Report[]> => {
    const response = await apiClient.get('/admin/moderation/reports', {
      params: filters,
    });
    return response.data;
  },

  resolveReport: async (
    reportId: string,
    action: string,
    resolution: string,
  ): Promise<void> => {
    await apiClient.post(`/admin/moderation/reports/${reportId}/resolve`, {
      action,
      resolution,
    });
  },

  deleteReport: async (reportId: string): Promise<void> => {
    await apiClient.delete(`/admin/moderation/reports/${reportId}`);
  },
};
