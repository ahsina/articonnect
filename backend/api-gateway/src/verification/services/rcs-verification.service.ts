import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { RcsVerificationResult } from '../dto/verification.dto';

/**
 * Service for verifying Luxembourg RCS (Registre de Commerce et des Sociétés) numbers
 * API Documentation: https://data.public.lu/en/datasets/registre-de-commerce-et-des-societes-entreprises/
 */
@Injectable()
export class RcsVerificationService {
  private readonly logger = new Logger(RcsVerificationService.name);
  private readonly rcsApiUrl = 'https://data.public.lu/api/3/action';
  private readonly lbrApiUrl = 'https://www.lbr.lu/mjrcs/jsp'; // Luxembourg Business Registers

  constructor(private configService: ConfigService) {}

  /**
   * Validate RCS format (Luxembourg)
   * Format: Letter (A-Z) + 5-7 digits (e.g., B123456)
   */
  validateRcsFormat(rcsNumber: string): boolean {
    const cleanRcs = rcsNumber.replace(/\s/g, '').toUpperCase();
    // RCS format: Letter + digits (e.g., B123456, A12345)
    return /^[A-Z]\d{5,7}$/.test(cleanRcs);
  }

  /**
   * Verify RCS number with Luxembourg public data
   */
  async verifyRcs(
    rcsNumber: string,
    companyName?: string,
  ): Promise<RcsVerificationResult> {
    const cleanRcs = rcsNumber.replace(/\s/g, '').toUpperCase();

    // Validate format first
    if (!this.validateRcsFormat(cleanRcs)) {
      return {
        verified: false,
        rcsNumber: cleanRcs,
        companyName: '',
        legalForm: '',
        address: '',
        isActive: false,
        registrationDate: new Date(),
        errors: ['Format RCS invalide (doit commencer par une lettre suivie de 5-7 chiffres)'],
      };
    }

    // Try Luxembourg open data API
    try {
      const response = await axios.get(`${this.rcsApiUrl}/datastore_search`, {
        params: {
          resource_id: 'rcs-dataset-id', // Would need actual dataset ID
          q: cleanRcs,
          limit: 1,
        },
        timeout: 10000,
      });

      if (response.data?.result?.records?.length > 0) {
        const record = response.data.result.records[0];

        const nameMatch = companyName
          ? record.name?.toLowerCase().includes(companyName.toLowerCase()) ||
            companyName.toLowerCase().includes(record.name?.toLowerCase())
          : true;

        return {
          verified: record.status === 'ACTIVE' && nameMatch,
          rcsNumber: cleanRcs,
          companyName: record.name || '',
          legalForm: record.legal_form || '',
          address: record.address || '',
          isActive: record.status === 'ACTIVE',
          registrationDate: new Date(record.registration_date),
          naceCode: record.nace_code,
          errors: [],
        };
      }
    } catch (error) {
      this.logger.warn(`Luxembourg RCS API unavailable, using mock verification: ${error.message}`);
    }

    // Fallback to mock verification
    return this.mockRcsVerification(cleanRcs, companyName);
  }

  /**
   * Mock verification for development/testing
   * In production, this would integrate with Luxembourg Business Registers
   */
  private mockRcsVerification(
    rcsNumber: string,
    companyName?: string,
  ): RcsVerificationResult {
    this.logger.warn(`Using MOCK verification for Luxembourg RCS: ${rcsNumber}`);

    return {
      verified: true,
      rcsNumber,
      companyName: companyName || 'Entreprise Luxembourg S.à r.l.',
      legalForm: 'S.à r.l.',
      address: '5 Rue de la Liberté, L-1234 Luxembourg',
      isActive: true,
      registrationDate: new Date('2020-01-01'),
      naceCode: '43.21',
      warnings: ['⚠️ MOCK MODE: Luxembourg RCS API not fully integrated'],
    };
  }

  /**
   * Verify VAT number (Luxembourg format)
   */
  validateLuxembourgVat(vatNumber: string): boolean {
    const cleanVat = vatNumber.replace(/\s/g, '').toUpperCase();
    // Luxembourg VAT: LU + 8 digits
    return /^LU\d{8}$/.test(cleanVat);
  }
}
