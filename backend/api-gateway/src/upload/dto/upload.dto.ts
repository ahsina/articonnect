import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FileType } from '../services/s3.service';

export class GetPresignedUrlDto {
  @ApiProperty({ enum: FileType, example: FileType.AVATAR })
  @IsEnum(FileType)
  fileType: FileType;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  mimeType: string;
}
