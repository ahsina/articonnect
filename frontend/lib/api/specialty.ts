import apiClient from './client';

export interface Specialty {
  id: string;
  name: string;
  category: string;
  description?: string;
  icon?: string;
  createdAt: string;
}

export interface CreateSpecialtyDto {
  name: string;
  category: string;
  description?: string;
  icon?: string;
}

export const specialtyApi = {
  getAll: async (category?: string): Promise<Specialty[]> => {
    const response = await apiClient.get('/specialties', {
      params: category ? { category } : undefined,
    });
    return response.data;
  },

  getById: async (id: string): Promise<Specialty> => {
    const response = await apiClient.get(`/specialties/${id}`);
    return response.data;
  },

  getCategories: async (): Promise<string[]> => {
    const response = await apiClient.get('/specialties/categories');
    return response.data;
  },

  create: async (data: CreateSpecialtyDto): Promise<Specialty> => {
    const response = await apiClient.post('/specialties', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateSpecialtyDto>): Promise<Specialty> => {
    const response = await apiClient.put(`/specialties/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/specialties/${id}`);
  },
};
