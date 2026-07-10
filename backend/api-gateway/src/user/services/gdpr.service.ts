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
        // Factures : l'utilisateur peut être émetteur (artisan) et/ou destinataire (client).
        issuedInvoices: true,
        receivedInvoices: true,
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
          'Invoices',
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

    if (user.deletionRequestedAt) {
      // Une demande de suppression est déjà en attente : opération idempotente.
      const scheduledFor =
        user.deletionScheduledFor ??
        new Date(
          user.deletionRequestedAt.getTime() +
            this.DELETION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
        );
      return {
        message:
          'Une demande de suppression est déjà en cours. Vous pouvez l\'annuler à tout moment avant la date prévue.',
        requestedAt: user.deletionRequestedAt.toISOString(),
        scheduledFor: scheduledFor.toISOString(),
      };
    }

    const requestedAt = new Date();
    const scheduledFor = new Date(
      requestedAt.getTime() + this.DELETION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    );

    // Marque la demande de façon RÉVERSIBLE, sans casser l'authentification :
    //  - on ne passe PAS le compte à SUSPENDED (sinon jwt.strategy le rejette en 401) ;
    //  - on n'écrit PAS `deletedAt` (le middleware soft-delete masquerait l'utilisateur de tout
    //    findUnique/findMany, rendant cancel-deletion et le login impossibles).
    // On enregistre uniquement l'horodatage de la demande + la date d'effacement programmée.
    // Aucune PII n'est détruite ici — l'effacement définitif est un job différé / action admin.
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletionRequestedAt: requestedAt,
        deletionScheduledFor: scheduledFor,
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

    // Efface uniquement les marqueurs de demande de suppression. On ne force pas `status`
    // (la demande ne suspend plus le compte) ni `deletedAt` (jamais écrit à la demande).
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletionRequestedAt: null,
        deletionScheduledFor: null,
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
