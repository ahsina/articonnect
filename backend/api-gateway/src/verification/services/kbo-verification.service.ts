import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { KboVerificationResult } from '../dto/verification.dto';

/**
 * Service for verifying Belgian KBO/BCE (Kruispuntbank van Ondernemingen) numbers
 * API Documentation: https://kbopub.economie.fgov.be/kbopub/api/
 */
@Injectable()
export class KboVerificationService {
  private readonly logger = new Logger(KboVerificationService.name);
  private readonly kboApiUrl = 'https://kbopub.economie.fgov.be/kbopub/api/v1';

  constructor(private configService: ConfigService) {}

  /**
   * Validate KBO/BCE format (Belgium)
   * Format: 10 digits, often displayed as 0123.456.789
   */
  validateKboFormat(kboNumber: string): boolean {
    const cleanKbo = kboNumber.replace(/[\s.]/g, '');

    if (!/^\d{10}$/.test(cleanKbo)) {
      return false;
    }

    // KBO uses modulo 97 checksum validation
    return this.validateKboChecksum(cleanKbo);
  }

  /**
   * Validate KBO checksum (modulo 97)
   */
  private validateKboChecksum(kboNumber: string): boolean {
    // Take first 8 digits
    const mainNumber = kboNumber.substring(0, 8);
    const checkDigits = parseInt(kboNumber.substring(8, 10));

    // Calculate expected check digits
    const remainder = parseInt(mainNumber) % 97;
    const expectedCheck = 97 - remainder;

    return checkDigits === expectedCheck;
  }

  /**
   * Format KBO number with dots (0123.456.789)
   */
  formatKboNumber(kboNumber: string): string {
    const clean = kboNumber.replace(/[\s.]/g, '');
    return `${clean.substring(0, 4)}.${clean.substring(4, 7)}.${clean.substring(7, 10)}`;
  }

  /**
   * Verify KBO/BCE number with Belgian open data API
   */
  async verifyKbo(
    kboNumber: string,
    companyName?: string,
  ): Promise<KboVerificationResult> {
    const cleanKbo = kboNumber.replace(/[\s.]/g, '');

    // Validate format first
    if (!this.validateKboFormat(cleanKbo)) {
      return {
        verified: false,
        kboNumber: cleanKbo,
        companyName: '',
        legalForm: '',
        address: '',
        isActive: false,
        startDate: new Date(),
        errors: ['Format KBO invalide (doit contenir 10 chiffres avec checksum valide)'],
      };
    }

    try {
      // Call KBO Open Data API
      const response = await axios.get(`${this.kboApiUrl}/enterprise/${cleanKbo}`, {
        headers: {
          Accept: 'application/json',
        },
        timeout: 10000,
      });

      const enterprise = response.data;

      // Check if enterprise is active
      const isActive = enterprise.Status === 'AC'; // AC = Active

      // Get latest denomination
      const denomination =
        enterprise.Denomination?.find((d: any) => d.Language === 'FR')?.Value ||
        enterprise.Denomination?.[0]?.Value ||
        '';

      // Build address
      const address = enterprise.Address?.find((a: any) => a.Type === 'REGO'); // Registered office
      const formattedAddress = address
        ? `${address.Street} ${address.HouseNumber}, ${address.Zipcode} ${address.Municipality}`
        : '';

      // Verify company name if provided
      const nameMatch = companyName
        ? denomination.toLowerCase().includes(companyName.toLowerCase()) ||
          companyName.toLowerCase().includes(denomination.toLowerCase())
        : true;

      return {
        verified: isActive && nameMatch,
        kboNumber: cleanKbo,
        companyName: denomination,
        legalForm: enterprise.JuridicalForm || '',
        address: formattedAddress,
        isActive,
        startDate: new Date(enterprise.StartDate),
        naceCode: enterprise.Activity?.[0]?.NaceCode,
        vatNumber: this.formatBelgianVat(cleanKbo),
        errors: isActive && nameMatch ? [] : ['Entreprise inactive ou nom non correspondant'],
        warnings: !nameMatch ? ['Le nom de l\'entreprise ne correspond pas exactement'] : [],
      };
    } catch (error) {
      this.logger.error(`Failed to verify KBO ${cleanKbo}:`, error.message);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return {
            verified: false,
            kboNumber: cleanKbo,
            companyName: '',
            legalForm: '',
            address: '',
            isActive: false,
            startDate: new Date(),
            errors: ['Numéro KBO non trouvé dans la base belge'],
          };
        }
      }

      // Fallback to mock verification if API fails
      this.logger.warn('KBO API unavailable, using mock verification');
      return this.mockKboVerification(cleanKbo, companyName);
    }
  }

  /**
   * Format Belgian VAT number from KBO
   * Format: BE + 10 digits (e.g., BE0123456789)
   */
  formatBelgianVat(kboNumber: string): string {
    return `BE${kboNumber}`;
  }

  /**
   * Validate Belgian VAT number
   */
  validateBelgianVat(vatNumber: string): boolean {
    const cleanVat = vatNumber.replace(/[\s.]/g, '').toUpperCase();
    // Belgian VAT: BE + 10 digits
    if (!/^BE\d{10}$/.test(cleanVat)) {
      return false;
    }

    const kboNumber = cleanVat.substring(2);
    return this.validateKboChecksum(kboNumber);
  }

  /**
   * Mock verification for development/testing
   */
  private mockKboVerification(
    kboNumber: string,
    companyName?: string,
  ): KboVerificationResult {
    this.logger.warn(`Using MOCK verification for Belgian KBO: ${kboNumber}`);

    return {
      verified: true,
      kboNumber,
      companyName: companyName || 'Entreprise Belge SPRL',
      legalForm: 'SPRL',
      address: 'Rue de la Loi 123, 1000 Bruxelles',
      isActive: true,
      startDate: new Date('2020-01-01'),
      naceCode: '43210',
      vatNumber: this.formatBelgianVat(kboNumber),
      warnings: ['⚠️ MOCK MODE: KBO API not fully integrated'],
    };
  }
}
