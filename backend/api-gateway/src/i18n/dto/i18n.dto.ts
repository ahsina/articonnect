import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsArray,
  ValidateNested,
  IsObject,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SupportedLocale {
  FR = 'fr',
  EN = 'en',
  DE = 'de',
  ES = 'es',
  IT = 'it',
  NL = 'nl',
  PT = 'pt',
  AR = 'ar',
  TR = 'tr',
  PL = 'pl',
  RO = 'ro',
  BE = 'be',
  CH = 'ch',
}

export enum TextDirection {
  LTR = 'ltr',
  RTL = 'rtl',
}

export enum TranslationStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum TranslationNamespace {
  COMMON = 'common',
  AUTH = 'auth',
  DASHBOARD = 'dashboard',
  MISSIONS = 'missions',
  MARKETPLACE = 'marketplace',
  ARTISANS = 'artisans',
  ADMIN = 'admin',
  NOTIFICATIONS = 'notifications',
  EMAILS = 'emails',
  ERRORS = 'errors',
  VALIDATION = 'validation',
}

export class LocaleConfigDto {
  @IsEnum(SupportedLocale)
  code: SupportedLocale;

  @IsString()
  name: string;

  @IsString()
  nativeName: string;

  @IsEnum(TextDirection)
  direction: TextDirection;

  @IsString()
  @IsOptional()
  flag?: string;

  @IsString()
  @IsOptional()
  dateFormat?: string;

  @IsString()
  @IsOptional()
  timeFormat?: string;

  @IsString()
  @IsOptional()
  currencyCode?: string;

  @IsString()
  @IsOptional()
  currencySymbol?: string;

  @IsString()
  @IsOptional()
  numberFormat?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class CreateLocaleDto {
  @IsEnum(SupportedLocale)
  code: SupportedLocale;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  nativeName: string;

  @IsEnum(TextDirection)
  direction: TextDirection;

  @IsString()
  @IsOptional()
  flag?: string;

  @IsString()
  @IsOptional()
  dateFormat?: string;

  @IsString()
  @IsOptional()
  timeFormat?: string;

  @IsString()
  @IsOptional()
  currencyCode?: string;

  @IsString()
  @IsOptional()
  currencySymbol?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateLocaleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  nativeName?: string;

  @IsEnum(TextDirection)
  @IsOptional()
  direction?: TextDirection;

  @IsString()
  @IsOptional()
  flag?: string;

  @IsString()
  @IsOptional()
  dateFormat?: string;

  @IsString()
  @IsOptional()
  timeFormat?: string;

  @IsString()
  @IsOptional()
  currencyCode?: string;

  @IsString()
  @IsOptional()
  currencySymbol?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class TranslationKeyDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsEnum(TranslationNamespace)
  namespace: TranslationNamespace;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  context?: string;

  @IsBoolean()
  @IsOptional()
  isPlural?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  variables?: string[];
}

export class CreateTranslationDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsEnum(TranslationNamespace)
  namespace: TranslationNamespace;

  @IsEnum(SupportedLocale)
  locale: SupportedLocale;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  @IsOptional()
  pluralValue?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  context?: string;

  @IsEnum(TranslationStatus)
  @IsOptional()
  status?: TranslationStatus;
}

export class UpdateTranslationDto {
  @IsString()
  @IsOptional()
  value?: string;

  @IsString()
  @IsOptional()
  pluralValue?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  context?: string;

  @IsEnum(TranslationStatus)
  @IsOptional()
  status?: TranslationStatus;
}

export class BulkTranslationDto {
  @IsEnum(SupportedLocale)
  locale: SupportedLocale;

  @IsEnum(TranslationNamespace)
  namespace: TranslationNamespace;

  @IsObject()
  translations: Record<string, string>;
}

export class BulkUpdateTranslationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTranslationDto)
  translations: CreateTranslationDto[];
}

export class ImportTranslationsDto {
  @IsEnum(SupportedLocale)
  locale: SupportedLocale;

  @IsEnum(TranslationNamespace)
  @IsOptional()
  namespace?: TranslationNamespace;

