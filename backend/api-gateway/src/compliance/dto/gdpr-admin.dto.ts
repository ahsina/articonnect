import { IsEnum, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Issue du traitement d'une demande RGPD par l'opérateur.
 * Sert uniquement à TRACER la décision (aucune PII n'est détruite par cet endpoint ;
 * l'effacement/anonymisation définitif reste un job différé).
 */
export enum GdprProcessOutcome {
  ANONYMIZED = 'ANONYMIZED', // compte anonymisé/effacé
  REJECTED = 'REJECTED', // demande refusée (ex. obligation légale de conservation)
  EXPORTED = 'EXPORTED', // droit d'accès : données exportées et fournies
  INFO = 'INFO', // note libre / suivi
}

export class ProcessGdprRequestDto {
  @IsEnum(GdprProcessOutcome)
  outcome: GdprProcessOutcome;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class GdprRequestFilterDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}
