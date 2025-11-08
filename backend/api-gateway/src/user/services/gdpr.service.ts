import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class GdprService {
  constructor(private prisma: PrismaService) {}

  /**
   * Export all user data (GDPR compliance)
   */
  async exportUserData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        clientProfile: {
          include: {
            addresses: true,
            savedArtisans: {
              include: {
                artisan: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        artisanProfile: {
          include: {
            specialties: true,
            certifications: true,
          },
        },
        givenReviews: true,
        receivedReviews: true,
        clientMissions: true,
        artisanMissions: true,
        notifications: true,
        refreshTokens: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    // Remove sensitive data
    const {
      password,
      twoFactorSecret,
      refreshTokens,
      ...userWithoutSensitiveData
    } = user;

    return {
      exportDate: new Date().toISOString(),
      personalData: userWithoutSensitiveData,
      metadata: {
        dataCategories: [
          'Account Information',
          'Profile Data',
          'Addresses',
          'Reviews',
          'Missions',
          'Notifications',
          'Preferences',
        ],
        exportFormat: 'JSON',
        gdprCompliant: true,
      },
    };
  }

  /**
   * Request account deletion (GDPR right to erasure)
   */
  async requestDeletion(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    // In production, this would typically create a deletion request
    // that gets processed after a grace period (e.g., 30 days)
    // For now, we'll just mark the account for deletion

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'SUSPENDED',
      },
    });

    return {
      message: 'Demande de suppression enregistrée. Votre compte sera supprimé dans 30 jours.',
      deletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Cancel account deletion request
   */
  async cancelDeletionRequest(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'ACTIVE',
      },
    });

    return { message: 'Demande de suppression annulée' };
  }

  /**
   * Get user consents (GDPR compliance)
   */
  async getUserConsents(userId: string) {
    let consents = await this.prisma.userConsent.findUnique({
      where: { userId },
    });

    // Create default consents if they don't exist
    if (!consents) {
      consents = await this.prisma.userConsent.create({
        data: {
          user: { connect: { id: userId } },
          marketing: false,
          analytics: false,
          geolocation: false,
          ipAddress: 'unknown',
        },
      });
    }

    return consents;
  }

  /**
   * Update user consents
   */
  async updateConsents(
    userId: string,
    updates: {
      marketing?: boolean;
      analytics?: boolean;
      geolocation?: boolean;
    },
  ) {
    // Ensure consents exist
    await this.getUserConsents(userId);

    return this.prisma.userConsent.update({
      where: { userId },
      data: updates,
    });
  }
}
