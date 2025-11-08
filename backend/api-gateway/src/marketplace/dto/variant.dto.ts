import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVariantDto {
  @ApiProperty({ example: 'Blanc chaud' })
  @IsString()
  name: string;

  @ApiProperty({ example: 15.0, description: 'Price adjustment (can be negative for discounts)' })
  @IsNumber()
  priceAdjustment: number;

  @ApiProperty({ example: 25 })
  @IsNumber()
  @Min(0)
  stock: number;
}

export class UpdateVariantDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  priceAdjustment?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;
}
