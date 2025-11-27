import { artisanApi } from '../artisan';
import apiClient from '../client';

// Mock the apiClient
jest.mock('../client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('artisanApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyProfile', () => {
    it('should fetch the artisan profile', async () => {
      const mockProfile = {
        id: 'artisan-1',
        companyName: 'Test Company',
        siret: '12345678901234',
        rating: 4.5,
        reviewCount: 10,
        missionCount: 25,
        available: true,
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockProfile });

      const result = await artisanApi.getMyProfile();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/artisan/profile');
      expect(result).toEqual(mockProfile);
    });
  });

  describe('updateProfile', () => {
    it('should update the artisan profile', async () => {
      const updateData = {
        companyName: 'Updated Company',
        description: 'New description',
        serviceRadius: 30,
      };
      const mockResponse = { id: 'artisan-1', ...updateData };

      mockedApiClient.put.mockResolvedValueOnce({ data: mockResponse });

      const result = await artisanApi.updateProfile(updateData);

      expect(mockedApiClient.put).toHaveBeenCalledWith('/artisan/profile', updateData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Stripe Connect', () => {
    it('should get Stripe onboarding status', async () => {
      const mockStatus = {
        onboarded: true,
        accountId: 'acct_123',
        chargesEnabled: true,
        payoutsEnabled: true,
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockStatus });

      const result = await artisanApi.getStripeOnboardingStatus();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/artisan/stripe/status');
      expect(result).toEqual(mockStatus);
    });

    it('should create Stripe onboarding link', async () => {
      const mockResponse = { url: 'https://connect.stripe.com/setup/...' };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await artisanApi.createStripeOnboardingLink();

      expect(mockedApiClient.post).toHaveBeenCalledWith('/artisan/stripe/onboarding');
      expect(result).toEqual(mockResponse);
    });

    it('should refresh Stripe onboarding link', async () => {
      const mockResponse = { url: 'https://connect.stripe.com/setup/refresh...' };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await artisanApi.refreshStripeOnboardingLink();

      expect(mockedApiClient.post).toHaveBeenCalledWith('/artisan/stripe/refresh');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Earnings', () => {
    it('should fetch earnings with pagination', async () => {
      const mockEarnings = {
        data: [
          {
            id: 'earning-1',
            missionId: 'mission-1',
            missionTitle: 'Test Mission',
            grossAmount: 500,
            platformFee: 50,
            netAmount: 450,
            status: 'PAID',
          },
        ],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockEarnings });

      const params = { page: 1, limit: 10, status: 'PAID' };
      const result = await artisanApi.getEarnings(params);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/artisan/earnings', { params });
      expect(result).toEqual(mockEarnings);
    });

    it('should fetch earnings summary', async () => {
      const mockSummary = {
        totalEarnings: 5000,
        pendingEarnings: 500,
        paidEarnings: 4500,
        totalMissions: 20,
        averagePerMission: 250,
        thisMonthEarnings: 1000,
        lastMonthEarnings: 800,
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockSummary });

      const result = await artisanApi.getEarningsSummary();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/artisan/earnings/summary');
      expect(result).toEqual(mockSummary);
    });
  });

  describe('Certifications', () => {
    it('should fetch certifications', async () => {
      const mockCertifications = [
        { id: 'cert-1', name: 'Electrician License', issuer: 'State Board' },
        { id: 'cert-2', name: 'Safety Training', issuer: 'OSHA' },
      ];

      mockedApiClient.get.mockResolvedValueOnce({ data: mockCertifications });

      const result = await artisanApi.getCertifications();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/artisan/certifications');
      expect(result).toEqual(mockCertifications);
    });

    it('should add a certification', async () => {
      const certData = {
        name: 'New Certification',
        issuer: 'Certification Board',
        issueDate: '2024-01-01',
      };
      const mockResponse = { id: 'cert-3', ...certData, verified: false };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await artisanApi.addCertification(certData);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/artisan/certifications', certData);
      expect(result).toEqual(mockResponse);
    });

    it('should update a certification', async () => {
      const updateData = { name: 'Updated Certification' };
      const mockResponse = { id: 'cert-1', ...updateData };

      mockedApiClient.put.mockResolvedValueOnce({ data: mockResponse });

      const result = await artisanApi.updateCertification('cert-1', updateData);

      expect(mockedApiClient.put).toHaveBeenCalledWith(
        '/artisan/certifications/cert-1',
        updateData,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should delete a certification', async () => {
      const mockResponse = { message: 'Certification deleted' };

      mockedApiClient.delete.mockResolvedValueOnce({ data: mockResponse });

      const result = await artisanApi.deleteCertification('cert-1');

      expect(mockedApiClient.delete).toHaveBeenCalledWith('/artisan/certifications/cert-1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Working Hours', () => {
    it('should fetch working hours', async () => {
      const mockWorkingHours = [
        { id: 'wh-1', dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isEnabled: true },
        { id: 'wh-2', dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isEnabled: true },
      ];

      mockedApiClient.get.mockResolvedValueOnce({ data: mockWorkingHours });

      const result = await artisanApi.getWorkingHours();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/artisan/working-hours');
      expect(result).toEqual(mockWorkingHours);
    });

    it('should set working hours', async () => {
      const workingHoursData = [
        { dayOfWeek: 1, startTime: '08:00', endTime: '18:00', isEnabled: true },
      ];
      const mockResponse = [{ id: 'wh-1', ...workingHoursData[0] }];

      mockedApiClient.put.mockResolvedValueOnce({ data: mockResponse });

      const result = await artisanApi.setWorkingHours(workingHoursData);

      expect(mockedApiClient.put).toHaveBeenCalledWith('/artisan/working-hours', {
        workingHours: workingHoursData,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Availability Slots', () => {
    it('should fetch availability slots', async () => {
      const mockSlots = [
        {
          id: 'slot-1',
          date: '2024-01-15',
          startTime: '09:00',
          endTime: '12:00',
          isAvailable: true,
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({ data: mockSlots });

      const params = { startDate: '2024-01-01', endDate: '2024-01-31' };
      const result = await artisanApi.getAvailabilitySlots(params);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/artisan/availability', { params });
      expect(result).toEqual(mockSlots);
    });

    it('should create an availability slot', async () => {
      const slotData = {
        date: '2024-01-20',
        startTime: '14:00',
        endTime: '18:00',
        isAvailable: true,
      };
      const mockResponse = { id: 'slot-2', ...slotData };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await artisanApi.createAvailabilitySlot(slotData);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/artisan/availability', slotData);
      expect(result).toEqual(mockResponse);
    });

    it('should update an availability slot', async () => {
      const updateData = { isAvailable: false };
      const mockResponse = { id: 'slot-1', ...updateData };

      mockedApiClient.put.mockResolvedValueOnce({ data: mockResponse });

      const result = await artisanApi.updateAvailabilitySlot('slot-1', updateData);

      expect(mockedApiClient.put).toHaveBeenCalledWith('/artisan/availability/slot-1', updateData);
      expect(result).toEqual(mockResponse);
    });

    it('should delete an availability slot', async () => {
      const mockResponse = { message: 'Slot deleted' };

      mockedApiClient.delete.mockResolvedValueOnce({ data: mockResponse });

      const result = await artisanApi.deleteAvailabilitySlot('slot-1');

      expect(mockedApiClient.delete).toHaveBeenCalledWith('/artisan/availability/slot-1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Time Off', () => {
    it('should fetch time offs', async () => {
      const mockTimeOffs = [
        {
          id: 'to-1',
          startDate: '2024-02-01',
          endDate: '2024-02-07',
          reason: 'Vacation',
          status: 'APPROVED',
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({ data: mockTimeOffs });

      const result = await artisanApi.getTimeOffs();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/artisan/time-off');
      expect(result).toEqual(mockTimeOffs);
    });

    it('should request time off', async () => {
      const timeOffData = {
        startDate: '2024-03-01',
        endDate: '2024-03-05',
        reason: 'Personal',
      };
      const mockResponse = { id: 'to-2', ...timeOffData, status: 'PENDING' };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await artisanApi.requestTimeOff(timeOffData);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/artisan/time-off', timeOffData);
      expect(result).toEqual(mockResponse);
    });

    it('should cancel time off', async () => {
      const mockResponse = { message: 'Time off cancelled' };

      mockedApiClient.delete.mockResolvedValueOnce({ data: mockResponse });

      const result = await artisanApi.cancelTimeOff('to-1');

      expect(mockedApiClient.delete).toHaveBeenCalledWith('/artisan/time-off/to-1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Reviews', () => {
    it('should fetch reviews', async () => {
      const mockReviews = {
        data: [
          {
            id: 'review-1',
            rating: 5,
            comment: 'Excellent work!',
            reviewer: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
          },
        ],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockReviews });

      const result = await artisanApi.getMyReviews({ page: 1, limit: 10 });

      expect(mockedApiClient.get).toHaveBeenCalledWith('/artisan/reviews', {
        params: { page: 1, limit: 10 },
      });
      expect(result).toEqual(mockReviews);
    });

    it('should respond to a review', async () => {
      const mockResponse = {
        id: 'response-1',
        content: 'Thank you for your feedback!',
        createdAt: '2024-01-15T10:00:00Z',
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await artisanApi.respondToReview('review-1', 'Thank you for your feedback!');

      expect(mockedApiClient.post).toHaveBeenCalledWith('/artisan/reviews/review-1/respond', {
        content: 'Thank you for your feedback!',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Location', () => {
    it('should update location', async () => {
      const mockResponse = { success: true };

      mockedApiClient.put.mockResolvedValueOnce({ data: mockResponse });

      const result = await artisanApi.updateLocation(48.8566, 2.3522);

      expect(mockedApiClient.put).toHaveBeenCalledWith('/artisan/location', {
        latitude: 48.8566,
        longitude: 2.3522,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Availability Toggle', () => {
    it('should toggle availability', async () => {
      const mockResponse = { available: false };

      mockedApiClient.put.mockResolvedValueOnce({ data: mockResponse });

      const result = await artisanApi.toggleAvailability(false);

      expect(mockedApiClient.put).toHaveBeenCalledWith('/artisan/availability/toggle', {
        available: false,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Dashboard Stats', () => {
    it('should fetch dashboard stats', async () => {
      const mockStats = {
        totalMissions: 50,
        completedMissions: 45,
        activeMissions: 5,
        pendingMissions: 2,
        totalEarnings: 10000,
        pendingEarnings: 500,
        averageRating: 4.8,
        totalReviews: 40,
        recentMissions: [],
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockStats });

      const result = await artisanApi.getDashboardStats();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/artisan/dashboard');
      expect(result).toEqual(mockStats);
    });
  });

  describe('Quotations', () => {
    it('should fetch quotations', async () => {
      const mockQuotations = {
        data: [{ id: 'quote-1', amount: 500, status: 'PENDING' }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockQuotations });

      const result = await artisanApi.getQuotations({ page: 1, status: 'PENDING' });

      expect(mockedApiClient.get).toHaveBeenCalledWith('/artisan/quotations', {
        params: { page: 1, status: 'PENDING' },
      });
      expect(result).toEqual(mockQuotations);
    });

    it('should create a quotation', async () => {
      const quotationData = {
        amount: 750,
        description: 'Plumbing repair',
        validUntil: '2024-02-01',
      };
      const mockResponse = { id: 'quote-2', ...quotationData, status: 'PENDING' };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await artisanApi.createQuotation('mission-1', quotationData);

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/missions/mission-1/quotation',
        quotationData,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Notification Preferences', () => {
    it('should fetch notification preferences', async () => {
      const mockPreferences = {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        newMissionAlerts: true,
        missionUpdates: true,
        paymentNotifications: true,
        reviewNotifications: true,
        marketingEmails: false,
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockPreferences });

      const result = await artisanApi.getNotificationPreferences();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/artisan/notification-preferences');
      expect(result).toEqual(mockPreferences);
    });

    it('should update notification preferences', async () => {
      const updateData = { emailNotifications: false, smsNotifications: true };
      const mockResponse = { ...updateData };

      mockedApiClient.put.mockResolvedValueOnce({ data: mockResponse });

      const result = await artisanApi.updateNotificationPreferences(updateData);

      expect(mockedApiClient.put).toHaveBeenCalledWith(
        '/artisan/notification-preferences',
        updateData,
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
