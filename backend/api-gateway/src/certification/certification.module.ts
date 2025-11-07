import { Module } from '@nestjs/common';
import { CertificationController } from './controllers/certification.controller';
import { CertificationService } from './services/certification.service';

@Module({
  controllers: [CertificationController],
  providers: [CertificationService],
  exports: [CertificationService],
})
export class CertificationModule {}
