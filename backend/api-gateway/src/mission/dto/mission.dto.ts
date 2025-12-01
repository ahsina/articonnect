import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MissionType, MissionStatus } from '@prisma/client';

export class CreateMissionDto {
  @ApiProperty({ enum: MissionType })
  @IsEnum(MissionType)
  type: MissionType;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  category: string;

  @ApiProperty()
  @IsString()
  address: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsString()
  postalCode: string;

  @ApiProperty({ enum: ['LU', 'FR', 'BE'] })
  @IsString()
  country: string;

  @ApiProperty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledFor?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  clientBudget?: number;

  @ApiProperty({ required: false, description: 'Legacy photos field' })
  @IsOptional()
  @IsArray()
  photos?: string[];

  @ApiProperty({ required: false, description: 'Photos taken before the work (by client)' })
  @IsOptional()
  @IsArray()
  beforePhotos?: string[];

  @ApiProperty({ required: false, description: 'Photos taken after the work (by artisan)' })
  @IsOptional()
  @IsArray()
  afterPhotos?: string[];

  // B2B Billing fields
  @ApiProperty({ required: false, description: 'Purchase order number for B2B clients' })
  @IsOptional()
  @IsString()
  purchaseOrderNumber?: string;

  @ApiProperty({ required: false, description: 'Internal reference for B2B clients' })
  @IsOptional()
  @IsString()
  internalReference?: string;

  @ApiProperty({ required: false, description: 'Billing company name if different from client' })
  @IsOptional()
  @IsString()
  billingCompanyName?: string;

  @ApiProperty({ required: false, description: 'Billing address if different from mission address' })
  @IsOptional()
  @IsString()
  billingAddress?: string;

  @ApiProperty({ required: false, description: 'Billing VAT number' })
  @IsOptional()
  @IsString()
  billingVatNumber?: string;
}

export class UpdateMissionStatusDto {
  @ApiProperty({ enum: MissionStatus })
  @IsEnum(MissionStatus)
  status: MissionStatus;

  @ApiProperty({ required: false, description: 'Optional note about the status change' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class AddMissionPhotosDto {
  @ApiProperty({ required: false, description: 'Photos to add to before photos array' })
  @IsOptional()
  @IsArray()
  beforePhotos?: string[];

  @ApiProperty({ required: false, description: 'Photos to add to after photos array' })
  @IsOptional()
  @IsArray()
  afterPhotos?: string[];
}
