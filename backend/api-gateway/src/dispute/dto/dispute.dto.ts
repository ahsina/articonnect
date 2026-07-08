import { IsString, IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DisputeStatus, DisputePriority } from '@prisma/client';

export enum DisputeOutcome {
  REFUND_CLIENT = 'REFUND_CLIENT',
  PARTIAL_REFUND = 'PARTIAL_REFUND',
  FAVOR_ARTISAN = 'FAVOR_ARTISAN',
}

export class CreateDisputeDto {
  @ApiProperty({ example: 'uuid-mission-id' })
  @IsString()
  missionId: string;

  @ApiProperty({ example: 'Non-paiement' })
  @IsString()
  reason: string;

  @ApiProperty({ example: 'L\'artisan n\'a pas effectué le travail conformément au devis.' })
  @IsString()
  description: string;

  @ApiProperty({ enum: DisputePriority, default: DisputePriority.MEDIUM, required: false })
  @IsOptional()
  @IsEnum(DisputePriority)
  priority?: DisputePriority;
}

export class UpdateDisputeDto {
  @ApiProperty({ enum: DisputeStatus, required: false })
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;

  @ApiProperty({ enum: DisputePriority, required: false })
  @IsOptional()
  @IsEnum(DisputePriority)
  priority?: DisputePriority;
}

export class ProposeSettlementDto {
  @ApiProperty({ example: 150, required: false, description: 'Montant remboursé au client dans le règlement amiable' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  refundAmount?: number;

  @ApiProperty({ example: 50, required: false, description: 'Compensation versée à l\'artisan' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  compensationAmount?: number;

  @ApiProperty({ example: 'Remboursement partiel, travail conservé en l\'état.' })
  @IsString()
  description: string;
}

export class AcceptSettlementDto {
  @ApiProperty({ example: 0, description: 'Index de la proposition de règlement à accepter' })
  @IsNumber()
  @Min(0)
  settlementIndex: number;
}

export class EscalateDisputeDto {
  @ApiProperty({ example: 'Aucune réponse de l\'artisan après 7 jours.' })
  @IsString()
  reason: string;
}

export enum EvidenceType {
  PHOTO = 'PHOTO',
  DOCUMENT = 'DOCUMENT',
  MESSAGE = 'MESSAGE',
  OTHER = 'OTHER',
}

export class AddEvidenceDto {
  @ApiProperty({ enum: EvidenceType, example: EvidenceType.PHOTO })
  @IsEnum(EvidenceType)
  type: EvidenceType;

  @ApiProperty({ example: 'https://cdn.example.com/files/evidence.jpg' })
  @IsString()
  url: string;

  @ApiProperty({ example: 'Photo du travail non conforme.' })
  @IsString()
  description: string;
}

export class ResolveDisputeDto {
  @ApiProperty({ example: 'Remboursement total accordé au client' })
  @IsString()
  resolution: string;

  // Issue de la résolution : détermine si de l'argent doit réellement bouger.
  @ApiProperty({ enum: DisputeOutcome, required: false, description: 'REFUND_CLIENT / PARTIAL_REFUND / FAVOR_ARTISAN' })
  @IsOptional()
  @IsEnum(DisputeOutcome)
  outcome?: DisputeOutcome;

  // Montant à rembourser (requis pour PARTIAL_REFUND ; pour REFUND_CLIENT, défaut = montant convenu).
  @ApiProperty({ example: 150, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  refundAmount?: number;
}
