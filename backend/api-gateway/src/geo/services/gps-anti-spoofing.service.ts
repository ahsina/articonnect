import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import axios from 'axios';

export interface LocationValidationResult {
  valid: boolean;
  score: number; // 0-100 (higher = more suspicious)
  reasons: string[];
  warnings: string[];
}

export interface LocationSubmission {
  latitude: number;
  longitude: number;
  accuracy?: number; // GPS accuracy in meters
  altitude?: number;
  speed?: number; // m/s
  heading?: number; // degrees
  timestamp?: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface LocationHistory {
  userId: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  source: string; // 'artisan_checkin', 'mission_creation', etc.
}

/**
 * Advanced GPS Anti-Spoofing Protection Service
 *
 * Detects and prevents fake/manipulated GPS coordinates:
 * - Validates coordinate ranges and formats
 * - Detects impossible movement patterns (velocity checks)
 * - Cross-references with IP geolocation
 * - Checks for known spoofing patterns
 * - Validates GPS metadata (accuracy, altitude, etc.)
 * - Tracks location history for pattern analysis
 * - Detects coordinate rounding (sign of spoofing)
 */
@Injectable()
export class GpsAntiSpoofingService {
  private readonly logger = new Logger(GpsAntiSpoofingService.name);
  private readonly LOCATION_HISTORY_TTL = 86400 * 7; // 7 days
  private readonly MAX_SPEED_KMH = 200; // Max realistic speed (car on highway)
  private readonly SUSPICIOUS_ACCURACY = 1; // Perfect accuracy is suspicious
  private readonly MAX_IP_DISTANCE_KM = 100; // Max distance from IP location

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validate GPS coordinates with comprehensive anti-spoofing checks
   */
  async validateLocation(
    userId: string,
    location: LocationSubmission,
  ): Promise<LocationValidationResult> {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let score = 0;

    // 1. Basic coordinate validation
    const basicCheck = this.validateBasicCoordinates(location);
    if (!basicCheck.valid) {
      reasons.push(...basicCheck.reasons);
      score += 100;
      return { valid: false, score, reasons, warnings };
    }

    // 2. Coordinate precision check (detect rounding)
    const precisionCheck = this.checkCoordinatePrecision(location);
    if (precisionCheck.suspicious) {
      warnings.push('Coordonnées arrondies détectées (potentiel spoofing)');
      score += 15;
    }

    // 3. Accuracy check (too perfect = suspicious)
    if (location.accuracy !== undefined) {
      if (location.accuracy < this.SUSPICIOUS_ACCURACY) {
        warnings.push('Précision GPS parfaite détectée (potentiel spoofing)');
        score += 20;
      }
      if (location.accuracy > 50) {
        warnings.push('Précision GPS faible (>50m)');
        score += 5;
      }
    }

    // 4. Velocity check (impossible movement)
    const velocityCheck = await this.checkVelocity(userId, location);
    if (!velocityCheck.valid) {
      reasons.push(...velocityCheck.reasons);
      score += velocityCheck.score;
    }

    // 5. IP geolocation cross-reference
    if (location.ipAddress) {
      const ipCheck = await this.checkIpGeolocation(location);
      if (!ipCheck.valid) {
        warnings.push(...ipCheck.warnings);
        score += ipCheck.score;
      }
    }

    // 6. Known spoofed location patterns
    const patternCheck = this.checkKnownPatterns(location);
    if (patternCheck.suspicious) {
      warnings.push(...patternCheck.warnings);
      score += patternCheck.score;
    }

    // 7. Altitude validation (if provided)
    if (location.altitude !== undefined) {
      const altitudeCheck = this.validateAltitude(location);
      if (!altitudeCheck.valid) {
        warnings.push(...altitudeCheck.warnings);
        score += altitudeCheck.score;
      }
    }

    // Store location in history
    await this.storeLocationHistory(userId, location);

    // Determine if location is valid (score < 50 = valid, 50-80 = suspicious, 80+ = reject)
    const valid = score < 50;

    if (score >= 80) {
      reasons.push('Score de suspicion trop élevé (spoofing détecté)');
    }

    return { valid, score, reasons, warnings };
  }

  /**
   * Basic coordinate validation (range check)
   */
  private validateBasicCoordinates(location: LocationSubmission): {
    valid: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];

    // Latitude must be between -90 and 90
    if (location.latitude < -90 || location.latitude > 90) {
      reasons.push('Latitude invalide (doit être entre -90 et 90)');
    }

    // Longitude must be between -180 and 180
    if (location.longitude < -180 || location.longitude > 180) {
      reasons.push('Longitude invalide (doit être entre -180 et 180)');
    }

