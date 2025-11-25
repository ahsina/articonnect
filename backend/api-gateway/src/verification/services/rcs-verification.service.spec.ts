import { Test, TestingModule } from '@nestjs/testing';
import { RcsVerificationService } from './rcs-verification.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RcsVerificationService', () => {
  let service: RcsVerificationService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        RCS_API_URL: 'https://data.public.lu/api/3/action',
        LBR_API_URL: 'https://www.lbr.lu/mjrcs/jsp',
      };
      return config[key];
    }),
  };

  const mockRcsResponse = {
    data: {
      result: {
        records: [
          {
            name: 'Test Luxembourg SARL',
            legal_form: 'S.à r.l.',
            address: '5 Rue de la Liberté, L-1234 Luxembourg',
            status: 'ACTIVE',
            registration_date: '2020-01-01',
            nace_code: '43.21',
          },
        ],
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RcsVerificationService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RcsVerificationService>(RcsVerificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateRcsFormat', () => {
    it('should validate correct RCS format (letter + 5-7 digits)', () => {
      expect(service.validateRcsFormat('B123456')).toBe(true);
      expect(service.validateRcsFormat('A12345')).toBe(true);
      expect(service.validateRcsFormat('C1234567')).toBe(true);
    });

    it('should handle lowercase letters', () => {
      expect(service.validateRcsFormat('b123456')).toBe(true);
    });

    it('should handle spaces', () => {
      expect(service.validateRcsFormat('B 123456')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(service.validateRcsFormat('123456')).toBe(false); // No letter
      expect(service.validateRcsFormat('AB123456')).toBe(false); // Two letters
      expect(service.validateRcsFormat('B1234')).toBe(false); // Too few digits
      expect(service.validateRcsFormat('B12345678')).toBe(false); // Too many digits
    });
  });

  describe('verifyRcs', () => {
    it('should return error for invalid format', async () => {
      const result = await service.verifyRcs('invalid');

      expect(result.verified).toBe(false);
      expect(result.errors).toContain(
        'Format RCS invalide (doit commencer par une lettre suivie de 5-7 chiffres)',
      );
    });

    it('should verify RCS with Luxembourg API', async () => {
      mockedAxios.get.mockResolvedValue(mockRcsResponse);

      const result = await service.verifyRcs('B123456', 'Test Luxembourg');

      expect(result.verified).toBe(true);
      expect(result.companyName).toBe('Test Luxembourg SARL');
      expect(result.isActive).toBe(true);
      expect(result.legalForm).toBe('S.à r.l.');
    });

    it('should verify company name match', async () => {
      mockedAxios.get.mockResolvedValue(mockRcsResponse);

      const result = await service.verifyRcs('B123456', 'Wrong Company');

      expect(result.verified).toBe(false);
    });

    it('should handle inactive company', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          result: {
            records: [
              {
                ...mockRcsResponse.data.result.records[0],
                status: 'INACTIVE',
              },
            ],
          },
        },
      });

      const result = await service.verifyRcs('B123456');

      expect(result.verified).toBe(false);
      expect(result.isActive).toBe(false);
    });

    it('should fallback to mock when API fails', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API unavailable'));

      const result = await service.verifyRcs('B123456', 'Test Company');

      expect(result.verified).toBe(true);
      expect(result.warnings).toContain(
        '⚠️ MOCK MODE: Luxembourg RCS API not fully integrated',
      );
    });

    it('should fallback to mock when no records found', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { result: { records: [] } },
      });

      const result = await service.verifyRcs('B123456');

      expect(result.verified).toBe(true);
      expect(result.warnings).toBeDefined();
    });

    it('should verify without company name', async () => {
      mockedAxios.get.mockResolvedValue(mockRcsResponse);

      const result = await service.verifyRcs('B123456');

      expect(result.verified).toBe(true);
    });

    it('should include NACE code in result', async () => {
      mockedAxios.get.mockResolvedValue(mockRcsResponse);

      const result = await service.verifyRcs('B123456');

      expect(result.naceCode).toBe('43.21');
    });
  });

  describe('validateLuxembourgVat', () => {
    it('should validate correct Luxembourg VAT format', () => {
      expect(service.validateLuxembourgVat('LU12345678')).toBe(true);
    });

    it('should handle lowercase', () => {
      expect(service.validateLuxembourgVat('lu12345678')).toBe(true);
    });

    it('should handle spaces', () => {
      expect(service.validateLuxembourgVat('LU 1234 5678')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(service.validateLuxembourgVat('LU1234567')).toBe(false); // 7 digits
      expect(service.validateLuxembourgVat('LU123456789')).toBe(false); // 9 digits
      expect(service.validateLuxembourgVat('BE12345678')).toBe(false); // Wrong country
      expect(service.validateLuxembourgVat('12345678')).toBe(false); // No prefix
    });
  });
});
