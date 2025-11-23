import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { BotDetectorService } from '../services/bot-detector.service';
import { FeatureToggleService } from '../services/feature-toggle.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class BotDetectionGuard implements CanActivate {
  private readonly logger = new Logger(BotDetectionGuard.name);

  constructor(
    private readonly botDetector: BotDetectorService,
    private readonly featureToggle: FeatureToggleService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check if bot detection is enabled
    const isEnabled = await this.featureToggle.isBotDetectionEnabled();
    if (!isEnabled) {
      return true;
    }

    try {
      // Extract request context
      const ipAddress = request.ip || request.connection.remoteAddress || 'unknown';
      const userAgent = request.headers['user-agent'] || 'unknown';
      const requestPath = request.path || request.url || 'unknown';
      const requestMethod = request.method || 'GET';

      // Build request fingerprint
      const requestFingerprint = {
        ipAddress,
        userAgent,
        endpoint: `${requestMethod} ${requestPath}`,
        timestamp: new Date(),
        headers: {
          'user-agent': userAgent,
          'accept': request.headers['accept'] || 'unknown',
          'accept-language': request.headers['accept-language'] || 'unknown',
          'accept-encoding': request.headers['accept-encoding'] || 'unknown',
        },
      };

      // Detect bot activity
      const botResult = await this.botDetector.detectBot(requestFingerprint);

      // Check if captcha challenge is enabled
      const captchaEnabled = await this.featureToggle.isBotCaptchaEnabled();

      // Handle bot detection - block high-risk bots (score >= 80)
      if (botResult.isBot && botResult.botScore >= 80) {
        this.logger.warn(
          `High-risk bot activity detected: ` +
          `IP=${ipAddress}, ` +
          `user=${user?.userId || 'anonymous'}, ` +
          `score=${botResult.botScore.toFixed(0)}, ` +
          `signals=[${botResult.signals.map((s) => s.type).join(', ')}], ` +
          `recommendation=${botResult.recommendation}`
        );

        // Block malicious bots
        if (botResult.recommendation === 'BLOCK') {
          throw new ForbiddenException(
            'Accès refusé. Activité suspecte détectée.'
          );
        }

        // Rate limit suspicious bots
        if (botResult.recommendation === 'RATE_LIMIT') {
          // Add rate limiting header
          const retryAfter = 60; // seconds
          const response = context.switchToHttp().getResponse();
          response.setHeader('Retry-After', retryAfter);

          throw new ForbiddenException(
            `Trop de requêtes. Veuillez réessayer dans ${retryAfter} secondes.`
          );
        }

        // Challenge with CAPTCHA if enabled
        if (captchaEnabled && botResult.recommendation === 'CHALLENGE_CAPTCHA') {
          throw new ForbiddenException(
            'Vérification CAPTCHA requise. Veuillez prouver que vous n\'êtes pas un robot.'
          );
        }
      } else if (botResult.isBot && botResult.botScore >= 50) {
        // Log medium-risk bot activity but allow
        this.logger.warn(
          `Medium-risk bot activity flagged but allowed: ` +
          `IP=${ipAddress}, ` +
          `score=${botResult.botScore.toFixed(0)}, ` +
          `recommendation=${botResult.recommendation}`
        );
      }

      return true;
    } catch (error) {
      // Re-throw authorization errors
      if (error instanceof ForbiddenException) {
        throw error;
      }

      // Log and allow on detection failures (fail open)
      this.logger.error('Bot detection failed:', error);
      return true;
    }
  }
}