  @IsObject()
  data: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  overwrite?: boolean;

  @IsBoolean()
  @IsOptional()
  createMissing?: boolean;
}

export class ExportTranslationsDto {
  @IsEnum(SupportedLocale)
  @IsOptional()
  locale?: SupportedLocale;

  @IsEnum(TranslationNamespace)
  @IsOptional()
  namespace?: TranslationNamespace;

  @IsEnum(TranslationStatus)
  @IsOptional()
  status?: TranslationStatus;

  @IsString()
  @IsOptional()
  format?: 'json' | 'csv' | 'xliff';
}

export class TranslationFilterDto {
  @IsEnum(SupportedLocale)
  @IsOptional()
  locale?: SupportedLocale;

  @IsEnum(TranslationNamespace)
  @IsOptional()
  namespace?: TranslationNamespace;

  @IsEnum(TranslationStatus)
  @IsOptional()
  status?: TranslationStatus;

  @IsString()
  @IsOptional()
  search?: string;

  @IsBoolean()
  @IsOptional()
  missingOnly?: boolean;

  @IsBoolean()
  @IsOptional()
  outdatedOnly?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}

export class LocaleDetectionDto {
  @IsString()
  @IsOptional()
  acceptLanguage?: string;

  @IsString()
  @IsOptional()
  browserLocale?: string;

  @IsString()
  @IsOptional()
  userPreference?: string;

  @IsString()
  @IsOptional()
  ipCountry?: string;
}

export class SetUserLocaleDto {
  @IsEnum(SupportedLocale)
  locale: SupportedLocale;

  @IsBoolean()
  @IsOptional()
  saveAsDefault?: boolean;
}

export class TranslationComparisonDto {
  @IsEnum(SupportedLocale)
  sourceLocale: SupportedLocale;

  @IsEnum(SupportedLocale)
  targetLocale: SupportedLocale;

  @IsEnum(TranslationNamespace)
  @IsOptional()
  namespace?: TranslationNamespace;
}

export class MachineTranslationDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsEnum(SupportedLocale)
  sourceLocale: SupportedLocale;

  @IsEnum(SupportedLocale)
  targetLocale: SupportedLocale;

  @IsString()
  @IsOptional()
  context?: string;
}

export class BulkMachineTranslationDto {
  @IsArray()
  @IsString({ each: true })
  keys: string[];

  @IsEnum(SupportedLocale)
  sourceLocale: SupportedLocale;

  @IsEnum(SupportedLocale)
  targetLocale: SupportedLocale;

  @IsEnum(TranslationNamespace)
  @IsOptional()
  namespace?: TranslationNamespace;

  @IsBoolean()
  @IsOptional()
  overwrite?: boolean;
}

export class TranslationValidationDto {
  @IsEnum(SupportedLocale)
  locale: SupportedLocale;

  @IsEnum(TranslationNamespace)
  @IsOptional()
  namespace?: TranslationNamespace;
}

export class ApproveTranslationDto {
  @IsArray()
  @IsString({ each: true })
  translationIds: string[];

  @IsString()
  @IsOptional()
  comment?: string;
}

export class RejectTranslationDto {
  @IsArray()
  @IsString({ each: true })
  translationIds: string[];

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class TranslationHistoryFilterDto {
  @IsString()
  @IsOptional()
  translationId?: string;

  @IsString()
  @IsOptional()
  key?: string;

  @IsEnum(SupportedLocale)
  @IsOptional()
  locale?: SupportedLocale;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}

export class PluralRulesDto {
  @IsEnum(SupportedLocale)
  locale: SupportedLocale;

  @IsString()
  @IsNotEmpty()
  key: string;

  @IsObject()
  forms: {
    zero?: string;
    one: string;
    two?: string;
    few?: string;
    many?: string;
    other: string;
  };
}

export class InterpolationTestDto {
  @IsString()
  @IsNotEmpty()
  template: string;

  @IsObject()
  variables: Record<string, any>;

  @IsEnum(SupportedLocale)
  @IsOptional()
  locale?: SupportedLocale;
}
