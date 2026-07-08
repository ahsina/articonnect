import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
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
  async updateLocation(@Request() req, @Body() body: { lat: number; lng: number }) {
    // IDOR fix : la localisation est TOUJOURS celle de l'utilisateur authentifié (jamais un id du body).
    return this.geoService.updateArtisanLocation(req.user.userId, body.lat, body.lng);
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
