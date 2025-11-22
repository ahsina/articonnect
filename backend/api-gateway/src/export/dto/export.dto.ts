import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export enum ExportFormat {
  CSV = 'CSV',
  PDF = 'PDF',
}

export enum ExportType {
  INVOICES = 'INVOICES',
  TRANSACTIONS = 'TRANSACTIONS',
  VAT_DECLARATIONS = 'VAT_DECLARATIONS',
  REVENUE_REPORT = 'REVENUE_REPORT',
}

export class ExportQueryDto {
  @IsEnum(ExportType)
  type: ExportType;

  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  artisanId?: string;
}
