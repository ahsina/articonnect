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

  cancel: async (id: string, reason?: string) => {
    const response = await apiClient.post(`/missions/${id}/cancel`, { reason });
    return response.data;
  },

  getCancellationFees: async (id: string) => {
    const response = await apiClient.get(`/missions/${id}/cancellation-fees`);
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

  dispute: async (id: string, reason: string, description?: string) => {
    const response = await apiClient.post('/disputes', {
      missionId: id,
      reason,
      description: description || reason,
    });
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

  startTravel: async (id: string) => {
    const response = await apiClient.post(`/missions/${id}/start-travel`);
    return response.data;
  },

  // Étape « arrivé sur place » (IN_TRANSIT -> IN_PROGRESS) : pose arrivedAt et notifie le client.
  arrive: async (id: string) => {
    const response = await apiClient.post(`/missions/${id}/arrive`);
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

  // Vue agrégée "Mes offres" (artisan) : offres envoyées + statut dérivé + résumé mission + stats.
  getMyOffers: async () => {
    const response = await apiClient.get('/missions/negotiations/mine');
    return response.data;
  },

  acceptNegotiation: async (negotiationId: string, accepted: boolean, rejectedReason?: string) => {
    const response = await apiClient.put(`/missions/negotiations/${negotiationId}/accept`, {
      accepted,
      rejectedReason,
    });
    return response.data;
  },

  // Photo Upload — upload direct (multipart) vers le backend qui stocke dans S3/MinIO
  uploadPhoto: async (file: File): Promise<{ url: string }> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('fileType', 'mission-photo');
    const response = await apiClient.post('/upload/file', fd);
    return response.data;
  },

  addBeforePhotos: async (missionId: string, photoUrls: string[]) => {
    const response = await apiClient.post(`/missions/${missionId}/photos`, {
      photos: photoUrls,
      type: 'before',
    });
    return response.data;
  },

  addAfterPhotos: async (missionId: string, photoUrls: string[]) => {
    const response = await apiClient.post(`/missions/${missionId}/photos`, {
      photos: photoUrls,
      type: 'after',
    });
    return response.data;
  },
};
