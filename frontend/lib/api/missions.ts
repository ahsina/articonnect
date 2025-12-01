import apiClient from './client';

export const missionsApi = {
  getAll: async () => {
    const response = await apiClient.get('/missions');
    return response.data;
  },

  getOne: async (id: string) => {
    const response = await apiClient.get(`/missions/${id}`);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/missions/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>) => {
    const response = await apiClient.post('/missions', data);
    return response.data;
  },

  cancel: async (id: string) => {
    const response = await apiClient.post(`/missions/${id}/cancel`);
    return response.data;
  },

  complete: async (id: string) => {
    const response = await apiClient.post(`/missions/${id}/complete`);
    return response.data;
  },

  validate: async (id: string, rating?: number) => {
    const response = await apiClient.post(`/missions/${id}/validate`, { rating });
    return response.data;
  },

  dispute: async (id: string, reason: string) => {
    const response = await apiClient.post(`/missions/${id}/dispute`, { reason });
    return response.data;
  },

  getNearby: async (lat: number, lng: number, radius?: number) => {
    const response = await apiClient.get('/missions/nearby', {
      params: { lat, lng, radius },
    });
    return response.data;
  },

  accept: async (id: string) => {
    const response = await apiClient.post(`/missions/${id}/accept`);
    return response.data;
  },

  updateStatus: async (id: string, status: string) => {
    const response = await apiClient.put(`/missions/${id}/status`, { status });
    return response.data;
  },

  createNegotiation: async (missionId: string, data: Record<string, unknown>) => {
    const response = await apiClient.post(`/missions/${missionId}/negotiations`, data);
    return response.data;
  },

  getNegotiations: async (missionId: string) => {
    const response = await apiClient.get(`/missions/${missionId}/negotiations`);
    return response.data;
  },

  acceptNegotiation: async (negotiationId: string, accepted: boolean, rejectedReason?: string) => {
    const response = await apiClient.put(`/missions/negotiations/${negotiationId}/accept`, {
      accepted,
      rejectedReason,
    });
    return response.data;
  },

  // Photo Upload
  uploadPhoto: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/uploads/mission-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  addBeforePhotos: async (missionId: string, photoUrls: string[]) => {
    const response = await apiClient.post(`/missions/${missionId}/photos`, {
      beforePhotos: photoUrls,
    });
    return response.data;
  },

  addAfterPhotos: async (missionId: string, photoUrls: string[]) => {
    const response = await apiClient.post(`/missions/${missionId}/photos`, {
      afterPhotos: photoUrls,
    });
    return response.data;
  },
};
