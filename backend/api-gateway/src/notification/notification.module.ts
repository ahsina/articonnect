import { Module } from '@nestjs/common';
import { NotificationService } from './services/notification.service';
import { NotificationPreferencesService } from './services/notification-preferences.service';
import { EmailTemplateService } from './services/email-template.service';
import { NotificationController } from './controllers/notification.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { RedisModule } from '../common/redis/redis.module';
import { FcmModule } from '../fcm/fcm.module';

@Module({
  imports: [PrismaModule, RedisModule, FcmModule],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationPreferencesService, EmailTemplateService],
  exports: [NotificationService, NotificationPreferencesService, EmailTemplateService],
})
export class NotificationModule {}
