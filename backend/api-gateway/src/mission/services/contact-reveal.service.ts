import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * ContactRevealService — révélation de contact TIME-BOXÉE + AUDITÉE + RÉVOCABLE (façon Uber).
 *
 * Objectif anti-désintermédiation : le contact réel (téléphone) n'est révélé aux deux parties que
 * pendant la FENÊTRE ACTIVE de la mission. Après COMPLETED / AUTO_VALIDATED + un délai de grâce
 * (72h), on RE-MASQUE (retour prénom + initiale) : impossible de recycler le numéro pour le
 * prochain chantier « en direct ». Chaque révélation croisée effective est journalisée
 * (ContactRevealLog) pour alimenter le détecteur de leakage, et un viewer déjà `leakageFlagged`
 * ne peut plus DÉVERROUILLER de NOUVEAU contact.
 *
 * NB : cette classe est instanciée manuellement par MissionService (`new ContactRevealService(prisma)`)
 * pour ne pas toucher au wiring du module — pas besoin de l'enregistrer comme provider.
 */
export class ContactRevealService {
  /** Délai de grâce après clôture pendant lequel le contact reste visible (SAV / dernier échange). */
  private static readonly GRACE_MS = 72 * 60 * 60 * 1000; // 72h

  /** Statuts terminaux au-delà desquels la mission n'est plus « active » (grâce 72h puis re-masquage). */
  private static readonly TERMINAL_STATUSES = new Set(['COMPLETED', 'AUTO_VALIDATED']);

  /**
   * Statuts d'ANNULATION / litige : la mise en relation est ROMPUE — on FERME la fenêtre
   * immédiatement (pas de grâce). Sinon un client peut payer l'acompte (contact révélé),
   * annuler + se faire rembourser, et garder le numéro de l'artisan à vie → désintermédiation.
   */
  private static readonly CANCELLED_STATUSES = new Set([
    'CANCELLED', 'CANCELLED_NO_SHOW', 'DISPUTED', 'REFUNDED', 'EXPIRED', 'REJECTED',
  ]);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * La mission est-elle dans sa FENÊTRE ACTIVE de révélation ?
   *  - Tant qu'elle n'est pas COMPLETED / AUTO_VALIDATED : fenêtre ouverte (happy-path préservé).
   *  - Une fois terminée : ouverte seulement pendant GRACE_MS après la date de clôture, puis fermée
   *    (re-masquage). Sans date de clôture exploitable, on ferme par prudence.
   */
  isWithinActiveWindow(mission: any): boolean {
    const status = String(mission?.status);
    // Annulation / litige : mise en relation rompue → fenêtre fermée IMMÉDIATEMENT (aucune grâce).
    if (ContactRevealService.CANCELLED_STATUSES.has(status)) {
      return false;
    }
    // Mission terminée avec succès : ouverte seulement pendant la grâce 72h après clôture.
    if (ContactRevealService.TERMINAL_STATUSES.has(status)) {
      const closedAt =
        mission?.autoValidatedAt || mission?.validatedAt || mission?.completedAt;
      if (!closedAt) return false;
      const elapsed = Date.now() - new Date(closedAt).getTime();
      return elapsed <= ContactRevealService.GRACE_MS;
    }
    // Mission active (en cours) : fenêtre ouverte (happy-path préservé).
    return true;
  }

  /**
   * Décide de la révélation des contacts CLIENT et ARTISAN pour un viewer donné.
   *
   * Règles :
   *  - Soi-même / ADMIN : contact toujours visible (donnée propre / supervision), NON audité, NON time-boxé.
   *  - Révélation CROISÉE (la « mise en relation ») artisan↔client : exige escrow sécurisé ET fenêtre
   *    active. Elle est journalisée (idempotent) et bloquée pour un viewer `leakageFlagged` qui n'avait
   *    pas déjà déverrouillé ce contact.
   */
  async resolveContactReveal(params: {
    mission: any;
    userId: string;
    isAdmin: boolean;
    isClientViewer: boolean;
    isAssignedArtisanViewer: boolean;
    escrowSecured: boolean;
  }): Promise<{ revealClientContact: boolean; revealArtisanContact: boolean }> {
    const {
      mission,
      userId,
      isAdmin,
      isClientViewer,
      isAssignedArtisanViewer,
      escrowSecured,
    } = params;

    // Révélations « propres » (donnée du viewer lui-même) + supervision ADMIN : non concernées par
    // le time-box / l'audit / le leakage.
    let revealClientContact = isAdmin || isClientViewer;
    let revealArtisanContact = isAdmin || isAssignedArtisanViewer;

    const withinWindow = this.isWithinActiveWindow(mission);

    // Artisan assigné (viewer) -> contact du CLIENT (croisé).
    if (
      !revealClientContact &&
      isAssignedArtisanViewer &&
      escrowSecured &&
      withinWindow &&
      mission?.clientId
    ) {
      revealClientContact = await this.grantCrossReveal(
        userId,
        mission.clientId,
        mission.id,
      );
    }

    // Client (viewer) -> contact de l'ARTISAN assigné (croisé).
    if (
      !revealArtisanContact &&
      isClientViewer &&
      escrowSecured &&
      withinWindow &&
      mission?.artisanId
    ) {
      revealArtisanContact = await this.grantCrossReveal(
        userId,
        mission.artisanId,
        mission.id,
      );
    }

    return { revealClientContact, revealArtisanContact };
  }

  /**
   * Autorise (ou non) une révélation croisée et l'AUDITE.
   *  - `leakageFlagged` + aucun déverrouillage antérieur sur ce triplet => refus (pas de NOUVEAU contact),
   *    sans casser une mission en cours où le viewer avait déjà obtenu le contact (log existant => OK).
   *  - Log idempotent/dédupliqué par (viewer, target, mission) : n'écrit qu'une fois, résiste à la course.
   */
  private async grantCrossReveal(
    viewerId: string,
    targetUserId: string,
    missionId: string,
  ): Promise<boolean> {
    const [viewer, existing] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: viewerId },
        select: { leakageFlagged: true },
      }),
      this.prisma.contactRevealLog.findUnique({
        where: {
          viewerId_targetUserId_missionId: { viewerId, targetUserId, missionId },
        },
        select: { id: true },
      }),
    ]);

    // Viewer gelé pour désintermédiation : on refuse tout NOUVEAU déverrouillage, mais on n'invalide
    // pas un contact déjà déverrouillé pendant cette mission (log existant).
    if (viewer?.leakageFlagged && !existing) {
      return false;
    }

    if (!existing) {
      // Idempotent : la contrainte @@unique dédoublonne ; on avale l'erreur de course éventuelle.
      await this.prisma.contactRevealLog
        .create({ data: { viewerId, targetUserId, missionId } })
        .catch(() => undefined);
    }

    return true;
  }
}
