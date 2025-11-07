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
