import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Content Filter Service
 *
 * Anti-désintermédiation (façon Uber) : empêche le partage de coordonnées
 * (téléphone FR/LU/BE, email, URL, handles réseaux sociaux, apps de messagerie,
 * intentions de sortie hors-plateforme) pour éviter le contournement de la commission.
 *
 * Robustesse :
 *  - Normalisation Unicode NFKC + suppression des caractères invisibles / emojis keycap
 *    avant toute regex (contre l'obfuscation).
 *  - Détection des numéros sur une version « compactée » (séparateurs retirés) pour
 *    attraper « 6 2 1 . 1 2 - 34 56 » et autres obfuscations.
 *  - Détection sur une version normalisée pour emails / URLs / handles.
 *  - Aucune RegExp `/g` réutilisée avec `.test()` (bug de lastIndex) : chaque passe
 *    recompile une regex fraîche via `matchAll`.
 *  - Chaque violation détectée est loguée (logger + persistée en base pour revue admin).
 *
 * Réutilisable : `filterContent()` est appelé depuis le chat direct (ChatService),
 * le chat interne (InternalChatService) et peut l'être depuis tout autre canal.
 */

export interface FilterResult {
  isBlocked: boolean;
  filteredContent: string;
  detectedPatterns: string[];
  violationType?: string;
}

type Severity = 'LOW' | 'MEDIUM' | 'HIGH';

// 'text'    -> détection sur le texte normalisé (NFKC, invisibles retirés)
// 'compact' -> détection sur le texte compacté (séparateurs retirés) : numéros obfusqués
type DetectTarget = 'text' | 'compact';

export interface FilterPattern {
  name: string;
  regex: RegExp;
  replacement: string;
  severity: Severity;
  enabled: boolean;
  detectOn: DetectTarget;
}

@Injectable()
export class ContentFilterService {
  private readonly logger = new Logger(ContentFilterService.name);

  // Caractères invisibles / de contrôle utilisés pour l'obfuscation.
  private static readonly INVISIBLE = /[​-‏‪-‮⁠⁦-⁩﻿᠎­]/g;
  // Sélecteurs de variation + « combining enclosing keycap » (emojis chiffres 6️⃣).
  private static readonly KEYCAP = /[︀-️⃣]/g;
  // Séparateurs à retirer pour la version compacte (on GARDE les lettres : elles
  // servent de frontières et empêchent la fusion de numéros distincts).
  private static readonly SEPARATORS = /[\s.\-_/\\()\[\]{}|·•*'"~,;:]+/g;

  // Bibliothèque de motifs.
  private patterns: FilterPattern[] = [
    // ---------------------------------------------------------------------
    // TÉLÉPHONES — détection sur la version COMPACTE (obfuscation-proof)
    // ---------------------------------------------------------------------
    // France : +33 / 0033 / national 0X + 8 chiffres.
    {
      name: 'PHONE_FR',
      regex: /(?<!\d)(?:\+33|0033|0)[1-9]\d{8}(?!\d)/g,
      replacement: '[NUMÉRO BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
      detectOn: 'compact',
    },
    // Luxembourg — LE marché réel : +352 / 00352 + 6 à 9 chiffres.
    {
      name: 'PHONE_LU_CC',
      regex: /(?<!\d)(?:\+352|00352)\d{6,9}(?!\d)/g,
      replacement: '[NUMÉRO BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
      detectOn: 'compact',
    },
    // Luxembourg mobile national : 6XX XXX XXX (9 chiffres, préfixes 621/661/691/671/681…).
    {
      name: 'PHONE_LU_MOBILE',
      regex: /(?<!\d)6\d{8}(?!\d)/g,
      replacement: '[NUMÉRO BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
      detectOn: 'compact',
    },
    // Luxembourg fixe national : 2X XX XX XX (8 chiffres, préfixe 2).
    {
      name: 'PHONE_LU_FIXED',
      regex: /(?<!\d)2\d{7}(?!\d)/g,
      replacement: '[NUMÉRO BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
      detectOn: 'compact',
    },
    // Belgique : +32 / 0032 + 8-9 chiffres, et mobile national 04XX XX XX XX.
    {
      name: 'PHONE_BE_CC',
      regex: /(?<!\d)(?:\+32|0032)\d{8,9}(?!\d)/g,
      replacement: '[NUMÉRO BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
      detectOn: 'compact',
    },
    {
      name: 'PHONE_BE_MOBILE',
      regex: /(?<!\d)04\d{8}(?!\d)/g,
      replacement: '[NUMÉRO BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
      detectOn: 'compact',
    },
    // Filet générique : tout indicatif international +XX suivi de 6+ chiffres.
    {
      name: 'PHONE_INTL_GENERIC',
      regex: /(?<!\d)\+\d{2,3}\d{6,12}(?!\d)/g,
      replacement: '[NUMÉRO BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
      detectOn: 'compact',
    },
    // Longue séquence de chiffres (>= 9) potentiellement un numéro déguisé.
    {
      name: 'PHONE_LONG_DIGITS',
      regex: /(?<!\d)\d{9,14}(?!\d)/g,
      replacement: '[NUMÉRO BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
      detectOn: 'compact',
    },

    // ---------------------------------------------------------------------
    // NUMÉROS ÉCRITS EN LETTRES (obfuscation) — détection sur texte normalisé
    // « zéro six douze… », « six deux un… », séquences longues de nombres-mots.
    // ---------------------------------------------------------------------
    {
      name: 'WRITTEN_PHONE',
      regex:
        /(?:\b(?:z[ée]ro|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|soixante|cent|et|zero|one|two|three|four|five|six|seven|eight|nine|ten|null|eins|zwei|drei|vier|sechs)\b[\s,.\-]*){4,}/gi,
      replacement: '[NUMÉRO BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
      detectOn: 'text',
    },

    // ---------------------------------------------------------------------
    // EMAILS — détection sur texte normalisé (séparateurs conservés)
    // ---------------------------------------------------------------------
    {
      name: 'EMAIL',
      regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
      replacement: '[EMAIL BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
      detectOn: 'text',
    },
    {
      name: 'EMAIL_OBFUSCATED',
      regex:
        /[a-zA-Z0-9._%+-]+\s*(?:@|\(at\)|\[at\]|\bat\b|arobase|chez)\s*[a-zA-Z0-9.-]+\s*(?:\.|\(dot\)|\[dot\]|\bdot\b|point|punkt)\s*[a-zA-Z]{2,}/gi,
      replacement: '[EMAIL BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
      detectOn: 'text',
    },

    // ---------------------------------------------------------------------
    // URLs / SITES — BLOQUÉ (HIGH), plus juste masqué
    // ---------------------------------------------------------------------
    {
      name: 'URL_SCHEME',
      regex: /(?:https?:\/\/|www\.)[^\s<>()]+/gi,
      replacement: '[LIEN BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
      detectOn: 'text',
    },
    // Domaine nu avec TLD connu (évite les faux positifs sur les décimaux « 3.5 »).
    {
      name: 'URL_DOMAIN',
      regex:
        /(?<![@\w.])[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.(?:com|net|org|fr|lu|be|io|me|eu|de|nl|info|biz|shop|site|online|app|co|xyz|gg|tel|link|page|dev|pro|store|club)\b(?:\/[^\s]*)?/gi,
      replacement: '[LIEN BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
      detectOn: 'text',
    },

    // ---------------------------------------------------------------------
    // APPS DE MESSAGERIE / RÉSEAUX SOCIAUX — BLOQUÉ (HIGH)
    // WhatsApp, Telegram, Signal, Snapchat, WeChat, Viber, Messenger…
    // ---------------------------------------------------------------------
    {
      name: 'MESSAGING_APP_LINK',
      regex:
        /(?:wa\.me|whatsapp\.com|t\.me|telegram\.me|signal\.me|snapchat\.com|m\.me|messenger\.com)\/[^\s]*/gi,
      replacement: '[CONTACT BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
      detectOn: 'text',
    },
    {
      name: 'MESSAGING_APP_MENTION',
      regex:
        /\b(?:whats\s?app|whatsap+|wapp|wsp|telegram|télégramme|signal|snapchat|snap\b|wechat|we\s?chat|viber|messenger|imessage|facetime|kik|line\sapp)\b(?:\s*(?:me|moi|:|@|#|\+)?\s*[a-z0-9._+@-]*)?/gi,
      replacement: '[CONTACT BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
      detectOn: 'text',
    },
    {
      name: 'SOCIAL_LINK',
      regex:
        /(?:instagram\.com|facebook\.com|fb\.com|fb\.me|twitter\.com|x\.com|tiktok\.com|linkedin\.com|youtube\.com|youtu\.be)\/[^\s]*/gi,
      replacement: '[CONTACT BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
      detectOn: 'text',
    },
    {
      name: 'SOCIAL_MENTION',
      regex:
        /\b(?:insta(?:gram)?|facebook|tiktok|linkedin|snap(?:chat)?)\b(?:\s*(?:me|moi|:|@|#)?\s*[a-z0-9._]{2,30})?/gi,
      replacement: '[CONTACT BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
      detectOn: 'text',
    },
    // Handle générique @pseudo (non-email) — masqué + logué.
    {
      name: 'HANDLE_AT',
      regex: /(?<![a-zA-Z0-9._%+-])@[a-zA-Z0-9._]{3,30}\b/g,
      replacement: '[CONTACT BLOQUÉ]',
      severity: 'MEDIUM',
      enabled: true,
      detectOn: 'text',
    },

    // ---------------------------------------------------------------------
    // INTENTIONS DE SORTIE HORS-PLATEFORME — logué + masqué
    // (« appelle-moi », « paiement cash / sans commission », « on se voit direct »)
    // ---------------------------------------------------------------------
    {
      name: 'CONTACT_KEYWORDS',
      regex:
        /(?:appelle|appeler|contacte|contacter|[ée]cris|[ée]crire|joins|joindre|call|text|message)\s*(?:moi|me)?\s*(?:au|sur|à|via|on|at)?\s*:?\s*[+\d@][\d@.a-zA-Z\s.\-]*/gi,
      replacement: '[CONTACT BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
      detectOn: 'text',
    },
    {
      name: 'OFFPLATFORM_INTENT',
      regex:
        /(?:hors[\s-]?plateforme|hors[\s-]?site|en\s+dehors\s+de\s+(?:la\s+)?(?:plateforme|krafolt|l['’]app(?:lication)?)|sans\s+(?:commission|krafolt|passer\s+par)|paiement\s+(?:en\s+)?(?:cash|liquide|esp[èe]ces|de\s+la\s+main\s+à\s+la\s+main)|payer?\s+(?:en\s+)?(?:cash|liquide|esp[èe]ces)|virement\s+direct|paypal|revolut|lydia|twint|off\s?[- ]?platform|pay\s+(?:in\s+)?cash)/gi,
      replacement: '[MESSAGE MODÉRÉ]',
      severity: 'MEDIUM',
      enabled: true,
      detectOn: 'text',
    },
  ];

  constructor(private prisma: PrismaService) {}

  // ==========================================================================
  //  NORMALISATION
  // ==========================================================================

  /** NFKC + suppression des caractères invisibles / keycap emojis. */
  private normalize(input: string): string {
    if (!input) return '';
    let s = input.normalize('NFKC');
    s = s.replace(ContentFilterService.INVISIBLE, '');
    s = s.replace(ContentFilterService.KEYCAP, '');
    return s;
  }

  /**
   * Version compacte pour la détection des numéros : on retire les séparateurs
   * (espaces, points, tirets, emojis déjà nettoyés…) MAIS on garde les lettres,
   * qui servent de frontières et évitent de fusionner deux numéros distincts.
   */
  private toCompact(normalized: string): string {
    return normalized.replace(ContentFilterService.SEPARATORS, '');
  }

  /** Compile une regex globale fraîche (évite le bug de lastIndex partagé). */
  private freshGlobal(source: RegExp): RegExp {
    const flags = source.flags.includes('g') ? source.flags : source.flags + 'g';
    return new RegExp(source.source, flags);
  }

  // ==========================================================================
  //  API PUBLIQUE
  // ==========================================================================

  /**
   * Filtre le contenu et détecte les violations.
   * @param content  Texte à filtrer.
   * @param userId   Auteur (pour le log de violation).
   * @param context  Canal d'origine (chat_direct, chat_interne, ...) — pour l'audit.
   */
  async filterContent(
    content: string,
    userId: string,
    context = 'chat',
  ): Promise<FilterResult> {
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return { isBlocked: false, filteredContent: content ?? '', detectedPatterns: [] };
    }

    const normalized = this.normalize(content);
    const compact = this.toCompact(normalized);

    let filteredContent = content;
    const detectedPatterns: string[] = [];
    let highestSeverity: Severity | null = null;

    for (const pattern of this.patterns) {
      if (!pattern.enabled) continue;

      const haystack = pattern.detectOn === 'compact' ? compact : normalized;
      const detectRegex = this.freshGlobal(pattern.regex);
      const matches = [...haystack.matchAll(detectRegex)];
      if (matches.length === 0) continue;

      detectedPatterns.push(pattern.name);

      // Masquage best-effort sur le texte affiché (la forme non-obfusquée y figure).
      // Pour les violations HIGH le message est de toute façon bloqué en amont ;
      // ce masquage sert surtout aux violations MEDIUM (laissées passer, masquées).
      filteredContent = filteredContent.replace(
        this.freshGlobal(pattern.regex),
        pattern.replacement,
      );

      if (
        !highestSeverity ||
        this.severityLevel(pattern.severity) > this.severityLevel(highestSeverity)
      ) {
        highestSeverity = pattern.severity;
      }

      this.logger.warn(
        `Contact info detected | User: ${userId} | Context: ${context} | Pattern: ${pattern.name} | Matches: ${matches.length}`,
      );
    }

    const isBlocked = highestSeverity === 'HIGH';

    // Persiste CHAQUE violation détectée (pas seulement les HIGH) pour l'audit.
    if (detectedPatterns.length > 0 && highestSeverity) {
      await this.logViolation(userId, content, detectedPatterns, highestSeverity, context);
    }

    return {
      isBlocked,
      filteredContent,
      detectedPatterns,
      violationType: highestSeverity || undefined,
    };
  }

  /** Vrai si le contenu ne contient aucune violation HIGH (sans état partagé). */
  async isContentSafe(content: string): Promise<boolean> {
    const normalized = this.normalize(content);
    const compact = this.toCompact(normalized);
    for (const pattern of this.patterns) {
      if (!pattern.enabled || pattern.severity !== 'HIGH') continue;
      const haystack = pattern.detectOn === 'compact' ? compact : normalized;
      if (this.freshGlobal(pattern.regex).test(haystack)) {
        return false;
      }
    }
    return true;
  }

  /** Détecte les motifs sans modifier le contenu (sans état partagé). */
  async detectPatterns(content: string): Promise<string[]> {
    const normalized = this.normalize(content);
    const compact = this.toCompact(normalized);
    const detected: string[] = [];
    for (const pattern of this.patterns) {
      if (!pattern.enabled) continue;
      const haystack = pattern.detectOn === 'compact' ? compact : normalized;
      if (this.freshGlobal(pattern.regex).test(haystack)) {
        detected.push(pattern.name);
      }
    }
    return detected;
  }

  // ==========================================================================
  //  AUDIT / VIOLATIONS
  // ==========================================================================

  private async logViolation(
    userId: string,
    content: string,
    patterns: string[],
    severity: string,
    context = 'chat',
  ): Promise<void> {
    try {
      await this.prisma.contentViolation.create({
        data: {
          userId,
          content: content.substring(0, 500),
          detectedPatterns: patterns,
          severity,
          createdAt: new Date(),
        },
      });

      const violationCount = await this.prisma.contentViolation.count({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      });

      this.logger.warn(
        `Content violation logged | User: ${userId} | Context: ${context} | Severity: ${severity} | Total(30d): ${violationCount}`,
      );

      // Auto-suspension après 5 violations sur 30 jours (toutes sévérités confondues).
      if (violationCount >= 5) {
        this.logger.error(`User ${userId} exceeded violation threshold (${violationCount})`);
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { status: true },
        });
        if (user && user.status !== 'SUSPENDED') {
          await this.prisma.user.update({
            where: { id: userId },
            data: { status: 'SUSPENDED' },
          });
          await this.prisma.contentViolation.updateMany({
            where: { userId, reviewed: false },
            data: { actionTaken: 'ACCOUNT_SUSPENDED' },
          });
          this.logger.warn(
            `User ${userId} auto-suspended after ${violationCount} content violations (REPEATED_CONTACT_SHARING)`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to log content violation', error);
    }
  }

  async getUserViolations(userId: string, days: number = 30): Promise<any> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [violations, total] = await Promise.all([
      this.prisma.contentViolation.findMany({
        where: { userId, createdAt: { gte: startDate } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.contentViolation.count({
        where: { userId, createdAt: { gte: startDate } },
      }),
    ]);
    return { violations, total, period: `${days} days` };
  }

  async getAllViolations(page: number = 1, limit: number = 50): Promise<any> {
    const skip = (page - 1) * limit;
    const [violations, total] = await Promise.all([
      this.prisma.contentViolation.findMany({
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.contentViolation.count(),
    ]);
    return {
      violations,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async togglePattern(patternName: string, enabled: boolean): Promise<void> {
    const pattern = this.patterns.find((p) => p.name === patternName);
    if (pattern) {
      pattern.enabled = enabled;
      this.logger.log(`Pattern ${patternName} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  getPatterns(): FilterPattern[] {
    return this.patterns.map((p) => ({
      ...p,
      regex: p.regex.source,
    })) as any;
  }

  private severityLevel(severity: string): number {
    const levels = { LOW: 1, MEDIUM: 2, HIGH: 3 };
    return levels[severity] || 0;
  }
}
