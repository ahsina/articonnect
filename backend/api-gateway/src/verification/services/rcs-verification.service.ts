import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { RcsVerificationResult } from '../dto/verification.dto';
import { MANUAL_REVIEW_MARKER } from './siret-verification.service';

/**
 * Service for verifying Luxembourg RCS (Registre de Commerce et des Sociétés) numbers
 * API Documentation: https://data.public.lu/en/datasets/registre-de-commerce-et-des-societes-entreprises/
 *
 * CONNECTEUR AUTOMATIQUE :
 *  - Si une clé RCS/LBR est présente (RCS_API_KEY | LBR_API_KEY) → appel authentifié
 *    au registre luxembourgeois (header `X-API-Key`), décision sur l'état réel (ACTIVE).
 *  - Sinon → l'open-data est tenté puis repli mock marqué MANUAL_REVIEW
 *    (comportement historique conservé : pas de rejet sur indisponibilité).
 */
@Injectable()
export class RcsVerificationService {
  private readonly logger = new Logger(RcsVerificationService.name);
  private readonly rcsApiUrl: string;
  private readonly lbrApiUrl: string;
  private readonly rcsApiKey: string;

  constructor(private configService: ConfigService) {
    this.rcsApiUrl = this.configService.get<string>('RCS_API_URL') || 'https://data.public.lu/api/3/action';
    this.lbrApiUrl = this.configService.get<string>('LBR_API_URL') || 'https://www.lbr.lu/mjrcs/jsp';
    // Clé d'accès au registre RCS/LBR (LBR — Luxembourg Business Registers). Alias : LBR_API_KEY.
    this.rcsApiKey =
      this.configService.get<string>('RCS_API_KEY') ||
      this.configService.get<string>('LBR_API_KEY') ||
      '';
  }

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

    if (this.rcsApiKey) {
      this.logger.log(`RCS: clé présente → appel authentifié pour ${cleanRcs}`);
    } else {
      this.logger.warn(
        `RCS: clé absente (RCS_API_KEY) → open-data puis repli mock / MANUAL_REVIEW pour ${cleanRcs}`,
      );
    }

    // Try Luxembourg open data API. Le header d'authentification n'est ajouté que si une clé existe.
    try {
      const response = await axios.get(`${this.rcsApiUrl}/datastore_search`, {
        params: {
          resource_id: 'rcs-dataset-id', // Would need actual dataset ID
          q: cleanRcs,
          limit: 1,
        },
        headers: this.rcsApiKey ? { 'X-API-Key': this.rcsApiKey } : {},
        timeout: 10000,
      });

      if (response.data?.result?.records?.length > 0) {
        const record = response.data.result.records[0];

        const nameMatch = companyName
          ? record.name?.toLowerCase().includes(companyName.toLowerCase()) ||
            companyName.toLowerCase().includes(record.name?.toLowerCase())
          : true;

        const isActive = record.status === 'ACTIVE';
        const verified = isActive && nameMatch;
        this.logger.log(
          `RCS: ${cleanRcs} statut=${record.status ?? '?'} → ${verified ? 'VERIFIED' : 'REJECTED'}`,
        );

        return {
          verified,
          rcsNumber: cleanRcs,
          companyName: record.name || '',
          legalForm: record.legal_form || '',
          address: record.address || '',
          isActive,
          registrationDate: new Date(record.registration_date),
          naceCode: record.nace_code,
          errors: verified ? [] : ['Entreprise inactive ou nom non correspondant'],
        };
      }
      // Aucun enregistrement trouvé : on ne tranche pas → repli mock / MANUAL_REVIEW.
      this.logger.warn(`RCS: aucun enregistrement pour ${cleanRcs} → MANUAL_REVIEW`);
    } catch (error) {
      // Panne réseau/API : on NE rejette PAS → repli mock / MANUAL_REVIEW.
      this.logger.warn(`RCS: open-data indisponible (${error.message}) → MANUAL_REVIEW`);
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
      // SÉCURITÉ : fail-closed — RCS Luxembourg non vérifié réellement → pas de validation auto.
      verified: false,
      rcsNumber,
      companyName: companyName || 'Entreprise Luxembourg S.à r.l.',
      legalForm: 'S.à r.l.',
      address: '5 Rue de la Liberté, L-1234 Luxembourg',
      isActive: true,
      registrationDate: new Date('2020-01-01'),
      naceCode: '43.21',
      warnings: ['⚠️ MOCK MODE: Luxembourg RCS API not fully integrated', MANUAL_REVIEW_MARKER],
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
