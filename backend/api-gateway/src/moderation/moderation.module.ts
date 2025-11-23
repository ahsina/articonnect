import { Module } from '@nestjs/common';
import { ModerationService } from './services/moderation.service';
import { ModerationController } from './controllers/moderation.controller';
import { ContentModerationController } from './controllers/content-moderation.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [PrismaModule, ChatModule],
  controllers: [ModerationController, ContentModerationController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
