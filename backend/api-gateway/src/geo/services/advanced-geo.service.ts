import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { UserRole } from '@prisma/client';

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface GeoSearchResult {
  id: string;
  name: string;
  distance: number;
  latitude: number;
  longitude: number;
  rating?: number;
  completedMissions?: number;
}

export interface ProximityFilter {
  center: GeoLocation;
  radiusKm: number;
  minRating?: number;
  categories?: string[];
  limit?: number;
}

@Injectable()
export class AdvancedGeoService {
  private readonly logger = new Logger(AdvancedGeoService.name);
  private readonly CACHE_TTL = 600; // 10 minutes
  private readonly SHORT_CACHE_TTL = 60; // 1 minute for real-time locations
  private readonly EARTH_RADIUS_KM = 6371;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  calculateDistance(point1: GeoLocation, point2: GeoLocation): number {
    const lat1 = this.degreesToRadians(point1.latitude);
    const lon1 = this.degreesToRadians(point1.longitude);
    const lat2 = this.degreesToRadians(point2.latitude);
    const lon2 = this.degreesToRadians(point2.longitude);

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return this.EARTH_RADIUS_KM * c;
  }

  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  generateGeohash(location: GeoLocation, precision: number = 6): string {
    const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
    let latMin = -90;
    let latMax = 90;
    let lonMin = -180;
    let lonMax = 180;
    let geohash = '';
    let isEven = true;
    let bit = 0;
    let ch = 0;

    while (geohash.length < precision) {
      if (isEven) {
        const lonMid = (lonMin + lonMax) / 2;
        if (location.longitude > lonMid) {
          ch |= (1 << (4 - bit));
          lonMin = lonMid;
        } else {
          lonMax = lonMid;
        }
      } else {
        const latMid = (latMin + latMax) / 2;
        if (location.latitude > latMid) {
          ch |= (1 << (4 - bit));
          latMin = latMid;
        } else {
          latMax = latMid;
        }
      }

      isEven = !isEven;

      if (bit < 4) {
        bit++;
      } else {
        geohash += base32[ch];
        bit = 0;
        ch = 0;
      }
    }

    return geohash;
  }

  getBoundingBox(center: GeoLocation, radiusKm: number): {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  } {
    const latDelta = radiusKm / 111.32;
    const lonDelta = radiusKm / (111.32 * Math.cos(this.degreesToRadians(center.latitude)));

    return {
      minLat: center.latitude - latDelta,
      maxLat: center.latitude + latDelta,
      minLon: center.longitude - lonDelta,
      maxLon: center.longitude + lonDelta,
    };
  }

