import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DisputeStatus, DisputePriority } from '@prisma/client';

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
}
