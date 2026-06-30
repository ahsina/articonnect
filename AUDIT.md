# Krafolt — Audit de production (analyse en profondeur)

> Audit lecture seule par 4 analyses parallèles (client, artisan/B2B, admin, transverse), code back+front réel.
> **Verdict** : back-end impressionnant et en grande partie réel, mais **PAS prêt pour la production** — beaucoup
> de parcours critiques sont cassés contre les vraies données, des flux d'argent sont incomplets, et il y a
> plusieurs failles de sécurité. C'est une « démo qui paraît complète » avec des chemins critiques creux.

## Thèmes systémiques (transversaux)
1. **« La base dit PAYÉ mais l'argent n'a pas bougé »** — récurrent : gains artisan (fictifs, tous `PAID`),
   payouts employés (s'arrêtent à `PROCESSING`), compensations, **annulations** (frais affichés mais 0 €
   prélevé/remboursé → fonds bloqués en escrow), **résolution de litige** (remboursement = stub mort).
2. **Mismatches contrat front↔back** — noms de champs et formes de réponse divergents → pages cassées :
   avis (`rating` vs `overallRating`), commandes (`total`/`totalAmount`, `product` imbriqué), litiges
   (`type` vs `reason`), profils artisan (plat vs `artisanProfile` imbriqué), devis (`Negotiation` vs `Quote`).
3. **Back plus complet que le front** — services réels orphelins : analytics, `CalendarService`, module Quote,
   génération de factures, split de gains employés… existants mais non câblés / mal câblés / jamais déclenchés.
4. **Dernier kilomètre mort** : SMS (Twilio commenté), files email/SMS (aucun consommateur), mismatch clé SMTP,
   **pas de proxy `/api`** (analytics/pointeuse/signature devis cassés), handshake chat, Sentry non installé.
5. **Sécurité** : IDOR factures, RBAC admin manquant, ownership produits/commandes manquant, 2FA login cassé,
   vérif entreprise fail-open.

---

## 🔴 BLOQUANTS (sécurité / argent / légal)

### Sécurité
- **IDOR factures** : `GET /invoices`, `/invoices/:id`, `/:id/pdf` sans `@Roles` ni scoping `req.user` ; `clientId`
  est un paramètre client → **tout utilisateur connecté peut lire toutes les factures/PDF de la plateforme**.
- **RBAC admin manquant** sur `AdminController`/`PlatformConfigController` (#1 admin) → endpoints admin
  potentiellement accessibles sans rôle admin. (À confirmer/corriger en urgence.)
- **Ownership manquant** : `updateProduct`/`deleteProduct`/`updateOrderStatus` → un artisan peut modifier/supprimer
  les produits et commandes d'un autre (cross-tenant).
- **2FA login impossible** : `auth.service.ts:218,274` passe `user.id` au lieu de `user.twoFactorSecret` →
  quiconque active la 2FA est **verrouillé** ; `/auth/2fa-recovery` n'existe pas (404).
- **Vérif entreprise fail-open** : SIRET/KBO/RCS renvoient `verified:true` si le token API est absent (cas actuel)
  → tout SIRET Luhn-valide est « vérifié ». RCS Luxembourg = pur stub.
- **Audit logging dormant** sur les mutations sensibles (et `validate no-show` déclenche un **vrai virement
  Stripe** non gardé/non audité).

### Argent (flux incomplets)
- **Payouts employés** : ne s'exécutent jamais (s'arrêtent à `PROCESSING`, aucun transfert Stripe).
- **Payout artisan** : dépend d'une `Transaction` créée par le flux client ; sinon aucun transfert pendant que
  la page « Gains » affiche `PAID` ; `transferToArtisan` avale le cas « pas de compte Stripe ».
- **Page Gains artisan = fiction** : pas de table `ArtisanEarning`, tout `status:'PAID'`, `pendingEarnings:0`,
  frais 10 % alors que la config fait foi à 12 %.
- **Annulation** : `cancelMission` ne prélève aucun frais et ne rembourse personne (barème 10/25/50 % cosmétique).
- **Litige résolu** : aucun mouvement d'argent (logique de remboursement = stub mort, non câblée).
- **Webhook Stripe sans idempotence** (pas de dédup sur `event.id`) + **montant de remboursement non bridé serveur**
  (over-refund possible) ; **PaymentIntent sans idempotence** (doublons de Transaction).
- **Factures jamais auto-générées** à la complétion (uniquement endpoints manuels).
- **Stripe Connect** : pas de webhook `account.updated` ; **pays codé en dur `LU`** → payouts FR/BE échouent.

