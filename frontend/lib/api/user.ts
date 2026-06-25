import apiClient from './client';

export interface CreateArtisanProfileDto {
  companyName: string;
  siret: string;
  description?: string;
  baseAddress: string;
  latitude: number;
  longitude: number;
  serviceRadius?: number;
  hourlyRate?: number;
  specialtyIds?: string[];
}

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
}

export interface UpdateClientProfileDto {
  clientType?: 'INDIVIDUAL' | 'PROFESSIONAL';
  companyName?: string;
  siret?: string;
  vatNumber?: string;
  industry?: string;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  missionUpdates: boolean;
  paymentNotifications: boolean;
  reviewNotifications: boolean;
  marketingEmails: boolean;
}

export interface UpdateNotificationPreferencesDto {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  missionUpdates?: boolean;
  paymentNotifications?: boolean;
  reviewNotifications?: boolean;
  marketingEmails?: boolean;
}

export const userApi = {
  getProfile: async () => {
    const response = await apiClient.get('/users/profile');
    return response.data;
  },

  updateProfile: async (data: UpdateProfileDto) => {
    const response = await apiClient.put('/users/profile', data);
    return response.data;
  },

  createArtisanProfile: async (data: CreateArtisanProfileDto) => {
    const response = await apiClient.post('/users/artisan-profile', data);
    return response.data;
  },

  getArtisans: async (filters?: {
    specialty?: string;
    city?: string;
    lat?: number;
    lng?: number;
    radius?: number;
  }) => {
    const response = await apiClient.get('/users/artisans', { params: filters });
    return response.data;
  },

  getArtisanById: async (id: string) => {
    const response = await apiClient.get(`/users/artisans/${id}`);
    return response.data;
  },

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Client Profile (B2B support)
  getClientProfile: async () => {
    const response = await apiClient.get('/users/client-profile');
    return response.data;
  },

  updateClientProfile: async (data: UpdateClientProfileDto) => {
    const response = await apiClient.put('/users/client-profile', data);
    return response.data;
  },

  // Notification Preferences
  getNotificationPreferences: async (): Promise<NotificationPreferences> => {
    const response = await apiClient.get('/notifications/preferences');
    return response.data;
  },

  updateNotificationPreferences: async (data: UpdateNotificationPreferencesDto) => {
    const response = await apiClient.put('/notifications/preferences', data);
    return response.data;
  },

  // Notifications
  getNotifications: async (params?: { page?: number; limit?: number; unreadOnly?: boolean }) => {
    const response = await apiClient.get('/notifications', { params });
    return response.data;
  },

  markNotificationAsRead: async (id: string) => {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllNotificationsAsRead: async () => {
    const response = await apiClient.patch('/notifications/mark-all-read');
    return response.data;
  },

  getUnreadNotificationCount: async (): Promise<{ count: number }> => {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
  },

  // Disputes
  getDisputes: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await apiClient.get('/disputes', { params });
    return response.data;
  },

  createDispute: async (data: {
    missionId: string;
    reason: string;
    description: string;
  }) => {
    const response = await apiClient.post('/disputes', data);
    return response.data;
  },

  getDisputeById: async (id: string) => {
    const response = await apiClient.get(`/disputes/${id}`);
    return response.data;
  },

  cancelDispute: async (id: string) => {
    const response = await apiClient.post(`/disputes/${id}/cancel`);
    return response.data;
  },
};
