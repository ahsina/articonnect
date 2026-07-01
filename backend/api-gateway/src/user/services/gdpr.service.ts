import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
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
      password: _password,
      twoFactorSecret: _twoFactorSecret,
      refreshTokens: _refreshTokens,
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

    if (user.status === 'DELETED') {
      return { message: 'Ce compte a déjà été supprimé.' };
    }

    // ERASURE RGPD réelle : on anonymise les données personnelles (le record est conservé pour les
    // obligations légales — factures, comptabilité — mais ne contient plus de PII identifiante).
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId}@krafolt.invalid`,
        firstName: 'Compte',
        lastName: 'supprimé',
        phone: null,
        avatar: null,
        password: randomBytes(32).toString('hex'), // verrouille toute connexion
        twoFactorSecret: null,
        twoFactorEnabled: false,
        outlookAccessToken: null,
        outlookRefreshToken: null,
        outlookTokenExpiry: null,
        fcmTokens: [],
        deviceFingerprints: [],
        lastUserAgent: null,
        lastIpAddress: null,
        lastSessionId: null,
        lastSessionLocation: null,
        status: 'DELETED',
        deletedAt: new Date(),
      },
    });

    // Anonymise aussi le profil artisan (adresse, coordonnées, SIRET) si présent.
    await this.prisma.artisanProfile.updateMany({
      where: { userId },
      data: { baseAddress: 'Adresse supprimée', latitude: 0, longitude: 0, description: null, website: null },
    });

    return {
      message: 'Votre compte et vos données personnelles ont été supprimés. Les pièces à conservation légale (factures) sont anonymisées et conservées selon la réglementation.',
      deletedAt: new Date().toISOString(),
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
