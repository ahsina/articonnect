import { IsEnum, IsString, IsOptional, IsUUID } from 'class-validator';
import { ReportType, ReportReason } from '@prisma/client';

export class CreateReportDto {
  @IsEnum(ReportType)
  type: ReportType;

  @IsEnum(ReportReason)
  reason: ReportReason;

  @IsString()
  @IsOptional()
  description?: string;

  // Only one of these should be provided based on type
  @IsUUID()
  @IsOptional()
  reviewId?: string;

  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsUUID()
  @IsOptional()
  reportedUserId?: string;

  @IsUUID()
  @IsOptional()
  missionId?: string;
}
