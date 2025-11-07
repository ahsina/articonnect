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
  rating: number;

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
  rating?: number;

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
  rating: number;
  comment?: string;
  createdAt: Date;
  reviewer: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}
