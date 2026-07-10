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
  // Emojis / pictogrammes / drapeaux / ZWJ : sur la version compacte ils jouent le rôle
  // de séparateurs entre chiffres (« 06📞12345678 » → « 0612345678 ») et doivent disparaître.
  private static readonly EMOJI =
    /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{FE00}-\u{FE0F}\u{200D}\u{2190}-\u{21FF}\u{2300}-\u{23FF}]/gu;
  // Séparateurs à retirer pour la version compacte (on GARDE les lettres : elles
  // servent de frontières et empêchent la fusion de numéros distincts).
  // Inclut les variantes exotiques : espaces unicode, tirets typographiques, puces,
  // points médians (·・･), minus mathématique, etc. — sinon « 06‑12‧34 » passerait.
  private static readonly SEPARATORS =
    /[\s.\-_/\\()\[\]{}|·•*'"~,;:…  -​  　‐-―−⁃•‧∙・･·．－～]+/gu;

  // Homoglyphes lettre→chiffre pour la détection de numéros déguisés (« O6 I2 34 56 »).
  // On les applique UNIQUEMENT à une lettre COLLÉE à un vrai chiffre (voir
  // applyPhoneHomoglyphs) afin de ne pas transformer la prose (« Bonjour », « salut »).
  // On exclut volontairement a/e/t (trop fréquents en français) pour rester sûr.
  private static readonly HOMOGLYPHS: Record<string, string> = {
    o: '0', O: '0',
    i: '1', I: '1', l: '1', L: '1',
    z: '2', Z: '2',
    s: '5', S: '5',
    b: '8', B: '8',
    g: '9', G: '9', q: '9', Q: '9',
  };

  // Statuts de mission « argent engagé » : au-delà, le contact est légitimement révélé
  // (happy-path) et le message média n'est plus un signal de risque pré-paiement.
  private static readonly PAID_MISSION_STATUSES = new Set<string>([
    'DEPOSIT_PAID',
    'IN_TRANSIT',
    'PAID',
    'IN_PROGRESS',
    'COMPLETED',
    'AUTO_VALIDATED',
  ]);

  // Motifs sûrs à appliquer à un NOM DE FICHIER : très faible taux de faux positifs.
  // On EXCLUT volontairement les heuristiques « suite de chiffres » (PHONE_LONG_DIGITS,
  // nationaux nus 6XXXXXXXX / 2XXXXXXX / 04XXXXXXXX) car les noms de fichiers d'appareils
  // photo (« IMG_20240612_123456.jpg ») déclencheraient des blocages abusifs.
  private static readonly FILENAME_SAFE_PATTERNS = new Set<string>([
    'PHONE_FR',
    'PHONE_LU_CC',
    'PHONE_BE_CC',
    'PHONE_INTL_GENERIC',
    'PHONE_INTL_00_GENERIC',
    'EMAIL',
    'EMAIL_OBFUSCATED',
    'URL_SCHEME',
    'URL_DOMAIN',
    'MESSAGING_APP_LINK',
    'MESSAGING_APP_MENTION',
    'SOCIAL_LINK',
    'SOCIAL_MENTION',
  ]);

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
    // Filet générique : préfixe international « 00 » + indicatif pays + 6+ chiffres
    // (ex « 0033… », « 00352… », « 0032… » collés, non couverts par un préfixe pays précis).
    {
      name: 'PHONE_INTL_00_GENERIC',
      regex: /(?<!\d)00\d{8,13}(?!\d)/g,
      replacement: '[NUMÉRO BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
      detectOn: 'compact',
    },
    // Longue séquence de chiffres (>= 8) potentiellement un numéro déguisé.
    // Seuil 8 (et non 9) pour couvrir les numéros LU/BE nationaux à 8 chiffres.
    // Détection sur la version COMPACTE où les LETTRES sont conservées : « 250 euros »,
    // « 10 juillet 2026 » gardent leurs mots comme frontières (runs de 3/4 chiffres),
    // donc SEULE une suite de 8+ chiffres CONTIGUS (après retrait des séparateurs) matche.
    {
      name: 'PHONE_LONG_DIGITS',
      // Borne HAUTE retirée (\d{8,}) : une suite de 15+ chiffres contigus (numéro préfixé d'un
      // « n° de facture » pour casser les motifs pays) n'avait aucun sous-groupe 8-14 délimité et
      // passait. Tout run de 8+ chiffres contigus est désormais bloqué.
      regex: /(?<!\d)\d{8,}(?!\d)/g,
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
        /(?:\b(?:z[ée]ro|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|soixante|cent|et|zero|one|two|three|four|five|six|seven|eight|nine|ten|null|eins|zwei|drei|vier|sechs|eent|zwee|dr[aä]i|v[eé]ier|f[eë]nnef|siwen|aacht|n[eé]ng|z[eé]ng|nul|een|twee|drie|vijf|zes|zeven|acht|negen|uno|due|tre|quattro|cinque|sette|otto|nove)\b[\s,.\-]*(?:\b(?:alors|ensuite|puis|donc|apr[eè]s|enfin|voil[aà]|then|next|et)\b[\s,.\-]*)?){4,}/gi,
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
    // Connecteurs @ : @, (at)/[at]/{at}, (a)/[a]/{a}, at/arobase/chez.
    // Connecteurs point : ., (dot)/[dot]/{dot}, (.)/[.]/{.}, dot/point/punkt.
    // Le point + TLD devient OPTIONNEL quand un domaine mail CONNU suit (« x at gmail »,
    // « j.dupont[a]gmail[.]com ») ; sinon le point reste requis pour éviter les faux positifs.
    {
      name: 'EMAIL_OBFUSCATED',
      regex:
        /[a-zA-Z0-9._%+-]+[\s,;]*(?:@|\(at\)|\[at\]|\{at\}|\(a\)|\[a\]|\{a\}|\(arobas+e?\)|\[arobas+e?\]|\bat\b|arobas+e?|arobaz[e]?|\bchez\b|\bsur\b)\s*(?:(?:gmail|hotmail|outlook|yahoo|protonmail|proton|icloud|gmx|aol)(?:\s*(?:\.|\(dot\)|\[dot\]|\{dot\}|\(\.\)|\[\.\]|\{\.\}|\(point\)|\[point\]|\bdot\b|point|punkt)\s*[a-zA-Z]{2,})?|[a-zA-Z0-9.-]+\s*(?:\.|\(dot\)|\[dot\]|\{dot\}|\(\.\)|\[\.\]|\{\.\}|\(point\)|\[point\]|\bdot\b|point|punkt)\s*[a-zA-Z]{2,})/gi,
      replacement: '[EMAIL BLOQUÉ]',
      severity: 'HIGH',
      enabled: true,
      detectOn: 'text',
    },
    // Email avec lettres ESPACÉES (« j o h n at g m a i l dot c o m »). On exige les
    // connecteurs forts « at » + « dot/point » pour éviter tout faux positif sur du texte.
    {
      name: 'EMAIL_SPACED',
      regex:
        /(?:[a-z0-9]\s+){2,}(?:@|\(at\)|\[at\]|\bat\b|arobas+e?|arobaz[e]?|chez)(?:\s+[a-z0-9]){2,}\s+(?:\.|\(dot\)|\[dot\]|\bdot\b|point|punkt)(?:\s+[a-z]){2,}/gi,
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
    // Domaine nu « label.tld » GÉNÉRIQUE (TLD = 2 à 24 lettres) plutôt qu'une allow-list figée
    // qui laissait passer les TLD récents / exotiques. Garde-fous :
    //  - whitelist krafolt.(com|lu) (notre propre domaine, non bloqué) ;
    //  - EXCLUSION des extensions de FICHIERS courantes (.pdf/.jpg/.png/.docx/.xlsx…) : un nom
    //    de pièce jointe « devis.pdf » ne doit jamais être pris pour un lien ;
    //  - sensible à la casse (pas de flag « i ») : le label ET le TLD doivent être en minuscules,
    //    ce qui protège les initiales/patronymes capitalisés (« M.Dupont », « Jean.Martin »)
    //    tout en attrapant les vrais domaines/handles saisis en minuscules (« monsite.tld »).
    {
      name: 'URL_DOMAIN',
      regex:
        /(?<![@\w.])(?!(?:www\.)?krafolt\.(?:com|lu)\b)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.(?!(?:pdf|jpe?g|png|gif|webp|svg|bmp|tiff?|heic|docx?|xlsx?|pptx?|odt|ods|odp|pages|numbers|key|txt|rtf|csv|md|json|xml|html?|zip|rar|7z|tar|gz|mp[34]|m4[av]|mov|avi|mkv|wmv|wav|flac|aac|ogg|dwg|dxf|ai|psd|eps|indd)\b)[a-z]{2,24}\b(?:\/[^\s]*)?/g,
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
    // Abréviations réseaux/messagerie SUIVIES d'un pseudo NU (sans @) :
    // « IG john_doe », « ig: cooldude », « fb dm jeanlu », « snap monpseudo », « tg @x »…
    // On exige un token >=4 caractères derrière pour limiter les faux positifs.
    // MEDIUM : non bloquant mais le pseudo est masqué + la violation est loguée.
    {
      name: 'SOCIAL_HANDLE_ABBR',
      regex:
        /\b(?:ig|insta|fb|messenger|tg|tele|snap|viber)\b\s*(?:dm|me|moi|:|@|#|=|->|→)?\s*@?[a-z0-9._]{4,30}\b/gi,
      replacement: '[CONTACT BLOQUÉ]',
      severity: 'MEDIUM',
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
    // Périphrase « suis-moi / ajoute-moi <handle> » SANS nommer le réseau (« suis-moi @x »,
    // « ajoute-moi jean_doe », « suis-moi mon.compte », « follow me user123 »). Le handle
    // doit être « handle-ish » (préfixe @ OU contenir un « . », « _ » ou un chiffre) afin de
    // NE PAS masquer un mot courant (« ajoute-moi demain », « suis-moi partout »).
    // MEDIUM : masqué + logué, non bloquant, pour limiter les faux positifs.
    {
      name: 'SOCIAL_FOLLOW_ME',
      regex:
        /\b(?:suis|ajoute|rejoins|abonne|follow|add)[\s-]?(?:moi|toi|me)\b\s*(?:sur|on|via)?\s*(?:@[a-z0-9._]{3,30}|[a-z0-9][a-z0-9._]*[._\d][a-z0-9._]*)\b/gi,
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

  /**
   * Confusables Unicode : lettres CYRILLIQUES / GRECQUES visuellement identiques à des lettres
   * latines, utilisées pour esquiver le filtre (« jоhn.dое@gmаil.cоm » avec о/а/е cyrilliques →
   * lisible par un humain mais invisible pour une regex latine). On les REPLIE vers le latin avant
   * matching (jamais sur le contenu stocké). NFKC ne couvre pas ces confusables, d'où cette table.
   */
  private static readonly CONFUSABLES: Record<string, string> = {
    // Cyrillique → latin
    'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x', 'і': 'i', 'ѕ': 's',
    'ј': 'j', 'к': 'k', 'н': 'h', 'в': 'b', 'т': 't', 'м': 'm', 'А': 'A', 'Е': 'E', 'О': 'O',
    'Р': 'P', 'С': 'C', 'У': 'Y', 'Х': 'X', 'І': 'I', 'К': 'K', 'Н': 'H', 'В': 'B', 'Т': 'T', 'М': 'M',
    // Grec → latin
    'α': 'a', 'ο': 'o', 'ρ': 'p', 'ε': 'e', 'ι': 'i', 'ν': 'v', 'τ': 't', 'κ': 'k', 'Α': 'A',
    'Ο': 'O', 'Ρ': 'P', 'Ε': 'E', 'Τ': 'T', 'Κ': 'K',
  };

  private foldConfusables(s: string): string {
    let out = '';
    for (const ch of s) {
      out += ContentFilterService.CONFUSABLES[ch] ?? ch;
    }
    return out;
  }

  /** NFKC + repli des confusables Unicode + suppression des caractères invisibles / keycap emojis. */
  private normalize(input: string): string {
    if (!input) return '';
    let s = input.normalize('NFKC');
    s = this.foldConfusables(s);
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
    return normalized
      .replace(ContentFilterService.EMOJI, '')
      .replace(ContentFilterService.SEPARATORS, '');
  }

  /**
   * Applique les homoglyphes lettre→chiffre, mais SEULEMENT sur une lettre
   * immédiatement collée à un vrai chiffre (frontière calculée sur la chaîne
   * d'origine). Cible « O6 I2 34 56 » / « O6I2345678 » sans jamais toucher à la
   * prose (« Bonjour », « salut » n'ont pas de chiffre adjacent).
   */
  private applyPhoneHomoglyphs(s: string): string {
    const map = ContentFilterService.HOMOGLYPHS;
    const chars = [...s];
    const isDigit = (c?: string): boolean => !!c && c >= '0' && c <= '9';
    return chars
      .map((c, i) =>
        map[c] && (isDigit(chars[i - 1]) || isDigit(chars[i + 1])) ? map[c] : c,
      )
      .join('');
  }

  /**
   * Détecte un téléphone OBFUSQUÉ que les motifs « compact » standard laissent passer :
   *  - homoglyphes lettre-pour-chiffre (« O6 I2 34 56 ») ;
   *  - chiffres séparés par du BRUIT LISIBLE / des mots (« 621 (indicatif interne) 123 456 »).
   *
   * Méthode : on mappe les homoglyphes, on compacte (séparateurs retirés), puis on retire
   * les courts fragments alphabétiques (3–20) INTERCALÉS ENTRE DEUX CHIFFRES (un mot glissé
   * au milieu d'un numéro), et on cherche une longue suite de chiffres.
   *
   * Anti-faux-positif : ne se déclenche QUE si cette normalisation a réellement transformé
   * la zone (`phoneish !== compact`) — sinon les dates/montants nus (« 20122026 », « 250 »)
   * restent gérés par PHONE_LONG_DIGITS (seuil 9) et ne sont pas re-jugés ici. Le fragment
   * retiré doit faire ≥3 caractères, ce qui protège les connecteurs courts (« 2026 à 8h »).
   */
  private detectObfuscatedPhone(normalized: string, compact: string): boolean {
    const mapped = this.applyPhoneHomoglyphs(normalized);
    const mappedCompact = this.toCompact(mapped);
    // Retire le BRUIT alphabétique intercalé ENTRE deux chiffres. Borne élargie {1,40} :
    //  - {1,2} capture le bruit COURT (« 62 ko 11 ok 23 xy 456 » → « 621123456 »),
    //  - {…,40} capture le bruit LONG (« 621 (indicatif interne) 123 456 »).
    // Un intervalle > 40 caractères entre deux chiffres n'est PAS retiré : il sert de
    // frontière et évite de recoller deux nombres réellement distincts d'une phrase.
    const phoneish = mappedCompact.replace(/(?<=\d)[^\d]{1,80}(?=\d)/g, '');
    if (phoneish === compact) return false; // aucune obfuscation réelle → laissé aux motifs standard
    // Une fois nettoyé : ≥8 chiffres consécutifs couvrent LU (6/8/9) / FR / BE.
    const run = /(?<!\d)(\d{8,})(?!\d)/.exec(phoneish);
    if (!run) return false;
    // Garde-fou « chiffres majoritaires » : le bruit retiré entre les chiffres ne doit pas
    // excéder 5× la longueur du numéro révélé — écarte les phrases où de rares chiffres épars
    // sont noyés dans beaucoup de texte, tout en attrapant un numéro coupé par un long bourrage.
    const removed = mappedCompact.length - phoneish.length;
    return removed <= run[1].length * 5;
  }

  /** Chiffres « téléphone » d'un fragment : homoglyphes appliqués puis compactage. */
  private phoneCompact(text: string): string {
    return this.toCompact(this.applyPhoneHomoglyphs(this.normalize(text || '')));
  }

  /**
   * Vrai si le fragment est COURT et MAJORITAIREMENT numérique (morceau de numéro probable).
   * Une phrase normale (« 250 euros », « le 10 juillet 2026 ») n'est jamais dense → jamais
   * considérée comme un fragment de numéro.
   */
  private isPhoneFragment(text: string): boolean {
    const compact = this.phoneCompact(text);
    if (compact.length === 0 || compact.length > 14) return false;
    const digits = (compact.match(/\d/g) || []).length;
    return digits >= 2 && digits / compact.length >= 0.6;
  }

  /**
   * Détection GLISSANTE inter-messages d'un numéro éclaté sur plusieurs messages consécutifs
   * du MÊME expéditeur vers le MÊME destinataire (« 62 11 » puis « 23 456 »). `filterContent`
   * étant sans état, chaque fragment (< seuil) passe individuellement ; on concatène ici les
   * chiffres des fragments « denses » consécutifs se terminant au message COURANT et on cherche
   * un run ≥ 9 chiffres.
   *
   * @param userId          Auteur (pour tracer la violation).
   * @param messagesChrono  Contenus en ORDRE CHRONOLOGIQUE, le message COURANT en dernier.
   *
   * Fail-safe : exige que le message courant soit lui-même un fragment dense ET qu'au moins
   * 2 fragments consécutifs le soient → un message légitime isolé n'est JAMAIS bloqué.
   */
  async detectSplitPhone(userId: string, messagesChrono: string[]): Promise<boolean> {
    if (!Array.isArray(messagesChrono) || messagesChrono.length < 2) return false;
    const last = messagesChrono[messagesChrono.length - 1];
    if (!this.isPhoneFragment(last)) return false; // le message courant doit être un fragment

    // Remonte la traîne de fragments « denses » consécutifs (le plus récent en dernier).
    const run: string[] = [];
    for (let i = messagesChrono.length - 1; i >= 0; i--) {
      if (this.isPhoneFragment(messagesChrono[i])) run.unshift(messagesChrono[i]);
      else break;
    }
    if (run.length < 2) return false;

    const digits = run.map((t) => (this.phoneCompact(t).match(/\d/g) || []).join('')).join('');
    if (!/\d{9,}/.test(digits)) return false;

    // Violation : on TRACE (alimente le détecteur + auto-suspension) puis on signale le blocage.
    await this.logViolation(
      userId,
      `[MULTI-MSG] ${run.join(' | ')}`.substring(0, 500),
      ['PHONE_SPLIT_MULTIMSG'],
      'HIGH',
      'chat_multimsg',
    );
    return true;
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

    // Passe dédiée : téléphone obfusqué (homoglyphes + mots intercalés) que les motifs
    // « compact » standard laissent passer. HIGH. Le message étant bloqué, on ne tente
    // pas de masquage best-effort (impossible de remapper les positions transformées).
    if (
      !detectedPatterns.includes('PHONE_OBFUSCATED') &&
      this.detectObfuscatedPhone(normalized, compact)
    ) {
      detectedPatterns.push('PHONE_OBFUSCATED');
      highestSeverity = 'HIGH';
      this.logger.warn(
        `Contact info detected | User: ${userId} | Context: ${context} | Pattern: PHONE_OBFUSCATED`,
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

  /**
   * Filtre un NOM DE FICHIER (canal de contournement : une pièce jointe nommée
   * « appelle-moi-0612345678.jpg » ou « jean.dupont@gmail.com.pdf » fait fuiter un contact
   * sans passer par le champ texte). N'applique QUE les motifs à faible taux de faux positifs
   * (voir FILENAME_SAFE_PATTERNS) pour ne pas bloquer les noms d'appareils photo bourrés de
   * chiffres (horodatages). Bloque (HIGH) et loggue la violation, comme filterContent.
   */
  async filterFileName(
    fileName: string,
    userId: string,
    context = 'chat',
  ): Promise<FilterResult> {
    if (!fileName || typeof fileName !== 'string' || fileName.trim().length === 0) {
      return { isBlocked: false, filteredContent: fileName ?? '', detectedPatterns: [] };
    }

    const normalized = this.normalize(fileName);
    const compact = this.toCompact(normalized);

    const detectedPatterns: string[] = [];
    let highestSeverity: Severity | null = null;

    for (const pattern of this.patterns) {
      if (!pattern.enabled) continue;
      if (!ContentFilterService.FILENAME_SAFE_PATTERNS.has(pattern.name)) continue;

      const haystack = pattern.detectOn === 'compact' ? compact : normalized;
      const detectRegex = this.freshGlobal(pattern.regex);
      if (![...haystack.matchAll(detectRegex)].length) continue;

      detectedPatterns.push(pattern.name);
      if (
        !highestSeverity ||
        this.severityLevel(pattern.severity) > this.severityLevel(highestSeverity)
      ) {
        highestSeverity = pattern.severity;
      }
      this.logger.warn(
        `Contact info in filename | User: ${userId} | Context: ${context} | Pattern: ${pattern.name}`,
      );
    }

    const isBlocked = highestSeverity === 'HIGH';
    if (detectedPatterns.length > 0 && highestSeverity) {
      await this.logViolation(
        userId,
        `[NOM DE FICHIER] ${fileName}`,
        detectedPatterns,
        highestSeverity,
        `${context}_filename`,
      );
    }

    return {
      isBlocked,
      filteredContent: fileName,
      detectedPatterns,
      violationType: highestSeverity || undefined,
    };
  }

  /**
   * Vrai si la mission liée a « l'argent engagé » (acompte payé ou statut avancé).
   * Sert au signal anti-fishing média : une pièce jointe envoyée AVANT ce stade est
   * suspecte (contournement du filtre par photo d'une carte de visite, capture d'écran…).
   * Sans missionId → considérée NON payée (chat direct hors mission payée).
   * En cas d'erreur DB, renvoie `false` (privilégie la traçabilité ; ne bloque jamais).
   */
  async isMissionPaid(missionId?: string | null): Promise<boolean> {
    if (!missionId) return false;
    try {
      const mission = await this.prisma.mission.findUnique({
        where: { id: missionId },
        select: { status: true, depositPaidAt: true },
      });
      if (!mission) return false;
      if (mission.depositPaidAt) return true;
      return ContentFilterService.PAID_MISSION_STATUSES.has(mission.status as string);
    } catch (error) {
      this.logger.error('isMissionPaid a échoué', error as Error);
      return false;
    }
  }

  /**
   * Signal anti-fishing : TRACE un message IMAGE/FILE envoyé avant paiement de la mission
   * (ou en chat direct sans mission payée). L'OCR réel du contenu de l'image (lire un « 06 »
   * sur une photo de carte de visite) nécessite un service OCR dédié, hors périmètre du
   * conteneur ; à défaut on flagge/trace le média pré-paiement.
   *
   * Effet : (a) ContentViolation type IMAGE_PRE_PAYMENT (LOW) pour l'audit admin ;
   * (b) incrément de offPlatformSolicitationCount (→ leakageRiskScore), DÉDOUBLONNÉ par
   * (utilisateur, mission) sur 24h afin qu'un client honnête envoyant plusieurs photos du
   * chantier ne soit pas gelé. Ne bloque JAMAIS le message, ne lève jamais.
   */
  async flagPrePaymentMedia(
    userId: string,
    opts?: {
      fileName?: string;
      mediaType?: string;
      missionId?: string | null;
      context?: string;
    },
  ): Promise<void> {
    if (!userId) return;
    const context = opts?.context ?? 'chat';
    const missionKey = opts?.missionId ?? 'DIRECT';
    try {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const already = await this.prisma.contentViolation.findFirst({
        where: {
          userId,
          createdAt: { gte: since24h },
          detectedPatterns: { has: 'IMAGE_PRE_PAYMENT' },
          content: { contains: `mission=${missionKey}` },
        },
        select: { id: true },
      });

      const label =
        `[MEDIA ${opts?.mediaType ?? 'FILE'} PRE-PAIEMENT mission=${missionKey}]` +
        (opts?.fileName ? ` ${opts.fileName}` : '');
      await this.prisma.contentViolation.create({
        data: {
          userId,
          content: label.substring(0, 500),
          detectedPatterns: ['IMAGE_PRE_PAYMENT'],
          severity: 'LOW',
          createdAt: new Date(),
        },
      });

      // On alimente le score UNE fois par (utilisateur, mission)/24h (anti faux positif).
      // Volontairement PAS de passage par logViolation() : un média pré-paiement est souvent
      // légitime (photo du chantier) → on TRACE et on score sans auto-suspendre.
      if (!already) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { offPlatformSolicitationCount: { increment: 1 } },
        });
      }

      this.logger.warn(
        `Média pré-paiement tracé | User: ${userId} | Context: ${context} | Type: ${opts?.mediaType ?? 'FILE'} | Mission: ${missionKey} | Scored: ${!already}`,
      );
    } catch (error) {
      this.logger.error('flagPrePaymentMedia a échoué', error as Error);
    }
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
    if (this.detectObfuscatedPhone(normalized, compact)) return false;
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
    if (this.detectObfuscatedPhone(normalized, compact)) {
      detected.push('PHONE_OBFUSCATED');
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
