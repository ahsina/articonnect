import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  IsEnum,
  IsObject,
} from 'class-validator';

export enum DocumentTemplateType {
  CHECKLIST = 'CHECKLIST',
  SAFETY_FORM = 'SAFETY_FORM',
  COMPLIANCE_FORM = 'COMPLIANCE_FORM',
  INSPECTION_REPORT = 'INSPECTION_REPORT',
  WORK_COMPLETION = 'WORK_COMPLETION',
  WARRANTY_CERTIFICATE = 'WARRANTY_CERTIFICATE',
  HANDOVER_DOCUMENT = 'HANDOVER_DOCUMENT',
  CUSTOM = 'CUSTOM',
}

export class CreateDocumentTemplateDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(DocumentTemplateType)
  type: DocumentTemplateType;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  trade?: string;

  @IsArray()
  sections: DocumentTemplateSectionDto[];

  @IsBoolean()
  @IsOptional()
  requiresSignature?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresPhotos?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresClientApproval?: boolean;

  @IsString()
  @IsOptional()
  locale?: string;
}

export class DocumentTemplateSectionDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  fields: DocumentTemplateFieldDto[];
}

export class DocumentTemplateFieldDto {
  @IsString()
  label: string;

  @IsString()
  fieldType: string; // TEXT, TEXTAREA, NUMBER, CHECKBOX, RADIO, SELECT, DATE, TIME, PHOTO, SIGNATURE

  @IsString()
  @IsOptional()
  placeholder?: string;

  @IsString()
  @IsOptional()
  helpText?: string;

  @IsArray()
  @IsOptional()
  options?: { value: string; label: string }[];

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;
}

export class CreateJobDocumentDto {
  @IsUUID()
  missionId: string;

  @IsUUID()
  @IsOptional()
  templateId?: string;

  @IsString()
  name: string;

  @IsEnum(DocumentTemplateType)
  type: DocumentTemplateType;

  @IsObject()
  data: Record<string, any>;

  @IsArray()
  @IsOptional()
  photos?: string[];

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateJobDocumentDto {
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @IsArray()
  @IsOptional()
  photos?: string[];

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  status?: string;
}

export class SignDocumentDto {
  @IsString()
  signature: string; // Base64 encoded signature image
}
