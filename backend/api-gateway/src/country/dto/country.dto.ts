import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsUUID,
  IsEnum,
  IsObject,
  IsDate,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCountryConfigDto {
  @IsString()
  @Length(2, 2)
  countryCode: string; // ISO 3166-1 alpha-2 (FR, DE, GB, CH, etc.)

  @IsString()
  name: string;

  @IsString()
  defaultCurrency: string; // ISO 4217 currency code

  @IsString()
  defaultLanguage: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  dateFormat?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  defaultVatRate: number;

  @IsObject()
  @IsOptional()
  vatRates?: Record<string, number>; // { 'standard': 20, 'reduced': 10, 'super-reduced': 5.5 }

  @IsString()
  @IsOptional()
  vatNumberFormat?: string; // Regex pattern for VAT validation

  @IsString()
  @IsOptional()
  phoneFormat?: string;

  @IsString()
  @IsOptional()
  postalCodeFormat?: string;

  @IsObject()
  @IsOptional()
  invoiceRequirements?: Record<string, any>;

  @IsObject()
  @IsOptional()
  paymentMethods?: Record<string, any>;

  @IsArray()
  @IsOptional()
  supportedTrades?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCountryConfigDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  defaultCurrency?: string;

  @IsString()
  @IsOptional()
  defaultLanguage?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  dateFormat?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  defaultVatRate?: number;

  @IsObject()
  @IsOptional()
  vatRates?: Record<string, number>;

  @IsString()
  @IsOptional()
  vatNumberFormat?: string;

  @IsString()
  @IsOptional()
  phoneFormat?: string;

  @IsString()
  @IsOptional()
  postalCodeFormat?: string;

  @IsObject()
  @IsOptional()
  invoiceRequirements?: Record<string, any>;

  @IsObject()
  @IsOptional()
  paymentMethods?: Record<string, any>;

  @IsArray()
  @IsOptional()
  supportedTrades?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export enum ComplianceCategory {
  CERTIFICATION = 'CERTIFICATION',
  INSURANCE = 'INSURANCE',
  LICENSE = 'LICENSE',
  REGISTRATION = 'REGISTRATION',
  QUALIFICATION = 'QUALIFICATION',
  SAFETY = 'SAFETY',
}

export class CreateComplianceRequirementDto {
  @IsString()
  @Length(2, 2)
  countryCode: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ComplianceCategory)
  category: ComplianceCategory;

  @IsArray()
  @IsOptional()
  applicableTrades?: string[]; // Empty = all trades

  @IsBoolean()
  isMandatory: boolean;

  @IsBoolean()
  @IsOptional()
  requiresDocument?: boolean;

  @IsBoolean()
  @IsOptional()
  hasExpiry?: boolean;

  @IsNumber()
  @IsOptional()
  validityPeriodMonths?: number;

  @IsNumber()
  @IsOptional()
  reminderDaysBefore?: number;

  @IsString()
  @IsOptional()
  verificationUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateComplianceRequirementDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ComplianceCategory)
  @IsOptional()
  category?: ComplianceCategory;

  @IsArray()
  @IsOptional()
  applicableTrades?: string[];

  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresDocument?: boolean;

  @IsBoolean()
  @IsOptional()
  hasExpiry?: boolean;

  @IsNumber()
  @IsOptional()
  validityPeriodMonths?: number;

  @IsNumber()
  @IsOptional()
  reminderDaysBefore?: number;

  @IsString()
  @IsOptional()
  verificationUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export enum ComplianceStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export class SubmitComplianceRecordDto {
  @IsUUID()
  requirementId: string;

  @IsString()
  @IsOptional()
  documentNumber?: string;

  @IsString()
  @IsOptional()
  documentUrl?: string;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  issuedAt?: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  expiresAt?: Date;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateComplianceRecordDto {
  @IsString()
  @IsOptional()
  documentNumber?: string;

  @IsString()
  @IsOptional()
  documentUrl?: string;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  issuedAt?: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  expiresAt?: Date;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class VerifyComplianceRecordDto {
  @IsEnum(ComplianceStatus)
  status: ComplianceStatus;

  @IsString()
  @IsOptional()
  verificationNotes?: string;
}
