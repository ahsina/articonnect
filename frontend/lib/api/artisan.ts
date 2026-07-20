import apiClient from './client';

// Types
export interface ArtisanProfile {
  id: string;
  userId: string;
  companyId?: string;
  companyName: string;
  siret: string;
  vatNumber?: string;
  description?: string;
  website?: string;
  specialties: Specialty[];
  serviceRadius: number;
  baseAddress: string;
  latitude: number;
  longitude: number;
  hourlyRate?: number;
  emergencyRate?: number;
  insurance?: string;
  certifications: Certification[];
  stripeAccountId?: string;
  stripeOnboarded: boolean;
  businessVerified: boolean;
  businessVerifiedAt?: string;
  businessVerificationStatus: string;
  businessCountry?: string;
  rating: number;
  reviewCount: number;
  missionCount: number;
  available: boolean;
  currentLat?: number;
  currentLng?: number;
  lastLocationUpdate?: string;
  workingHours: WorkingHours[];
  availabilitySlots: AvailabilitySlot[];
  timeOffs: TimeOff[];
  createdAt: string;
  updatedAt: string;
}

export interface Specialty {
  id: string;
  name: string;
  category: string;
  description?: string;
  icon?: string;
}

export interface Certification {
  id: string;
  artisanId: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  document?: string;
  verified: boolean;
  createdAt: string;
}

export interface WorkingHours {
  id: string;
  artisanId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm
  endTime: string;
  isEnabled: boolean;
}

export interface AvailabilitySlot {
  id: string;
  artisanId: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  notes?: string;
}

export interface TimeOff {
  id: string;
  artisanId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export interface ArtisanEarning {
  id: string;
  artisanId: string;
  missionId: string;
  missionTitle: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED';
  payoutDate?: string;
  stripePayoutId?: string;
  createdAt: string;
}

export interface EarningsSummary {
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  totalMissions: number;
  averagePerMission: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
}

export interface StripeOnboardingStatus {
  onboarded: boolean;
  accountId: string | null;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
}

// Analytics artisan — forme renvoyée par GET /artisan/analytics (données réelles DB).
export interface ArtisanAnalytics {
  earnings: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
    byMonth: Array<{ month: string; amount: number; missions?: number }>;
  };
  missions: {
    total: number;
    completed: number;
    cancelled: number;
    conversionRate: number;
    byCategory: Array<{ category: string; count: number }>;
    byStatus: Array<{ status: string; count: number }>;
  };
  performance: {
    averageRating: number;
    totalReviews: number;
    responseTime: number;
    completionRate: number;
    repeatClientRate: number;
  };
  geography: {
    topCities: Array<{ city: string; count: number; revenue: number }>;
    averageDistance: number;
  };
  trends: {
    peakHours: Array<{ hour: number; requests: number }>;
    peakDays: Array<{ day: string; requests: number }>;
  };
}

export interface UpdateArtisanProfileDto {
  companyName?: string;
  description?: string;
  website?: string;
  serviceRadius?: number;
  baseAddress?: string;
  latitude?: number;
  longitude?: number;
  hourlyRate?: number;
  emergencyRate?: number;
  specialtyIds?: string[];
  available?: boolean;
}

export interface CreateCertificationDto {
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  document?: string;
}

export interface SetWorkingHoursDto {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
}

export interface CreateAvailabilitySlotDto {
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  notes?: string;
}

export interface CreateTimeOffDto {
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface Review {
  id: string;
  missionId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
  response?: {
    id: string;
    content: string;
    createdAt: string;
  };
  reviewer: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  mission: {
    id: string;
    title: string;
  };
  createdAt: string;
}

export const artisanApi = {
  // Profile
  getMyProfile: async (): Promise<ArtisanProfile> => {
    const response = await apiClient.get('/artisan/profile');
    return response.data;
  },

  updateProfile: async (data: UpdateArtisanProfileDto): Promise<ArtisanProfile> => {
    const response = await apiClient.put('/artisan/profile', data);
    return response.data;
  },

  // Stripe Connect
  getStripeOnboardingStatus: async (): Promise<StripeOnboardingStatus> => {
    const response = await apiClient.get('/artisan/stripe/status');
    return response.data;
  },

  createStripeOnboardingLink: async (): Promise<{ url: string }> => {
    const response = await apiClient.post('/artisan/stripe/onboarding');
    return response.data;
  },

  refreshStripeOnboardingLink: async (): Promise<{ url: string }> => {
    const response = await apiClient.post('/artisan/stripe/refresh');
    return response.data;
  },

  // Earnings
  getEarnings: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    data: ArtisanEarning[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> => {
    const response = await apiClient.get('/artisan/earnings', { params });
    return response.data;
  },

  getEarningsSummary: async (): Promise<EarningsSummary> => {
    const response = await apiClient.get('/artisan/earnings/summary');
    return response.data;
  },

  // Analytics (données réelles calculées côté backend à partir des missions/avis/offres)
  getAnalytics: async (): Promise<ArtisanAnalytics> => {
    const response = await apiClient.get('/artisan/analytics');
    return response.data;
  },

  // Certifications
  getCertifications: async (): Promise<Certification[]> => {
    const response = await apiClient.get('/artisan/certifications');
    return response.data;
  },

  addCertification: async (data: CreateCertificationDto): Promise<Certification> => {
    const response = await apiClient.post('/artisan/certifications', data);
    return response.data;
  },

  updateCertification: async (
    id: string,
    data: Partial<CreateCertificationDto>,
  ): Promise<Certification> => {
    const response = await apiClient.put(`/artisan/certifications/${id}`, data);
    return response.data;
  },

  deleteCertification: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/artisan/certifications/${id}`);
    return response.data;
  },

  uploadCertificationDocument: async (id: string, file: File): Promise<{ url: string }> => {
    // Upload direct (multipart) → stockage S3/MinIO → attache l'URL au certif
    const fd = new FormData();
    fd.append('file', file);
    fd.append('fileType', 'certification');
    const { data } = await apiClient.post('/upload/file', fd);
    const url = data?.url || '';
    await apiClient.post(`/certifications/${id}/document`, { document: url });
    return { url };
  },

  // Working Hours
  getWorkingHours: async (): Promise<WorkingHours[]> => {
    const response = await apiClient.get('/artisan/working-hours');
    return response.data;
  },

  setWorkingHours: async (data: SetWorkingHoursDto[]): Promise<WorkingHours[]> => {
    const response = await apiClient.put('/artisan/working-hours', { workingHours: data });
    return response.data;
  },

  // Availability Slots
  getAvailabilitySlots: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<AvailabilitySlot[]> => {
    const response = await apiClient.get('/artisan/availability', { params });
    return response.data;
  },

  createAvailabilitySlot: async (data: CreateAvailabilitySlotDto): Promise<AvailabilitySlot> => {
    const response = await apiClient.post('/artisan/availability', data);
    return response.data;
  },

  updateAvailabilitySlot: async (
    id: string,
    data: Partial<CreateAvailabilitySlotDto>,
  ): Promise<AvailabilitySlot> => {
    // Pas de route PUT dédiée : on remplace le créneau (supprime + recrée)
    await apiClient.delete(`/artisan/availability/${id}`);
    const response = await apiClient.post('/artisan/availability', data);
    return response.data;
  },

  deleteAvailabilitySlot: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/artisan/availability/${id}`);
    return response.data;
  },

