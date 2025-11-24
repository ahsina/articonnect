import { IsEnum, IsOptional, IsNumber, Min, Max, IsArray, IsString, IsDate } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EmployeeRole, EmployeeStatus, PaymentModel } from '@prisma/client';

export class UpdateEmployeeDto {
  @ApiPropertyOptional({
    description: 'Employee role',
    enum: EmployeeRole
  })
  @IsOptional()
  @IsEnum(EmployeeRole)
  role?: EmployeeRole;

  @ApiPropertyOptional({
    description: 'Employee status',
    enum: EmployeeStatus
  })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional({
    description: 'Payment model',
    enum: PaymentModel
  })
  @IsOptional()
  @IsEnum(PaymentModel)
  paymentModel?: PaymentModel;

  @ApiPropertyOptional({
    description: 'Commission rate (0-100%)',
    example: 50,
    minimum: 0,
    maximum: 100
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  commissionRate?: number;

  @ApiPropertyOptional({
    description: 'Monthly base salary',
    example: 2500
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  baseSalary?: number;

  @ApiPropertyOptional({
    description: 'Hourly rate',
    example: 35
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  hourlyRate?: number;

  @ApiPropertyOptional({
    description: 'Specialty IDs',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialtyIds?: string[];

  @ApiPropertyOptional({
    description: 'Custom permissions array',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({
    description: 'Employment end date (for termination)',
    type: Date
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;
}
