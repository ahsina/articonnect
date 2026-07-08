import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const SHIFT_TYPES = ['REGULAR', 'OVERTIME', 'ONCALL', 'BREAK'] as const;
const REPEAT_PATTERNS = ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const;

export class CreateShiftDto {
  @ApiProperty({ description: 'CompanyEmployee ID' })
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty({ description: 'Shift start time (ISO 8601)' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: 'Shift end time (ISO 8601)' })
  @IsDateString()
  endTime: string;

  @ApiProperty({ enum: SHIFT_TYPES })
  @IsEnum(SHIFT_TYPES)
  shiftType: (typeof SHIFT_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkScheduleDto {
  @ApiProperty({ description: 'List of CompanyEmployee IDs', type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  employeeIds: string[];

  @ApiProperty({ description: 'Shift start time (ISO 8601)' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: 'Shift end time (ISO 8601)' })
  @IsDateString()
  endTime: string;

  @ApiProperty({ enum: SHIFT_TYPES })
  @IsEnum(SHIFT_TYPES)
  shiftType: (typeof SHIFT_TYPES)[number];

  @ApiPropertyOptional({ enum: REPEAT_PATTERNS })
  @IsOptional()
  @IsEnum(REPEAT_PATTERNS)
  repeatPattern?: (typeof REPEAT_PATTERNS)[number];

  @ApiPropertyOptional({ description: 'Number of repetitions', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  repeatCount?: number;
}
