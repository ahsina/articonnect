import { Module } from '@nestjs/common';
import { GeoController } from './controllers/geo.controller';
import { GeoService } from './services/geo.service';
import { AdvancedGeoService } from './services/advanced-geo.service';
import { GpsAntiSpoofingService } from './services/gps-anti-spoofing.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { RedisModule } from '../common/redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [GeoController],
  providers: [GeoService, AdvancedGeoService, GpsAntiSpoofingService],
  exports: [GeoService, AdvancedGeoService, GpsAntiSpoofingService],
})
export class GeoModule {}
