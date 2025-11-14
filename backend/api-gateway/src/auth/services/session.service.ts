import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import * as crypto from 'crypto';

export interface SessionInfo {
  id: string;
  userId: string;
  deviceInfo: {
    type: 'MOBILE' | 'WEB' | 'TABLET' | 'DESKTOP';
    browser?: string;
    os?: string;
    ipAddress: string;
  };
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

@Injectable()
export class SessionService {
  private readonly SESSION_PREFIX = 'session:';
  private readonly USER_SESSIONS_PREFIX = 'user:sessions:';
  private readonly SESSION_TTL = 30 * 24 * 60 * 60; // 30 days

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Create a new session for a user
   */
  async createSession(
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<string> {
    const sessionId = this.generateSessionId();
    const deviceInfo = this.parseUserAgent(userAgent);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.SESSION_TTL * 1000);

    const session: SessionInfo = {
      id: sessionId,
      userId,
      deviceInfo: {
        ...deviceInfo,
        ipAddress,
      },
      createdAt: now,
      lastAccessedAt: now,
      expiresAt,
      isActive: true,
    };

    // Store session in Redis
    await this.redis.set(
      `${this.SESSION_PREFIX}${sessionId}`,
      JSON.stringify(session),
      this.SESSION_TTL,
    );

    // Add session to user's session list
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
    const userSessions = await this.getUserSessionIds(userId);
    userSessions.push(sessionId);
    await this.redis.set(
      userSessionsKey,
      JSON.stringify(userSessions),
      this.SESSION_TTL,
    );

    return sessionId;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    const sessionIds = await this.getUserSessionIds(userId);
    const sessions: SessionInfo[] = [];

    for (const sessionId of sessionIds) {
      const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
      const sessionData = await this.redis.get(sessionKey);

      if (sessionData) {
        const session: SessionInfo = JSON.parse(sessionData);

        // Check if session is expired
        if (new Date(session.expiresAt) > new Date()) {
          sessions.push(session);
        } else {
          // Remove expired session
          await this.revokeSession(sessionId);
        }
      }
    }

    // Update user sessions list
    const activeSessionIds = sessions.map((s) => s.id);
    await this.redis.set(
      `${this.USER_SESSIONS_PREFIX}${userId}`,
      JSON.stringify(activeSessionIds),
      this.SESSION_TTL,
    );

    return sessions;
  }

  /**
   * Get a specific session
   */
  async getSession(sessionId: string): Promise<SessionInfo | null> {
    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
    const sessionData = await this.redis.get(sessionKey);

    if (!sessionData) {
      return null;
    }

    const session: SessionInfo = JSON.parse(sessionData);

    // Check if expired
    if (new Date(session.expiresAt) < new Date()) {
      await this.revokeSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Update session last accessed time
   */
  async touchSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return;
    }

    session.lastAccessedAt = new Date();

    await this.redis.set(
      `${this.SESSION_PREFIX}${sessionId}`,
      JSON.stringify(session),
      this.SESSION_TTL,
    );
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);

    if (session) {
      // Mark as inactive
      session.isActive = false;
      await this.redis.set(
        `${this.SESSION_PREFIX}${sessionId}`,
        JSON.stringify(session),
        60, // Keep for 1 minute for audit purposes
      );

      // Remove from user's session list
      const userSessionIds = await this.getUserSessionIds(session.userId);
      const updatedSessionIds = userSessionIds.filter((id) => id !== sessionId);
      await this.redis.set(
        `${this.USER_SESSIONS_PREFIX}${session.userId}`,
        JSON.stringify(updatedSessionIds),
        this.SESSION_TTL,
      );
    } else {
      // Just delete the key if session doesn't exist
      await this.redis.del(`${this.SESSION_PREFIX}${sessionId}`);
    }
  }

  /**
   * Revoke all sessions for a user except the current one
   */
  async revokeAllSessionsExcept(
    userId: string,
    currentSessionId: string,
  ): Promise<void> {
    const sessions = await this.getUserSessions(userId);

    for (const session of sessions) {
      if (session.id !== currentSessionId) {
        await this.revokeSession(session.id);
      }
    }
  }

  /**
   * Revoke all sessions for a user (logout from all devices)
   */
  async revokeAllSessions(userId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);

    for (const session of sessions) {
      await this.revokeSession(session.id);
    }

    // Clear user sessions list
    await this.redis.del(`${this.USER_SESSIONS_PREFIX}${userId}`);
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(userId: string): Promise<void> {
    await this.getUserSessions(userId); // This will automatically clean up expired sessions
  }

  /**
   * Get session count for a user
   */
  async getActiveSessionCount(userId: string): Promise<number> {
    const sessions = await this.getUserSessions(userId);
    return sessions.length;
  }

  /**
   * Private: Generate a secure session ID
   */
  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Private: Get session IDs for a user
   */
  private async getUserSessionIds(userId: string): Promise<string[]> {
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
    const data = await this.redis.get(userSessionsKey);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Private: Parse user agent string
   */
  private parseUserAgent(userAgent: string): {
    type: 'MOBILE' | 'WEB' | 'TABLET' | 'DESKTOP';
    browser?: string;
    os?: string;
  } {
    const ua = userAgent.toLowerCase();

    // Detect device type
    let type: 'MOBILE' | 'WEB' | 'TABLET' | 'DESKTOP' = 'WEB';
    if (ua.includes('mobile')) {
      type = 'MOBILE';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      type = 'TABLET';
    } else if (
      !ua.includes('mobile') &&
      (ua.includes('windows') || ua.includes('mac') || ua.includes('linux'))
    ) {
      type = 'DESKTOP';
    }

    // Detect browser
    let browser: string | undefined;
    if (ua.includes('chrome')) {
      browser = 'Chrome';
    } else if (ua.includes('firefox')) {
      browser = 'Firefox';
    } else if (ua.includes('safari')) {
      browser = 'Safari';
    } else if (ua.includes('edge')) {
      browser = 'Edge';
    } else if (ua.includes('opera')) {
      browser = 'Opera';
    }

    // Detect OS
    let os: string | undefined;
    if (ua.includes('windows')) {
      os = 'Windows';
    } else if (ua.includes('mac')) {
      os = 'macOS';
    } else if (ua.includes('linux')) {
      os = 'Linux';
    } else if (ua.includes('android')) {
      os = 'Android';
    } else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
      os = 'iOS';
    }

    return { type, browser, os };
  }
}
