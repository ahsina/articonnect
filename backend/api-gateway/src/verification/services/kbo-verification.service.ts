import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { KboVerificationResult } from '../dto/verification.dto';
import { MANUAL_REVIEW_MARKER } from './siret-verification.service';

/**
 * Service for verifying Belgian KBO/BCE (Kruispuntbank van Ondernemingen) numbers
 * API Documentation: https://kbopub.economie.fgov.be/kbopub/api/
 *
 * CONNECTEUR AUTOMATIQUE :
 *  - Si une clé KBO est présente (KBO_API_KEY | KBO_API_TOKEN) → appel authentifié
 *    au registre KBO/BCE (header `X-API-Key`), décision sur l'état réel (AC = actif).
 *  - Sinon → l'endpoint ouvert est tenté puis repli mock marqué MANUAL_REVIEW
 *    (comportement historique conservé : on ne rejette pas sur indisponibilité).
 */
@Injectable()
export class KboVerificationService {
  private readonly logger = new Logger(KboVerificationService.name);
  private readonly kboApiUrl: string;
  private readonly kboApiKey: string;

  constructor(private configService: ConfigService) {
    this.kboApiUrl = this.configService.get<string>('KBO_API_URL') || 'https://kbopub.economie.fgov.be/kbopub/api/v1';
    // Clé d'accès au registre KBO/BCE (l'accès réel nécessite un enregistrement auprès
    // du SPF Économie). Alias accepté : KBO_API_TOKEN.
    this.kboApiKey =
      this.configService.get<string>('KBO_API_KEY') ||
      this.configService.get<string>('KBO_API_TOKEN') ||
      '';
  }

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

    if (this.kboApiKey) {
      this.logger.log(`KBO: clé présente → appel authentifié pour ${cleanKbo}`);
    } else {
      this.logger.warn(
        `KBO: clé absente (KBO_API_KEY) → endpoint ouvert puis repli mock / MANUAL_REVIEW pour ${cleanKbo}`,
      );
    }

    try {
      // Call KBO/BCE API. Le header d'authentification n'est ajouté que si une clé est fournie.
      const response = await axios.get(`${this.kboApiUrl}/enterprise/${cleanKbo}`, {
        headers: {
          Accept: 'application/json',
          ...(this.kboApiKey ? { 'X-API-Key': this.kboApiKey } : {}),
        },
        timeout: 10000,
      });

      const enterprise = response.data;

      // Check if enterprise is active — AC = Active ; tout autre statut (ST/radié…) → REJECTED
      const isActive = enterprise.Status === 'AC';

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

      const verified = isActive && nameMatch;
      this.logger.log(
        `KBO: ${cleanKbo} statut=${enterprise.Status ?? '?'} → ${verified ? 'VERIFIED' : 'REJECTED'}`,
      );

      return {
        verified,
        kboNumber: cleanKbo,
        companyName: denomination,
        legalForm: enterprise.JuridicalForm || '',
        address: formattedAddress,
        isActive,
        startDate: new Date(enterprise.StartDate),
        naceCode: enterprise.Activity?.[0]?.NaceCode,
        vatNumber: this.formatBelgianVat(cleanKbo),
        errors: verified ? [] : ['Entreprise inactive ou nom non correspondant'],
        warnings: !nameMatch ? ['Le nom de l\'entreprise ne correspond pas exactement'] : [],
      };
    } catch (error) {
      this.logger.error(`Failed to verify KBO ${cleanKbo}:`, error.message);

      // 404 = entreprise inexistante → REJECTED (décision ferme).
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        this.logger.log(`KBO: ${cleanKbo} introuvable (404) → REJECTED`);
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

      // Panne réseau/5xx/timeout : on NE rejette PAS → repli mock marqué MANUAL_REVIEW.
      this.logger.warn(`KBO API indisponible (${error.message}) → MANUAL_REVIEW`);
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
      // SÉCURITÉ : fail-closed — sans accès KBO réel, pas de validation auto (vérif manuelle admin).
      verified: false,
      kboNumber,
      companyName: companyName || 'Entreprise Belge SPRL',
      legalForm: 'SPRL',
      address: 'Rue de la Loi 123, 1000 Bruxelles',
      isActive: true,
      startDate: new Date('2020-01-01'),
      naceCode: '43210',
      vatNumber: this.formatBelgianVat(kboNumber),
      warnings: ['⚠️ MOCK MODE: KBO API not fully integrated', MANUAL_REVIEW_MARKER],
    };
  }
}
