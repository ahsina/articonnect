import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { MissionModule } from './mission/mission.module';
import { GeoModule } from './geo/geo.module';
import { PaymentModule } from './payment/payment.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { AdminModule } from './admin/admin.module';
import { ChatModule } from './chat/chat.module';
import { NotificationModule } from './notification/notification.module';
import { SpecialtyModule } from './specialty/specialty.module';
import { ReviewModule } from './review/review.module';
import { UploadModule } from './upload/upload.module';
import { DisputeModule } from './dispute/dispute.module';
import { AddressModule } from './address/address.module';
import { FavoriteModule } from './favorite/favorite.module';
import { CertificationModule } from './certification/certification.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    AuthModule,
    UserModule,
    MissionModule,
    GeoModule,
    PaymentModule,
    MarketplaceModule,
    SpecialtyModule,
    ReviewModule,
    UploadModule,
    DisputeModule,
    AddressModule,
    FavoriteModule,
    CertificationModule,
    AdminModule,
    ChatModule,
    NotificationModule,
  ],
})
export class AppModule {}
