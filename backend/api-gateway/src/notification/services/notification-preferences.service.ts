import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface UpdatePreferencesDto {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  newMission?: boolean;
  missionUpdate?: boolean;
  newMessage?: boolean;
  paymentReceived?: boolean;
  paymentSent?: boolean;
  reviewReceived?: boolean;
  marketingEmails?: boolean;
  weeklyDigest?: boolean;
}

@Injectable()
export class NotificationPreferencesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get user's notification preferences (create default if doesn't exist)
   */
  async getPreferences(userId: string) {
    let preferences = await this.prisma.notificationPreferences.findUnique({
      where: { userId },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await this.prisma.notificationPreferences.create({
        data: { userId },
      });
    }

    return preferences;
  }

  /**
   * Update user's notification preferences
   */
  async updatePreferences(userId: string, updates: UpdatePreferencesDto) {
    // Ensure preferences exist
    await this.getPreferences(userId);

    // Mappe les alias UI vers les VRAIES colonnes Prisma + ignore tout champ inconnu
    // (sinon Prisma lève une 500 sur une colonne inexistante : missionUpdates/paymentNotifications/…).
    const COLS: Record<string, string> = {
      emailNotifications: 'emailNotifications',
      pushNotifications: 'pushNotifications',
      smsNotifications: 'smsNotifications',
      newMission: 'newMission',
      missionUpdate: 'missionUpdate',
      missionUpdates: 'missionUpdate',
      newMessage: 'newMessage',
      paymentReceived: 'paymentReceived',
      paymentSent: 'paymentSent',
      paymentNotifications: 'paymentReceived',
      reviewReceived: 'reviewReceived',
      reviewNotifications: 'reviewReceived',
      marketingEmails: 'marketingEmails',
      weeklyDigest: 'weeklyDigest',
    };
    const data: Record<string, boolean> = {};
    for (const [k, v] of Object.entries((updates as Record<string, unknown>) || {})) {
      const col = COLS[k];
      if (col && typeof v === 'boolean') data[col] = v;
    }

    return this.prisma.notificationPreferences.update({
      where: { userId },
      data,
    });
  }

  /**
   * Reset preferences to defaults
   */
  async resetPreferences(userId: string) {
    await this.prisma.notificationPreferences.delete({
      where: { userId },
    });

    return this.prisma.notificationPreferences.create({
      data: { userId },
    });
  }

  /**
   * Check if user should receive a specific notification type
   */
  async shouldNotify(userId: string, notificationType: string): Promise<boolean> {
    const preferences = await this.getPreferences(userId);

    // Map notification types to preference fields
    const typeMapping: Record<string, keyof typeof preferences> = {
      NEW_MISSION: 'newMission',
      MISSION_UPDATE: 'missionUpdate',
      NEW_MESSAGE: 'newMessage',
      PAYMENT_RECEIVED: 'paymentReceived',
      PAYMENT_SENT: 'paymentSent',
      REVIEW_RECEIVED: 'reviewReceived',
    };

    const field = typeMapping[notificationType];
    if (!field) {
      return true; // Default to sending if type not mapped
    }

    return preferences[field] as boolean;
  }
}
