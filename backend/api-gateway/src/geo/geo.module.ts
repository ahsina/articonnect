import { Module } from '@nestjs/common';
import { GeoController } from './controllers/geo.controller';
import { GeoService } from './services/geo.service';

@Module({
  controllers: [GeoController],
  providers: [GeoService],
  exports: [GeoService],
})
export class GeoModule {}
