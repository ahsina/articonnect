/**
 * Règles de TVA par PAYS DU CHANTIER (art. 47 directive 2006/112/CE : les travaux sur un bien
 * immeuble sont taxés là où se trouve le bâtiment). Config versionnée et déclarative → maintenable
 * et évolutive : pour changer un taux ou ajouter une mesure temporaire, on édite ce fichier.
 *
 * `workType` attendu : 'RENOVATION' | 'ENERGY_RENOVATION' | 'NEW_BUILD' | 'MAINTENANCE' | 'OTHER'.
 */
export type WorkType =
  | 'RENOVATION'
  | 'ENERGY_RENOVATION'
  | 'NEW_BUILD'
  | 'MAINTENANCE'
  | 'OTHER';

export interface ReducedRule {
  rate: number;
  workTypes: WorkType[];
  /** Ancienneté minimale du bâtiment (années) pour le taux réduit. */
  minBuildingAge?: number;
  /** Le logement doit être une résidence (habitation), voire principale. */
  requiresResidential?: boolean;
  requiresPrimaryResidence?: boolean;
  mention: string;
  requiresAttestation?: boolean;
  /** Mesures temporaires : bornes de validité (incluses). */
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface CountryVatRules {
  standard: number;
  /** Testées dans l'ordre : la première qui matche s'applique. */
  reduced: ReducedRule[];
}

// ⚠️ Taux 2026. À maintenir ici (source unique). Voir aussi PlatformConfig si besoin d'override runtime.
export const VAT_RULES: Record<string, CountryVatRules> = {
  LU: {
    standard: 17,
    reduced: [
      {
        rate: 3,
        workTypes: ['RENOVATION', 'ENERGY_RENOVATION', 'NEW_BUILD'],
        minBuildingAge: 10,
        requiresResidential: true,
        requiresPrimaryResidence: true,
        mention:
          'TVA super-réduite 3 % — logement affecté à la résidence principale (LU, plafond 50 000 € d\'avantage).',
        requiresAttestation: true,
      },
    ],
  },
  FR: {
    standard: 20,
    reduced: [
      {
        rate: 5.5,
        workTypes: ['ENERGY_RENOVATION'],
        minBuildingAge: 2,
        requiresResidential: true,
        mention: 'TVA 5,5 % — travaux de rénovation énergétique (art. 278-0 bis A du CGI).',
        requiresAttestation: true,
      },
      {
        rate: 10,
        workTypes: ['RENOVATION', 'MAINTENANCE'],
        minBuildingAge: 2,
        requiresResidential: true,
        mention:
          'TVA 10 % — travaux d\'amélioration/entretien d\'un logement achevé depuis plus de 2 ans (art. 279-0 bis du CGI).',
        requiresAttestation: true,
      },
    ],
  },
  BE: {
    standard: 21,
    reduced: [
      {
        rate: 6,
        workTypes: ['RENOVATION', 'ENERGY_RENOVATION', 'MAINTENANCE'],
        minBuildingAge: 10,
        requiresResidential: true,
        mention:
          'TVA 6 % — rénovation d\'un logement privé de plus de 10 ans (AR n° 20, tableau A, rubrique XXXVIII). Attestation client requise.',
        requiresAttestation: true,
      },
    ],
  },
};

/** Taux standard de secours pour un pays hors LU/FR/BE (moyenne UE prudente). */
export const FALLBACK_STANDARD = 21;
