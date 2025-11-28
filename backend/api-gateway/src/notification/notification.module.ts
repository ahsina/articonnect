import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationService } from './services/notification.service';
import { NotificationPreferencesService } from './services/notification-preferences.service';
import { EmailTemplateService } from './services/email-template.service';
import { TwilioSmsService } from './services/twilio-sms.service';
import { NotificationGateway } from './gateways/notification.gateway';
import { NotificationController } from './controllers/notification.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { RedisModule } from '../common/redis/redis.module';
import { FcmModule } from '../fcm/fcm.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    FcmModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationPreferencesService,
    EmailTemplateService,
    TwilioSmsService,
    NotificationGateway,
  ],
  exports: [
    NotificationService,
    NotificationPreferencesService,
    EmailTemplateService,
    TwilioSmsService,
    NotificationGateway,
  ],
})
export class NotificationModule {}
