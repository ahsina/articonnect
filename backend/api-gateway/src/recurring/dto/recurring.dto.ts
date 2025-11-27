import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDateString,
  IsUUID,
  IsEnum,
  Min,
  Max,
} from 'class-validator';

export enum RecurringFrequency {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  BIANNUALLY = 'BIANNUALLY',
  ANNUALLY = 'ANNUALLY',
}

export enum RecurringServiceStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  PENDING_RENEWAL = 'PENDING_RENEWAL',
}

export class CreateRecurringServiceDto {
  @IsUUID()
  clientId: string;

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

  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsString()
  postalCode: string;

  @IsString()
  country: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsEnum(RecurringFrequency)
  frequency: RecurringFrequency;

  @IsNumber()
  @Min(0)
  @Max(6)
  @IsOptional()
  scheduledDayOfWeek?: number;

  @IsNumber()
  @Min(1)
  @Max(31)
  @IsOptional()
  scheduledDayOfMonth?: number;

  @IsNumber()
  @Min(1)
  @Max(12)
  @IsOptional()
  scheduledMonth?: number;

  @IsString()
  @IsOptional()
  preferredTimeSlot?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @Min(0)
  servicePrice: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  discountPercent?: number;

  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean;

  @IsNumber()
  @IsOptional()
  renewalNotifyDays?: number;

  @IsBoolean()
  @IsOptional()
  autoCharge?: boolean;

  @IsString()
  @IsOptional()
  paymentMethodId?: string;

  @IsString()
  @IsOptional()
  serviceNotes?: string;

  @IsString()
  @IsOptional()
  accessInstructions?: string;

  @IsString()
  @IsOptional()
  internalNotes?: string;
}

export class UpdateRecurringServiceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  preferredTimeSlot?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  servicePrice?: number;

  @IsNumber()
  @IsOptional()
  discountPercent?: number;

  @IsEnum(RecurringServiceStatus)
  @IsOptional()
  status?: RecurringServiceStatus;

  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean;

  @IsBoolean()
  @IsOptional()
  autoCharge?: boolean;

  @IsString()
  @IsOptional()
  serviceNotes?: string;

  @IsString()
  @IsOptional()
  accessInstructions?: string;

  @IsString()
  @IsOptional()
  internalNotes?: string;
}

export class RecurringServiceFilterDto {
  @IsEnum(RecurringServiceStatus)
  @IsOptional()
  status?: RecurringServiceStatus;

  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}
