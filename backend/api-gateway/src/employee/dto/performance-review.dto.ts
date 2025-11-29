import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsEnum,
  IsArray,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ReviewStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
}

export enum ReviewPeriodType {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  BIANNUAL = 'BIANNUAL',
  ANNUAL = 'ANNUAL',
}

export class RatingDto {
  @IsInt()
  @Min(1)
  @Max(5)
  qualityOfWork: number;

  @IsInt()
  @Min(1)
  @Max(5)
  communication: number;

  @IsInt()
  @Min(1)
  @Max(5)
  reliability: number;

  @IsInt()
  @Min(1)
  @Max(5)
  technicalSkills: number;

  @IsInt()
  @Min(1)
  @Max(5)
  customerService: number;

  @IsInt()
  @Min(1)
  @Max(5)
  teamwork: number;
}

export class GoalDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  targetDate: string;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number;

  @IsString()
  @IsOptional()
  status?: string;
}

export class CreatePerformanceReviewDto {
  @IsUUID()
  employeeId: string;

  @IsDateString()
  reviewPeriodStart: string;

  @IsDateString()
  reviewPeriodEnd: string;

  @ValidateNested()
  @Type(() => RatingDto)
  ratings: RatingDto;

  @IsString()
  @IsOptional()
  strengths?: string;

  @IsString()
  @IsOptional()
  areasForImprovement?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoalDto)
  @IsOptional()
  goals?: GoalDto[];

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(ReviewStatus)
  @IsOptional()
  status?: ReviewStatus;
}

export class UpdatePerformanceReviewDto {
  @ValidateNested()
  @Type(() => RatingDto)
  @IsOptional()
  ratings?: RatingDto;

  @IsString()
  @IsOptional()
  strengths?: string;

  @IsString()
  @IsOptional()
  areasForImprovement?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoalDto)
  @IsOptional()
  goals?: GoalDto[];

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(ReviewStatus)
  @IsOptional()
  status?: ReviewStatus;
}

export class SubmitReviewDto {
  @IsString()
  @IsOptional()
  finalNotes?: string;
}

export class AcknowledgeReviewDto {
  @IsString()
  @IsOptional()
  employeeFeedback?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  satisfactionRating?: number;
}

export class CreateGoalDto {
  @IsUUID()
  employeeId: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  targetDate: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsInt()
  @IsOptional()
  priority?: number;
}

export class UpdateGoalDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  targetDate?: string;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  completionNotes?: string;
}

export class ReviewFilterDto {
  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @IsUUID()
  @IsOptional()
  reviewerId?: string;

  @IsEnum(ReviewStatus)
  @IsOptional()
  status?: ReviewStatus;

  @IsDateString()
  @IsOptional()
  periodStart?: string;

  @IsDateString()
  @IsOptional()
  periodEnd?: string;

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

export class Feedback360RequestDto {
  @IsUUID()
  employeeId: string;

  @IsArray()
  @IsUUID('4', { each: true })
  reviewerIds: string[];

  @IsDateString()
  deadline: string;

  @IsString()
  @IsOptional()
  message?: string;
}

export class Feedback360ResponseDto {
  @IsUUID()
  requestId: string;

  @ValidateNested()
  @Type(() => RatingDto)
  ratings: RatingDto;

  @IsString()
  @IsOptional()
  strengths?: string;

  @IsString()
  @IsOptional()
  areasForImprovement?: string;

  @IsString()
  @IsOptional()
  additionalComments?: string;

  @IsOptional()
  anonymous?: boolean;
}

export class ReviewTemplateDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ReviewPeriodType)
  periodType: ReviewPeriodType;

  @IsArray()
  @IsString({ each: true })
  ratingCategories: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  defaultGoalCategories?: string[];

  @IsOptional()
  customQuestions?: { question: string; type: 'text' | 'rating' | 'multiChoice'; options?: string[] }[];
}
