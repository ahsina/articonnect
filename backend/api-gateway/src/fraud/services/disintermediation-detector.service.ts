import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Disintermediation (leakage) detector — anti-désintermédiation façon Uber.
 *
 * Comble la lacune structurelle : jusqu'ici fraud/* détectait le multi-compte, la fraude
 * aux avis, aux payouts, aux remboursements… mais RIEN ne mesurait le risque qu'un
 * utilisateur (client OU artisan) essaie de sortir la relation hors de la plateforme
 * (« leakage »), qui est la fuite de revenu #1 d'une marketplace de services.
 *
 * Le score de risque `leakageRiskScore` (0-100) agrège des signaux réels et déjà
 * persistés (aucune donnée inventée) :
 *   1. Nb de ContentViolation « contact » sur 30j (téléphone/email/WhatsApp bloqués par le chat).
 *   2. offPlatformSolicitationCount : compteur incrémenté à chaque message BLOQUÉ par le
 *      content-filter et à chaque signalement OFF_PLATFORM_SOLICITATION (voir recordBlockedMessage).
 *   3. Contact-fishing : ratio anormalement bas entre conversations initiées (partenaires de
 *      messagerie distincts) et missions réellement payées/escrow-financées.
 *   4. Sollicitation hors-plateforme : mots-clés « en direct / sans commission / cash /
 *      de la main à la main / hors site / on se fait ça directement » détectés dans le contenu
 *      des violations déjà loggées.
 *   5. Demandes répétées de coordonnées.
 *
 * ENFORCEMENT GRADUÉ (posture stricte Uber) — porté par le champ persistant `leakageFlagged`
 * (que la couche de révélation/mise-en-relation DOIT honorer) et par le statut du compte :
 *   - score >=  40 → WARNING          : avertissement tracé (aucun blocage).
 *   - score >=  60 → REQUIRE_DEPOSIT  : escrow/dépôt rendu obligatoire pour ce compte.
 *   - score >=  75 → FREEZE_MATCHING  : leakageFlagged=true → gel des mises en relation
 *                                       (plus de nouvelle révélation de contact).
 *   - score >=  90 → DEACTIVATE       : compte SUSPENDED.
 *
 * IMPORTANT — happy-path préservé : ce détecteur n'annule JAMAIS la révélation de contact
 * légitime déclenchée par un paiement escrow pour le client et l'artisan ASSIGNÉ. Il ne fait
 * qu'observer et graduer des pénalités ; il ne touche pas la logique de révélation post-paiement.
 */

export type LeakagePenalty =
  | 'NONE'
  | 'WARNING'
  | 'REQUIRE_DEPOSIT'
  | 'FREEZE_MATCHING'
  | 'DEACTIVATE';

export interface LeakageSignal {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  data?: Record<string, unknown>;
}

export interface LeakageRiskResult {
  userId: string;
  leakageRiskScore: number;
  leakageFlagged: boolean;
  offPlatformSolicitationCount: number;
  signals: LeakageSignal[];
  recommendedPenalty: LeakagePenalty;
}

// Statuts de mission qui prouvent qu'un paiement/escrow a réellement été financé.
const PAID_MISSION_STATUSES = [
  'DEPOSIT_PAID',
  'IN_TRANSIT',
  'PAID',
  'IN_PROGRESS',
  'COMPLETED',
  'AUTO_VALIDATED',
];

// Noms de patterns du content-filter qui correspondent à un partage de coordonnées (vs simple lien).
const CONTACT_PATTERN_NAMES = [
  'PHONE_FR_INTERNATIONAL',
  'PHONE_FR_NATIONAL',
  'PHONE_FR_MOBILE',
  'PHONE_LU', // couverture Luxembourg éventuelle (marché réel)
  'EMAIL',
  'EMAIL_OBFUSCATED',
  'WHATSAPP',
  'TELEGRAM',
  'SIGNAL',
  'CONTACT_KEYWORDS',
  'WRITTEN_PHONE',
];

@Injectable()
export class DisintermediationDetectorService {
  private readonly logger = new Logger(DisintermediationDetectorService.name);

