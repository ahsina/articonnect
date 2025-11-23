import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './gateways/chat.gateway';
import { ChatService } from './services/chat.service';
import { EncryptionService } from './services/encryption.service';
import { ContentFilterService } from './services/content-filter.service';
import { ChatController } from './controllers/chat.controller';
import { FcmModule } from '../fcm/fcm.module';

@Module({
  imports: [JwtModule, FcmModule],
  providers: [ChatGateway, ChatService, EncryptionService, ContentFilterService],
  controllers: [ChatController],
  exports: [ChatService, ContentFilterService],
})
export class ChatModule {}
