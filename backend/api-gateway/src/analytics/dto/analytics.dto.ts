import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class MatchingQueryDto {
  @IsString()
  category: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsNumber()
  @IsOptional()
  estimatedBudget?: number;
}

export class ArtisanRecommendation {
  artisanId: string;
  artisan: any;
  score: number;
  reasons: string[];
  distance?: number;
  matchFactors: {
    proximityScore: number;
    ratingScore: number;
    experienceScore: number;
    availabilityScore: number;
    priceScore: number;
    specialtyScore: number;
  };
}
