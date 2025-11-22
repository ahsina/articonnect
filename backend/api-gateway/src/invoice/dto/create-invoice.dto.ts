import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsArray, IsDateString, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceType } from '@prisma/client';

export class InvoiceLineItemDto {
  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty()
  @IsNumber()
  unitPrice: number;

  @ApiProperty()
  @IsNumber()
  total: number;
}

export class InvoiceAddressDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  address: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsString()
  postalCode: string;

  @ApiProperty()
  @IsString()
  country: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  siret?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vat?: string;
}

export class CreateInvoiceDto {
  @ApiProperty({ enum: InvoiceType })
  @IsEnum(InvoiceType)
  type: InvoiceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  missionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  noShowEventId?: string;

  @ApiProperty()
  @IsString()
  issuerId: string; // Artisan

  @ApiProperty()
  @IsString()
  clientId: string;

  @ApiProperty()
  @IsNumber()
  subtotal: number;

  @ApiProperty()
  @IsNumber()
  taxRate: number;

  @ApiProperty({ type: [InvoiceLineItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  lineItems: InvoiceLineItemDto[];

  @ApiProperty({ type: InvoiceAddressDto })
  @IsObject()
  @ValidateNested()
  @Type(() => InvoiceAddressDto)
  issuerAddress: InvoiceAddressDto;

  @ApiProperty({ type: InvoiceAddressDto })
  @IsObject()
  @ValidateNested()
  @Type(() => InvoiceAddressDto)
  clientAddress: InvoiceAddressDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paymentDueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
