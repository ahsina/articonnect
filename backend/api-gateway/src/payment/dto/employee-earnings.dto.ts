import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateEmployeeEarningsDto {
  @ApiProperty({
    description: 'Mission ID that generated the earnings',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsString()
  @IsNotEmpty()
  missionId: string;

  @ApiProperty({
    description: 'Employee ID receiving the earnings',
    example: '550e8400-e29b-41d4-a716-446655440001'
  })
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @ApiPropertyOptional({
    description: 'Optional notes about the earnings',
    example: 'Bonus for exceptional service'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEarningsStatusDto {
  @ApiProperty({
    description: 'Earnings status',
    enum: ['PENDING', 'PROCESSING', 'PAID', 'FAILED'],
    example: 'PAID'
  })
  @IsEnum(['PENDING', 'PROCESSING', 'PAID', 'FAILED'])
  status: string;

  @ApiPropertyOptional({
    description: 'Payout date',
    example: '2024-01-15T10:00:00Z'
  })
  @IsOptional()
  @IsDateString()
  payoutDate?: string;

  @ApiPropertyOptional({
    description: 'Stripe transfer ID',
    example: 'tr_1234567890'
  })
  @IsOptional()
  @IsString()
  stripeTransferId?: string;

  @ApiPropertyOptional({
    description: 'Status update notes',
    example: 'Payment processed via Stripe'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class EmployeeEarningsQueryDto {
  @ApiPropertyOptional({ description: 'Employee ID to filter by' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['PENDING', 'PROCESSING', 'PAID', 'FAILED']
  })
  @IsOptional()
  @IsEnum(['PENDING', 'PROCESSING', 'PAID', 'FAILED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Start date for filtering', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for filtering', example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 20, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}

export class ProcessPayoutDto {
  @ApiProperty({
    description: 'Array of earning IDs to process',
    type: [String],
    example: ['earning-id-1', 'earning-id-2']
  })
  @IsString({ each: true })
  @IsNotEmpty()
  earningIds: string[];

  @ApiPropertyOptional({
    description: 'Payout method',
    enum: ['STRIPE_TRANSFER', 'BANK_TRANSFER', 'MANUAL'],
    default: 'STRIPE_TRANSFER'
  })
  @IsOptional()
  @IsEnum(['STRIPE_TRANSFER', 'BANK_TRANSFER', 'MANUAL'])
  payoutMethod?: string = 'STRIPE_TRANSFER';
}
