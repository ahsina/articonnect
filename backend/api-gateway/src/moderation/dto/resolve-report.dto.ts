import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ReportStatus } from '@prisma/client';

export class ResolveReportDto {
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @IsString()
  @IsOptional()
  resolution?: string;

  @IsString()
  @IsOptional()
  actionTaken?: string; // "USER_WARNED", "CONTENT_REMOVED", "USER_SUSPENDED", etc.
}
