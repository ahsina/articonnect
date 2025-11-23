import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  MultiAccountDetectionResult,
  AccountLinkSignal,
  DeviceFingerprintDto,
} from '../dto/fraud.dto';

/**
 * Service for detecting multi-account fraud and Sybil attacks
 * Prevents users from gaming reputation/commission systems
 */
@Injectable()
export class MultiAccountDetectorService {
  private readonly logger = new Logger(MultiAccountDetectorService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Detect if a user has multiple accounts
   */
  async detectMultipleAccounts(
    userId: string,
    deviceFingerprint?: DeviceFingerprintDto,
  ): Promise<MultiAccountDetectionResult> {
    const signals: AccountLinkSignal[] = [];
    const linkedAccountIds = new Set<string>();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        phone: true,
        deviceFingerprints: true,
        lastIpAddress: true,
        clientProfile: {
          select: {
            stripeCustomerId: true,
          },
        },
      },
    });

    if (!user) {
      return this.createResult([], 0);
    }

    // 1. Email similarity check (john+1@gmail.com, john+2@gmail.com)
    const emailSimilarAccounts = await this.findSimilarEmails(user.email);
    emailSimilarAccounts.forEach((account) => {
      linkedAccountIds.add(account.id);
      signals.push({
        type: 'EMAIL_SIMILARITY',
        confidence: 85,
        details: `Email similaire détecté: ${account.email}`,
      });
    });

    // 2. Phone number match
    if (user.phone) {
      const phoneMatches = await this.findPhoneMatches(user.phone, userId);
      phoneMatches.forEach((account) => {
        linkedAccountIds.add(account.id);
        signals.push({
          type: 'PHONE_MATCH',
          confidence: 95,
          details: `Même numéro de téléphone: ${user.phone}`,
        });
      });
    }

    // 3. Device fingerprint match
    if (deviceFingerprint && user.deviceFingerprints) {
      const deviceMatches = await this.findDeviceMatches(
        deviceFingerprint.fingerprintId,
        userId,
      );
      deviceMatches.forEach((account) => {
        linkedAccountIds.add(account.id);
        signals.push({
          type: 'DEVICE_MATCH',
          confidence: 90,
          details: `Même empreinte d'appareil détectée`,
        });
      });
    }

    // 4. IP address clustering
    if (user.lastIpAddress) {
      const ipMatches = await this.findIpMatches(user.lastIpAddress, userId);
      ipMatches.forEach((account) => {
        linkedAccountIds.add(account.id);
        signals.push({
          type: 'IP_MATCH',
          confidence: 60, // Lower confidence as IPs can be shared
          details: `Même adresse IP: ${user.lastIpAddress}`,
        });
      });
    }

    // 5. Payment method match (same Stripe customer)
    if (user.clientProfile?.stripeCustomerId) {
      const paymentMatches = await this.findPaymentMethodMatches(
        user.clientProfile.stripeCustomerId,
        userId,
      );
      paymentMatches.forEach((account) => {
        linkedAccountIds.add(account.id);
        signals.push({
          type: 'PAYMENT_METHOD_MATCH',
          confidence: 95,
          details: 'Même moyen de paiement utilisé',
        });
      });
    }

    // 6. Behavioral pattern analysis
    const behavioralMatches = await this.findBehavioralPatterns(userId);
    behavioralMatches.forEach((account) => {
      linkedAccountIds.add(account.id);
      signals.push({
        type: 'BEHAVIORAL_PATTERN',
        confidence: 70,
        details: 'Modèle de comportement similaire détecté',
      });
    });

    // Calculate risk score
    const riskScore = this.calculateRiskScore(signals);
    const linkedAccounts = Array.from(linkedAccountIds);

    return this.createResult(linkedAccounts, riskScore, signals);
  }

  /**
   * Find accounts with similar emails (plus addressing)
   */
  private async findSimilarEmails(email: string) {
    const baseEmail = email.split('+')[0].split('@')[0];
    const domain = email.split('@')[1];

    return this.prisma.user.findMany({
      where: {
        email: {
          startsWith: baseEmail,
          endsWith: `@${domain}`,
        },
      },
      select: {
        id: true,
        email: true,
      },
      take: 10,
    });
  }

  /**
   * Find accounts with same phone number
   */
  private async findPhoneMatches(phone: string, excludeUserId: string) {
    return this.prisma.user.findMany({
      where: {
        phone,
        id: {
          not: excludeUserId,
        },
      },
      select: {
        id: true,
        email: true,
      },
    });
  }

  /**
   * Find accounts with same device fingerprint
   */
  private async findDeviceMatches(fingerprintId: string, excludeUserId: string) {
    return this.prisma.user.findMany({
      where: {
        deviceFingerprints: {
          has: fingerprintId,
        },
        id: {
          not: excludeUserId,
        },
      },
      select: {
        id: true,
        email: true,
      },
      take: 10,
    });
  }

  /**
   * Find accounts with same IP address (recent)
   */
  private async findIpMatches(ipAddress: string, excludeUserId: string) {
    return this.prisma.user.findMany({
      where: {
        lastIpAddress: ipAddress,
        id: {
          not: excludeUserId,
        },
      },
      select: {
        id: true,
        email: true,
      },
      take: 10,
    });
  }

  /**
   * Find accounts with same payment method
   */
  private async findPaymentMethodMatches(stripeCustomerId: string, excludeUserId: string) {
    return this.prisma.user.findMany({
      where: {
        clientProfile: {
          stripeCustomerId,
        },
        id: {
          not: excludeUserId,
        },
      },
      select: {
        id: true,
        email: true,
      },
    });
  }

  /**
   * Find accounts with similar behavioral patterns
   * (login times, mission patterns, etc.)
   */
  private async findBehavioralPatterns(userId: string) {
    // This would use ML or statistical analysis
    // For now, return empty array
    // In production, analyze:
    // - Login times (same hours of day)
    // - Mission creation patterns
    // - Review patterns
    // - Transaction timings
    return [];
  }

  /**
   * Calculate overall risk score from signals
   */
  private calculateRiskScore(signals: AccountLinkSignal[]): number {
    if (signals.length === 0) return 0;

    // Weighted average of signal confidences
    const totalConfidence = signals.reduce((sum, signal) => sum + signal.confidence, 0);
    const avgConfidence = totalConfidence / signals.length;

    // Bonus for multiple signal types
    const uniqueTypes = new Set(signals.map((s) => s.type));
    const typeBonus = Math.min(uniqueTypes.size * 10, 30);

    return Math.min(avgConfidence + typeBonus, 100);
  }

  /**
   * Create detection result with recommendation
   */
  private createResult(
    linkedAccounts: string[],
    riskScore: number,
    signals: AccountLinkSignal[] = [],
  ): MultiAccountDetectionResult {
    let recommendation: 'ALLOW' | 'FLAG' | 'BLOCK' | 'MANUAL_REVIEW';

    if (riskScore >= 90) {
      recommendation = 'BLOCK';
    } else if (riskScore >= 70) {
      recommendation = 'MANUAL_REVIEW';
    } else if (riskScore >= 50) {
      recommendation = 'FLAG';
    } else {
      recommendation = 'ALLOW';
    }

    const isSuspicious = linkedAccounts.length >= 2 || riskScore >= 50;

    return {
      isSuspicious,
      riskScore,
      linkedAccounts,
      signals,
      recommendation,
    };
  }

  /**
   * Store device fingerprint for user
   */
  async storeDeviceFingerprint(userId: string, fingerprint: DeviceFingerprintDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { deviceFingerprints: true },
    });

    const currentFingerprints = user?.deviceFingerprints || [];

    // Add new fingerprint if not already stored
    if (!currentFingerprints.includes(fingerprint.fingerprintId)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          deviceFingerprints: [...currentFingerprints, fingerprint.fingerprintId],
          lastUserAgent: fingerprint.userAgent,
          lastIpAddress: fingerprint.ipAddress,
        },
      });
    }
  }

  /**
   * Get all flagged multi-account users (admin)
   */
  async getFlaggedUsers(limit: number = 100) {
    const users = await this.prisma.user.findMany({
      where: {
        multiAccountRiskScore: {
          gte: 50,
        },
      },
      select: {
        id: true,
        email: true,
        phone: true,
        multiAccountRiskScore: true,
        multiAccountFlagged: true,
        createdAt: true,
      },
      orderBy: {
        multiAccountRiskScore: 'desc',
      },
      take: limit,
    });

    return users;
  }
}
