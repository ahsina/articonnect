import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignMissionToEmployeeDto {
  @ApiProperty({
    description: 'Employee ID to assign mission to',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @ApiPropertyOptional({
    description: 'Assignment notes or instructions',
    example: 'Client prefers morning appointments'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReassignMissionDto {
  @ApiProperty({
    description: 'New employee ID to reassign mission to',
    example: '550e8400-e29b-41d4-a716-446655440001'
  })
  @IsString()
  @IsNotEmpty()
  newEmployeeId: string;

  @ApiProperty({
    description: 'Reason for reassignment',
    example: 'Original employee unavailable'
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class AssignMissionToCompanyDto {
  @ApiProperty({
    description: 'Company ID to assign mission to',
    example: '550e8400-e29b-41d4-a716-446655440002'
  })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiPropertyOptional({
    description: 'Employee ID for direct assignment (optional)',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsOptional()
  @IsString()
  employeeId?: string;
}

export class BulkAssignMissionsDto {
  @ApiProperty({
    description: 'Array of mission IDs to assign',
    type: [String],
    example: ['mission-id-1', 'mission-id-2']
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  missionIds: string[];

  @ApiProperty({
    description: 'Employee ID to assign all missions to',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsString()
  @IsNotEmpty()
  employeeId: string;
}

export class MarkMissionCompletedDto {
  @ApiPropertyOptional({
    description: 'Completion notes',
    example: 'Mission completed successfully, client satisfied'
  })
  @IsOptional()
  @IsString()
  completionNotes?: string;
}