  // Time Off
  getTimeOffs: async (): Promise<TimeOff[]> => {
    const response = await apiClient.get('/artisan/time-off');
    return response.data;
  },

  requestTimeOff: async (data: CreateTimeOffDto): Promise<TimeOff> => {
    const response = await apiClient.post('/artisan/time-off', data);
    return response.data;
  },

  cancelTimeOff: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/artisan/time-off/${id}`);
    return response.data;
  },

  // Reviews
  getMyReviews: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<{
    data: Review[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> => {
    const response = await apiClient.get('/artisan/reviews', { params });
    return response.data;
  },

  respondToReview: async (
    reviewId: string,
    content: string,
  ): Promise<{ id: string; content: string; createdAt: string }> => {
    const response = await apiClient.post(`/review-responses/${reviewId}`, { response: content });
    return response.data;
  },

  // Location
  updateLocation: async (lat: number, lng: number): Promise<{ success: boolean }> => {
    const response = await apiClient.put('/artisan/location', { latitude: lat, longitude: lng });
    return response.data;
  },

  // Availability toggle
  toggleAvailability: async (available: boolean): Promise<{ available: boolean }> => {
    const response = await apiClient.put('/artisan/availability/toggle', { available });
    return response.data;
  },

  // Dashboard stats
  getDashboardStats: async (): Promise<{
    totalMissions: number;
    completedMissions: number;
    activeMissions: number;
    pendingMissions: number;
    totalEarnings: number;
    pendingEarnings: number;
    averageRating: number;
    totalReviews: number;
    recentMissions: any[];
  }> => {
    const response = await apiClient.get('/artisan/dashboard');
    return response.data;
  },

  // Quotations
  getQuotations: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<any> => {
    const response = await apiClient.get('/artisan/quotations', { params });
    return response.data;
  },

  createQuotation: async (
    missionId: string,
    data: {
      amount: number;
      description: string;
      validUntil: string;
      items?: { description: string; quantity: number; unitPrice: number }[];
    },
  ): Promise<any> => {
    // Une "quotation" sur une mission = une offre de négociation (proposition de prix)
    const response = await apiClient.post(`/missions/${missionId}/negotiations`, {
      missionId,
      proposedPrice: data.amount,
      message: data.description,
    });
    return response.data;
  },

  // Notification preferences
  getNotificationPreferences: async (): Promise<{
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    newMissionAlerts: boolean;
    missionUpdates: boolean;
    paymentNotifications: boolean;
    reviewNotifications: boolean;
    marketingEmails: boolean;
  }> => {
    const response = await apiClient.get('/artisan/notification-preferences');
    return response.data;
  },

  updateNotificationPreferences: async (data: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    smsNotifications?: boolean;
    newMissionAlerts?: boolean;
    missionUpdates?: boolean;
    paymentNotifications?: boolean;
    reviewNotifications?: boolean;
    marketingEmails?: boolean;
  }): Promise<any> => {
    const response = await apiClient.put('/artisan/notification-preferences', data);
    return response.data;
  },

  // Favorites (for clients)
  getFavorites: async (): Promise<any[]> => {
    const response = await apiClient.get('/favorites/artisans');
    return response.data;
  },

  addFavorite: async (artisanId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post(`/favorites/artisans/${artisanId}`);
    return response.data;
  },

  removeFavorite: async (artisanId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete(`/favorites/artisans/${artisanId}`);
    return response.data;
  },

  checkFavorite: async (artisanId: string): Promise<{ isFavorite: boolean }> => {
    const response = await apiClient.get(`/favorites/artisans/${artisanId}/check`);
    return response.data;
  },
};