    // Check for null island (0,0) - common spoofing coordinate
    if (location.latitude === 0 && location.longitude === 0) {
      reasons.push('Coordonnées "Null Island" détectées (0,0) - spoofing');
    }

    // Check for obvious fake coordinates (e.g., 1,1 or 99,99)
    if (
      (Math.abs(location.latitude) === Math.abs(location.longitude) &&
        [1, 2, 99].includes(Math.abs(location.latitude))) ||
      (location.latitude === 123.456 && location.longitude === 123.456)
    ) {
      reasons.push('Coordonnées factices détectées');
    }

    return { valid: reasons.length === 0, reasons };
  }

  /**
   * Check coordinate precision (spoofed coordinates often have suspicious rounding)
   */
  private checkCoordinatePrecision(location: LocationSubmission): {
    suspicious: boolean;
    score: number;
  } {
    const latStr = location.latitude.toString();
    const lngStr = location.longitude.toString();

    // Check for too few decimal places (< 4 is suspicious for GPS)
    const latDecimals = latStr.includes('.') ? latStr.split('.')[1].length : 0;
    const lngDecimals = lngStr.includes('.') ? lngStr.split('.')[1].length : 0;

    if (latDecimals < 4 || lngDecimals < 4) {
      return { suspicious: true, score: 15 };
    }

    // Check for repeating patterns (e.g., 48.8888, 2.3333)
    const hasRepeatingLat = /(\d)\1{3,}/.test(latStr.split('.')[1] || '');
    const hasRepeatingLng = /(\d)\1{3,}/.test(lngStr.split('.')[1] || '');

    if (hasRepeatingLat || hasRepeatingLng) {
      return { suspicious: true, score: 10 };
    }

    return { suspicious: false, score: 0 };
  }

  /**
   * Velocity check - detect impossible movement
   */
  private async checkVelocity(
    userId: string,
    location: LocationSubmission,
  ): Promise<{ valid: boolean; reasons: string[]; score: number }> {
    const reasons: string[] = [];
    let score = 0;

    // Get last known location from history
    const lastLocation = await this.getLastLocation(userId);

    if (!lastLocation) {
      return { valid: true, reasons, score }; // No history, can't check
    }

    const timeDiff = (location.timestamp || new Date()).getTime() - lastLocation.timestamp.getTime();
    const timeDiffHours = timeDiff / (1000 * 60 * 60);

    // Must have at least 10 seconds between updates
    if (timeDiff < 10000) {
      reasons.push('Mises à jour de localisation trop fréquentes');
      score += 20;
    }

    // Calculate distance
    const distance = this.calculateDistance(
      lastLocation.latitude,
      lastLocation.longitude,
      location.latitude,
      location.longitude,
    );

    // Calculate speed in km/h
    const speedKmh = distance / Math.max(timeDiffHours, 0.001); // Avoid division by zero

    // Check if speed is realistic
    if (speedKmh > this.MAX_SPEED_KMH) {
      reasons.push(
        `Vitesse impossible: ${Math.round(speedKmh)}km/h (max ${this.MAX_SPEED_KMH}km/h)`,
      );
      score += 50;
    }

    // Teleportation check (moved > 50km in < 5 minutes)
    if (distance > 50 && timeDiffHours < 0.083) {
      // 5 min = 0.083 hours
      reasons.push('Téléportation détectée (déplacement instantané sur longue distance)');
      score += 40;
    }

    return { valid: reasons.length === 0, reasons, score };
  }

