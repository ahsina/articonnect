import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SiretVerificationResult } from '../dto/verification.dto';

/**
 * Service for verifying French SIRET numbers via INSEE Sirene API
 * API Documentation: https://api.insee.fr/catalogue/site/themes/wso2/subthemes/insee/pages/item-info.jag?name=Sirene&version=V3&provider=insee
 */
@Injectable()
export class SiretVerificationService {
  private readonly logger = new Logger(SiretVerificationService.name);
  private readonly inseeApiUrl: string;
  private readonly inseeToken: string;

  constructor(private configService: ConfigService) {
    this.inseeApiUrl = this.configService.get<string>('INSEE_API_URL') || 'https://api.insee.fr/entreprises/sirene/V3';
    this.inseeToken = this.configService.get<string>('INSEE_API_TOKEN') || '';
  }

  /**
   * Validate SIRET format (14 digits)
   */
  validateSiretFormat(siret: string): boolean {
    const cleanSiret = siret.replace(/\s/g, '');
    if (!/^\d{14}$/.test(cleanSiret)) {
      return false;
    }

    // Luhn algorithm validation for SIRET
    return this.validateLuhnAlgorithm(cleanSiret);
  }

  /**
   * Luhn algorithm to validate SIRET checksum
   */
  private validateLuhnAlgorithm(siret: string): boolean {
    let sum = 0;
    for (let i = 0; i < siret.length; i++) {
      let digit = parseInt(siret[i]);
      if (i % 2 === 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    return sum % 10 === 0;
  }

  /**
   * Verify SIRET number with INSEE API
   */
  async verifySiret(siret: string, companyName?: string): Promise<SiretVerificationResult> {
    const cleanSiret = siret.replace(/\s/g, '');

    // Validate format first
    if (!this.validateSiretFormat(cleanSiret)) {
      return {
        verified: false,
        siret: cleanSiret,
        siren: '',
        companyName: '',
        legalForm: '',
        address: '',
        isActive: false,
        creationDate: new Date(),
        nafCode: '',
        nafLabel: '',
        errors: ['Format SIRET invalide (doit contenir 14 chiffres)'],
      };
    }

    // If no API token configured, return mock verification for development
    if (!this.inseeToken) {
      this.logger.warn('INSEE_API_TOKEN not configured, using mock verification');
      return this.mockSiretVerification(cleanSiret, companyName);
    }

    try {
      const response = await axios.get(`${this.inseeApiUrl}/siret/${cleanSiret}`, {
        headers: {
          Authorization: `Bearer ${this.inseeToken}`,
          Accept: 'application/json',
        },
        timeout: 10000,
      });

      const etablissement = response.data.etablissement;
      const uniteLegale = etablissement.uniteLegale;
      const adresseEtablissement = etablissement.adresseEtablissement;

      // Check if establishment is active
      const isActive = etablissement.etatAdministratifEtablissement === 'A';

      // Build address
      const address = [
        adresseEtablissement.numeroVoieEtablissement,
        adresseEtablissement.typeVoieEtablissement,
        adresseEtablissement.libelleVoieEtablissement,
        adresseEtablissement.codePostalEtablissement,
        adresseEtablissement.libelleCommuneEtablissement,
      ]
        .filter(Boolean)
        .join(' ');

      // Verify company name if provided
      const registeredName =
        uniteLegale.denominationUniteLegale ||
        `${uniteLegale.prenomUsuelUniteLegale} ${uniteLegale.nomUniteLegale}`.trim();

      const nameMatch = companyName
        ? registeredName.toLowerCase().includes(companyName.toLowerCase()) ||
          companyName.toLowerCase().includes(registeredName.toLowerCase())
        : true;

      return {
        verified: isActive && nameMatch,
        siret: cleanSiret,
        siren: etablissement.siren,
        companyName: registeredName,
        legalForm: uniteLegale.categorieJuridiqueUniteLegale || '',
        address,
        isActive,
        creationDate: new Date(uniteLegale.dateCreationUniteLegale),
        nafCode: etablissement.activitePrincipaleEtablissement,
        nafLabel: etablissement.activitePrincipaleEtablissementLibelle || '',
        employeeCount: etablissement.trancheEffectifsEtablissement,
        errors: isActive && nameMatch ? [] : ['Établissement inactif ou nom non correspondant'],
        warnings: !nameMatch ? ['Le nom de l\'entreprise ne correspond pas exactement'] : [],
      };
    } catch (error) {
      this.logger.error(`Failed to verify SIRET ${cleanSiret}:`, error.message);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return {
            verified: false,
            siret: cleanSiret,
            siren: cleanSiret.substring(0, 9),
            companyName: '',
            legalForm: '',
            address: '',
            isActive: false,
            creationDate: new Date(),
            nafCode: '',
            nafLabel: '',
            errors: ['SIRET non trouvé dans la base INSEE'],
          };
        }
      }

      throw new HttpException(
        'Erreur lors de la vérification SIRET avec l\'API INSEE',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Mock verification for development/testing
   */
  private mockSiretVerification(
    siret: string,
    companyName?: string,
  ): SiretVerificationResult {
    return {
      // SÉCURITÉ : fail-closed — sans token INSEE, on NE valide PAS automatiquement (vérif manuelle admin).
      verified: false,
      siret,
      siren: siret.substring(0, 9),
      companyName: companyName || 'Entreprise Test SARL',
      legalForm: '5499',
      address: '123 Rue de la République, 75001 Paris',
      isActive: true,
      creationDate: new Date('2020-01-01'),
      nafCode: '4321A',
      nafLabel: 'Travaux d\'installation électrique',
      employeeCount: '1 à 2 salariés',
      warnings: ['⚠️ MOCK MODE: INSEE API not configured'],
    };
  }

  /**
   * Extract SIREN (9 digits) from SIRET (14 digits)
   */
  extractSiren(siret: string): string {
    const cleanSiret = siret.replace(/\s/g, '');
    return cleanSiret.substring(0, 9);
  }
}
