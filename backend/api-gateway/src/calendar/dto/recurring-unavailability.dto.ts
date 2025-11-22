import {
  IsEnum,
  IsString,
  IsDateString,
  IsOptional,
  IsInt,
  Min,
  Max,
  Matches,
  IsBoolean,
} from 'class-validator';
import { RecurrencePattern, DayOfWeek } from '@prisma/client';

export class CreateRecurringUnavailabilityDto {
  @IsString()
  title: string;

  @IsEnum(RecurrencePattern)
  pattern: RecurrencePattern;

  @IsEnum(DayOfWeek)
  @IsOptional()
  dayOfWeek?: DayOfWeek;

  @IsInt()
  @Min(1)
  @Max(31)
  @IsOptional()
  dayOfMonth?: number;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  startTime: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  endTime: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}

export class UpdateRecurringUnavailabilityDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
