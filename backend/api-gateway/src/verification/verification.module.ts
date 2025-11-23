import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../common/prisma/prisma.module';
import { VerificationController } from './controllers/verification.controller';
import { BusinessVerificationService } from './services/business-verification.service';
import { SiretVerificationService } from './services/siret-verification.service';
import { RcsVerificationService } from './services/rcs-verification.service';
import { KboVerificationService } from './services/kbo-verification.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [VerificationController],
  providers: [
    BusinessVerificationService,
    SiretVerificationService,
    RcsVerificationService,
    KboVerificationService,
  ],
  exports: [
    BusinessVerificationService,
    SiretVerificationService,
    RcsVerificationService,
    KboVerificationService,
  ],
})
export class VerificationModule {}
