import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private firebaseApp: admin.app.App | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      const firebaseConfig = this.configService.get('FIREBASE_CONFIG');

      if (!firebaseConfig) {
        this.logger.warn(
          'Firebase configuration not found. Push notifications will not be sent. ' +
          'To enable FCM, set FIREBASE_CONFIG environment variable with your Firebase service account JSON.',
        );
        return;
      }

      const config = JSON.parse(firebaseConfig);

      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(config),
      });

      this.logger.log('Firebase Cloud Messaging initialized successfully');
    } catch (error) {
      this.logger.error(
        `Failed to initialize Firebase: ${error.message}. Push notifications will not be sent.`,
      );
    }
  }

  /**
   * Check if FCM is configured and ready
   */
  isConfigured(): boolean {
    return this.firebaseApp !== null;
  }

  /**
   * Register a new FCM token for a user
   */
  async registerToken(userId: string, token: string): Promise<void> {
    try {
      // Get current tokens
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { fcmTokens: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Add token if not already registered
      if (!user.fcmTokens.includes(token)) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            fcmTokens: {
              push: token,
            },
          },
        });

        this.logger.log(`Registered FCM token for user ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to register FCM token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Unregister an FCM token for a user
   */
  async unregisterToken(userId: string, token: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { fcmTokens: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Remove token
      const updatedTokens = user.fcmTokens.filter((t) => t !== token);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          fcmTokens: updatedTokens,
        },
      });

      this.logger.log(`Unregistered FCM token for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to unregister FCM token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send a push notification to a specific user
   */
  async sendToUser(
    userId: string,
    notification: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.debug('FCM not configured, skipping push notification');
      return;
    }

    try {
      // Get user's FCM tokens
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { fcmTokens: true },
      });

      if (!user || user.fcmTokens.length === 0) {
        this.logger.debug(`No FCM tokens found for user ${userId}`);
        return;
      }

      // Send notification to all user's devices
      await this.sendToTokens(user.fcmTokens, notification);
    } catch (error) {
      this.logger.error(`Failed to send notification to user ${userId}: ${error.message}`);
    }
  }

  /**
   * Send a push notification to specific tokens
   */
  async sendToTokens(
    tokens: string[],
    notification: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.debug('FCM not configured, skipping push notification');
      return;
    }

    if (tokens.length === 0) {
      return;
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data || {},
        tokens,
      };

      const response = await this.firebaseApp!.messaging().sendEachForMulticast(message);

      // Log results
      if (response.failureCount > 0) {
        this.logger.warn(
          `Failed to send ${response.failureCount} out of ${tokens.length} notifications`,
        );

        // Remove invalid tokens
        const invalidTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const error = resp.error;
            if (
              error?.code === 'messaging/invalid-registration-token' ||
              error?.code === 'messaging/registration-token-not-registered'
            ) {
              invalidTokens.push(tokens[idx]);
            }
          }
        });

        if (invalidTokens.length > 0) {
          await this.removeInvalidTokens(invalidTokens);
        }
      } else {
        this.logger.log(`Successfully sent ${response.successCount} notifications`);
      }
    } catch (error) {
      this.logger.error(`Failed to send push notifications: ${error.message}`);
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    notification: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.debug('FCM not configured, skipping push notification');
      return;
    }

    try {
      // Get all FCM tokens for these users
      const users = await this.prisma.user.findMany({
        where: {
          id: { in: userIds },
        },
        select: {
          fcmTokens: true,
        },
      });

      const allTokens = users.flatMap((user) => user.fcmTokens);

      if (allTokens.length === 0) {
        this.logger.debug('No FCM tokens found for specified users');
        return;
      }

      await this.sendToTokens(allTokens, notification);
    } catch (error) {
      this.logger.error(`Failed to send notifications to users: ${error.message}`);
    }
  }

  /**
   * Remove invalid tokens from database
   */
  private async removeInvalidTokens(tokens: string[]): Promise<void> {
    try {
      // Find users with these tokens and remove them
      const users = await this.prisma.user.findMany({
        where: {
          fcmTokens: {
            hasSome: tokens,
          },
        },
        select: {
          id: true,
          fcmTokens: true,
        },
      });

      for (const user of users) {
        const validTokens = user.fcmTokens.filter((token) => !tokens.includes(token));

        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            fcmTokens: validTokens,
          },
        });
      }

      this.logger.log(`Removed ${tokens.length} invalid FCM tokens from database`);
    } catch (error) {
      this.logger.error(`Failed to remove invalid tokens: ${error.message}`);
    }
  }

  /**
   * Send a notification with topic subscription
   */
  async sendToTopic(
    topic: string,
    notification: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.debug('FCM not configured, skipping push notification');
      return;
    }

    try {
      const message: admin.messaging.Message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data || {},
        topic,
      };

      await this.firebaseApp!.messaging().send(message);
      this.logger.log(`Successfully sent notification to topic: ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to send notification to topic ${topic}: ${error.message}`);
    }
  }
}
