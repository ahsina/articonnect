import { companyApi } from '../company';
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

describe('companyApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new company', async () => {
      const createData = {
        companyName: 'Test Company',
        siret: '12345678901234',
        baseAddress: '123 Test Street',
        city: 'Paris',
        postalCode: '75001',
        country: 'FR',
        latitude: 48.8566,
        longitude: 2.3522,
      };
      const mockResponse = { id: 'company-1', ...createData };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await companyApi.create(createData);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/companies', createData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getAll', () => {
    it('should fetch all companies with pagination', async () => {
      const mockResponse = {
        data: [
          { id: 'company-1', companyName: 'Company A' },
          { id: 'company-2', companyName: 'Company B' },
        ],
        meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockResponse });

      const params = { page: 1, limit: 10, country: 'FR' };
      const result = await companyApi.getAll(params);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/companies', { params });
      expect(result).toEqual(mockResponse);
    });

    it('should fetch companies without params', async () => {
      const mockResponse = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await companyApi.getAll();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/companies', { params: undefined });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getMyCompany', () => {
    it('should fetch the current user company', async () => {
      const mockCompany = {
        id: 'company-1',
        companyName: 'My Company',
        siret: '12345678901234',
        totalMissions: 50,
        totalRevenue: 100000,
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockCompany });

      const result = await companyApi.getMyCompany();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/companies/my-company');
      expect(result).toEqual(mockCompany);
    });
  });

  describe('getById', () => {
    it('should fetch a company by ID', async () => {
      const mockCompany = {
        id: 'company-1',
        companyName: 'Specific Company',
        siret: '12345678901234',
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockCompany });

      const result = await companyApi.getById('company-1');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/companies/company-1');
      expect(result).toEqual(mockCompany);
    });
  });

  describe('update', () => {
    it('should update company information', async () => {
      const updateData = {
        companyName: 'Updated Company Name',
        description: 'New description',
        serviceRadius: 50,
      };
      const mockResponse = { id: 'company-1', ...updateData };

      mockedApiClient.put.mockResolvedValueOnce({ data: mockResponse });

      const result = await companyApi.update('company-1', updateData);

      expect(mockedApiClient.put).toHaveBeenCalledWith('/companies/company-1', updateData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateSettings', () => {
    it('should update company settings', async () => {
      const settingsData = {
        defaultCommissionRate: 15,
        autoAssignMissions: true,
        requireManagerApproval: false,
        payoutFrequency: 'WEEKLY',
      };
      const mockResponse = { id: 'settings-1', companyId: 'company-1', ...settingsData };

      mockedApiClient.put.mockResolvedValueOnce({ data: mockResponse });

      const result = await companyApi.updateSettings('company-1', settingsData);

      expect(mockedApiClient.put).toHaveBeenCalledWith(
        '/companies/company-1/settings',
        settingsData,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getStats', () => {
    it('should fetch company statistics', async () => {
      const mockStats = {
        totalMissions: 100,
        completedMissions: 95,
        activeMissions: 5,
        totalRevenue: 250000,
        averageRating: 4.7,
        totalReviews: 85,
        employeeCount: 12,
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockStats });

      const result = await companyApi.getStats('company-1');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/companies/company-1/stats');
      expect(result).toEqual(mockStats);
    });
  });

  describe('delete', () => {
    it('should delete a company', async () => {
      const mockResponse = { message: 'Company deleted successfully' };

      mockedApiClient.delete.mockResolvedValueOnce({ data: mockResponse });

      const result = await companyApi.delete('company-1');

      expect(mockedApiClient.delete).toHaveBeenCalledWith('/companies/company-1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('uploadLogo', () => {
    it('should upload a company logo', async () => {
      const mockFile = new File(['test'], 'logo.png', { type: 'image/png' });
      const mockResponse = { url: 'https://storage.example.com/logos/company-1.png' };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await companyApi.uploadLogo('company-1', mockFile);

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/companies/company-1/logo',
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error handling', () => {
    it('should propagate errors from the API', async () => {
      const error = new Error('Network error');
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(companyApi.getMyCompany()).rejects.toThrow('Network error');
    });

    it('should handle 404 errors', async () => {
      const error = { response: { status: 404, data: { message: 'Company not found' } } };
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(companyApi.getById('non-existent')).rejects.toEqual(error);
    });
  });
});
