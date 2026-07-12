import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/**
 * DTO du PORTAIL sous-traitant (exécutant).
 *
 * Ces classes remplacent les anciennes `interface` déclarées dans
 * subcontractor-portal.service.ts : une interface n'a AUCUNE métadonnée de
 * validation, donc le ValidationPipe global (whitelist + forbidNonWhitelisted +
 * transform, cf. main.ts) ne s'appliquait pas. Résultat : un refus d'offre sans
 * motif (`reason` absent) était accepté et stockait « Refusé: undefined » en base
 * (feedback), et un `progress` hors bornes/non numérique passait sans contrôle.
 *
 * Les classes ci-dessous sont STRUCTURELLEMENT compatibles avec les interfaces
 * homonymes encore utilisées à l'intérieur du service (mêmes champs) : le
 * contrôleur passe une instance de classe validée, le service la consomme sans
 * changement. Aucun champ nouveau, aucun champ retiré → les appels front
 * existants (portal.declineOffer/acceptOffer/updateProgress/setAvailability/
 * leaveRelationship) restent valides.
 */

/** Acceptation d'une offre : note libre optionnelle. */
export class AcceptOfferDto {
  @IsString()
  @IsOptional()
  notes?: string;
}

/**
 * Refus d'une offre : un MOTIF est désormais obligatoire (empêche le
 * « Refusé: undefined » et donne une raison exploitable au donneur d'ordre).
 */
export class DeclineOfferDto {
  @IsString()
  @IsNotEmpty({ message: 'Le motif du refus (reason) est requis.' })
  reason: string;
}

/**
 * Mise à jour d'avancement : `progress` optionnel (mise à jour de note seule
 * autorisée) mais, s'il est fourni, entier borné 0-100.
 */
export class UpdateProgressDto {
  @IsString()
  @IsOptional()
  notes?: string;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number;
}

/**
 * Bascule de disponibilité : `active` requis (booléen). `subcontractorId`
 * optionnel cible une relation précise ; absent = toutes les relations.
 */
export class SetAvailabilityDto {
  @IsBoolean()
  active: boolean;

  @IsUUID()
  @IsOptional()
  subcontractorId?: string;
}

/** Départ d'une relation : `subcontractorId` requis. */
export class LeaveRelationshipDto {
  @IsUUID()
  @IsNotEmpty({ message: 'subcontractorId est requis.' })
  subcontractorId: string;
}

/**
 * Notation RÉCIPROQUE du donneur d'ordre par le sous-traitant (fiabilité, paiement à temps).
 * Écrit `contractorRating`/`contractorFeedback` sur l'attribution du sous-traitant courant.
 * Symétrique de la note donneur d'ordre → sous-traitant (rating/feedback), déjà en base.
 */
export class RateContractorDto {
  @IsInt()
  @Min(1)
  @Max(5)
  contractorRating: number;

  @IsString()
  @IsOptional()
  contractorFeedback?: string;
}
