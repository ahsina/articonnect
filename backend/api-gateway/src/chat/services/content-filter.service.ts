import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Content Filter Service
 *
 * Prevents users from sharing contact information to bypass the platform.
 * Detects phone numbers, emails, URLs, and social media handles.
 */

export interface FilterResult {
  isBlocked: boolean;
  filteredContent: string;
  detectedPatterns: string[];
  violationType?: string;
}

export interface FilterPattern {
  name: string;
  regex: RegExp;
  replacement: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  enabled: boolean;
}

@Injectable()
export class ContentFilterService {
  private readonly logger = new Logger(ContentFilterService.name);

  // Comprehensive pattern library
  private patterns: FilterPattern[] = [
    // Phone Numbers - French formats
    {
      name: 'PHONE_FR_INTERNATIONAL',
      regex: /(?:\+33|0033)\s*[1-9](?:[\s.-]*\d{2}){4}/gi,
      replacement: '[NUMÉRO BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
    },
    {
      name: 'PHONE_FR_NATIONAL',
      regex: /(?:^|[^\d])0[1-9](?:[\s.-]*\d{2}){4}(?:[^\d]|$)/gi,
      replacement: '[NUMÉRO BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
    },
    {
      name: 'PHONE_FR_MOBILE',
      regex: /(?:^|[^\d])(?:06|07)[\s.-]*(?:\d{2}[\s.-]*){4}(?:[^\d]|$)/gi,
      replacement: '[NUMÉRO BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
    },

    // Email Addresses
    {
      name: 'EMAIL',
      regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
      replacement: '[EMAIL BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
    },
    {
      name: 'EMAIL_OBFUSCATED',
      regex: /[a-zA-Z0-9._%+-]+\s*(?:@|at|arobase)\s*[a-zA-Z0-9.-]+\s*(?:\.|dot|point)\s*[a-zA-Z]{2,}/gi,
      replacement: '[EMAIL BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
    },

    // URLs and Websites
    {
      name: 'URL_HTTP',
      regex: /(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/gi,
      replacement: '[LIEN BLOQUÉ]',
      severity: 'MEDIUM',
      enabled: true,
    },
    {
      name: 'URL_WWW',
      regex: /www\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/gi,
      replacement: '[LIEN BLOQUÉ]',
      severity: 'MEDIUM',
      enabled: true,
    },

    // Social Media Handles
    {
      name: 'INSTAGRAM',
      regex: /@[a-zA-Z0-9._]{1,30}|instagram\.com\/[a-zA-Z0-9._]+/gi,
      replacement: '[CONTACT BLOQUÉ]',
      severity: 'MEDIUM',
      enabled: true,
    },
    {
      name: 'FACEBOOK',
      regex: /(?:facebook|fb)\.com\/[a-zA-Z0-9.]+|fb\.me\/[a-zA-Z0-9.]+/gi,
      replacement: '[CONTACT BLOQUÉ]',
      severity: 'MEDIUM',
      enabled: true,
    },
    {
      name: 'TWITTER',
      regex: /twitter\.com\/[a-zA-Z0-9_]+|x\.com\/[a-zA-Z0-9_]+/gi,
      replacement: '[CONTACT BLOQUÉ]',
      severity: 'MEDIUM',
      enabled: true,
    },
    {
      name: 'WHATSAPP',
      regex: /(?:whatsapp|wa)\.me\/\d+|whatsapp\s*:\s*\+?\d+/gi,
      replacement: '[CONTACT BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
    },
    {
      name: 'TELEGRAM',
      regex: /(?:telegram|t)\.me\/[a-zA-Z0-9_]+/gi,
      replacement: '[CONTACT BLOQUÉ]',
      severity: 'MEDIUM',
      enabled: true,
    },

    // Contact Keywords (French)
    {
      name: 'CONTACT_KEYWORDS',
      regex: /(?:appelle|appeler|contacte|contacter|écris|écrire)\s*(?:moi|me)\s*(?:au|sur|à|via)\s*:?\s*[\d@.a-zA-Z]+/gi,
      replacement: '[CONTACT BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
    },

    // Written numbers (to catch "zero six...")
    {
      name: 'WRITTEN_PHONE',
      regex: /(?:zéro|zero)\s+(?:un|deux|trois|quatre|cinq|six|sept|huit|neuf)/gi,
      replacement: '[NUMÉRO BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
    },
  ];

  constructor(private prisma: PrismaService) {}

  /**
   * Filter message content and detect violations
   */
  async filterContent(content: string, userId: string): Promise<FilterResult> {
    let filteredContent = content;
    const detectedPatterns: string[] = [];
    let isBlocked = false;
    let highestSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | null = null;

    // Apply all enabled patterns
    for (const pattern of this.patterns) {
      if (!pattern.enabled) continue;

      const matches = content.match(pattern.regex);
      if (matches && matches.length > 0) {
        detectedPatterns.push(pattern.name);
        filteredContent = filteredContent.replace(pattern.regex, pattern.replacement);

        // Track highest severity
        if (!highestSeverity || this.severityLevel(pattern.severity) > this.severityLevel(highestSeverity)) {
          highestSeverity = pattern.severity;
        }

        this.logger.warn(
          `Contact info detected | User: ${userId} | Pattern: ${pattern.name} | Matches: ${matches.length}`
        );
      }
    }

    // Block message if HIGH severity violations detected
    if (highestSeverity === 'HIGH') {
      isBlocked = true;

      // Log violation
      await this.logViolation(userId, content, detectedPatterns, highestSeverity);
    }

    return {
      isBlocked,
      filteredContent,
      detectedPatterns,
      violationType: highestSeverity || undefined,
    };
  }

  /**
   * Check if content is safe without filtering
   */
  async isContentSafe(content: string): Promise<boolean> {
    for (const pattern of this.patterns) {
      if (!pattern.enabled) continue;

      if (pattern.severity === 'HIGH' && pattern.regex.test(content)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get detected patterns without modifying content
   */
  async detectPatterns(content: string): Promise<string[]> {
    const detected: string[] = [];

    for (const pattern of this.patterns) {
      if (!pattern.enabled) continue;

      if (pattern.regex.test(content)) {
        detected.push(pattern.name);
      }
    }

    return detected;
  }

  /**
   * Log content violation for tracking
   */
  private async logViolation(
    userId: string,
    content: string,
    patterns: string[],
    severity: string
  ): Promise<void> {
    try {
      await this.prisma.contentViolation.create({
        data: {
          userId,
          content: content.substring(0, 500), // Store first 500 chars for review
          detectedPatterns: patterns,
          severity,
          createdAt: new Date(),
        },
      });

      // Update user violation count
      const violationCount = await this.prisma.contentViolation.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      });

      // Auto-suspend after 5 violations in 30 days
      if (violationCount >= 5) {
        this.logger.error(`User ${userId} exceeded violation threshold (${violationCount})`);

        // TODO: Trigger account review or suspension
        // await this.suspendUser(userId, 'REPEATED_CONTACT_SHARING');
      }
    } catch (error) {
      this.logger.error('Failed to log content violation', error);
    }
  }

  /**
   * Get violation statistics for a user
   */
  async getUserViolations(userId: string, days: number = 30): Promise<any> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [violations, total] = await Promise.all([
      this.prisma.contentViolation.findMany({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.contentViolation.count({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
      }),
    ]);

    return {
      violations,
      total,
      period: `${days} days`,
    };
  }

  /**
   * Get all violations for admin review
   */
  async getAllViolations(page: number = 1, limit: number = 50): Promise<any> {
    const skip = (page - 1) * limit;

    const [violations, total] = await Promise.all([
      this.prisma.contentViolation.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.contentViolation.count(),
    ]);

    return {
      violations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Enable/disable specific pattern
   */
  async togglePattern(patternName: string, enabled: boolean): Promise<void> {
    const pattern = this.patterns.find(p => p.name === patternName);
    if (pattern) {
      pattern.enabled = enabled;
      this.logger.log(`Pattern ${patternName} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Get all patterns configuration
   */
  getPatterns(): FilterPattern[] {
    return this.patterns.map(p => ({
      ...p,
      regex: p.regex.source, // Convert RegExp to string for API response
    })) as any;
  }

  /**
   * Helper: Convert severity to numeric level
   */
  private severityLevel(severity: string): number {
    const levels = { LOW: 1, MEDIUM: 2, HIGH: 3 };
    return levels[severity] || 0;
  }
}
