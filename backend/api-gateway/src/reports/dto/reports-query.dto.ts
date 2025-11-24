import { IsOptional, IsDateString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ReportsQueryDto {
  @ApiPropertyOptional({ description: 'Start date for the report period (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for the report period (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class RevenueReportQueryDto extends ReportsQueryDto {
  @ApiPropertyOptional({ enum: ['day', 'week', 'month'], default: 'month' })
  @IsOptional()
  @IsEnum(['day', 'week', 'month'])
  groupBy?: 'day' | 'week' | 'month' = 'month';
}

export class ProductivityTrendsQueryDto {
  @ApiPropertyOptional({ description: 'Number of months to analyze', default: 6, minimum: 1, maximum: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  months?: number = 6;
}

export class PerformanceOverviewQueryDto {
  @ApiPropertyOptional({ description: 'Number of days to include', default: 30, minimum: 1, maximum: 365 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number = 30;
}
