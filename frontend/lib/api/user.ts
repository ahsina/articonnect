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
};
