import {
  Controller,
  Post,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { S3Service, FileType } from '../services/s3.service';
import { GetPresignedUrlDto } from '../dto/upload.dto';

@ApiTags('Uploads')
@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly s3Service: S3Service) {}

  @Post('file')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload file to S3 (direct)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        fileType: {
          type: 'string',
          enum: Object.values(FileType),
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body('fileType') fileType: FileType,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    if (!fileType) {
      throw new BadRequestException('Type de fichier requis');
    }

    const url = await this.s3Service.uploadFile(file, fileType, req.user.userId);

    return { url };
  }

  @Post('presigned-url')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get presigned URL for direct client upload to S3' })
  async getPresignedUrl(@Request() req, @Body() getPresignedUrlDto: GetPresignedUrlDto) {
    const { url, key } = await this.s3Service.getPresignedUrl(
      getPresignedUrlDto.fileType,
      req.user.userId,
      getPresignedUrlDto.mimeType,
    );

    // Return presigned URL and the final public URL
    const publicUrl = process.env.S3_PUBLIC_URL
      ? `${process.env.S3_PUBLIC_URL}/${key}`
      : `https://${process.env.AWS_S3_BUCKET || 'articonnect-dev'}.s3.${process.env.AWS_REGION || 'eu-west-1'}.amazonaws.com/${key}`;

    return {
      uploadUrl: url,
      publicUrl,
      expiresIn: 3600,
    };
  }
}
