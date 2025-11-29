import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
  IsNumber,
  IsUUID,
} from 'class-validator';

export class CreatePortfolioDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

export class CreatePortfolioProjectDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  category: string;

  @IsString()
  @IsOptional()
  trade?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  completionDate?: string;

  @IsString()
  @IsOptional()
  duration?: string;

  @IsArray()
  @IsOptional()
  beforePhotos?: string[];

  @IsArray()
  @IsOptional()
  afterPhotos?: string[];

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsString()
  @IsOptional()
  projectScope?: string;

  @IsString()
  @IsOptional()
  challenges?: string;

  @IsString()
  @IsOptional()
  solutions?: string;

  @IsString()
  @IsOptional()
  budgetRange?: string;

  @IsUUID()
  @IsOptional()
  missionId?: string;

  @IsString()
  @IsOptional()
  clientTestimonial?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsArray()
  @IsOptional()
  tags?: string[];
}

export class UpdatePortfolioProjectDto extends CreatePortfolioProjectDto {
  @IsNumber()
  @IsOptional()
  displayOrder?: number;
}

export class AddPortfolioPhotoDto {
  @IsString()
  url: string;

  @IsString()
  @IsOptional()
  caption?: string;

  @IsBoolean()
  @IsOptional()
  isBefore?: boolean;

  @IsBoolean()
  @IsOptional()
  isAfter?: boolean;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsNumber()
  @IsOptional()
  displayOrder?: number;
}
