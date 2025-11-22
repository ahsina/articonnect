import { Module } from '@nestjs/common';
import { ModerationService } from './services/moderation.service';
import { ModerationController } from './controllers/moderation.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ModerationController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
