import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class GdprService {
  constructor(private prisma: PrismaService) {}

  /**
   * Export all user data (GDPR compliance).
   *
   * RÈGLE ANTI-EXFILTRATION : un export RGPD ne doit contenir que la PII du DEMANDEUR.
   * On ne doit JAMAIS embarquer les coordonnées exactes (email / téléphone / adresse
   * précise / géoloc) d'une CONTREPARTIE (artisan favori, client d'une mission, partie
   * d'une facture). Sinon /users/gdpr/export devient un exfiltrateur de carnet d'adresses
   * légitime en un clic (poaching / désintermédiation). Les tiers sont donc pseudonymisés :
   * on garde l'identifiant + le prénom, jamais l'email/tel, et on remplace les adresses de
   * chantier de la contrepartie par une zone approximative (ville uniquement, pas de rue ni
   * de latitude/longitude).
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
                  // Contrepartie : jamais d'email/téléphone. Prénom + id seulement.
                  select: {
                    id: true,
                    firstName: true,
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
        // Consentements (RGPD art.7) : préférences marketing/analytics/géoloc/notifications.
        consents: true,
        givenReviews: true,
        receivedReviews: true,
        clientMissions: true,
        artisanMissions: true,
        notifications: true,
        // Factures : l'utilisateur peut être émetteur (artisan) et/ou destinataire (client).
        issuedInvoices: true,
        receivedInvoices: true,
        // Paiements/transactions initiés par l'utilisateur (escrow, remboursements). Données
        // financières propres au demandeur : montants, méthode, références Stripe/PayPal.
        payments: true,
        // Marketplace : commandes passées en tant que client (adresse de livraison = la sienne).
        orders: {
          include: {
            items: true,
          },
        },
        // Offres / négociations sur missions (l'utilisateur émet ET reçoit des propositions).
        negotiationsSent: true,
        negotiationsReceived: true,
        // Demandes de devis (l'utilisateur en tant que client ; en tant qu'artisan = contrepartie).
        clientRequests: true,
        artisanRequests: true,
        // Favoris (artisans/produits sauvegardés). Contrepartie pseudonymisée (id + prénom / nom produit).
        favorites: {
          include: {
            artisan: {
              select: {
                id: true,
                firstName: true,
              },
            },
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        // Tickets support : on n'embarque QUE les messages visibles du client (pas les notes internes).
        supportTickets: {
          include: {
            messages: {
              where: { isInternal: false },
            },
          },
        },
        // Messages/conversations : chargés via relations pour scoper strictement au demandeur.
        // - sentMessages : le demandeur est l'auteur → contenu + pièces jointes conservés.
        // - receivedMessages : contenu rédigé par la CONTREPARTIE → métadonnées seulement (voir plus bas).
        sentMessages: { orderBy: { createdAt: 'asc' } },
        receivedMessages: { orderBy: { createdAt: 'asc' } },
        refreshTokens: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    // Remove sensitive data / credentials (jamais dans un export téléchargeable).
    const {
      password: _password,
      twoFactorSecret: _twoFactorSecret,
      refreshTokens: _refreshTokens,
      // Jetons OAuth Microsoft = identifiants d'accès (credentials), pas de la « donnée
      // personnelle » exploitable : on ne les restitue jamais dans un fichier téléchargé.
      outlookAccessToken: _outlookAccessToken,
      outlookRefreshToken: _outlookRefreshToken,
      clientMissions,
      artisanMissions,
      issuedInvoices,
      receivedInvoices,
      payments,
      orders,
      negotiationsSent,
      negotiationsReceived,
      clientRequests,
      artisanRequests,
      favorites,
      supportTickets,
      sentMessages,
      receivedMessages,
      ...userWithoutSensitiveData
    } = user as any;

    // receivedMessages : le corps et les pièces jointes sont rédigés par la CONTREPARTIE →
    // on ne restitue que les métadonnées (id, expéditeur pseudonyme, lu/non lu, date). L'utilisateur
    // conserve la trace de l'échange sans qu'on exfiltre le contenu/PII d'autrui (art.15).
    const receivedMessagesMeta = (receivedMessages ?? []).map((m: any) => ({
      id: m.id,
      senderId: m.senderId,
      read: m.read,
      readAt: m.readAt,
      createdAt: m.createdAt,
      contentOmitted: true,
    }));

    const sanitized = {
      ...userWithoutSensitiveData,
      // clientMissions : missions où le demandeur est le CLIENT → l'adresse du chantier est
      // la SIENNE, on la conserve. La contrepartie artisan n'est qu'un artisanId (pseudonyme).
      clientMissions: clientMissions ?? [],
      // artisanMissions : missions où le demandeur est l'ARTISAN → l'adresse/géoloc du chantier
      // appartient au CLIENT (contrepartie). On la réduit à une zone approximative.
      artisanMissions: (artisanMissions ?? []).map((m: any) =>
        this.redactCounterpartyMissionLocation(m),
      ),
      // Factures : on retire l'adresse de la contrepartie (bloc JSON {name, address, ...}).
      // issuedInvoices → l'émetteur est le demandeur, le client est la contrepartie.
      issuedInvoices: (issuedInvoices ?? []).map((inv: any) =>
        this.redactInvoiceCounterparty(inv, 'clientAddress'),
      ),
      // receivedInvoices → le destinataire est le demandeur, l'émetteur est la contrepartie.
      receivedInvoices: (receivedInvoices ?? []).map((inv: any) =>
        this.redactInvoiceCounterparty(inv, 'issuerAddress'),
      ),
      // Paiements/transactions du demandeur (montants, remboursements, références PSP).
      payments: payments ?? [],
      // Commandes marketplace du demandeur (adresse de livraison = la sienne).
      orders: orders ?? [],
      // Offres/négociations : l'utilisateur voit les siennes ET celles reçues sur ses missions.
      // Aucune PII de contrepartie (uniquement senderId/receiverId pseudonymes + prix + message métier).
      negotiationsSent: negotiationsSent ?? [],
      negotiationsReceived: negotiationsReceived ?? [],
      // Demandes de devis en tant que client (adresse = la sienne).
      clientRequests: clientRequests ?? [],
      // Demandes reçues en tant qu'artisan : l'adresse appartient au client (contrepartie) → zone approx.
      artisanRequests: (artisanRequests ?? []).map((r: any) =>
        this.redactCounterpartyRequestLocation(r),
      ),
      // Favoris (contrepartie déjà pseudonymisée via select id/prénom/nom produit).
      favorites: favorites ?? [],
      // Tickets support (messages internes déjà exclus via le where).
      supportTickets: supportTickets ?? [],
      // Messages : sortants complets (rédigés par l'utilisateur), entrants en métadonnées seules.
      sentMessages: sentMessages ?? [],
      receivedMessages: receivedMessagesMeta,
    };

    return {
      exportDate: new Date().toISOString(),
      personalData: sanitized,
      metadata: {
        dataCategories: [
          'Account Information',
          'Profile Data',
          'Addresses',
          'Consents',
          'Reviews',
          'Missions',
          'Quote Requests',
          'Offers & Negotiations',
          'Payments & Transactions',
          'Invoices',
          'Marketplace Orders',
          'Favorites',
          'Messages',
          'Support Tickets',
          'Notifications',
          'Preferences',
        ],
        exportFormat: 'JSON',
        gdprCompliant: true,
        // Les coordonnées exactes des tiers (contreparties) sont volontairement omises :
        // un export RGPD ne restitue que la PII du demandeur, pas celle d'autrui.
        thirdPartyDataPseudonymized: true,
      },
    };
  }

  /**
   * Réduit une mission où la contrepartie est le CLIENT : on supprime l'adresse exacte
   * (rue), le code postal et la géolocalisation du chantier ; on ne garde que la ville
   * comme zone approximative. La contrepartie reste identifiée par son clientId (pseudonyme).
   */
  private redactCounterpartyMissionLocation(mission: any) {
    if (!mission || typeof mission !== 'object') return mission;
    const {
      address: _address,
      postalCode: _postalCode,
      latitude: _latitude,
      longitude: _longitude,
      billingAddress: _billingAddress,
      billingCompanyName: _billingCompanyName,
      ...rest
    } = mission;
    return {
      ...rest,
      // Zone approximative uniquement (ville), jamais l'adresse précise du client.
      approximateArea: mission.city ?? null,
    };
  }

  /**
   * Réduit une demande de devis reçue en tant qu'ARTISAN : l'adresse/géoloc appartient au
   * CLIENT (contrepartie). On supprime rue, code postal et coordonnées ; on ne garde que la
   * ville comme zone approximative. Le client reste identifié par son clientId (pseudonyme).
   */
  private redactCounterpartyRequestLocation(request: any) {
    if (!request || typeof request !== 'object') return request;
    const {
      address: _address,
      postalCode: _postalCode,
      latitude: _latitude,
      longitude: _longitude,
      ...rest
    } = request;
    return {
      ...rest,
      approximateArea: request.city ?? null,
    };
  }

  /**
   * Retire le bloc adresse de la CONTREPARTIE d'une facture (JSON {name, address, city,
   * postalCode, country, siret, vat}). On ne garde qu'une localisation grossière
   * (ville/pays) pour la valeur probante, jamais le nom/rue/SIRET du tiers.
   */
  private redactInvoiceCounterparty(
    invoice: any,
    counterpartyField: 'clientAddress' | 'issuerAddress',
  ) {
    if (!invoice || typeof invoice !== 'object') return invoice;
    const raw = invoice[counterpartyField];
    const coarse =
      raw && typeof raw === 'object'
        ? { city: (raw as any).city ?? null, country: (raw as any).country ?? null }
        : null;
    return {
      ...invoice,
      [counterpartyField]: coarse,
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
