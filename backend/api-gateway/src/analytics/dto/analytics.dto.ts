import { IsString, IsNumber, IsOptional, IsEnum, IsDate, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

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

// ============ ADVANCED ANALYTICS DTOs ============

export enum GoalPeriod {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export class CreateRevenueGoalDto {
  @IsEnum(GoalPeriod)
  period: GoalPeriod;

  @IsNumber()
  @Min(0)
  targetAmount: number;

  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateRevenueGoalDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  targetAmount?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class DateRangeDto {
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  endDate: Date;
}

export enum AnalyticsMetricType {
  REVENUE = 'REVENUE',
  MISSIONS = 'MISSIONS',
  CLIENTS = 'CLIENTS',
  QUOTES = 'QUOTES',
  CONVERSION = 'CONVERSION',
}

export class TrendAnalysisDto {
  @IsEnum(AnalyticsMetricType)
  metric: AnalyticsMetricType;

  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @IsString()
  @IsOptional()
  groupBy?: string; // 'day', 'week', 'month'
}

export class ForecastDto {
  @IsEnum(AnalyticsMetricType)
  metric: AnalyticsMetricType;

  @IsNumber()
  @Min(1)
  @Max(12)
  monthsAhead: number;
}

export class ProfitabilityQueryDto {
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endDate?: Date;

  @IsString()
  @IsOptional()
  groupBy?: string; // 'category', 'client', 'month'
}