  async findNearbyArtisans(filter: ProximityFilter): Promise<GeoSearchResult[]> {
    const cacheKey = `geo:artisans:${filter.center.latitude}:${filter.center.longitude}:${filter.radiusKm}:${filter.minRating || 0}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const bbox = this.getBoundingBox(filter.center, filter.radiusKm);

    const artisans = await this.prisma.user.findMany({
      where: {
        role: UserRole.ARTISAN,
        artisanProfile: {
          available: true,
          latitude: {
            gte: bbox.minLat,
            lte: bbox.maxLat,
          },
          longitude: {
            gte: bbox.minLon,
            lte: bbox.maxLon,
          },
          ...(filter.minRating && {
            rating: {
              gte: filter.minRating,
            },
          }),
        },
      },
      include: {
        artisanProfile: {
          include: {
            specialties: true,
          },
        },
      },
      take: filter.limit || 50,
    });

    const results: GeoSearchResult[] = artisans
      .map((artisan) => {
        if (!artisan.artisanProfile) return null;

        const distance = this.calculateDistance(filter.center, {
          latitude: artisan.artisanProfile.latitude,
          longitude: artisan.artisanProfile.longitude,
        });

        if (distance > filter.radiusKm) return null;

        if (filter.categories && filter.categories.length > 0) {
          const hasCategory = artisan.artisanProfile.specialties.some((specialty) =>
            filter.categories.includes(specialty.name),
          );
          if (!hasCategory) return null;
        }

        return {
          id: artisan.id,
          name: artisan.artisanProfile.companyName || `${artisan.firstName} ${artisan.lastName}`,
          distance: Math.round(distance * 100) / 100,
          latitude: artisan.artisanProfile.latitude,
          longitude: artisan.artisanProfile.longitude,
          rating: Number(artisan.artisanProfile.rating),
          completedMissions: artisan.artisanProfile.missionCount,
        } as GeoSearchResult;
      })
      .filter((result): result is NonNullable<typeof result> => result !== null)
      .sort((a, b) => a.distance - b.distance);

    await this.redis.set(cacheKey, JSON.stringify(results), this.CACHE_TTL);

    return results;
  }

  async findNearbyMissions(
    artisanLocation: GeoLocation,
    serviceRadius: number,
    categories?: string[],
  ): Promise<Array<{ id: string; title: string; distance: number; category: string; budget: number }>> {
    const cacheKey = `geo:missions:${artisanLocation.latitude}:${artisanLocation.longitude}:${serviceRadius}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const bbox = this.getBoundingBox(artisanLocation, serviceRadius);

    const missions = await this.prisma.mission.findMany({
      where: {
        status: 'PENDING',
        latitude: {
          gte: bbox.minLat,
          lte: bbox.maxLat,
        },
        longitude: {
          gte: bbox.minLon,
          lte: bbox.maxLon,
        },
        ...(categories && categories.length > 0 && {
          category: {
            in: categories,
          },
        }),
      },
      select: {
        id: true,
        title: true,
        category: true,
        latitude: true,
        longitude: true,
        clientBudget: true,
        agreedPrice: true,
      },
      take: 100,
    });

    const results = missions
      .map((mission) => {
        const distance = this.calculateDistance(artisanLocation, {
          latitude: mission.latitude,
          longitude: mission.longitude,
        });

        if (distance > serviceRadius) return null;

        return {
          id: mission.id,
          title: mission.title,
          distance: Math.round(distance * 100) / 100,
          category: mission.category,
          budget: Number(mission.clientBudget || mission.agreedPrice || 0),
        };
      })
      .filter((result): result is NonNullable<typeof result> => result !== null)
      .sort((a, b) => a.distance - b.distance);

    await this.redis.set(cacheKey, JSON.stringify(results), this.CACHE_TTL);

    return results;
  }

  async updateArtisanLocation(artisanId: string, location: GeoLocation): Promise<void> {
    await this.prisma.artisanProfile.update({
      where: { userId: artisanId },
      data: {
        currentLat: location.latitude,
        currentLng: location.longitude,
        lastLocationUpdate: new Date(),
      },
    });

    const geohash = this.generateGeohash(location, 6);
    await this.redis.set(`geo:artisan:${artisanId}:location`, JSON.stringify({ ...location, geohash }), 3600);
  }

  async getArtisanLocation(artisanId: string): Promise<(GeoLocation & { geohash: string }) | null> {
    const cached = await this.redis.get(`geo:artisan:${artisanId}:location`);

    if (cached) {
      return JSON.parse(cached);
    }

    const profile = await this.prisma.artisanProfile.findUnique({
      where: { userId: artisanId },
      select: {
        currentLat: true,
        currentLng: true,
      },
    });

    if (!profile || !profile.currentLat || !profile.currentLng) {
      return null;
    }

    const location = {
      latitude: profile.currentLat,
      longitude: profile.currentLng,
    };

    const geohash = this.generateGeohash(location, 6);

    await this.redis.set(
      `geo:artisan:${artisanId}:location`,
      JSON.stringify({ ...location, geohash }),
      3600,
    );

    return { ...location, geohash };
  }

