import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCertificationDto {
  @ApiProperty({ example: 'Certificat Électricien Agréé' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Ministère de l\'Économie Luxembourg' })
  @IsString()
  issuer: string;

  @ApiProperty({ example: '2020-01-15' })
  @IsDateString()
  issueDate: string;

  @ApiProperty({ required: false, example: '2025-01-15' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiProperty({ required: false, example: 'https://s3.../certificate.pdf' })
  @IsOptional()
  @IsString()
  document?: string;
}

export class UpdateCertificationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  issuer?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  document?: string;
}
