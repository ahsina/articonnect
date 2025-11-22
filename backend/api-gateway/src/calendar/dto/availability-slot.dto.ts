import { IsDateString, IsUUID, IsOptional } from 'class-validator';

export class CreateAvailabilitySlotDto {
  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;
}

export class BookAvailabilitySlotDto {
  @IsUUID()
  missionId: string;
}

export class QueryAvailabilityDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsUUID()
  @IsOptional()
  artisanId?: string;
}
