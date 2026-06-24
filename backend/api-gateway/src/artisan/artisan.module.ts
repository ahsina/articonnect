import { Module } from '@nestjs/common';
import { ArtisanController } from './artisan.controller';
import { ArtisanService } from './artisan.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [PrismaModule, UserModule], // UserModule exporte StripeConnectService
  controllers: [ArtisanController],
  providers: [ArtisanService],
})
export class ArtisanModule {}
