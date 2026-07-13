import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SiretVerificationResult } from '../dto/verification.dto';

/**
 * Marqueur interne (non destiné à l'affichage) placé dans `warnings` lorsqu'une
 * vérification n'a PAS pu être tranchée automatiquement (clé absente = mock, ou
 * panne réseau/API). L'orchestrateur le lit pour poser le statut MANUAL_REVIEW
 * au lieu de REJECTED (on ne rejette jamais une entreprise sur une panne).
 */
export const MANUAL_REVIEW_MARKER = 'MANUAL_REVIEW_REQUIRED';

/**
 * Service for verifying French SIRET numbers via INSEE Sirene API
 * API Documentation: https://api.insee.fr/catalogue/site/themes/wso2/subthemes/insee/pages/item-info.jag?name=Sirene&version=V3&provider=insee
 *
 * CONNECTEUR AUTOMATIQUE :
 *  - Si un jeton INSEE est présent (INSEE_API_TOKEN | INSEE_SIRENE_API_KEY | INSEE_API_KEY)
 *    → vrai appel HTTP au registre Sirene, décision VERIFIED / REJECTED sur l'état réel.
 *  - Sinon → repli mock (fail-closed) marqué pour revue manuelle (MANUAL_REVIEW).
 */
@Injectable()
export class SiretVerificationService {
  private readonly logger = new Logger(SiretVerificationService.name);
  private readonly inseeApiUrl: string;
  private readonly inseeToken: string;

  constructor(private configService: ConfigService) {
    this.inseeApiUrl = this.configService.get<string>('INSEE_API_URL') || 'https://api.insee.fr/entreprises/sirene/V3';
    // Convention établie dans le code/.env.example : INSEE_API_TOKEN.
    // On accepte aussi INSEE_SIRENE_API_KEY / INSEE_API_KEY (alias documentés) pour
    // rester compatible avec la nomenclature « clé API par pays ».
    this.inseeToken =
      this.configService.get<string>('INSEE_API_TOKEN') ||
      this.configService.get<string>('INSEE_SIRENE_API_KEY') ||
      this.configService.get<string>('INSEE_API_KEY') ||
      '';
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

    // Gate de format STRICT = 14 chiffres, AVANT tout appel.
    // NB : on ne bloque volontairement PAS sur le seul checksum de Luhn ici — c'est le
    // registre INSEE qui fait autorité sur la validité réelle. Bloquer sur Luhn causait
    // le bug « Format SIRET invalide » sur des SIRET pourtant à 14 chiffres (ex. cas
    // historiques type La Poste dont le SIREN ne satisfait pas Luhn).
    if (!/^\d{14}$/.test(cleanSiret)) {
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

    // Luhn = contrôle indicatif (warning), pas bloquant.
    const luhnWarnings = this.validateLuhnAlgorithm(cleanSiret)
      ? []
      : ['Checksum SIRET (Luhn) non conforme — vérification via le registre INSEE'];

    // Pas de jeton INSEE → repli mock (fail-closed) marqué pour revue manuelle.
    if (!this.inseeToken) {
      this.logger.warn(
        `INSEE: clé absente (INSEE_API_TOKEN) → mock / MANUAL_REVIEW pour SIRET ${cleanSiret}`,
      );
      return this.mockSiretVerification(cleanSiret, companyName, luhnWarnings);
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

      // État administratif : champ direct ou, à défaut, dernière période connue.
      const etat =
        etablissement.etatAdministratifEtablissement ??
        etablissement.periodesEtablissement?.[0]?.etatAdministratifEtablissement;
      // 'A' = Actif → VERIFIED ; 'F' = Fermé → REJECTED.
      const isActive = etat === 'A';

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

      const verified = isActive && nameMatch;
      this.logger.log(
        `INSEE: SIRET ${cleanSiret} état=${etat ?? '?'} → ${verified ? 'VERIFIED' : 'REJECTED'}`,
      );

      return {
        verified,
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
        errors: verified ? [] : ['Établissement inactif ou nom non correspondant'],
        warnings: [
          ...luhnWarnings,
          ...(!nameMatch ? ['Le nom de l\'entreprise ne correspond pas exactement'] : []),
        ],
      };
    } catch (error) {
      this.logger.error(`Failed to verify SIRET ${cleanSiret}:`, error.message);

      // 404 = SIRET inexistant dans la base INSEE → REJECTED (décision ferme).
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        this.logger.log(`INSEE: SIRET ${cleanSiret} introuvable (404) → REJECTED`);
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

      // Toute autre erreur (réseau, 5xx, timeout, jeton expiré) : on NE bloque PAS et on
      // NE rejette PAS l'entreprise sur une panne → repli mock marqué MANUAL_REVIEW.
      this.logger.warn(
        `INSEE: appel indisponible pour SIRET ${cleanSiret} (${error.message}) → MANUAL_REVIEW`,
      );
      return this.mockSiretVerification(cleanSiret, companyName, [
        ...luhnWarnings,
        'API INSEE indisponible au moment du contrôle',
      ]);
    }
  }

  /**
   * Mock verification for development/testing
   */
  private mockSiretVerification(
    siret: string,
    companyName?: string,
    extraWarnings: string[] = [],
  ): SiretVerificationResult {
    return {
      // SÉCURITÉ : fail-closed — sans token INSEE (ou API indisponible), on NE valide PAS
      // automatiquement. Le marqueur MANUAL_REVIEW indique à l'orchestrateur de router vers
      // une revue manuelle admin (statut MANUAL_REVIEW) plutôt qu'un rejet ferme.
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
      warnings: [
        '⚠️ MOCK MODE: INSEE API not configured',
        MANUAL_REVIEW_MARKER,
        ...extraWarnings,
      ],
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
