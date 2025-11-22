import { IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ReportType, ReportReason, ReportStatus } from '@prisma/client';

export class QueryReportDto {
  @IsEnum(ReportType)
  @IsOptional()
  type?: ReportType;

  @IsEnum(ReportReason)
  @IsOptional()
  reason?: ReportReason;

  @IsEnum(ReportStatus)
  @IsOptional()
  status?: ReportStatus;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;
}
