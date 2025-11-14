import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FcmService } from './services/fcm.service';
import { FcmController } from './fcm.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [FcmController],
  providers: [FcmService],
  exports: [FcmService],
})
export class FcmModule {}