  async getOptimalRoute(
    start: GeoLocation,
    waypoints: GeoLocation[],
  ): Promise<{ totalDistance: number; orderedWaypoints: GeoLocation[] }> {
    if (waypoints.length === 0) {
      return { totalDistance: 0, orderedWaypoints: [] };
    }

    if (waypoints.length === 1) {
      return {
        totalDistance: this.calculateDistance(start, waypoints[0]),
        orderedWaypoints: waypoints,
      };
    }

    const visited = new Set<number>();
    const ordered: GeoLocation[] = [];
    let current = start;
    let totalDistance = 0;

    while (visited.size < waypoints.length) {
      let minDistance = Infinity;
      let nextIndex = -1;

      waypoints.forEach((waypoint, index) => {
        if (!visited.has(index)) {
          const distance = this.calculateDistance(current, waypoint);
          if (distance < minDistance) {
            minDistance = distance;
            nextIndex = index;
          }
        }
      });

      if (nextIndex !== -1) {
        visited.add(nextIndex);
        ordered.push(waypoints[nextIndex]);
        totalDistance += minDistance;
        current = waypoints[nextIndex];
      }
    }

    return { totalDistance: Math.round(totalDistance * 100) / 100, orderedWaypoints: ordered };
  }

  async clearLocationCache(artisanId?: string): Promise<void> {
    if (artisanId) {
      await this.redis.del(`geo:artisan:${artisanId}:location`);
    }
  }

  /**
   * Batch update artisan locations in Redis GEO index
   * More efficient for bulk operations
   */
  async batchUpdateArtisanLocations(
    locations: Array<{ artisanId: string; latitude: number; longitude: number }>,
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    const client = this.redis.getClient();

    // Use pipeline for batch operations
    const pipeline = client.pipeline();

    for (const loc of locations) {
      try {
        // Add to Redis GEO index
        pipeline.geoadd('artisans:geo:index', loc.longitude, loc.latitude, loc.artisanId);
        // Cache individual location
        const geohash = this.generateGeohash({ latitude: loc.latitude, longitude: loc.longitude }, 6);
        pipeline.setex(
          `geo:artisan:${loc.artisanId}:location`,
          this.SHORT_CACHE_TTL,
          JSON.stringify({ latitude: loc.latitude, longitude: loc.longitude, geohash }),
        );
        success++;
      } catch (error) {
        this.logger.error(`Failed to update location for artisan ${loc.artisanId}`, error);
        failed++;
      }
    }

    await pipeline.exec();

    this.logger.log(`Batch location update: ${success} success, ${failed} failed`);
    return { success, failed };
  }

  /**
   * Fast proximity search using Redis GEORADIUS
   * Falls back to database query if Redis is unavailable
   */
  async findNearbyArtisansFast(
    center: GeoLocation,
    radiusKm: number,
    limit: number = 50,
  ): Promise<Array<{ artisanId: string; distance: number }>> {
    try {
      const client = this.redis.getClient();
      const results = await client.georadius(
        'artisans:geo:index',
        center.longitude,
        center.latitude,
        radiusKm,
        'km',
        'WITHDIST',
        'ASC',
        'COUNT',
        limit,
      );

      return results.map((result: [string, string]) => ({
        artisanId: result[0],
        distance: parseFloat(result[1]),
      }));
    } catch (error) {
      this.logger.warn('Redis GEORADIUS failed, falling back to database query', error);
      // Fallback to database bounding box query
      const bbox = this.getBoundingBox(center, radiusKm);
      const artisans = await this.prisma.artisanProfile.findMany({
        where: {
          available: true,
          latitude: { gte: bbox.minLat, lte: bbox.maxLat },
          longitude: { gte: bbox.minLon, lte: bbox.maxLon },
        },
        select: { userId: true, latitude: true, longitude: true },
        take: limit * 2, // Fetch more to filter by actual distance
      });

      return artisans
        .map((a) => ({
          artisanId: a.userId,
          distance: this.calculateDistance(center, { latitude: a.latitude, longitude: a.longitude }),
        }))
        .filter((a) => a.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);
    }
  }

  /**
   * Get geo stats for monitoring
   */
  async getGeoStats(): Promise<{
    indexedArtisans: number;
    cacheHitRate: number;
  }> {
    try {
      const client = this.redis.getClient();
      const indexedArtisans = await client.zcard('artisans:geo:index');

      return {
        indexedArtisans,
        cacheHitRate: 0, // Would need to track hits/misses for accurate rate
      };
    } catch (error) {
      this.logger.error('Failed to get geo stats', error);
      return { indexedArtisans: 0, cacheHitRate: 0 };
    }
  }
}
