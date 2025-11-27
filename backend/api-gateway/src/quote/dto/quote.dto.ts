import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  ValidateNested,
  Min,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CONVERTED = 'CONVERTED',
}

export enum LineItemType {
  LABOR = 'LABOR',
  MATERIAL = 'MATERIAL',
  TRAVEL = 'TRAVEL',
  OTHER = 'OTHER',
}

export class CreateQuoteLineItemDto {
  @IsEnum(LineItemType)
  itemType: LineItemType;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsUUID()
  @IsOptional()
  catalogItemId?: string;

  @IsNumber()
  @IsOptional()
  position?: number;
}

export class CreateQuoteDto {
  @IsUUID()
  clientId: string;

  @IsUUID()
  @IsOptional()
  missionId?: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  category: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteLineItemDto)
  lineItems: CreateQuoteLineItemDto[];

  @IsNumber()
  @IsOptional()
  discountPercent?: number;

  @IsNumber()
  taxRate: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsDateString()
  validUntil: string;

  @IsUUID()
  @IsOptional()
  templateId?: string;

  @IsString()
  @IsOptional()
  termsAndConditions?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  internalNotes?: string;
}

export class UpdateQuoteDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteLineItemDto)
  @IsOptional()
  lineItems?: CreateQuoteLineItemDto[];

  @IsNumber()
  @IsOptional()
  discountPercent?: number;

  @IsNumber()
  @IsOptional()
  taxRate?: number;

  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @IsString()
  @IsOptional()
  termsAndConditions?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  internalNotes?: string;
}

export class SendQuoteDto {
  @IsString()
  @IsOptional()
  message?: string;
}

export class RespondToQuoteDto {
  @IsBoolean()
  accepted: boolean;

  @IsString()
  @IsOptional()
  signature?: string;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

export class CreateQuoteTemplateDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  category: string;

  @IsString()
  @IsOptional()
  trade?: string;

  @IsArray()
  defaultLineItems: any[];

  @IsString()
  @IsOptional()
  defaultTerms?: string;

  @IsNumber()
  @IsOptional()
  defaultValidityDays?: number;
}

export class CreateMaterialCatalogItemDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  category: string;

  @IsString()
  @IsOptional()
  trade?: string;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  supplierPrice?: number;

  @IsString()
  @IsOptional()
  supplierName?: string;

  @IsString()
  @IsOptional()
  supplierRef?: string;

  @IsBoolean()
  @IsOptional()
  trackStock?: boolean;

  @IsNumber()
  @IsOptional()
  currentStock?: number;

  @IsNumber()
  @IsOptional()
  minStockLevel?: number;
}

export class QuoteFilterDto {
  @IsEnum(QuoteStatus)
  @IsOptional()
  status?: QuoteStatus;

  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @IsDateString()
  @IsOptional()
  toDate?: string;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}
