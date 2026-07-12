import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_FOR_CUSTOMER = 'WAITING_FOR_CUSTOMER',
  WAITING_FOR_SUPPORT = 'WAITING_FOR_SUPPORT',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum TicketCategory {
  TECHNICAL_ISSUE = 'TECHNICAL_ISSUE',
  PAYMENT_ISSUE = 'PAYMENT_ISSUE',
  ACCOUNT_ISSUE = 'ACCOUNT_ISSUE',
  MISSION_ISSUE = 'MISSION_ISSUE',
  DISPUTE = 'DISPUTE',
  FEATURE_REQUEST = 'FEATURE_REQUEST',
  FEEDBACK = 'FEEDBACK',
  OTHER = 'OTHER',
}

export class CreateTicketDto {
  @IsString()
  subject: string;

  @IsString()
  description: string;

  @IsEnum(TicketCategory)
  category: TicketCategory;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsUUID()
  @IsOptional()
  missionId?: string;

  @IsUUID()
  @IsOptional()
  orderId?: string;

  @IsUUID()
  @IsOptional()
  quoteId?: string;

  @IsArray()
  @IsOptional()
  attachments?: string[];

  @IsArray()
  @IsOptional()
  tags?: string[];
}

export class UpdateTicketDto {
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  resolution?: string;
}

export class AddTicketMessageDto {
  @IsString()
  content: string;

  @IsBoolean()
  @IsOptional()
  isInternal?: boolean;

  @IsArray()
  @IsOptional()
  attachments?: string[];
}

export class RateTicketDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;
}

export class TicketFilterDto {
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsEnum(TicketCategory)
  @IsOptional()
  category?: TicketCategory;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}

/**
 * Filtre GLOBAL des tickets pour l'inbox opérateur (ADMIN).
 * Contrairement à TicketFilterDto (scopé au user courant), il permet de filtrer par
 * agent assigné / demandeur et de rechercher par n° de ticket ou sujet.
 * `page`/`limit` sont transformés depuis la query string (les query params sont des strings).
 */
export class AdminTicketFilterDto {
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsEnum(TicketCategory)
  @IsOptional()
  category?: TicketCategory;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}

// Knowledge Base DTOs

export class CreateArticleDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsString()
  category: string;

  @IsString()
  @IsOptional()
  subcategory?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  targetAudience?: string;

  @IsString()
  @IsOptional()
  locale?: string;
}

export class UpdateArticleDto extends CreateArticleDto {
  @IsString()
  @IsOptional()
  status?: string;
}
