import { IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CompanyQueryDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 20, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by country', enum: ['FR', 'LU', 'BE'] })
  @IsOptional()
  @IsEnum(['FR', 'LU', 'BE'])
  country?: string;

  @ApiPropertyOptional({ description: 'Filter by verification status' })
  @IsOptional()
  @IsEnum(['PENDING', 'VERIFIED', 'REJECTED', 'MANUAL_REVIEW'])
  verificationStatus?: string;

  @ApiPropertyOptional({ description: 'Sort by field', enum: ['createdAt', 'totalMissions', 'averageRating'] })
  @IsOptional()
  @IsEnum(['createdAt', 'totalMissions', 'averageRating'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
