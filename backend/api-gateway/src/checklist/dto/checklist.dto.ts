import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsArray,
  ValidateNested,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ChecklistStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum ChecklistItemType {
  CHECKBOX = 'CHECKBOX',
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  PHOTO = 'PHOTO',
  SIGNATURE = 'SIGNATURE',
  DATE = 'DATE',
  SELECT = 'SELECT',
  MULTI_SELECT = 'MULTI_SELECT',
  MEASUREMENT = 'MEASUREMENT',
  YES_NO = 'YES_NO',
  PASS_FAIL = 'PASS_FAIL',
}

export enum ChecklistCategory {
  SAFETY = 'SAFETY',
  QUALITY = 'QUALITY',
  COMPLIANCE = 'COMPLIANCE',
  INSPECTION = 'INSPECTION',
  MAINTENANCE = 'MAINTENANCE',
  INSTALLATION = 'INSTALLATION',
  PRE_JOB = 'PRE_JOB',
  POST_JOB = 'POST_JOB',
  CUSTOM = 'CUSTOM',
}

export class ChecklistItemOptionDto {
  @IsString()
  value: string;

  @IsString()
  label: string;

  @IsBoolean()
  @IsOptional()
  requiresNote?: boolean;
}

export class ChecklistItemDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ChecklistItemType)
  type: ChecklistItemType;

  @IsBoolean()
  @IsOptional()
  required?: boolean;

  @IsInt()
  @IsOptional()
  position?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemOptionDto)
  @IsOptional()
  options?: ChecklistItemOptionDto[];

  @IsString()
  @IsOptional()
  unit?: string;

  @IsOptional()
  minValue?: number;

  @IsOptional()
  maxValue?: number;

  @IsBoolean()
  @IsOptional()
  requiresPhoto?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresNote?: boolean;

  @IsString()
  @IsOptional()
  helpText?: string;

  @IsString()
  @IsOptional()
  validationRule?: string;
}

export class ChecklistSectionDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  position?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  items: ChecklistItemDto[];
}

export class CreateChecklistTemplateDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ChecklistCategory)
  category: ChecklistCategory;

  @IsString()
  @IsOptional()
  trade?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistSectionDto)
  sections: ChecklistSectionDto[];

  @IsBoolean()
  @IsOptional()
  requiresSignature?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresPhotos?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresClientApproval?: boolean;

  @IsBoolean()
  @IsOptional()
  isGlobal?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class UpdateChecklistTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ChecklistCategory)
  @IsOptional()
  category?: ChecklistCategory;

  @IsString()
  @IsOptional()
  trade?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistSectionDto)
  @IsOptional()
  sections?: ChecklistSectionDto[];

  @IsEnum(ChecklistStatus)
  @IsOptional()
  status?: ChecklistStatus;

  @IsBoolean()
  @IsOptional()
  requiresSignature?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresPhotos?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresClientApproval?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class ItemResponseDto {
  @IsString()
  itemId: string;

  @IsOptional()
  value: any;

  @IsString()
  @IsOptional()
  note?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[];

  @IsDateString()
  @IsOptional()
  completedAt?: string;
}

export class SectionResponseDto {
  @IsString()
  sectionId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemResponseDto)
  items: ItemResponseDto[];
}

export class CreateChecklistInstanceDto {
  @IsUUID()
  templateId: string;

  @IsUUID()
  missionId: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateChecklistInstanceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionResponseDto)
  @IsOptional()
  responses?: SectionResponseDto[];

  @IsString()
  @IsOptional()
  artisanSignature?: string;

  @IsString()
  @IsOptional()
  clientSignature?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CompleteChecklistDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionResponseDto)
  responses: SectionResponseDto[];

  @IsString()
  @IsOptional()
  artisanSignature?: string;

  @IsString()
  @IsOptional()
  clientSignature?: string;

  @IsString()
  @IsOptional()
  completionNotes?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  finalPhotos?: string[];
}

export class ChecklistFilterDto {
  @IsEnum(ChecklistCategory)
  @IsOptional()
  category?: ChecklistCategory;

  @IsString()
  @IsOptional()
  trade?: string;

  @IsEnum(ChecklistStatus)
  @IsOptional()
  status?: ChecklistStatus;

  @IsString()
  @IsOptional()
  search?: string;

  @IsBoolean()
  @IsOptional()
  isGlobal?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}

export class InstanceFilterDto {
  @IsUUID()
  @IsOptional()
  missionId?: string;

  @IsUUID()
  @IsOptional()
  templateId?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}

export class CloneTemplateDto {
  @IsString()
  newName: string;

  @IsString()
  @IsOptional()
  newDescription?: string;
}

export class BulkItemUpdateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemResponseDto)
  items: ItemResponseDto[];
}

export class AddPhotoDto {
  @IsString()
  itemId: string;

  @IsString()
  photoUrl: string;

  @IsString()
  @IsOptional()
  caption?: string;

  @IsOptional()
  metadata?: {
    latitude?: number;
    longitude?: number;
    timestamp?: string;
  };
}
