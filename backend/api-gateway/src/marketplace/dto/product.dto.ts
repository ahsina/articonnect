import { IsString, IsNumber, IsOptional, IsArray, IsEnum, IsInt, Min, Max, MaxLength } from 'class-validator';
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

  @ApiProperty({
    example: 'lighting',
    description: 'ID de catégorie OU slug (ex "lighting"). Les deux sont acceptés.',
  })
  @IsString()
  category: string;

  @ApiProperty({ required: false, type: [String], example: ['https://example.com/image1.jpg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({
    required: false,
    type: [String],
    example: ['https://example.com/photo1.jpg'],
    description: 'Photos du produit (persistées sur Product.photos). Alias accepté : `images`.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

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

  @ApiProperty({ required: false, description: 'ID de catégorie OU slug (les deux acceptés)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ required: false, type: [String], description: 'Photos du produit. Alias accepté : `images`.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

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

export class CreateProductReviewDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5, description: 'Note de 1 à 5 étoiles' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ required: false, example: 'Produit de très bonne qualité, livraison rapide.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class ReplyProductReviewDto {
  @ApiProperty({ example: 'Merci pour votre retour, ravi que le produit vous plaise !' })
  @IsString()
  @MaxLength(2000)
  reply: string;
}

export interface ProductFilters {
  category?: string;
  search?: string;
  artisanId?: string;
  status?: ProductStatus;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: 'price' | 'rating' | 'newest' | 'popular';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
