import { Module } from '@nestjs/common';
import { UploadController } from './controllers/upload.controller';
import { S3Service } from './services/s3.service';
import { ClamavService } from './services/clamav.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UploadController],
  providers: [S3Service, ClamavService],
  exports: [S3Service, ClamavService],
})
export class UploadModule {}
