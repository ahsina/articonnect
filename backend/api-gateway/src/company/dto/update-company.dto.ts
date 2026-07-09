import { IsString, IsOptional, IsNumber, Min, Max, IsUrl, MaxLength, Matches, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateCompanyDto {
  @ApiPropertyOptional({ description: 'Company name', example: 'Krafolt SARL' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  companyName?: string;

  @ApiPropertyOptional({ description: 'SIRET number (France)', example: '12345678901234' })
  @IsOptional()
  @ValidateIf((o) => o.siret !== '' && o.siret != null)
  @IsString()
  @Matches(/^[0-9]{14}$/, { message: 'SIRET must be 14 digits' })
  siret?: string;

  @ApiPropertyOptional({ description: 'VAT number', example: 'FR12345678901' })
  @IsOptional()
  @IsString()
  vatNumber?: string;

  @ApiPropertyOptional({ description: 'Company description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Company website URL', example: 'https://example.com' })
  @IsOptional()
  @ValidateIf((o) => o.website !== '' && o.website != null)
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ description: 'Base address', example: '123 Rue de la Paix' })
  @IsOptional()
  @IsString()
  baseAddress?: string;

  @ApiPropertyOptional({ description: 'City', example: 'Paris' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Postal code', example: '75001' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Latitude', example: 48.8566 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude', example: 2.3522 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({ description: 'Service radius in km', example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  serviceRadius?: number;

  @ApiPropertyOptional({ description: 'Logo URL (S3)' })
  @IsOptional()
  @ValidateIf((o) => o.logo !== '' && o.logo != null)
  @IsString()
  @IsUrl()
  logo?: string;
}
