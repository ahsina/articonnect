# ArtiConnect — Analyse de couverture fonctionnelle

_Analyse du 2026-06-24 — basée sur la lecture du code (49 modules backend, ~90 pages frontend,
111 modèles Prisma) + vérifications en exécution sur le déploiement démo._

> **Lecture de ce rapport.** On distingue deux niveaux :
> - **Code présent** = la logique existe dans le code (controller + service + UI + modèle DB).
> - **✔ Vérifié** = testé en exécution sur la démo (`https://149.56.131.178:9443`).
>
> Beaucoup de fonctionnalités sont **codées** mais ne sont **pas activables sans clés tierces réelles**
> (Stripe, AWS S3, Twilio, Firebase, SMTP, OAuth, Stripe Identity) — inactives en mode démo.

---

## 1. Synthèse exécutive

ArtiConnect est une marketplace artisans↔clients (LU/FR/BE) au périmètre fonctionnel **très large** et
à l'implémentation **majoritairement réelle** (peu de mock côté front, logique métier substantielle côté
back). 

**Couverture estimée (du code, par profondeur d'implémentation) :**

| Niveau | Part estimée | Signification |
|--------|--------------|---------------|
| ✅ Complet (logique métier réelle, câblé front↔back) | **~75 %** | Auth, missions, paiements, marketplace, devis/signature, chat, factures, KYC, employés, admin, compta |
| ⚠️ Partiel (logique présente mais simplifiée / dépend d'un tiers / UI minimale) | **~18 %** | Calendar (sync Google), analytics (pas de ML), CRM, export custom, géo avancé, sous-traitance UI |
| 🔲 Squelette / délégué / décoratif | **~7 %** | Pages employé déléguées à des composants, pages publiques statiques, callback OAuth |

**Important :** « complet » signifie ici *implémenté au niveau code*, pas *vérifié de bout en bout en
production*. Seuls les parcours marqués ✔ ci-dessous ont été exécutés réellement.

---

## 2. Couverture par domaine fonctionnel (backend)

Légende : ✅ complet · ⚠️ partiel · 🔲 squelette — colonne « Tiers » = dépendance externe pour activation réelle.

| Domaine | Module(s) | État code | Tiers requis | Notes |
|---|---|---|---|---|
| **Authentification** | auth, verification, captcha | ✅ | Twilio (SMS), Google/FB/Apple (OAuth), reCAPTCHA | JWT httpOnly + refresh, 2FA TOTP + backup codes, device fingerprint, phone verif. ✔ login vérifié |
| **Utilisateurs / GDPR** | user | ✅ | S3 (avatar) | Profils client/artisan, export RGPD, droit à l'oubli. ✔ profil vérifié |
| **Missions** | mission (5 ctrl, 8 svc) | ✅ | — | Cycle complet : création→matching géo→négociation→acompte→trajet→arrivée→complétion→validation 48h→auto-validation cron |
| **Paiements** | payment (11 svc, le + gros) | ✅ | **Stripe, PayPal, banque** | Escrow (capture manuelle), 3DS/SCA, commission, payout, no-show avec preuves, paiement différé B2B |
| **Marketplace** | marketplace, favorite | ✅ | Stripe | Produits + variantes, panier (localStorage), commandes, retours, favoris. ✔ liste produits vérifiée |
| **Devis / Signature** | quote | ✅ | PDFKit | Devis multi-versions, templates, catalogue matériaux, signature électronique (tracée IP/UA) |
| **Communication** | chat, notification, fcm, email | ✅ | Redis, FCM, Twilio, SMTP | Chat E2E chiffré + WebSocket, filtre de contenu, notifs multi-canal + préférences |
| **Conformité / KYC** | compliance | ✅ | Stripe Identity | Seuils (1000€/3000€), blocage paiement si non vérifié |
| **Entreprise / Employés** | employee, company, subcontractor | ✅ / ⚠️ | — | Invitations, pointage (time-tracking), shifts, affectation missions, paie. Sous-traitance : back ok, **UI minimale** |
| **Comptabilité / TVA** | accounting, vat, invoice | ✅ | — | Facturation séquentielle + PDF, TVA multi-pays, **export FEC** (TVA déductible partiellement simplifiée) |
| **Litiges** | dispute, moderation | ✅ | — | Workflow création→résolution admin. ⚠️ pas de fil de discussion litige multi-tours |
| **Avis** | review | ✅ | — | Notation + réponse artisan + impact réputation + anti-fraude |
| **Anti-fraude** | fraud (8 détecteurs) | ✅ | — | Multi-comptes, faux avis, abus remboursement, anomalies prix/payout. **Règles, pas de ML**. (désactivé en démo) |
| **Administration** | admin (6 ctrl), reports | ✅ | — | Dashboard, gestion users, audit logs, feature flags, config plateforme (15 sections) |
| **Documents** | documents, portfolio | ✅ | PDFKit, S3 | Génération PDF (devis, facture, contrat, reçu, rapport), portfolio artisan |
| **Upload / Antivirus** | upload | ✅ | **S3, ClamAV** | Scan antivirus avant stockage |
| **Calendrier** | calendar | ⚠️ | Google Calendar | Calendrier local ok, **sync Google = mock** |
| **Analytics** | analytics, geo | ⚠️ | Google Maps (opt.) | Métriques de base ; **prévisions sans ML**, géo avancé limité |
| **CRM / Export** | crm, export | ⚠️ | — | CRUD basique ; exports custom limités |
| **Support / KB / i18n** | support, knowledge-base, i18n | ✅ | — | Tickets, FAQ/articles, 3 langues (fr/en/de) |
| **Récurrent / Badges / Specialty / Currency** | recurring, badges, specialty, currency, country, address | ✅ | Stripe (abos) | Services récurrents, gamification, référentiels. ✔ specialties/currencies vérifiés |

---

## 3. Couverture frontend par espace

| Espace | Pages (~) | État | Câblage API |
|---|---|---|---|
| **Client** | 19 | ✅ Complet | API réelle (`lib/api/*`), pas de mock |
| **Artisan** | 25 | ✅ Complet | API réelle (profil, devis, revenus, Stripe Connect, entreprise, employés) |
| **Admin** | 32 | ✅ ~Complet | API réelle (~50 endpoints) ; config plateforme en 15 sections |
| **Auth** | 8 | ✅ (1 callback squelette) | login/register/2FA/reset + OAuth |
| **Employé** | 2 | 🔲 Délégué | Logique dans composants (`InternalChat`, `MobileTimeTracking`), pas dans les pages |
| **Public / divers** | 6 | 🔲 Décoratif | Accueil statique, design-system, offline PWA, signature devis (flux externe) |

> Point notable : **très peu de données mock** dans le front — les pages appellent l'API réelle.
> C'est cohérent avec ce que j'ai vérifié (le front consomme bien `/api/*` derrière nginx).

---

## 4. Parcours utilisateurs de bout en bout (12 parcours clés)

État = chaîne UI front → API → logique métier → DB. ✔ = maillon(s) vérifié(s) en exécution.

| # | Parcours | État code | Réserve / maillon à activer |
|---|---|---|---|
| 1 | Inscription + vérif email + login (+2FA, +OAuth) | ✅ | ✔ login/profil vérifiés. OAuth nécessite vraies clés ; email de vérif nécessite SMTP |
| 2 | Client : créer mission → candidatures/devis → choisir artisan | ✅ | Notifications de proximité dépendent de FCM/SMS |
| 3 | Artisan : voir missions → candidater → devis → signature | ✅ | Signature tracée (IP/UA) mais **sans horodatage PKI/RFC 3161** |
| 4 | Paiement (Stripe/escrow, commission, B2B différé) | ✅ (code) | **Inactif sans clés Stripe réelles** ; webhooks à configurer |
| 5 | Marketplace : produits → panier → commande → paiement | ✅ | ✔ listing produits vérifié ; paiement = Stripe réel |
| 6 | Chat temps réel (client↔artisan, interne entreprise) via WebSocket | ✅ | nginx route `/socket.io/` ; namespace `/api` à valider côté gateway |
| 7 | Avis après mission | ✅ | — |
| 8 | Litiges et résolution | ✅ | ⚠️ pas de messagerie litige multi-tours |
| 9 | KYC / vérification d'identité | ✅ (code) | **Inactif sans Stripe Identity** |
| 10 | Entreprise : employés, pointage, affectation | ✅ | UI pages employé déléguée à composants |
| 11 | Comptabilité : facturation, TVA, export FEC | ✅ | TVA déductible partiellement simplifiée |
| 12 | Admin : modération, users, feature flags, analytics | ✅ | Analytics en cache (pas live), pas de ML |

**Aucun des 12 parcours n'est *absent* au niveau code.** Les réserves portent sur (a) les intégrations
tierces à activer, et (b) des raffinements UX, pas sur la logique métier centrale.

---

## 5. Principaux gaps fonctionnels (priorisés)

**Bloquants pour une vraie prod (intégrations à brancher) :**
1. **Clés tierces réelles** — Stripe (paiements/KYC/Connect), AWS S3 (upload), Twilio (SMS), Firebase
   (push), SMTP (emails), OAuth (Google/FB/Apple). Tant qu'elles sont en placeholder, paiement, upload,
   SMS, push, emails et login social sont **inactifs**.

**Raffinements fonctionnels (logique présente mais incomplète) :**
2. **Sync Google Calendar** — actuellement mock (calendrier local seulement).
3. **Analytics avancées** — pas de ML/forecasting ; dashboards en cache (non temps réel).
4. **Signature électronique** — traçabilité IP/UA mais pas d'horodatage légal PKI (RFC 3161).
5. **TVA déductible (FEC)** — calcul partiellement simplifié (manque données d'achats).
6. **UI sous-traitance** — back complet, interface artisan minimale.
7. **Messagerie de litige** — pas de fil disputant↔admin multi-tours.
8. **Géo / no-show** — détection no-show par timing manuel, pas de geofencing GPS d'arrivée.
9. **Pages employé** — logique déléguée à des composants, pages non finalisées.
10. **Multi-devise** — modèle présent mais logique EUR en dur (suffisant pour LU/FR/BE).

---

## 6. Réserves méthodologiques

- L'évaluation « complet » repose majoritairement sur la **lecture du code** (présence controller +
  service + UI + modèle). Elle **ne garantit pas** l'absence de bugs d'exécution : rappel, le backend ne
  démarrait pas du tout avant correction de 3 bugs (dépendance circulaire, provider manquant, OAuth), et
  le login était bloqué par l'anti-fraude — autant de défauts invisibles à la seule lecture.
- Seuls les flux suivants ont été **exécutés et confirmés** sur la démo : santé API, login (3 rôles),
  profil authentifié, listing spécialités/devises/produits. Le reste est une évaluation au niveau code.
- Pour fiabiliser ce rapport, l'étape suivante recommandée serait une **campagne de tests e2e**
  (Playwright est déjà présent côté front) couvrant les 12 parcours sur un environnement avec clés
  tierces de test (sandbox Stripe, etc.).

---

## 7. Conclusion

ArtiConnect présente une **couverture fonctionnelle large et majoritairement implémentée** (~75 % complet
au niveau code, ~18 % partiel, ~7 % squelette). Les 12 parcours métier clés existent de bout en bout dans
le code. Les écarts vers une vraie production sont surtout des **activations d'intégrations tierces** et
des **raffinements** (calendrier, analytics ML, horodatage légal, UX litiges/sous-traitance), pas des
trous de logique centrale.
