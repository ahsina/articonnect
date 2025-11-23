import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { SessionAnomalyDetectorService } from '../services/session-anomaly-detector.service';
import { FeatureToggleService } from '../services/feature-toggle.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SessionAnomalyGuard implements CanActivate {
  private readonly logger = new Logger(SessionAnomalyGuard.name);

  constructor(
    private readonly sessionAnomalyDetector: SessionAnomalyDetectorService,
    private readonly featureToggle: FeatureToggleService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Skip if no authenticated user
    if (!user?.userId) {
      return true;
    }

    // Check if session anomaly detection is enabled
    const isEnabled = await this.featureToggle.isSessionAnomalyDetectionEnabled();
    if (!isEnabled) {
      return true;
    }

    try {
      // Extract session context
      const ipAddress = request.ip || request.connection.remoteAddress || 'unknown';
      const userAgent = request.headers['user-agent'] || 'unknown';
      const deviceFingerprint = request.headers['x-device-fingerprint'] || request.body?.deviceId || 'unknown';

      // Build current session data
      const currentSession = {
        ipAddress,
        userAgent,
        deviceId: deviceFingerprint,
      };

      // Get previous session data from user record
      const userRecord = await this.prisma.user.findUnique({
        where: { id: user.userId },
        select: {
          lastIpAddress: true,
          lastUserAgent: true,
          deviceFingerprints: true,
        },
      });

      const previousSession = userRecord ? {
        ipAddress: userRecord.lastIpAddress || 'unknown',
        userAgent: userRecord.lastUserAgent || 'unknown',
        deviceId: userRecord.deviceFingerprints?.[0] || undefined,
      } : undefined;

      // Detect session anomalies
      const anomalyResult = await this.sessionAnomalyDetector.detectSessionAnomaly(
        user.userId,
        currentSession,
        previousSession
      );

      // Update user with latest session data
      await this.prisma.user.update({
        where: { id: user.userId },
        data: {
          lastIpAddress: ipAddress,
          lastUserAgent: userAgent,
        },
      }).catch((error) => {
        this.logger.error(`Failed to update user session data:`, error);
      });

      // Check if auto-actions are enabled
      const autoLogoutEnabled = await this.featureToggle.isSessionAutoLogoutEnabled();

      // Handle high-risk sessions (CRITICAL or HIGH threat level)
      if (anomalyResult.isAnomalous && (anomalyResult.threatLevel === 'CRITICAL' || anomalyResult.threatLevel === 'HIGH')) {
        this.logger.warn(
          `Session anomaly detected for user ${user.userId}: ` +
          `threatLevel=${anomalyResult.threatLevel}, ` +
          `signals=[${anomalyResult.signals.map((s) => s.type).join(', ')}], ` +
          `recommendation=${anomalyResult.recommendation}`
        );

        // Auto-logout for critical threats
        if (autoLogoutEnabled && anomalyResult.recommendation === 'FORCE_LOGOUT') {
          throw new UnauthorizedException(
            'Activité suspecte détectée. Veuillez vous reconnecter pour des raisons de sécurité.'
          );
        }

        // Require 2FA re-authentication for suspicious activity
        if (autoLogoutEnabled && anomalyResult.recommendation === 'CHALLENGE_2FA') {
          // Check if user has already verified 2FA in this session
          const has2FAVerified = request.session?.twoFactorVerified;

          if (!has2FAVerified) {
            throw new UnauthorizedException(
              'Vérification de sécurité requise. Veuillez confirmer votre identité avec l\'authentification à deux facteurs.'
            );
          }
        }

        // Block IP if recommended
        if (autoLogoutEnabled && anomalyResult.recommendation === 'BLOCK_IP') {
          throw new UnauthorizedException(
            'Accès bloqué pour des raisons de sécurité. Contactez le support si vous pensez qu\'il s\'agit d\'une erreur.'
          );
        }
      }

      return true;
    } catch (error) {
      // Re-throw authorization errors
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Log and allow on detection failures (fail open)
      this.logger.error(
        `Session anomaly detection failed for user ${user?.userId}:`,
        error
      );
      return true;
    }
  }
}
