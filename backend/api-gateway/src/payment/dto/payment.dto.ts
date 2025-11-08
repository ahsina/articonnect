import { IsString, IsNumber, IsEnum, IsOptional, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RefundReason } from '@prisma/client';

/**
 * DTO pour créer un paiement d'acompte
 */
export class CreateDepositPaymentDto {
  @ApiProperty({
    description: 'ID de la mission',
    example: 'uuid-mission-123',
  })
  @IsString()
  missionId: string;
}

/**
 * DTO pour demander un remboursement
 */
export class RequestRefundDto {
  @ApiProperty({
    description: 'ID de la mission',
    example: 'uuid-mission-123',
  })
  @IsString()
  missionId: string;

  @ApiProperty({
    description: 'Raison du remboursement',
    enum: RefundReason,
    example: 'WORK_NOT_DONE',
  })
  @IsEnum(RefundReason)
  reason: RefundReason;

  @ApiPropertyOptional({
    description: 'Montant du remboursement (optionnel, sinon remboursement total)',
    example: 50.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({
    description: 'Justification du remboursement',
    example: 'Le travail n\'a pas été fait correctement',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * DTO pour la réponse de création de paiement
 */
export class PaymentIntentResponseDto {
  @ApiProperty({
    description: 'Client secret Stripe pour finaliser le paiement',
    example: 'pi_xxx_secret_yyy',
  })
  clientSecret: string;

  @ApiProperty({
    description: 'Montant du paiement en euros',
    example: 150.0,
  })
  amount: number;

  @ApiPropertyOptional({
    description: 'Montant de l\'acompte (si applicable)',
    example: 50.0,
  })
  depositAmount?: number;

  @ApiPropertyOptional({
    description: 'Pourcentage de l\'acompte',
    example: 30,
  })
  depositPercentage?: number;
}

/**
 * DTO pour la réponse de remboursement
 */
export class RefundResponseDto {
  @ApiProperty({
    description: 'Succès de l\'opération',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Message de confirmation',
    example: 'Client remboursé et artisan compensé',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Coût total pour la plateforme (si applicable)',
    example: 200.0,
  })
  platformCost?: number;

  @ApiPropertyOptional({
    description: 'Litige créé automatiquement',
    example: true,
  })
  disputeCreated?: boolean;

  @ApiPropertyOptional({
    description: 'Compensation payée à l\'artisan',
    example: 20.0,
  })
  compensationPaid?: number;
}