  // Sollicitations explicites de sortie hors-plateforme (FR + variantes), tolérantes aux accents.
  // NB: on ne construit PAS ces RegExp avec le flag `g` pour éviter le bug de lastIndex persistant
  // sur .test() (chaque scan crée un usage frais et sans état partagé).
  private readonly solicitationPatterns: { name: string; regex: RegExp }[] = [
    { name: 'EN_DIRECT', regex: /\ben\s+direct\b/i },
    { name: 'SANS_COMMISSION', regex: /\bsans\s+(?:commission|comm[i1]ss?|frais\s+de\s+plateforme)\b/i },
    { name: 'CASH', regex: /\b(?:cash|esp[eè]ces?|liquide|au\s+black)\b/i },
    { name: 'MAIN_A_MAIN', regex: /\bde\s+la?\s+main\s+[àa]\s+la?\s+main\b/i },
    { name: 'HORS_SITE', regex: /\bhors\s+(?:site|plateforme|plate-?forme|application|app)\b/i },
    { name: 'DIRECTEMENT', regex: /\bon\s+(?:se\s+)?(?:fait|voit|arrange|r[eè]gle)\s+(?:[çc]a\s+)?(?:directement|en\s+direct|entre\s+nous)\b/i },
    { name: 'SANS_PASSER_PAR', regex: /\bsans\s+passer\s+par\b/i },
    { name: 'EN_DEHORS', regex: /\ben\s+dehors\s+(?:du\s+site|de\s+la\s+plateforme|de\s+l['e]?\s?app)/i },
    { name: 'PAIEMENT_DIRECT', regex: /\bpai(?:e|ement)\s+(?:direct|en\s+esp[eè]ces?|cash|de\s+la\s+main)/i },
  ];

  constructor(private prisma: PrismaService) {}

  /**
   * Scan pur (sans effet de bord) d'un texte à la recherche d'intentions de sortie hors-plateforme.
   * Réutilisable par le chat, les devis, les avis, etc.
   */
  scanSolicitation(text: string | null | undefined): { matched: string[]; score: number } {
    if (!text) return { matched: [], score: 0 };
    const matched: string[] = [];
    for (const p of this.solicitationPatterns) {
      if (p.regex.test(text)) matched.push(p.name);
    }
    // 20 points par famille de mot-clé, plafonné à 60 (pour laisser les autres signaux compter).
    const score = Math.min(matched.length * 20, 60);
    return { matched, score };
  }

  /**
   * HOOK — à appeler quand le content-filter BLOQUE un message (event « message bloqué »).
   * Incrémente offPlatformSolicitationCount de façon atomique et, si le contenu contient une
   * intention explicite de sortie hors-plateforme, recalcule immédiatement le risque de leakage.
   *
   * Idempotence côté persistance : chaque appel = un message bloqué (le content-filter n'appelle
   * qu'une fois par message bloqué). Ne lève jamais : la modération ne doit pas casser l'envoi.
   */
  async recordBlockedMessage(
    userId: string,
    opts?: { content?: string; detectedPatterns?: string[] },
  ): Promise<void> {
    if (!userId) return;
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { offPlatformSolicitationCount: { increment: 1 } },
      });

      const solicitation = this.scanSolicitation(opts?.content);
      if (solicitation.matched.length > 0) {
        this.logger.warn(
          `Off-platform solicitation par ${userId} | mots-clés: ${solicitation.matched.join(', ')}`,
        );
      }
      // Recalcule le score À CHAQUE message bloqué ET applique automatiquement la pénalité
      // graduée correspondante → enforcement automatique (plus seulement admin manuel).
      await this.enforce(userId, {
        source: 'blocked-message',
        reason: 'Message bloqué par le content-filter',
      });
    } catch (error) {
      this.logger.error(`recordBlockedMessage a échoué pour ${userId}`, error as Error);
    }
  }

