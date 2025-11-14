import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';

export interface LoginAttempt {
  email: string;
  ipAddress: string;
  timestamp: Date;
  success: boolean;
  userAgent?: string;
}

@Injectable()
export class LoginSecurityService {
  private readonly ATTEMPTS_PREFIX = 'login:attempts:';
  private readonly LOCKOUT_PREFIX = 'login:lockout:';
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60; // 15 minutes in seconds
  private readonly ATTEMPT_WINDOW = 15 * 60; // 15 minutes in seconds

  constructor(private readonly redis: RedisService) {}

  /**
   * Record a login attempt
   */
  async recordAttempt(
    email: string,
    ipAddress: string,
    success: boolean,
    userAgent?: string,
  ): Promise<void> {
    const key = this.getAttemptsKey(email);
    const attempt: LoginAttempt = {
      email,
      ipAddress,
      timestamp: new Date(),
      success,
      userAgent,
    };

    // Get existing attempts
    const attempts = await this.getRecentAttempts(email);
    attempts.push(attempt);

    // Store attempts with TTL
    await this.redis.set(
      key,
      JSON.stringify(attempts),
      this.ATTEMPT_WINDOW,
    );

    // If successful login, clear failed attempts
    if (success) {
      await this.clearFailedAttempts(email);
    } else {
      // Check if should lockout
      await this.checkAndApplyLockout(email);
    }
  }

  /**
   * Check if account is locked out
   */
  async isLockedOut(email: string): Promise<boolean> {
    const lockoutKey = this.getLockoutKey(email);
    const lockoutData = await this.redis.get(lockoutKey);
    return lockoutData !== null;
  }

  /**
   * Get remaining lockout time in seconds
   */
  async getRemainingLockoutTime(email: string): Promise<number> {
    const lockoutKey = this.getLockoutKey(email);
    const ttl = await this.redis.ttl(lockoutKey);
    return ttl > 0 ? ttl : 0;
  }

  /**
   * Get failed attempt count
   */
  async getFailedAttemptCount(email: string): Promise<number> {
    const attempts = await this.getRecentAttempts(email);
    return attempts.filter((a) => !a.success).length;
  }

  /**
   * Get all recent login attempts
   */
  async getRecentAttempts(email: string): Promise<LoginAttempt[]> {
    const key = this.getAttemptsKey(email);
    const data = await this.redis.get(key);

    if (!data) {
      return [];
    }

    const attempts: LoginAttempt[] = JSON.parse(data);
    const cutoffTime = new Date(Date.now() - this.ATTEMPT_WINDOW * 1000);

    // Filter out old attempts
    return attempts.filter((a) => new Date(a.timestamp) > cutoffTime);
  }

  /**
   * Clear failed attempts (called after successful login)
   */
  async clearFailedAttempts(email: string): Promise<void> {
    const key = this.getAttemptsKey(email);
    await this.redis.del(key);
  }

  /**
   * Manually unlock an account (admin function)
   */
  async unlockAccount(email: string): Promise<void> {
    const lockoutKey = this.getLockoutKey(email);
    const attemptsKey = this.getAttemptsKey(email);

    await Promise.all([
      this.redis.del(lockoutKey),
      this.redis.del(attemptsKey),
    ]);
  }

  /**
   * Verify login is allowed and throw if locked out
   */
  async verifyLoginAllowed(email: string): Promise<void> {
    if (await this.isLockedOut(email)) {
      const remainingTime = await this.getRemainingLockoutTime(email);
      const minutes = Math.ceil(remainingTime / 60);

      throw new UnauthorizedException(
        `Account locked due to too many failed login attempts. Try again in ${minutes} minutes.`,
      );
    }
  }

  /**
   * Get login security stats for a user
   */
  async getSecurityStats(email: string): Promise<{
    isLockedOut: boolean;
    failedAttempts: number;
    remainingLockoutTime: number;
    recentAttempts: LoginAttempt[];
  }> {
    const [isLockedOut, failedAttempts, remainingLockoutTime, recentAttempts] =
      await Promise.all([
        this.isLockedOut(email),
        this.getFailedAttemptCount(email),
        this.getRemainingLockoutTime(email),
        this.getRecentAttempts(email),
      ]);

    return {
      isLockedOut,
      failedAttempts,
      remainingLockoutTime,
      recentAttempts: recentAttempts.slice(-10), // Last 10 attempts
    };
  }

  /**
   * Private: Check and apply lockout if needed
   */
  private async checkAndApplyLockout(email: string): Promise<void> {
    const failedAttempts = await this.getFailedAttemptCount(email);

    if (failedAttempts >= this.MAX_ATTEMPTS) {
      const lockoutKey = this.getLockoutKey(email);
      await this.redis.set(
        lockoutKey,
        JSON.stringify({
          email,
          lockedAt: new Date(),
          reason: 'Too many failed login attempts',
        }),
        this.LOCKOUT_DURATION,
      );
    }
  }

  /**
   * Private: Get attempts key
   */
  private getAttemptsKey(email: string): string {
    return `${this.ATTEMPTS_PREFIX}${email}`;
  }

  /**
   * Private: Get lockout key
   */
  private getLockoutKey(email: string): string {
    return `${this.LOCKOUT_PREFIX}${email}`;
  }
}
