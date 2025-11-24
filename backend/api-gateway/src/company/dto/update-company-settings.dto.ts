import { IsBoolean, IsOptional, IsNumber, Min, IsEnum, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateCompanySettingsDto {
  @ApiPropertyOptional({ description: 'Default commission rate for employees (0-100)', example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Min(100)
  @Type(() => Number)
  defaultCommissionRate?: number;

  @ApiPropertyOptional({ description: 'Owner commission rate (0-100)', example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Min(100)
  @Type(() => Number)
  ownerCommissionRate?: number;

  @ApiPropertyOptional({ description: 'Auto-assign missions to employees', default: false })
  @IsOptional()
  @IsBoolean()
  autoAssignMissions?: boolean;

  @ApiPropertyOptional({ description: 'Require manager approval for missions', default: false })
  @IsOptional()
  @IsBoolean()
  requireManagerApproval?: boolean;

  @ApiPropertyOptional({ description: 'Allow employees to self-assign missions', default: true })
  @IsOptional()
  @IsBoolean()
  allowEmployeeSelfAssignment?: boolean;

  @ApiPropertyOptional({ description: 'Payout frequency', enum: ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'], default: 'WEEKLY' })
  @IsOptional()
  @IsEnum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'])
  payoutFrequency?: string;

  @ApiPropertyOptional({ description: 'Minimum payout amount', example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minimumPayout?: number;

  @ApiPropertyOptional({ description: 'Notify owner on new missions', default: true })
  @IsOptional()
  @IsBoolean()
  notifyOwnerOnNewMission?: boolean;

  @ApiPropertyOptional({ description: 'Notify manager on new missions', default: true })
  @IsOptional()
  @IsBoolean()
  notifyManagerOnNewMission?: boolean;

  @ApiPropertyOptional({ description: 'Notify employee on assignment', default: true })
  @IsOptional()
  @IsBoolean()
  notifyEmployeeOnAssignment?: boolean;

  @ApiPropertyOptional({ description: 'Default working hours start time', example: '09:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Time must be in HH:mm format' })
  defaultWorkingHoursStart?: string;

  @ApiPropertyOptional({ description: 'Default working hours end time', example: '18:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Time must be in HH:mm format' })
  defaultWorkingHoursEnd?: string;
}
