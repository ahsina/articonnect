import { IsString, IsNumber, IsOptional, IsBoolean, Min, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNegotiationDto {
  // Optionnel dans le body : le contrôleur le renseigne depuis le param d'URL (:id).
  @ApiProperty({ example: 'mission-id-123', required: false })
  @IsOptional()
  @IsString()
  missionId: string;

  // Multi-offres : permet au CLIENT de contre-proposer à un artisan précis (parmi ceux qui ont
  // déjà fait une offre) quand aucun artisan n'est encore assigné à la mission. Ignoré côté artisan.
  @ApiProperty({
    required: false,
    example: 'artisan-id-456',
    description: 'Artisan ciblé par la contre-offre du client (mission multi-offres, non assignée)'
  })
  @IsOptional()
  @IsString()
  targetArtisanId?: string;

  @ApiProperty({ example: 150.50, description: 'Prix total proposé (minimum 1€)' })
  @IsNumber()
  // Intégrité commission : un prix >= 1€ (jamais 0) empêche un "prix de façade" à 0 qui
  // produirait une commission nulle (0 * taux = 0) tout en réglant le vrai montant en cash
  // hors plateforme. Le plancher de prix garantit une assiette de commission strictement positive.
  @Min(1)
  proposedPrice: number;

  @ApiProperty({
    required: false,
    example: 120.00,
    description: 'Coût de la main d\'œuvre (optionnel)'
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  laborCost?: number;

  @ApiProperty({
    required: false,
    example: 50.00,
    description: 'Coût du matériel (optionnel)'
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  materialCost?: number;

  @ApiProperty({
    required: false,
    example: 30.00,
    description: 'Frais de déplacement (optionnel)'
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  travelCost?: number;

  @ApiProperty({ required: false, example: 'Je peux faire le travail pour ce prix' })
  @IsOptional()
  @IsString()
  message?: string;

  // Disponibilité proposée par l'artisan : le client compare le délai autant que le prix.
  // Texte libre court (ex "Dès demain matin", "Sous 48h"). Non filtré anti-coordonnées à ce stade
  // (pas un canal de message libre : format attendu court), longueur bornée pour éviter les abus.
  @ApiProperty({
    required: false,
    example: 'Dès demain matin',
    description: 'Disponibilité proposée (texte court, max 120 caractères)'
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  availability?: string;

  @ApiProperty({
    required: false,
    example: '~1 journée',
    description: 'Durée estimée des travaux (texte court, max 120 caractères)'
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  estimatedDuration?: string;
}

export class AcceptNegotiationDto {
  @ApiProperty()
  @IsBoolean()
  accepted: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  rejectedReason?: string;
}
