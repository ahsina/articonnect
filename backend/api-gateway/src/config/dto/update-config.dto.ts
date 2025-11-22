import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { ConfigCategory, ConfigDataType } from '@prisma/client';

export class UpdateConfigDto {
  @IsString()
  value: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateConfigDto {
  @IsString()
  key: string;

  @IsString()
  value: string;

  @IsEnum(ConfigDataType)
  dataType: ConfigDataType;

  @IsEnum(ConfigCategory)
  category: ConfigCategory;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
