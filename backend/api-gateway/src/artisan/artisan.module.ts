import { Module } from '@nestjs/common';
import { ArtisanController } from './artisan.controller';
import { ArtisanService } from './artisan.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { VerificationModule } from '../verification/verification.module';

@Module({
  imports: [PrismaModule, UserModule, VerificationModule], // UserModule → StripeConnectService ; VerificationModule → BusinessVerificationService
  controllers: [ArtisanController],
  providers: [ArtisanService],
})
export class ArtisanModule {}