  /**
   * Cross-reference GPS with IP geolocation
   */
  private async checkIpGeolocation(location: LocationSubmission): Promise<{
    valid: boolean;
    warnings: string[];
    score: number;
  }> {
    const warnings: string[] = [];
    let score = 0;

    if (!location.ipAddress) {
      return { valid: true, warnings, score };
    }

    try {
      // Use configurable IP geolocation API (default: ip-api.com)
      const ipGeoApiUrl = this.configService.get<string>('IP_GEOLOCATION_API_URL') || 'http://ip-api.com/json';
      const response = await axios.get(`${ipGeoApiUrl}/${location.ipAddress}`, {
        timeout: 3000,
      });

      if (response.data.status === 'success') {
        const ipLat = response.data.lat;
        const ipLng = response.data.lon;

        // Calculate distance between GPS and IP location
        const distance = this.calculateDistance(
          location.latitude,
          location.longitude,
          ipLat,
          ipLng,
        );

        // If distance > 100km, it's suspicious (VPN or spoofing)
        if (distance > this.MAX_IP_DISTANCE_KM) {
          warnings.push(
            `GPS éloigné de l'IP (${Math.round(distance)}km) - VPN ou spoofing possible`,
          );
          score += 25;
        }

        // Store IP location for logging
        this.logger.debug(
          `IP geolocation check: GPS (${location.latitude}, ${location.longitude}) vs IP (${ipLat}, ${ipLng}) = ${Math.round(distance)}km`,
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to check IP geolocation: ${error.message}`);
      // Don't fail validation if IP check fails
    }

    return { valid: true, warnings, score };
  }

  /**
   * Check for known spoofing patterns
   */
  private checkKnownPatterns(location: LocationSubmission): {
    suspicious: boolean;
    warnings: string[];
    score: number;
  } {
    const warnings: string[] = [];
    let score = 0;

    // Check if coordinates match common spoofing apps' default locations
    const knownFakeLocations = [
      { lat: 37.7749, lng: -122.4194, name: 'San Francisco (fake GPS default)' },
      { lat: 40.7128, lng: -74.006, name: 'New York (fake GPS default)' },
      { lat: 51.5074, lng: -0.1278, name: 'London (fake GPS default)' },
      { lat: 48.8566, lng: 2.3522, name: 'Paris (fake GPS default)' },
    ];

    for (const fakeLocation of knownFakeLocations) {
      const distance = this.calculateDistance(
        location.latitude,
        location.longitude,
        fakeLocation.lat,
        fakeLocation.lng,
      );

      // If within 100m of known fake location
      if (distance < 0.1) {
        warnings.push(`Coordonnées correspondent à ${fakeLocation.name}`);
        score += 30;
      }
    }

    return { suspicious: score > 0, warnings, score };
  }

  /**
   * Validate altitude (if provided)
   */
  private validateAltitude(location: LocationSubmission): {
    valid: boolean;
    warnings: string[];
    score: number;
  } {
    const warnings: string[] = [];
    let score = 0;

    if (location.altitude === undefined) {
      return { valid: true, warnings, score };
    }

    // Check for unrealistic altitudes
    if (location.altitude < -500 || location.altitude > 5000) {
      // Dead Sea to Everest base camp
      warnings.push('Altitude irréaliste');
      score += 15;
    }

    // Check for suspiciously perfect altitudes (multiples of 10/100)
    if (location.altitude % 100 === 0 || location.altitude % 50 === 0) {
      warnings.push('Altitude arrondie (potentiel spoofing)');
      score += 5;
    }

    return { valid: true, warnings, score };
  }

  /**
   * Calculate distance using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Store location in history (Redis for fast access)
   */
  private async storeLocationHistory(userId: string, location: LocationSubmission): Promise<void> {
    const history: LocationHistory = {
      userId,
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: location.timestamp || new Date(),
      source: 'validation',
    };

    const key = `gps:history:${userId}`;
    await this.redis.lpush(key, JSON.stringify(history));
    await this.redis.ltrim(key, 0, 99); // Keep last 100 locations
    await this.redis.expire(key, this.LOCATION_HISTORY_TTL);
  }

  /**
   * Get last known location for user
   */
  private async getLastLocation(userId: string): Promise<LocationHistory | null> {
    const key = `gps:history:${userId}`;
    const locations = await this.redis.lrange(key, 0, 0);

    if (locations.length === 0) {
      return null;
    }

    return JSON.parse(locations[0]);
  }

  /**
   * Get location history for user
   */
  async getLocationHistory(userId: string, limit = 10): Promise<LocationHistory[]> {
    const key = `gps:history:${userId}`;
    const locations = await this.redis.lrange(key, 0, limit - 1);

    return locations.map((loc) => JSON.parse(loc));
  }

  /**
   * Validate and throw if location is invalid
   */
  async validateOrThrow(userId: string, location: LocationSubmission): Promise<void> {
    const result = await this.validateLocation(userId, location);

    if (!result.valid) {
      this.logger.warn(
        `GPS spoofing detected for user ${userId}: ${result.reasons.join(', ')} (score: ${result.score})`,
      );
      throw new BadRequestException(
        `Localisation invalide: ${result.reasons.join(', ')}. Veuillez activer une localisation GPS authentique.`,
      );
    }

    if (result.warnings.length > 0) {
      this.logger.warn(
        `GPS warnings for user ${userId}: ${result.warnings.join(', ')} (score: ${result.score})`,
      );
    }
  }

  /**
   * Get anti-spoofing statistics for monitoring
   */
  async getStatistics(days = 7): Promise<{
    totalValidations: number;
    rejectedCount: number;
    suspiciousCount: number;
    averageScore: number;
    topReasons: Array<{ reason: string; count: number }>;
  }> {
    // This would typically be stored in database or analytics
    // For now, return mock data structure
    return {
      totalValidations: 0,
      rejectedCount: 0,
      suspiciousCount: 0,
      averageScore: 0,
      topReasons: [],
    };
  }
}
