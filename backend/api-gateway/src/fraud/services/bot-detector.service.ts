import { Injectable } from '@nestjs/common';
import { BotDetectionResult, BotDetectionSignal } from '../dto/fraud.dto';

interface RequestMetadata {
  userAgent: string;
  headers: Record<string, string>;
  requestPattern?: {
    requestCount: number;
    timeWindow: number; // seconds
  };
}

@Injectable()
export class BotDetectorService {
  async detectBot(metadata: RequestMetadata): Promise<BotDetectionResult> {
    const signals: BotDetectionSignal[] = [];

    // 1. Missing browser headers
    const requiredHeaders = ['accept-language', 'accept-encoding', 'accept'];
    const missingHeaders = requiredHeaders.filter((h) => !metadata.headers[h]);

    if (missingHeaders.length > 0) {
      signals.push({
        type: 'MISSING_HEADERS',
        confidence: 75,
        description: `Headers manquants: ${missingHeaders.join(', ')}`,
      });
    }

    // 2. Headless browser detection
    const headlessIndicators = [
      'headlesschrome',
      'phantomjs',
      'puppeteer',
      'selenium',
      'chromedriver',
    ];

    const isHeadless = headlessIndicators.some((indicator) =>
      metadata.userAgent.toLowerCase().includes(indicator),
    );

    if (isHeadless) {
      signals.push({
        type: 'HEADLESS_BROWSER',
        confidence: 95,
        description: 'Navigateur headless détecté',
      });
    }

    // 3. Rapid requests (scraping pattern)
    if (metadata.requestPattern) {
      const { requestCount, timeWindow } = metadata.requestPattern;
      const requestsPerSecond = requestCount / timeWindow;

      if (requestsPerSecond > 5) {
        signals.push({
          type: 'RAPID_REQUESTS',
          confidence: 85,
          description: `${requestsPerSecond.toFixed(1)} requêtes/seconde`,
        });
      }

      // Regular pattern detection
      if (requestCount > 10 && timeWindow < 60) {
        const variance = this.calculateRequestVariance(requestCount, timeWindow);
        if (variance < 0.1) {
          signals.push({
            type: 'REGULAR_PATTERN',
            confidence: 80,
            description: 'Modèle de requêtes trop régulier',
          });
        }
      }
    }

    const botScore = this.calculateBotScore(signals);

    return {
      isBot: botScore >= 70,
      botScore,
      signals,
      recommendation: this.getRecommendation(botScore),
    };
  }

  private calculateRequestVariance(requestCount: number, timeWindow: number): number {
    // Simplified variance calculation
    // Real implementation would analyze actual request timestamps
    const expectedInterval = timeWindow / requestCount;
    return Math.random() * 0.3; // Mock variance for now
  }

  private calculateBotScore(signals: BotDetectionSignal[]): number {
    if (signals.length === 0) return 0;

    const totalConfidence = signals.reduce((sum, s) => sum + s.confidence, 0);
    const avgConfidence = totalConfidence / signals.length;

    // Bonus for multiple signal types
    const typeBonus = Math.min(signals.length * 10, 30);

    return Math.min(avgConfidence + typeBonus, 100);
  }

  private getRecommendation(
    score: number,
  ): 'ALLOW' | 'CHALLENGE_CAPTCHA' | 'RATE_LIMIT' | 'BLOCK' {
    if (score >= 90) return 'BLOCK';
    if (score >= 70) return 'CHALLENGE_CAPTCHA';
    if (score >= 50) return 'RATE_LIMIT';
    return 'ALLOW';
  }
}
