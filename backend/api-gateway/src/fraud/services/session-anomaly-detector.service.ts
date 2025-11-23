import { Injectable } from '@nestjs/common';
import { SessionAnomalyResult, SessionAnomalySignal } from '../dto/fraud.dto';

interface SessionData {
  ipAddress: string;
  userAgent: string;
  deviceId?: string;
  location?: { lat: number; lng: number };
}

@Injectable()
export class SessionAnomalyDetectorService {
  async detectSessionAnomaly(
    userId: string,
    currentSession: SessionData,
    previousSession?: SessionData,
  ): Promise<SessionAnomalyResult> {
    const signals: SessionAnomalySignal[] = [];

    if (!previousSession) {
      return {
        isAnomalous: false,
        threatLevel: 'LOW',
        signals: [],
        recommendation: 'ALLOW',
      };
    }

    // 1. Impossible travel
    if (currentSession.location && previousSession.location) {
      const distance = this.calculateDistance(
        previousSession.location,
        currentSession.location,
      );
      const timeDiff = 5; // minutes (would get from actual session timestamps)

      if (distance > 100 && timeDiff < 60) {
        signals.push({
          type: 'IMPOSSIBLE_TRAVEL',
          severity: 'CRITICAL',
          description: `${distance}km parcourus en ${timeDiff} minutes`,
          previousValue: `${previousSession.location.lat},${previousSession.location.lng}`,
          currentValue: `${currentSession.location.lat},${currentSession.location.lng}`,
        });
      }
    }

    // 2. Device change
    if (
      previousSession.deviceId &&
      currentSession.deviceId &&
      previousSession.deviceId !== currentSession.deviceId
    ) {
      signals.push({
        type: 'DEVICE_CHANGE',
        severity: 'MEDIUM',
        description: 'Changement d\'appareil détecté',
        previousValue: previousSession.deviceId,
        currentValue: currentSession.deviceId,
      });
    }

    // 3. User-Agent change
    if (previousSession.userAgent !== currentSession.userAgent) {
      signals.push({
        type: 'USER_AGENT_CHANGE',
        severity: 'MEDIUM',
        description: 'Changement de navigateur détecté',
      });
    }

    // 4. IP jump
    if (previousSession.ipAddress !== currentSession.ipAddress) {
      signals.push({
        type: 'IP_JUMP',
        severity: 'LOW',
        description: 'Changement d\'adresse IP',
        previousValue: previousSession.ipAddress,
        currentValue: currentSession.ipAddress,
      });
    }

    const threatLevel = this.calculateThreatLevel(signals);

    return {
      isAnomalous: signals.length > 0,
      threatLevel,
      signals,
      recommendation: this.getRecommendation(threatLevel),
    };
  }

  private calculateDistance(
    pos1: { lat: number; lng: number },
    pos2: { lat: number; lng: number },
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = ((pos2.lat - pos1.lat) * Math.PI) / 180;
    const dLon = ((pos2.lng - pos1.lng) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((pos1.lat * Math.PI) / 180) *
        Math.cos((pos2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateThreatLevel(
    signals: SessionAnomalySignal[],
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const hasCritical = signals.some((s) => s.severity === 'CRITICAL');
    const highCount = signals.filter((s) => s.severity === 'HIGH').length;
    const mediumCount = signals.filter((s) => s.severity === 'MEDIUM').length;

    if (hasCritical || highCount >= 2) return 'CRITICAL';
    if (highCount >= 1 || mediumCount >= 3) return 'HIGH';
    if (mediumCount >= 1) return 'MEDIUM';
    return 'LOW';
  }

  private getRecommendation(
    threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  ): 'ALLOW' | 'CHALLENGE_2FA' | 'FORCE_LOGOUT' | 'BLOCK_IP' {
    switch (threatLevel) {
      case 'CRITICAL':
        return 'BLOCK_IP';
      case 'HIGH':
        return 'FORCE_LOGOUT';
      case 'MEDIUM':
        return 'CHALLENGE_2FA';
      default:
        return 'ALLOW';
    }
  }
}
