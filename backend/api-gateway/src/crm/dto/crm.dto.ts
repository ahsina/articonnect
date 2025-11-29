import {
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  IsNumber,
  IsUUID,
  IsEnum,
} from 'class-validator';

export enum ClientStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  VIP = 'VIP',
  BLOCKED = 'BLOCKED',
}

export enum ClientType {
  REGULAR = 'REGULAR',
  VIP = 'VIP',
  COMMERCIAL = 'COMMERCIAL',
  ONE_TIME = 'ONE_TIME',
}

export enum FollowUpType {
  GENERAL = 'GENERAL',
  QUOTE_FOLLOW_UP = 'QUOTE_FOLLOW_UP',
  MAINTENANCE_REMINDER = 'MAINTENANCE_REMINDER',
  THANK_YOU = 'THANK_YOU',
  CHECK_IN = 'CHECK_IN',
}

export enum FollowUpStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  OVERDUE = 'OVERDUE',
}

export class CreateClientRelationshipDto {
  @IsUUID()
  clientId: string;

  @IsEnum(ClientStatus)
  @IsOptional()
  status?: ClientStatus;

  @IsEnum(ClientType)
  @IsOptional()
  clientType?: ClientType;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  preferredContactMethod?: string;

  @IsString()
  @IsOptional()
  preferredContactTime?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  acquisitionSource?: string;
}

export class UpdateClientRelationshipDto {
  @IsEnum(ClientStatus)
  @IsOptional()
  status?: ClientStatus;

  @IsEnum(ClientType)
  @IsOptional()
  clientType?: ClientType;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  preferredContactMethod?: string;

  @IsString()
  @IsOptional()
  preferredContactTime?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateFollowUpDto {
  @IsUUID()
  relationshipId: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(FollowUpType)
  @IsOptional()
  type?: FollowUpType;

  @IsDateString()
  dueDate: string;

  @IsDateString()
  @IsOptional()
  reminderAt?: string;

  @IsUUID()
  @IsOptional()
  missionId?: string;

  @IsUUID()
  @IsOptional()
  quoteId?: string;
}

export class UpdateFollowUpDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(FollowUpType)
  @IsOptional()
  type?: FollowUpType;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsDateString()
  @IsOptional()
  reminderAt?: string;

  @IsEnum(FollowUpStatus)
  @IsOptional()
  status?: FollowUpStatus;

  @IsString()
  @IsOptional()
  outcome?: string;
}

export class ClientFilterDto {
  @IsEnum(ClientStatus)
  @IsOptional()
  status?: ClientStatus;

  @IsEnum(ClientType)
  @IsOptional()
  clientType?: ClientType;

  @IsString()
  @IsOptional()
  search?: string;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}
