import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Politique de frais de port d'un vendeur (1 par artisan, clé = artisanId).
 * Utilisée en UPSERT : tous les champs sont optionnels pour permettre une mise à jour partielle.
 * `freeThreshold` accepte `null` pour désactiver le franco de port (grâce à @IsOptional, qui neutralise
 * les validateurs quand la valeur est `null`/`undefined`).
 */
export class UpdateShippingPolicyDto {
  @ApiProperty({ required: false, example: false, description: 'Livraison toujours gratuite' })
  @IsOptional()
  @IsBoolean()
  freeShipping?: boolean;

  @ApiProperty({ required: false, example: 5.99, description: 'Forfait de port (€) appliqué par défaut' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  flatRate?: number;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 50,
    description: 'Franco de port : sous-total vendeur ≥ ce montant ⇒ port gratuit. null = désactivé.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  freeThreshold?: number | null;
}
