import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, IsUrl, IsEnum, IsDecimal, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCompanyDto {
  @ApiProperty({ description: 'Company name', example: 'ArtiConnect SARL' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  companyName: string;

  @ApiProperty({ description: 'SIRET number (France)', example: '12345678901234' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{14}$/, { message: 'SIRET must be 14 digits' })
  siret: string;

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
  @IsUrl()
  website?: string;

  @ApiProperty({ description: 'Base address', example: '123 Rue de la Paix' })
  @IsString()
  @IsNotEmpty()
  baseAddress: string;

  @ApiProperty({ description: 'City', example: 'Paris' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'Postal code', example: '75001' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiProperty({ description: 'Country code', example: 'FR', enum: ['FR', 'LU', 'BE'] })
  @IsEnum(['FR', 'LU', 'BE'])
  country: string;

  @ApiProperty({ description: 'Latitude', example: 48.8566 })
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @ApiProperty({ description: 'Longitude', example: 2.3522 })
  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @ApiPropertyOptional({ description: 'Service radius in km', example: 20, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  serviceRadius?: number;

  @ApiPropertyOptional({ description: 'Business registration number' })
  @IsOptional()
  @IsString()
  businessRegistrationNumber?: string;

  @ApiPropertyOptional({ description: 'Legal form (SARL, SPRL, etc.)' })
  @IsOptional()
  @IsString()
  businessLegalForm?: string;

  @ApiPropertyOptional({ description: 'Activity code (NAF, NACE)' })
  @IsOptional()
  @IsString()
  businessActivityCode?: string;
}