### Légal / RGPD (exposition en LU/FR/BE)
- **0 page légale** (CGU/CGV, confidentialité, mentions légales), **0 bandeau cookies/consentement**.
- **Droits RGPD non exposés** côté UI ; **« suppression » = simple passage en SUSPENDED** (pas d'effacement réel).

### Notifications / Email (parcours signup/reset à risque)
- **Mismatch clé SMTP** (`SMTP_PASS` vs `SMTP_PASSWORD`) → risque d'emails vers une fausse boîte (Ethereal).
  ⚠️ à vérifier sur le vrai `.env.deploy` (pas seulement `.env.example`).
- **Files email/SMS sans consommateur** → perte silencieuse de toutes les notifs/digests en file.
- **SMS 2FA = stub** (Twilio commenté ; `TwilioSmsService` réel existe mais non injecté).

---

## 🟠 IMPORTANTS (parcours cassés / robustesse)

### i18n (ton point)
- **Sélecteur de langue jamais rendu** (uniquement dans `Navbar.tsx`, code mort) → impossible de changer de langue
  côté utilisateur ; le `<select>` de langue dans client/settings est mort (pas de `onChange`). → **toute l'i18n
  (7 langues, ~21 000 traductions) est inutilisable tant que le switcher n'est pas posé partout.**

### Frontend robustesse
- **Pas de `app/error.tsx` / `global-error.tsx` / `not-found.tsx`** → crash brut Next sur erreur SSR/route/404.
- **Accès non gardés** qui crashent le rendu : `mission.client.firstName[0]`, `mission.artisan.firstName` (mission
  non assignée → `artisan` null), orders/quotations… (artisan/reviews déjà corrigé).
- **Pas de proxy `/api`** : `fetch('/api/...')` (pointeuse, analytics, earnings/FEC, signature devis, chat) → 404
  en prod, sans auth.

### Parcours fonctionnels
- **Client** : bouton « Terminer » → route ARTISAN-only (403) ; soumission d'avis 400 (`rating`/`overallRating`) ;
  page **commandes** cassée (schéma) ; total checkout faux (TVA+livraison) ; commandes marketplace **sans paiement** ;
  « embaucher un artisan précis » non fonctionnel ; `/client/request` 404 ; création mission perd beforePhotos+B2B.
- **Artisan** : **pointeuse** cassée (`getEmployeeId` renvoie userId) ; **quotations** n'affichent jamais les devis
  (tables Negotiation vs Quote) ; **disponibilités** cosmétiques (schéma incompatible, time-off jamais approuvé,
  `CalendarService` mort, matching ignore le calendrier) ; **analytics** = mock en dur sur un vrai service orphelin ;
  **Add/Edit produit** = stub (bouton Save sans onClick) ; statuts mission front≠back.
- **Admin** : **modération** USER_WARNED/SUSPENDED/BANNED = no-ops (seul produit→INACTIVE marche) ; **feature flags
  en mémoire** (volatils) ; **settings persistés mais non appliqués** ; **métriques monitoring/cron fabriquées** ;
  supervision missions limitée.

### Ops / SEO
- **Sentry non installé** (back pkg absent, front désactivé) → zéro visibilité erreurs en prod.
- **SEO faible** : pas de `robots.txt`/`sitemap`, 1/91 pages avec metadata, pas d'OG réel, pas de JSON-LD, `<img>` bruts (pas `next/image`).
- **Chat** : handshake auth incompatible (cookie vs `auth.token`) → connexions web droppées ; « chiffrement E2E »
  annoncé mais contenu en clair en base.

---

## 🟡 POLISH / DETTE
- Relecture **native** des traductions (de/nl/es/it/pt sont IA), surtout légal/fiscal.
- Pages **À propos / Contact / FAQ / Tarifs**.
- 1 216 `t(...) || 'fallback'` morts (t() ne renvoie jamais falsy) — nettoyer + warnings clés manquantes.
- A11y (alt/aria), `next/image`, Core Web Vitals.
- Tests **front** quasi nuls (3 unit) ; couverture back ~23 % (bonne sur paiement/fraude/auth).
- Rebrand **Capacitor** (encore « ArtiConnect », splash bleu, `cleartext:true`).
- Coordonnées géo **codées en dur** (centres-villes) → matching proximité faux.
- Modèle : `Mission.artisanId` sans `onDelete` ; `ReputationProfile.totalPoints` orphelin ; symlink schema cassé.

---

## ✅ Ce qui est SOLIDE (à ne pas refaire)
Auth (cookies httpOnly, refresh hashés, 2FA TOTP réel, reset password réel), architecture **paiements** Stripe
(escrow capture manuelle, Connect, SEPA, 3DS, Radar, webhook signé), **négociation/devis** (mission detail),
**upload fichiers** réels (MinIO + ClamAV), **chat temps réel** (gateway+hook), **marketplace browse** + pricing
serveur, **B2B** (entreprise/employés/rôles/invitations + split de gains calculé), **vérif SIRET** (INSEE réel
quand token présent), **no-show/compensation matrix**, RBAC serveur sur 44 contrôleurs, helmet/CORS/throttle.

### Déjà traité dans cette mission (ne pas relister)
Durcissement prod (throttle, anti-fraude sélective, mot de passe admin), **backups planifiés** (`/etc/cron.d/krafolt-backup`,
3h30 — l'agent transverse l'ignorait), HTTPS krafolt.com + Let's Encrypt, refonte design dark/jaune, i18n 7 langues
(0 orphelin) — **mais switcher à poser**, fix null-safety artisan/reviews.

---

## Priorisation recommandée
1. **Sécurité d'abord** : IDOR factures, RBAC admin, ownership produits/commandes, 2FA login, vérif fail-open. *(jours)*
2. **Argent** : brancher réellement payouts (employé+artisan), annulation (frais/refund), litige (refund),
   factures auto, idempotence webhook + clamp refund. *(le plus gros chantier)*
3. **Légal/RGPD** : pages légales + bandeau cookies + export/suppression réels. *(bloquant ouverture)*
4. **Débloquer l'UX** : sélecteur de langue partout, proxy `/api`, error/not-found pages, fix contrats
   (orders/reviews/disputes/quotations/profils), pointeuse, analytics.
5. **Intégrations** (tes clés) : email pro + clé SMTP, Twilio, Stripe live+webhook, Sentry, Maps, OAuth.
6. **SEO + polish + tests + relecture native.**
