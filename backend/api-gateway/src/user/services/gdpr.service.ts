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

  // Délai de grâce (en jours) avant l'effacement définitif d'un compte.
  private readonly DELETION_GRACE_PERIOD_DAYS = 30;

  /**
   * Request account deletion (GDPR right to erasure).
   *
   * IMPORTANT : cette opération est RÉVERSIBLE. On ne détruit ni n'anonymise aucune PII ici ;
   * on marque simplement le compte comme suspendu (en attente de suppression) et on horodate la
   * demande via `deletedAt`. Le client dispose d'un délai de grâce pour annuler la demande
   * (cancelDeletionRequest). L'effacement/anonymisation définitif est un job différé / une action
   * admin (hors scope de ce endpoint).
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

    if (user.deletedAt) {
      // Une demande de suppression est déjà en attente : opération idempotente.
      const scheduledFor = new Date(
        user.deletedAt.getTime() + this.DELETION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
      );
      return {
        message:
          'Une demande de suppression est déjà en cours. Vous pouvez l\'annuler à tout moment avant la date prévue.',
        requestedAt: user.deletedAt.toISOString(),
        scheduledFor: scheduledFor.toISOString(),
      };
    }

    const requestedAt = new Date();
    const scheduledFor = new Date(
      requestedAt.getTime() + this.DELETION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    );

    // Marque la demande de façon réversible : le compte est suspendu et la date de demande
    // enregistrée. Aucune PII n'est détruite ici — le compte peut être restauré via cancel-deletion.
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'SUSPENDED',
        deletedAt: requestedAt,
      },
    });

    return {
      message:
        'Votre demande de suppression a bien été enregistrée. Votre compte sera supprimé après un délai de grâce ; vous pouvez annuler cette demande avant cette date.',
      requestedAt: requestedAt.toISOString(),
      scheduledFor: scheduledFor.toISOString(),
    };
  }

  /**
   * Cancel account deletion request.
   *
   * Réactive un compte dont la suppression avait été demandée : on efface l'horodatage de demande
   * (`deletedAt`) et on repasse le statut à ACTIVE. Comme requestDeletion ne détruit plus aucune
   * PII, l'annulation restaure intégralement le compte.
   */
  async cancelDeletionRequest(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    if (user.status === 'DELETED') {
      throw new NotFoundException(
        'Ce compte a déjà été supprimé définitivement et ne peut plus être restauré.',
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'ACTIVE',
        deletedAt: null,
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
