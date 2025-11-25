import { Test, TestingModule } from '@nestjs/testing';
import { KboVerificationService } from './kbo-verification.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('KboVerificationService', () => {
  let service: KboVerificationService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        KBO_API_URL: 'https://kbopub.economie.fgov.be/kbopub/api/v1',
      };
      return config[key];
    }),
  };

  const mockKboResponse = {
    data: {
      Status: 'AC',
      Denomination: [
        { Language: 'FR', Value: 'Entreprise Test SPRL' },
        { Language: 'NL', Value: 'Test Onderneming BVBA' },
      ],
      JuridicalForm: 'SPRL',
      StartDate: '2020-01-01',
      Address: [
        {
          Type: 'REGO',
          Street: 'Rue de la Loi',
          HouseNumber: '123',
          Zipcode: '1000',
          Municipality: 'Bruxelles',
        },
      ],
      Activity: [{ NaceCode: '43210' }],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KboVerificationService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<KboVerificationService>(KboVerificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateKboFormat', () => {
    it('should validate correct 10-digit KBO with valid checksum', () => {
      // KBO with valid modulo 97 checksum: 0123456749
      expect(service.validateKboFormat('0123456749')).toBe(true);
    });

    it('should handle KBO with dots', () => {
      expect(service.validateKboFormat('0123.456.749')).toBe(true);
    });

    it('should handle KBO with spaces', () => {
      expect(service.validateKboFormat('0123 456 749')).toBe(true);
    });

    it('should reject KBO with wrong length', () => {
      expect(service.validateKboFormat('012345678')).toBe(false); // 9 digits
      expect(service.validateKboFormat('01234567890')).toBe(false); // 11 digits
    });

    it('should reject KBO with invalid checksum', () => {
      expect(service.validateKboFormat('0123456700')).toBe(false);
    });

    it('should reject non-numeric KBO', () => {
      expect(service.validateKboFormat('012345678A')).toBe(false);
    });
  });

  describe('formatKboNumber', () => {
    it('should format KBO with dots', () => {
      expect(service.formatKboNumber('0123456789')).toBe('0123.456.789');
    });

    it('should handle already formatted KBO', () => {
      expect(service.formatKboNumber('0123.456.789')).toBe('0123.456.789');
    });
  });

  describe('verifyKbo', () => {
    it('should return error for invalid format', async () => {
      const result = await service.verifyKbo('invalid');

      expect(result.verified).toBe(false);
      expect(result.errors).toContain(
        'Format KBO invalide (doit contenir 10 chiffres avec checksum valide)',
      );
    });

    it('should verify KBO with Belgian API', async () => {
      mockedAxios.get.mockResolvedValue(mockKboResponse);

      const result = await service.verifyKbo('0123456749', 'Entreprise Test');

      expect(result.verified).toBe(true);
      expect(result.companyName).toBe('Entreprise Test SPRL');
      expect(result.isActive).toBe(true);
      expect(result.legalForm).toBe('SPRL');
    });

    it('should verify company name match', async () => {
      mockedAxios.get.mockResolvedValue(mockKboResponse);

      const result = await service.verifyKbo('0123456749', 'Wrong Company');

      expect(result.verified).toBe(false);
      expect(result.warnings).toContain(
        'Le nom de l\'entreprise ne correspond pas exactement',
      );
    });

    it('should handle inactive company', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { ...mockKboResponse.data, Status: 'ST' }, // Stopped
      });

      const result = await service.verifyKbo('0123456749');

      expect(result.verified).toBe(false);
      expect(result.isActive).toBe(false);
    });

    it('should handle 404 response', async () => {
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 404 },
      });
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);

      const result = await service.verifyKbo('0123456749');

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Numéro KBO non trouvé dans la base belge');
    });

    it('should fallback to mock on API error', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(false);

      const result = await service.verifyKbo('0123456749');

      expect(result.verified).toBe(true);
      expect(result.warnings).toContain(
        '⚠️ MOCK MODE: KBO API not fully integrated',
      );
    });

    it('should include VAT number in result', async () => {
      mockedAxios.get.mockResolvedValue(mockKboResponse);

      const result = await service.verifyKbo('0123456749');

      expect(result.vatNumber).toBe('BE0123456749');
    });

    it('should include NACE code in result', async () => {
      mockedAxios.get.mockResolvedValue(mockKboResponse);

      const result = await service.verifyKbo('0123456749');

      expect(result.naceCode).toBe('43210');
    });

    it('should build address correctly', async () => {
      mockedAxios.get.mockResolvedValue(mockKboResponse);

      const result = await service.verifyKbo('0123456749');

      expect(result.address).toContain('Rue de la Loi');
      expect(result.address).toContain('123');
      expect(result.address).toContain('1000');
      expect(result.address).toContain('Bruxelles');
    });

    it('should prefer French denomination', async () => {
      mockedAxios.get.mockResolvedValue(mockKboResponse);

      const result = await service.verifyKbo('0123456749');

      expect(result.companyName).toBe('Entreprise Test SPRL');
    });

    it('should fallback to first denomination if no French', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          ...mockKboResponse.data,
          Denomination: [{ Language: 'NL', Value: 'Test Onderneming BVBA' }],
        },
      });

      const result = await service.verifyKbo('0123456749');

      expect(result.companyName).toBe('Test Onderneming BVBA');
    });
  });

  describe('formatBelgianVat', () => {
    it('should format KBO to Belgian VAT', () => {
      expect(service.formatBelgianVat('0123456789')).toBe('BE0123456789');
    });
  });

  describe('validateBelgianVat', () => {
    it('should validate correct Belgian VAT format', () => {
      expect(service.validateBelgianVat('BE0123456749')).toBe(true);
    });

    it('should handle lowercase', () => {
      expect(service.validateBelgianVat('be0123456749')).toBe(true);
    });

    it('should handle dots and spaces', () => {
      expect(service.validateBelgianVat('BE 0123.456.749')).toBe(true);
    });

    it('should reject invalid prefix', () => {
      expect(service.validateBelgianVat('LU0123456789')).toBe(false);
    });

    it('should reject wrong length', () => {
      expect(service.validateBelgianVat('BE012345678')).toBe(false); // 9 digits
      expect(service.validateBelgianVat('BE01234567890')).toBe(false); // 11 digits
    });

    it('should reject invalid checksum', () => {
      expect(service.validateBelgianVat('BE0123456700')).toBe(false);
    });
  });
});
