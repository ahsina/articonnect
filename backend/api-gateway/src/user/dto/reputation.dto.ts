import { IsString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReputationAction } from '@prisma/client';

/**
 * DTO pour ajuster manuellement la réputation (admin)
 */
export class AdjustReputationDto {
  @ApiProperty({
    description: 'ID de l\'utilisateur',
    example: 'uuid-user-123',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Changement de points (positif ou négatif)',
    example: -10,
  })
  @IsNumber()
  pointsChange: number;

  @ApiProperty({
    description: 'Raison de l\'ajustement',
    example: 'Remboursement de bonne volonté suite à incident technique',
  })
  @IsString()
  reason: string;
}

/**
 * DTO pour la réponse de résumé de réputation
 */
export class ReputationSummaryDto {
  @ApiProperty({
    description: 'Score de réputation (0-200)',
    example: 115,
    minimum: 0,
    maximum: 200,
  })
  reputationScore: number;

  @ApiProperty({
    description: 'Nombre de missions complétées',
    example: 15,
  })
  completedMissions: number;

  @ApiProperty({
    description: 'Nombre de no-shows',
    example: 0,
  })
  noShowCount: number;

  @ApiProperty({
    description: 'Nombre de litiges',
    example: 1,
  })
  disputeCount: number;

  @ApiProperty({
    description: 'Taux de litiges (%)',
    example: 6.67,
  })
  disputeRate: number;

  @ApiProperty({
    description: 'Niveau de risque',
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    example: 'LOW',
  })
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';

  @ApiProperty({
    description: 'Statut VIP (score > 100 + 10 missions)',
    example: true,
  })
  vipStatus: boolean;
}

/**
 * DTO pour un élément d'historique de réputation
 */
export class ReputationHistoryItemDto {
  @ApiProperty({
    description: 'ID de l\'entrée',
    example: 'uuid-history-123',
  })
  id: string;

  @ApiProperty({
    description: 'Action effectuée',
    enum: ReputationAction,
    example: 'MISSION_COMPLETED',
  })
  action: ReputationAction;

  @ApiProperty({
    description: 'Changement de points',
    example: 10,
  })
  pointsChange: number;

  @ApiProperty({
    description: 'Score précédent',
    example: 105,
  })
  previousScore: number;

  @ApiProperty({
    description: 'Nouveau score',
    example: 115,
  })
  newScore: number;

  @ApiPropertyOptional({
    description: 'Raison du changement',
    example: 'Mission complétée avec succès',
  })
  reason?: string;

  @ApiPropertyOptional({
    description: 'ID de la mission liée',
    example: 'uuid-mission-123',
  })
  relatedMissionId?: string;

  @ApiProperty({
    description: 'Date de création',
    example: '2025-11-08T14:30:00Z',
  })
  createdAt: Date;
}

/**
 * DTO pour la réponse d'historique de réputation
 */
export class ReputationHistoryResponseDto {
  @ApiProperty({
    description: 'Historique de réputation',
    type: [ReputationHistoryItemDto],
  })
  history: ReputationHistoryItemDto[];

  @ApiProperty({
    description: 'Nombre total d\'entrées',
    example: 23,
  })
  total: number;
}
