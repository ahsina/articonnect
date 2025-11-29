import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsArray,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';

export enum ArticleStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum TargetAudience {
  ALL = 'ALL',
  CLIENT = 'CLIENT',
  ARTISAN = 'ARTISAN',
  ADMIN = 'ADMIN',
}

export enum ArticleCategory {
  GETTING_STARTED = 'GETTING_STARTED',
  ACCOUNT = 'ACCOUNT',
  MISSIONS = 'MISSIONS',
  PAYMENTS = 'PAYMENTS',
  REVIEWS = 'REVIEWS',
  DISPUTES = 'DISPUTES',
  SAFETY = 'SAFETY',
  TECHNICAL = 'TECHNICAL',
  LEGAL = 'LEGAL',
  FAQ = 'FAQ',
  TROUBLESHOOTING = 'TROUBLESHOOTING',
  BEST_PRACTICES = 'BEST_PRACTICES',
}

export class CreateArticleDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(10)
  content: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  excerpt?: string;

  @IsEnum(ArticleCategory)
  category: ArticleCategory;

  @IsString()
  @IsOptional()
  subcategory?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsEnum(TargetAudience)
  @IsOptional()
  targetAudience?: TargetAudience;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  metaTitle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  metaDescription?: string;

  @IsEnum(ArticleStatus)
  @IsOptional()
  status?: ArticleStatus;

  @IsString()
  @IsOptional()
  locale?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  relatedArticleIds?: string[];

  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @IsBoolean()
  @IsOptional()
  featured?: boolean;
}

export class UpdateArticleDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsString()
  @MinLength(10)
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  excerpt?: string;

  @IsEnum(ArticleCategory)
  @IsOptional()
  category?: ArticleCategory;

  @IsString()
  @IsOptional()
  subcategory?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsEnum(TargetAudience)
  @IsOptional()
  targetAudience?: TargetAudience;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  metaTitle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  metaDescription?: string;

  @IsEnum(ArticleStatus)
  @IsOptional()
  status?: ArticleStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  relatedArticleIds?: string[];

  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @IsBoolean()
  @IsOptional()
  featured?: boolean;
}

export class ArticleTranslationDto {
  @IsString()
  locale: string;

  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(10)
  content: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  excerpt?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  metaTitle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  metaDescription?: string;
}

export class ArticleFilterDto {
  @IsEnum(ArticleCategory)
  @IsOptional()
  category?: ArticleCategory;

  @IsString()
  @IsOptional()
  subcategory?: string;

  @IsEnum(TargetAudience)
  @IsOptional()
  targetAudience?: TargetAudience;

  @IsEnum(ArticleStatus)
  @IsOptional()
  status?: ArticleStatus;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  tag?: string;

  @IsString()
  @IsOptional()
  locale?: string;

  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  sortBy?: 'createdAt' | 'viewCount' | 'helpfulCount' | 'displayOrder' | 'title';

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}

export class ArticleFeedbackDto {
  @IsBoolean()
  helpful: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  comment?: string;
}

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  slug: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class SearchQueryDto {
  @IsString()
  @MinLength(2)
  query: string;

  @IsEnum(TargetAudience)
  @IsOptional()
  audience?: TargetAudience;

  @IsString()
  @IsOptional()
  locale?: string;

  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number;
}

export class BulkUpdateStatusDto {
  @IsArray()
  @IsUUID('4', { each: true })
  articleIds: string[];

  @IsEnum(ArticleStatus)
  status: ArticleStatus;
}
