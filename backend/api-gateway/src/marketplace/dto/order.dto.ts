import { IsString, IsOptional, IsArray, IsNumber, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty({ example: 'uuid-product-id' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ required: false, example: 'uuid-variant-id' })
  @IsOptional()
  @IsString()
  variantId?: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ example: '10 Rue de la Gare, Luxembourg' })
  @IsString()
  shippingAddress: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ example: 'PAID' })
  @IsString()
  status: string;

  @ApiProperty({ required: false, example: 'LU123456789', description: 'Numéro de suivi (posé lors du passage à SHIPPED)' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;
}

export class ShipOrderDto {
  @ApiProperty({ required: false, example: 'LU123456789', description: 'Numéro de suivi transporteur' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;
}

export interface OrderSummary {
  subtotal: number;
  vat: number;
  shippingCost: number;
  total: number;
}
