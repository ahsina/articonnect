import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);

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

  /**
   * Geocode an address to lat/lng using Google Maps Geocoding API
   * Falls back to Luxembourg center if API key not configured
   */
  async geocodeAddress(address: string, city?: string, postalCode?: string, country: string = 'LU'): Promise<{
    latitude: number;
    longitude: number;
    formattedAddress: string;
  }> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      this.logger.warn('Google Maps API key not configured, using default Luxembourg coordinates');
      return {
        latitude: 49.6116,
        longitude: 6.1319,
        formattedAddress: address,
      };
    }

    try {
      const fullAddress = [address, city, postalCode, country].filter(Boolean).join(', ');
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        this.logger.warn(`Geocoding failed for address: ${fullAddress}, status: ${data.status}`);
        return {
          latitude: 49.6116,
          longitude: 6.1319,
          formattedAddress: fullAddress,
        };
      }

      const result = data.results[0];
      return {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
      };
    } catch (error) {
      this.logger.error('Geocoding error:', error);
      return {
        latitude: 49.6116,
        longitude: 6.1319,
        formattedAddress: address,
      };
    }
  }

  /**
   * Reverse geocode lat/lng to address
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<{
    address: string;
    city: string;
    postalCode: string;
    country: string;
  }> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      this.logger.warn('Google Maps API key not configured');
      return {
        address: '',
        city: 'Luxembourg',
        postalCode: '',
        country: 'LU',
      };
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        this.logger.warn(`Reverse geocoding failed for ${latitude},${longitude}`);
        return {
          address: '',
          city: 'Luxembourg',
          postalCode: '',
          country: 'LU',
        };
      }

      const result = data.results[0];
      const components = result.address_components;

      return {
        address: result.formatted_address,
        city: components.find((c: any) => c.types.includes('locality'))?.long_name || '',
        postalCode: components.find((c: any) => c.types.includes('postal_code'))?.long_name || '',
        country: components.find((c: any) => c.types.includes('country'))?.short_name || 'LU',
      };
    } catch (error) {
      this.logger.error('Reverse geocoding error:', error);
      return {
        address: '',
        city: 'Luxembourg',
        postalCode: '',
        country: 'LU',
      };
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
