import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatGateway } from './gateways/chat.gateway';
import { ChatService } from './services/chat.service';
import { InternalChatService } from './services/internal-chat.service';
import { EncryptionService } from './services/encryption.service';
import { ContentFilterService } from './services/content-filter.service';
import { ChatController } from './controllers/chat.controller';
import { InternalChatController } from './controllers/internal-chat.controller';
import { FcmModule } from '../fcm/fcm.module';

@Module({
  imports: [
    // WebSocket JWT : le JwtModule DOIT avoir le secret (sinon toute connexion WS = 'Invalid token').
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
    FcmModule,
  ],
  providers: [ChatGateway, ChatService, InternalChatService, EncryptionService, ContentFilterService],
  controllers: [ChatController, InternalChatController],
  exports: [ChatService, InternalChatService, ContentFilterService],
})
export class ChatModule {}
