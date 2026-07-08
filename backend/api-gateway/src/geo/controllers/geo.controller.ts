import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
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
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (lat === undefined || lat === '' || !Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
      throw new BadRequestException('lat must be a valid number between -90 and 90');
    }
    if (lng === undefined || lng === '' || !Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
      throw new BadRequestException('lng must be a valid number between -180 and 180');
    }
    let radiusNum = 20;
    if (radius !== undefined && radius !== '') {
      radiusNum = Number(radius);
      if (!Number.isFinite(radiusNum) || radiusNum <= 0) {
        throw new BadRequestException('radius must be a positive number');
      }
    }
    return this.geoService.findNearbyArtisans(latNum, lngNum, radiusNum);
  }
}
