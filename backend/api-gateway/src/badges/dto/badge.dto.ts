import { IsString, IsEnum, IsOptional, IsBoolean, Allow } from 'class-validator';
import { BadgeType, BadgeTier } from '@prisma/client';

export class CreateBadgeDto {
  @IsString()
  key: string;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsEnum(BadgeType)
  type: BadgeType;

  @IsEnum(BadgeTier)
  tier: BadgeTier;

  @Allow()
  criteria: any; // JSON object

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateBadgeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsOptional()
  criteria?: any;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
