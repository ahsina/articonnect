import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNegotiationDto {
  @ApiProperty()
  missionId: string;

  @ApiProperty()
  @IsNumber()
  proposedPrice: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  message?: string;
}

export class AcceptNegotiationDto {
  @ApiProperty()
  @IsBoolean()
  accepted: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  rejectedReason?: string;
}
