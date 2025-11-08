import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO pour configurer les exigences d'acompte
 */
export class SetupDepositDto {
  @ApiProperty({
    description: 'Prix négocié et accepté',
    example: 150.0,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  agreedPrice: number;
}

/**
 * DTO pour démarrer le voyage
 */
export class StartTravelDto {
  @ApiProperty({
    description: 'ID de la mission',
    example: 'uuid-mission-123',
  })
  @IsString()
  missionId: string;
}

/**
 * DTO pour marquer l'arrivée
 */
export class MarkArrivalDto {
  @ApiProperty({
    description: 'ID de la mission',
    example: 'uuid-mission-123',
  })
  @IsString()
  missionId: string;
}

/**
 * DTO pour marquer la mission comme terminée
 */
export class MarkCompletedDto {
  @ApiProperty({
    description: 'ID de la mission',
    example: 'uuid-mission-123',
  })
  @IsString()
  missionId: string;
}

/**
 * DTO pour valider la mission (client)
 */
export class ValidateCompletionDto {
  @ApiProperty({
    description: 'ID de la mission',
    example: 'uuid-mission-123',
  })
  @IsString()
  missionId: string;
}

/**
 * DTO pour la réponse de configuration d'acompte
 */
export class DepositSetupResponseDto {
  @ApiProperty({
    description: 'Mission mise à jour',
  })
  mission: any;

  @ApiProperty({
    description: 'Modèle de paiement déterminé',
    example: {
      depositPercentage: 50,
      depositRequired: true,
      reason: 'Client établi - Acompte standard',
      clientRiskLevel: 'MEDIUM',
    },
  })
  paymentModel: {
    depositPercentage: number;
    depositRequired: boolean;
    reason: string;
    clientRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  };

  @ApiProperty({
    description: 'Montant de l\'acompte en euros',
    example: 75.0,
  })
  depositAmount: number;
}

/**
 * DTO pour la réponse de statut d'acompte
 */
export class DepositStatusResponseDto {
  @ApiProperty({
    description: 'Acompte requis',
    example: true,
  })
  depositRequired: boolean;

  @ApiProperty({
    description: 'Pourcentage de l\'acompte',
    example: 50,
  })
  depositPercentage: number;

  @ApiProperty({
    description: 'Montant de l\'acompte',
    example: 75.0,
  })
  depositAmount: number;

  @ApiProperty({
    description: 'Acompte payé',
    example: true,
  })
  depositPaid: boolean;

  @ApiPropertyOptional({
    description: 'Date de paiement de l\'acompte',
    example: '2025-11-08T10:30:00Z',
  })
  depositPaidAt?: Date;

  @ApiProperty({
    description: 'Score de réputation du client',
    example: 85,
  })
  clientReputation: number;

  @ApiPropertyOptional({
    description: 'Date d\'expiration de la période de rétractation',
    example: '2025-11-10T16:00:00Z',
  })
  retractionExpiresAt?: Date;
}

/**
 * DTO pour la réponse de validation de mission
 */
export class ValidationResponseDto {
  @ApiProperty({
    description: 'Mission mise à jour',
  })
  mission: any;

  @ApiProperty({
    description: 'Période de rétractation expirée',
    example: false,
  })
  retractionExpired: boolean;
}

/**
 * DTO pour la réponse de mission terminée
 */
export class CompletedResponseDto {
  @ApiProperty({
    description: 'Mission mise à jour',
  })
  mission: any;

  @ApiProperty({
    description: 'Date d\'expiration de la période de rétractation (48h)',
    example: '2025-11-10T16:00:00Z',
  })
  retractionExpiresAt: Date;

  @ApiProperty({
    description: 'Message d\'information',
    example: 'Mission terminée - Le client a 48h pour valider ou demander un remboursement',
  })
  message: string;
}