  /**
   * Calcule et PERSISTE le leakageRiskScore + leakageFlagged d'un utilisateur.
   * Applique automatiquement la pénalité graduée jusqu'au gel des mises en relation
   * (le gel est réversible ; la désactivation reste une décision d'enforcement explicite via flagUser).
   */
  async computeLeakageRisk(userId: string): Promise<LeakageRiskResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, offPlatformSolicitationCount: true, status: true },
    });
    if (!user) throw new Error('User not found');

    const signals: LeakageSignal[] = [];
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // --- Signal 1 : violations « contact » loggées sur 30j -----------------------------------
    const contactViolations = await this.prisma.contentViolation.findMany({
      where: { userId, createdAt: { gte: since30d } },
      select: { detectedPatterns: true, content: true, createdAt: true },
    });
    const contactViolationCount = contactViolations.filter((v) =>
      (v.detectedPatterns || []).some((p) => CONTACT_PATTERN_NAMES.includes(p)),
    ).length;

    let score = 0;
    if (contactViolationCount > 0) {
      const s = Math.min(contactViolationCount * 12, 45);
      score += s;
      signals.push({
        type: 'CONTACT_SHARING_VIOLATIONS',
        severity: contactViolationCount >= 3 ? 'HIGH' : 'MEDIUM',
        description: `${contactViolationCount} partage(s) de coordonnées bloqué(s) sur 30j`,
        data: { contactViolationCount },
      });
    }

    // --- Signal 2 : compteur de sollicitation hors-plateforme --------------------------------
    const solicitationCount = user.offPlatformSolicitationCount || 0;
    if (solicitationCount > 0) {
      const s = Math.min(solicitationCount * 8, 40);
      score += s;
      signals.push({
        type: 'OFF_PLATFORM_SOLICITATION',
        severity: solicitationCount >= 4 ? 'HIGH' : 'MEDIUM',
        description: `${solicitationCount} sollicitation(s) hors-plateforme cumulée(s)`,
        data: { solicitationCount },
      });
    }

    // --- Signal 3 : mots-clés de sortie hors-plateforme dans le contenu déjà loggé -----------
    const keywordHits = new Set<string>();
    for (const v of contactViolations) {
      for (const k of this.scanSolicitation(v.content).matched) keywordHits.add(k);
    }
    if (keywordHits.size > 0) {
      score += Math.min(keywordHits.size * 10, 30);
      signals.push({
        type: 'SOLICITATION_KEYWORDS',
        severity: 'HIGH',
        description: `Mots-clés de sortie hors-plateforme détectés: ${[...keywordHits].join(', ')}`,
        data: { keywords: [...keywordHits] },
      });
    }

    // --- Signal 4 : contact-fishing (ratio conversations / missions payées anormalement bas) --
    const [distinctPartnersRaw, paidAsArtisan, paidAsClient] = await Promise.all([
      this.prisma.message.groupBy({ by: ['receiverId'], where: { senderId: userId } }),
      this.prisma.mission.count({
        where: { artisanId: userId, status: { in: PAID_MISSION_STATUSES as any } },
      }),
      this.prisma.mission.count({
        where: { clientId: userId, status: { in: PAID_MISSION_STATUSES as any } },
      }),
    ]);
    const distinctPartners = distinctPartnersRaw.length;
    const paidMissions = paidAsArtisan + paidAsClient;
    // Contact-fishing : beaucoup de conversations ouvertes (>=5) mais quasi aucune finit payée.
    if (distinctPartners >= 5) {
      const ratio = paidMissions / distinctPartners; // 0..1
      if (ratio < 0.2) {
        const s = ratio < 0.05 ? 30 : 18;
        score += s;
        signals.push({
          type: 'CONTACT_FISHING',
          severity: ratio < 0.05 ? 'HIGH' : 'MEDIUM',
          description: `${distinctPartners} conversations initiées pour seulement ${paidMissions} mission(s) payée(s) (ratio ${(ratio * 100).toFixed(0)}%)`,
          data: { distinctPartners, paidMissions, ratio },
        });
      }
    }

    // --- Signal 5 : demandes RÉPÉTÉES de coordonnées -----------------------------------------
    if (contactViolationCount >= 3) {
      score += 10;
      signals.push({
        type: 'REPEATED_COORDINATE_REQUESTS',
        severity: 'HIGH',
        description: 'Demandes répétées de coordonnées (>=3 violations contact sur 30j)',
        data: { contactViolationCount },
      });
    }

    score = Math.min(Math.round(score), 100);
    const recommendedPenalty = this.recommendPenalty(score);
    // Gel automatique des mises en relation dès le seuil FREEZE_MATCHING (réversible).
    const leakageFlagged = score >= 75;

    await this.prisma.user.update({
      where: { id: userId },
      data: { leakageRiskScore: score, leakageFlagged },
    });

    if (leakageFlagged) {
      this.logger.warn(
        `Leakage flag ON pour ${userId} (score ${score}) → mises en relation gelées; pénalité recommandée: ${recommendedPenalty}`,
      );
    }

    return {
      userId,
      leakageRiskScore: score,
      leakageFlagged,
      offPlatformSolicitationCount: solicitationCount,
      signals,
      recommendedPenalty,
    };
  }

  /**
   * Enforcement gradué explicite (déclenché par un admin ou par la modération).
   * Applique la pénalité demandée en respectant l'échelle Uber, sans jamais annuler
   * la révélation de contact légitime post-escrow.
   */
  async flagUser(userId: string, penalty: LeakagePenalty, reason?: string): Promise<LeakageRiskResult> {
    const result = await this.computeLeakageRisk(userId);

    switch (penalty) {
      case 'WARNING':
        this.logger.warn(`Avertissement leakage → ${userId}${reason ? ` (${reason})` : ''}`);
        break;
      case 'REQUIRE_DEPOSIT':
        // Marqueur d'escalade : le compte est flaggé, l'escrow devient exigible côté mission.
        await this.prisma.user.update({
          where: { id: userId },
          data: { leakageFlagged: true, offPlatformSolicitationCount: { increment: 0 } },
        });
        break;
      case 'FREEZE_MATCHING':
        await this.prisma.user.update({ where: { id: userId }, data: { leakageFlagged: true } });
        this.logger.warn(`Mises en relation GELÉES pour ${userId}${reason ? ` (${reason})` : ''}`);
        break;
      case 'DEACTIVATE':
        await this.prisma.user.update({
          where: { id: userId },
          data: { leakageFlagged: true, status: 'SUSPENDED' as any },
        });
        this.logger.error(`Compte DÉSACTIVÉ (leakage) → ${userId}${reason ? ` (${reason})` : ''}`);
        break;
      case 'NONE':
      default:
        break;
    }

    return { ...result, recommendedPenalty: penalty };
  }

  /**
   * ENFORCEMENT AUTOMATIQUE — cœur du détecteur automatique (plus seulement admin manuel).
   *
   * Recalcule le risque (computeLeakageRisk) PUIS applique la pénalité graduée recommandée
   * (recommendPenalty) : WARNING → REQUIRE_DEPOSIT → FREEZE_MATCHING → DEACTIVATE.
   * Écrit l'état sur User (leakageFlagged ; status SUSPENDED pour DEACTIVATE) et trace
   * l'escalade dans AuditLog. Ne lève jamais pour un happy-path : la révélation de contact
   * légitime post-escrow (client + artisan assigné) n'est jamais touchée ici.
   *
   * IDEMPOTENT :
   *  - L'état final (leakageFlagged / status) est ré-appliqué à l'identique ; ré-exécuter ne
   *    change rien de plus.
   *  - Une trace AuditLog n'est créée QUE lors d'une réelle transition d'état (flag OFF→ON,
   *    ou compte ACTIVE→SUSPENDED) ; les appels répétés ne spamment pas le journal.
   */
  async enforce(
    userId: string,
    opts?: { source?: string; reason?: string },
  ): Promise<LeakageRiskResult & { appliedPenalty: LeakagePenalty; enforced: boolean }> {
    if (!userId) throw new Error('userId is required');

    // État AVANT recalcul (computeLeakageRisk réécrit leakageFlagged) → sert à détecter la transition.
    const prior = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, leakageFlagged: true },
    });
    if (!prior) throw new Error('User not found');

    const result = await this.computeLeakageRisk(userId);
    const penalty = result.recommendedPenalty;

    const data: Record<string, unknown> = {};
    let transition = false;

    switch (penalty) {
      case 'DEACTIVATE':
        // Gel + désactivation. On ne suspend QUE depuis ACTIVE (ne clobber pas DELETED) et on
        // ne casse pas un login légitime : seul un score >= 90 (fuite avérée) atteint ce niveau.
        data.leakageFlagged = true;
        if (prior.status === 'ACTIVE') {
          data.status = 'SUSPENDED';
          transition = true;
        }
        break;
      case 'FREEZE_MATCHING':
      case 'REQUIRE_DEPOSIT':
        // Gel des mises en relation (réversible). On force leakageFlagged=true de façon idempotente
        // (REQUIRE_DEPOSIT est sous le seuil 75 que computeLeakageRisk utilise, donc on le rétablit).
        data.leakageFlagged = true;
        transition = !prior.leakageFlagged;
        break;
      case 'WARNING':
      case 'NONE':
      default:
        // Avertissement : aucune écriture bloquante, simple log (idempotent par nature).
        break;
    }

    if (Object.keys(data).length > 0) {
      await this.prisma.user.update({ where: { id: userId }, data: data as any });
    }

    if (penalty === 'WARNING') {
      this.logger.warn(
        `Leakage WARNING → ${userId} (score ${result.leakageRiskScore})${opts?.reason ? ` [${opts.reason}]` : ''}`,
      );
    }

    // Trace persistante UNIQUEMENT sur transition réelle → idempotent (pas de spam AuditLog).
    if (transition) {
      await this.writeEnforcementTrace(userId, penalty, result, opts);
    }

    return { ...result, appliedPenalty: penalty, enforced: transition };
  }

  /**
   * Évaluation BATCH : ré-enforce en masse tous les comptes déjà flaggés leakage.
   * Utilisé par le cron et par l'endpoint admin. Chaque erreur unitaire est isolée
   * (un compte KO n'interrompt pas le lot).
   */
  async enforceBatch(
    opts?: { limit?: number; source?: string },
  ): Promise<{ evaluated: number; enforced: number; penalties: Record<string, number> }> {
    const users = await this.getFlaggedUsers(opts?.limit ?? 200);
    const penalties: Record<string, number> = {};
    let enforced = 0;

    for (const u of users) {
      try {
        const r = await this.enforce(u.id, {
          source: opts?.source ?? 'batch',
          reason: 'Réévaluation batch anti-désintermédiation',
        });
        penalties[r.appliedPenalty] = (penalties[r.appliedPenalty] ?? 0) + 1;
        if (r.enforced) enforced++;
      } catch (error) {
        this.logger.error(`enforceBatch: enforce a échoué pour ${u.id}`, error as Error);
      }
    }

    return { evaluated: users.length, enforced, penalties };
  }

  /**
   * CRON d'évaluation automatique : toutes les 6h, ré-enforce les comptes flaggés
   * (escalade FREEZE→DEACTIVATE si le score a monté, maintien du gel, etc.).
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async scheduledEnforce(): Promise<void> {
    try {
      const res = await this.enforceBatch({ source: 'cron' });
      if (res.evaluated > 0) {
        this.logger.log(
          `Cron anti-désintermédiation: ${res.evaluated} compte(s) réévalué(s), ${res.enforced} nouvelle(s) escalade(s).`,
        );
      }
    } catch (error) {
      this.logger.error('Cron anti-désintermédiation a échoué', error as Error);
    }
  }

  /** Trace d'enforcement (AuditLog). ipAddress est requis par le schéma → marqueur système. */
  private async writeEnforcementTrace(
    userId: string,
    penalty: LeakagePenalty,
    result: LeakageRiskResult,
    opts?: { source?: string; reason?: string },
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: `LEAKAGE_ENFORCE_${penalty}`,
          resource: 'User',
          details: {
            penalty,
            leakageRiskScore: result.leakageRiskScore,
            leakageFlagged: result.leakageFlagged,
            offPlatformSolicitationCount: result.offPlatformSolicitationCount,
            signals: result.signals as any,
            reason: opts?.reason ?? null,
            source: opts?.source ?? 'auto',
          },
          ipAddress: 'system',
          userAgent: `disintermediation-detector:${opts?.source ?? 'auto'}`,
        },
      });
    } catch (error) {
      // Une trace manquée ne doit jamais casser l'enforcement lui-même.
      this.logger.error(`writeEnforcementTrace a échoué pour ${userId}`, error as Error);
    }
  }

  /** Liste des comptes flaggés leakage (endpoint admin). */
  async getFlaggedUsers(limit = 100): Promise<any[]> {
    return this.prisma.user.findMany({
      where: { leakageFlagged: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        leakageRiskScore: true,
        offPlatformSolicitationCount: true,
      },
      orderBy: { leakageRiskScore: 'desc' },
      take: Math.min(Math.max(limit, 1), 500),
    });
  }

  private recommendPenalty(score: number): LeakagePenalty {
    if (score >= 90) return 'DEACTIVATE';
    if (score >= 75) return 'FREEZE_MATCHING';
    if (score >= 60) return 'REQUIRE_DEPOSIT';
    if (score >= 40) return 'WARNING';
    return 'NONE';
  }
}
