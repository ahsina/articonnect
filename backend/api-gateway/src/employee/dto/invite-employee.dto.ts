import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsNumber, Min, Max, IsArray, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EmployeeRole, PaymentModel } from '@prisma/client';

export class InviteEmployeeDto {
  @ApiProperty({ description: 'Employee email address', example: 'employee@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Employee role',
    enum: EmployeeRole,
    example: EmployeeRole.TECHNICIAN
  })
  @IsEnum(EmployeeRole)
  role: EmployeeRole;

  @ApiProperty({
    description:
      "Modèle de paie de l'employé. Valeurs acceptées : SALARY (salaire fixe), COMMISSION (% du CA) " +
      "ou HYBRID (salaire + commission). Il n'existe PAS de modèle 'HOURLY' : le taux horaire " +
      '(hourlyRate) est une donnée de coût liée au pointage (time-tracking), pas un modèle de paie.',
    enum: PaymentModel,
    enumName: 'PaymentModel',
    example: PaymentModel.COMMISSION,
  })
  @IsEnum(PaymentModel)
  paymentModel: PaymentModel;

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
    description: 'Monthly base salary (for SALARY or HYBRID models)',
    example: 2500
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  baseSalary?: number;

  @ApiPropertyOptional({
    description:
      'Taux horaire de référence pour le pointage/time-tracking (coût interne). Ne remplace pas ' +
      'paymentModel : sert au calcul des heures, pas au versement de la paie.',
    example: 35,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  hourlyRate?: number;

  @ApiPropertyOptional({
    description: 'Specialty IDs that employee can perform',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialtyIds?: string[];

  @ApiPropertyOptional({
    description: 'Custom permissions array',
    type: [String],
    example: ['canViewAllMissions', 'canAssignMissions']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
