import { IsString, IsNumber, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: 'uuid-mission-id' })
  @IsString()
  missionId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  overallRating: number;

  @ApiProperty({ required: false, example: 5, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  qualityRating?: number;

  @ApiProperty({ required: false, example: 5, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  punctualityRating?: number;

  @ApiProperty({ required: false, example: 5, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  communicationRating?: number;

  @ApiProperty({ required: false, example: 5, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  valueRating?: number;

  @ApiProperty({ required: false, example: 'Excellent travail, très professionnel !' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class UpdateReviewDto {
  @ApiProperty({ required: false, example: 5, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  overallRating?: number;

  @ApiProperty({ required: false, example: 5, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  qualityRating?: number;

  @ApiProperty({ required: false, example: 5, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  punctualityRating?: number;

  @ApiProperty({ required: false, example: 5, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  communicationRating?: number;

  @ApiProperty({ required: false, example: 5, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  valueRating?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}

/**
 * Artisan→Client Review DTO
 * Allows artisans to evaluate client behavior after mission completion
 */
export class CreateArtisanReviewDto {
  @ApiProperty({ example: 'uuid-mission-id' })
  @IsString()
  missionId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5, description: 'Overall client rating' })
  @IsNumber()
  @Min(1)
  @Max(5)
  overallRating: number;

  @ApiProperty({ required: false, example: 5, minimum: 1, maximum: 5, description: 'Request clarity' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  qualityRating?: number; // Request clarity

  @ApiProperty({ required: false, example: 5, minimum: 1, maximum: 5, description: 'Client availability' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  punctualityRating?: number; // Availability

  @ApiProperty({ required: false, example: 5, minimum: 1, maximum: 5, description: 'Communication quality' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  communicationRating?: number;

  @ApiProperty({ required: false, example: 5, minimum: 1, maximum: 5, description: 'Fair pricing expectations' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  valueRating?: number; // Fair pricing

  @ApiProperty({ required: false, example: 5, minimum: 1, maximum: 5, description: 'Payment promptness' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  paymentPromptness?: number;

  @ApiProperty({ required: false, example: 5, minimum: 1, maximum: 5, description: 'Respectful behavior' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  respectRating?: number;

  @ApiProperty({ required: false, example: 5, minimum: 1, maximum: 5, description: 'Safe work environment' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  safetyRating?: number;

  @ApiProperty({ required: false, example: 'Client très professionnel, bon contact !' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export interface ReviewResponse {
  id: string;
  missionId: string;
  reviewerId: string;
  reviewedId: string;
  overallRating: number;
  qualityRating?: number;
  punctualityRating?: number;
  communicationRating?: number;
  valueRating?: number;
  comment?: string;
  createdAt: Date;
  reviewer: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}
