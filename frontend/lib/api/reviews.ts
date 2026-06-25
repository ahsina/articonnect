import apiClient from './client';

export interface Review {
  id: string;
  missionId: string;
  artisanId: string;
  clientId: string;
  rating: number;
  comment: string;
  createdAt: string;
  artisan?: {
    firstName: string;
    lastName: string;
  };
  client?: {
    firstName: string;
    lastName: string;
  };
}

export interface CreateReviewDto {
  missionId: string;
  rating: number;
  comment: string;
}

export const reviewsApi = {
  create: async (data: CreateReviewDto): Promise<Review> => {
    const response = await apiClient.post('/reviews', data);
    return response.data;
  },

  getByArtisan: async (artisanId: string): Promise<Review[]> => {
    const response = await apiClient.get(`/reviews/artisan/${artisanId}`);
    return response.data;
  },

  getByMission: async (missionId: string): Promise<Review | null> => {
    const response = await apiClient.get(`/reviews/mission/${missionId}`);
    return response.data;
  },

  getMyReviews: async (): Promise<Review[]> => {
    const response = await apiClient.get('/artisan/reviews');
    return response.data;
  },
};
