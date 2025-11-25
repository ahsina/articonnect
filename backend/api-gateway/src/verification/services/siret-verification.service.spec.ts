import { Test, TestingModule } from '@nestjs/testing';
import { SiretVerificationService } from './siret-verification.service';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SiretVerificationService', () => {
  let service: SiretVerificationService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        INSEE_API_URL: 'https://api.insee.fr/entreprises/sirene/V3',
        INSEE_API_TOKEN: 'test-token',
      };
      return config[key];
    }),
  };

  const mockInseeResponse = {
    data: {
      etablissement: {
        siren: '123456789',
        etatAdministratifEtablissement: 'A',
        activitePrincipaleEtablissement: '4321A',
        activitePrincipaleEtablissementLibelle: 'Travaux électriques',
        trancheEffectifsEtablissement: '1 à 2 salariés',
        adresseEtablissement: {
          numeroVoieEtablissement: '123',
          typeVoieEtablissement: 'RUE',
          libelleVoieEtablissement: 'DE LA REPUBLIQUE',
          codePostalEtablissement: '75001',
          libelleCommuneEtablissement: 'PARIS',
        },
        uniteLegale: {
          denominationUniteLegale: 'Test Company SARL',
          categorieJuridiqueUniteLegale: '5499',
          dateCreationUniteLegale: '2020-01-01',
        },
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SiretVerificationService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SiretVerificationService>(SiretVerificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateSiretFormat', () => {
    it('should validate correct 14-digit SIRET', () => {
      // Valid SIRET with Luhn checksum
      expect(service.validateSiretFormat('73282932000074')).toBe(true);
    });

    it('should reject SIRET with wrong length', () => {
      expect(service.validateSiretFormat('1234567890123')).toBe(false); // 13 digits
      expect(service.validateSiretFormat('123456789012345')).toBe(false); // 15 digits
    });

    it('should reject SIRET with non-numeric characters', () => {
      expect(service.validateSiretFormat('1234567890123A')).toBe(false);
    });

    it('should handle SIRET with spaces', () => {
      expect(service.validateSiretFormat('732 829 320 00074')).toBe(true);
    });

    it('should reject SIRET with invalid Luhn checksum', () => {
      expect(service.validateSiretFormat('12345678901235')).toBe(false);
    });
  });

  describe('verifySiret', () => {
    it('should return error for invalid format', async () => {
      const result = await service.verifySiret('invalid');

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Format SIRET invalide (doit contenir 14 chiffres)');
    });

    it('should use mock verification when token not configured', async () => {
      const noTokenConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'INSEE_API_TOKEN') return '';
          return 'https://api.insee.fr/entreprises/sirene/V3';
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          SiretVerificationService,
          { provide: ConfigService, useValue: noTokenConfigService },
        ],
      }).compile();

      const mockService = module.get<SiretVerificationService>(SiretVerificationService);

      const result = await mockService.verifySiret('73282932000074', 'Test Company');

      expect(result.verified).toBe(true);
      expect(result.warnings).toContain('⚠️ MOCK MODE: INSEE API not configured');
    });

    it('should verify SIRET with INSEE API', async () => {
      mockedAxios.get.mockResolvedValue(mockInseeResponse);

      const result = await service.verifySiret('73282932000074', 'Test Company');

      expect(result.verified).toBe(true);
      expect(result.companyName).toBe('Test Company SARL');
      expect(result.isActive).toBe(true);
      expect(result.nafCode).toBe('4321A');
    });

    it('should verify company name match', async () => {
      mockedAxios.get.mockResolvedValue(mockInseeResponse);

      const result = await service.verifySiret('73282932000074', 'Wrong Company Name');

      expect(result.verified).toBe(false);
      expect(result.warnings).toContain('Le nom de l\'entreprise ne correspond pas exactement');
    });

    it('should handle inactive establishment', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          etablissement: {
            ...mockInseeResponse.data.etablissement,
            etatAdministratifEtablissement: 'F', // Fermé (closed)
          },
        },
      });

      const result = await service.verifySiret('73282932000074');

      expect(result.verified).toBe(false);
      expect(result.isActive).toBe(false);
    });

    it('should handle 404 response from INSEE', async () => {
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 404 },
      });
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);

      const result = await service.verifySiret('73282932000074');

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('SIRET non trouvé dans la base INSEE');
    });

    it('should throw HttpException on API error', async () => {
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 500 },
      });
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);

      await expect(service.verifySiret('73282932000074')).rejects.toThrow(HttpException);
    });

    it('should build address correctly', async () => {
      mockedAxios.get.mockResolvedValue(mockInseeResponse);

      const result = await service.verifySiret('73282932000074');

      expect(result.address).toContain('123');
      expect(result.address).toContain('RUE');
      expect(result.address).toContain('75001');
      expect(result.address).toContain('PARIS');
    });

    it('should verify without company name', async () => {
      mockedAxios.get.mockResolvedValue(mockInseeResponse);

      const result = await service.verifySiret('73282932000074');

      expect(result.verified).toBe(true);
    });

    it('should handle individual entrepreneur name format', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          etablissement: {
            ...mockInseeResponse.data.etablissement,
            uniteLegale: {
              denominationUniteLegale: null,
              prenomUsuelUniteLegale: 'Jean',
              nomUniteLegale: 'Dupont',
              categorieJuridiqueUniteLegale: '1000',
              dateCreationUniteLegale: '2020-01-01',
            },
          },
        },
      });

      const result = await service.verifySiret('73282932000074');

      expect(result.companyName).toBe('Jean Dupont');
    });
  });

  describe('extractSiren', () => {
    it('should extract 9-digit SIREN from 14-digit SIRET', () => {
      expect(service.extractSiren('12345678901234')).toBe('123456789');
    });

    it('should handle SIRET with spaces', () => {
      expect(service.extractSiren('123 456 789 01234')).toBe('123456789');
    });
  });
});
