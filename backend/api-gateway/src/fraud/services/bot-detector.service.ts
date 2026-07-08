import { Injectable } from '@nestjs/common';
import { BotDetectionResult, BotDetectionSignal } from '../dto/fraud.dto';

interface RequestMetadata {
  userAgent: string;
  headers: Record<string, string>;
  requestPattern?: {
    requestCount: number;
    timeWindow: number; // seconds
    // Optional real request timestamps (ms epoch) for regularity analysis
    timestamps?: number[];
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

      // Regular pattern detection.
      // Bots tend to fire requests at near-constant intervals: a very low
      // coefficient of variation (CV) of inter-arrival gaps is suspicious.
      // We can only compute a real CV when we actually have the timestamps;
      // without them we do NOT emit a random signal (avoids flagging users
      // at random, cf. audit finding).
      const timestamps = metadata.requestPattern.timestamps;
      if (
        requestCount > 10 &&
        timeWindow < 60 &&
        timestamps &&
        timestamps.length >= 3
      ) {
        const cv = this.calculateRequestVariance(timestamps);
        // cv >= 0 ; a machine-regular pattern has CV close to 0.
        if (cv < 0.1) {
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

  /**
   * Coefficient of variation (stddev / mean) of inter-arrival gaps between
   * consecutive request timestamps. A value near 0 means the requests are
   * spaced almost perfectly evenly (machine-like), higher values mean the
   * spacing is irregular (human-like). Real computation from actual
   * timestamps — no randomness.
   */
  private calculateRequestVariance(timestamps: number[]): number {
    const sorted = [...timestamps].sort((a, b) => a - b);
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(sorted[i] - sorted[i - 1]);
    }
    if (gaps.length === 0) return 1;

    const mean = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
    if (mean === 0) return 0; // all requests at the same instant => perfectly regular

    const variance =
      gaps.reduce((sum, g) => sum + (g - mean) ** 2, 0) / gaps.length;
    const stdDev = Math.sqrt(variance);
    return stdDev / mean; // coefficient of variation
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
