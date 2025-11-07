import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSpecialtyDto {
  @ApiProperty({ example: 'Plomberie' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Construction' })
  @IsString()
  category: string;

  @ApiProperty({ required: false, example: 'Installation et réparation de systèmes de plomberie' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, example: '🔧' })
  @IsOptional()
  @IsString()
  icon?: string;
}

export class UpdateSpecialtyDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  icon?: string;
}

export interface SpecialtyResponse {
  id: string;
  name: string;
  category: string;
  description?: string;
  icon?: string;
  createdAt: Date;
}
