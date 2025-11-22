import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNegotiationDto {
  @ApiProperty({ example: 'mission-id-123' })
  @IsString()
  missionId: string;

  @ApiProperty({ example: 150.50, description: 'Prix total proposé' })
  @IsNumber()
  @Min(0)
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
