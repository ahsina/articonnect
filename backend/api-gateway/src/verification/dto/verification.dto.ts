import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum Country {
  FRANCE = 'FR',
  LUXEMBOURG = 'LU',
  BELGIUM = 'BE',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
}

/**
 * DTO for verifying business registration numbers
 * Supports FR (SIRET), LU (RCS), BE (KBO/BCE)
 */
export class VerifyBusinessDto {
  @IsEnum(Country)
  @IsNotEmpty()
  country: Country;

  @IsString()
  @IsNotEmpty()
  registrationNumber: string; // SIRET (FR), RCS (LU), KBO (BE)

  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  vatNumber?: string; // TVA intracommunautaire
}

/**
 * Unified business verification result
 */
export class BusinessVerificationResult {
  verified: boolean;
  country: Country;
  registrationNumber: string;
  companyName: string;
  legalForm: string;
  address: string;
  isActive: boolean;
  creationDate?: Date;
  activityCode?: string; // NAF (FR), NACE (BE/LU)
  activityDescription?: string;
  employeeCount?: string;
  vatNumber?: string;
  errors?: string[];
  warnings?: string[];
  lastVerifiedAt: Date;
}

/**
 * France-specific SIRET verification
 */
export class SiretVerificationResult {
  verified: boolean;
  siret: string;
  siren: string;
  companyName: string;
  legalForm: string;
  address: string;
  isActive: boolean;
  creationDate: Date;
  nafCode: string; // APE code
  nafLabel: string;
  employeeCount?: string;
  errors?: string[];
  warnings?: string[];
}

/**
 * Luxembourg-specific RCS verification
 */
export class RcsVerificationResult {
  verified: boolean;
  rcsNumber: string;
  companyName: string;
  legalForm: string;
  address: string;
  isActive: boolean;
  registrationDate: Date;
  naceCode?: string;
  errors?: string[];
  warnings?: string[];
}

/**
 * Belgium-specific KBO/BCE verification
 */
export class KboVerificationResult {
  verified: boolean;
  kboNumber: string;
  companyName: string;
  legalForm: string;
  address: string;
  isActive: boolean;
  startDate: Date;
  naceCode?: string;
  vatNumber?: string;
  errors?: string[];
  warnings?: string[];
}

/**
 * Identity verification DTO
 */
export class IdentityVerificationDto {
  @IsEnum(['ID_CARD', 'PASSPORT', 'DRIVER_LICENSE'])
  @IsNotEmpty()
  documentType: 'ID_CARD' | 'PASSPORT' | 'DRIVER_LICENSE';

  @IsString()
  @IsNotEmpty()
  documentNumber: string;

  @IsString()
  @IsNotEmpty()
  documentFrontUrl: string;

  @IsString()
  @IsOptional()
  documentBackUrl?: string;

  @IsString()
  @IsNotEmpty()
  selfieUrl: string;

  @IsEnum(Country)
  @IsNotEmpty()
  issuingCountry: Country;
}

/**
 * Admin rejection DTO — motif obligatoire (tracé dans les warnings du profil).
 */
export class RejectVerificationDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

/**
 * Manual verification request DTO
 */
export class ManualVerificationRequestDto {
  @IsString()
  @IsNotEmpty()
  artisanId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
