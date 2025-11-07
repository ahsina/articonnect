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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  photos?: string[];
}

export class UpdateMissionStatusDto {
  @ApiProperty({ enum: MissionStatus })
  @IsEnum(MissionStatus)
  status: MissionStatus;
}
