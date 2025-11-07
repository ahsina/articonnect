import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GeoService } from '../services/geo.service';

@ApiTags('Geolocation')
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Post('location')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateLocation(@Body() body: { artisanId: string; lat: number; lng: number }) {
    return this.geoService.updateArtisanLocation(body.artisanId, body.lat, body.lng);
  }

  @Get('nearby')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async findNearby(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius?: number,
  ) {
    return this.geoService.findNearbyArtisans(Number(lat), Number(lng), radius ? Number(radius) : 20);
  }
}
