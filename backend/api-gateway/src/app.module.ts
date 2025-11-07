import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { MissionModule } from './mission/mission.module';
import { GeoModule } from './geo/geo.module';
import { PaymentModule } from './payment/payment.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { AdminModule } from './admin/admin.module';
import { ChatModule } from './chat/chat.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UserModule,
    MissionModule,
    GeoModule,
    PaymentModule,
    MarketplaceModule,
    AdminModule,
    ChatModule,
  ],
})
export class AppModule {}
