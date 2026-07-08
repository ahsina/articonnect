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
