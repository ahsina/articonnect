import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsDateString,
  IsUUID,
  IsEmail,
  IsEnum,
  Min,
  Max,
} from 'class-validator';

export enum SubcontractorStatus {
  PENDING_INVITATION = 'PENDING_INVITATION',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED',
}

export class CreateSubcontractorDto {
  @IsUUID()
  @IsOptional()
  subcontractorUserId?: string;

  @IsString()
  @IsOptional()
  externalName?: string;

  @IsEmail()
  @IsOptional()
  externalEmail?: string;

  @IsString()
  @IsOptional()
  externalPhone?: string;

  @IsString()
  @IsOptional()
  externalCompany?: string;

  @IsString()
  @IsOptional()
  externalSiret?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  defaultCommissionRate?: number;

  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @IsArray()
  @IsOptional()
  specialties?: string[];

  @IsArray()
  @IsOptional()
  certifications?: string[];

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateSubcontractorDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  defaultCommissionRate?: number;

  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @IsArray()
  @IsOptional()
  specialties?: string[];

  @IsBoolean()
  @IsOptional()
  insuranceVerified?: boolean;

  @IsDateString()
  @IsOptional()
  insuranceExpiryDate?: string;

  @IsArray()
  @IsOptional()
  certifications?: string[];

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(SubcontractorStatus)
  @IsOptional()
  status?: SubcontractorStatus;
}

export class CreateSubcontractorAssignmentDto {
  @IsUUID()
  subcontractorId: string;

  @IsUUID()
  missionId: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  agreedAmount: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate: number;
}

export class UpdateAssignmentDto {
  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  agreedAmount?: number;

  @IsString()
  @IsOptional()
  paymentStatus?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsString()
  @IsOptional()
  feedback?: string;
}
