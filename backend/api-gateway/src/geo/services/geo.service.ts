import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class GeoService {
  constructor(private redis: RedisService) {}

  async updateArtisanLocation(artisanId: string, lat: number, lng: number) {
    const client = this.redis.getClient();
    await client.geoadd('artisans:locations', lng, lat, artisanId);
    return { success: true };
  }

  async findNearbyArtisans(lat: number, lng: number, radiusKm: number = 20) {
    const client = this.redis.getClient();
    const results = await client.georadius(
      'artisans:locations',
      lng,
      lat,
      radiusKm,
      'km',
      'WITHDIST',
      'ASC',
    );

    return results.map((result: [string, string]) => ({
      artisanId: result[0],
      distance: parseFloat(result[1]),
    }));
  }
}
