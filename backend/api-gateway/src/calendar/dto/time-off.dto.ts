import { IsEnum, IsDateString, IsString, IsOptional } from 'class-validator';
import { TimeOffType, TimeOffStatus } from '@prisma/client';

export class CreateTimeOffDto {
  @IsEnum(TimeOffType)
  type: TimeOffType;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class ApproveTimeOffDto {
  @IsEnum(TimeOffStatus)
  status: TimeOffStatus;
}
