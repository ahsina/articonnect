import { IsString, IsNumber, IsOptional, IsArray, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus } from '@prisma/client';

export class CreateProductDto {
  @ApiProperty({ example: 'Lustre LED moderne' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Lustre design avec éclairage LED économique' })
  @IsString()
  description: string;

  @ApiProperty({ example: 189.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ required: false, example: 17, description: 'VAT rate in percentage (Luxembourg standard is 17%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  vatRate?: number;

  @ApiProperty({ example: 'lighting' })
  @IsString()
  category: string;

  @ApiProperty({ required: false, type: [String], example: ['https://example.com/image1.jpg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({ required: false, example: 'LUS-LED-001' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ required: false, enum: ProductStatus, default: ProductStatus.DRAFT })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}

export class UpdateProductDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  vatRate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}

export interface ProductFilters {
  category?: string;
  search?: string;
  artisanId?: string;
  status?: ProductStatus;
}
