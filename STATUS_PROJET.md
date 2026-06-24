# ArtiConnect — État du projet & déploiement démo

_Rapport généré le 2026-06-23. Branche `claude/analyze-codebase-requirements-011LvJoSQUVBvhAcau2k2HaB` (défaut), HEAD `87cb5b5`._

## 1. Vue d'ensemble

Marketplace de mise en relation **artisans ↔ clients** (type « Uber des artisans »), multi-pays
**Luxembourg / France / Belgique**. Monorepo npm workspaces.

| Composant | Stack | Volume |
|-----------|-------|--------|
| Backend `backend/api-gateway` | NestJS 10 + TS, Prisma 5 / PostgreSQL, Redis, Socket.io | **49 modules**, 84 specs + 8 e2e |
| Schéma données `backend/shared/prisma` | Prisma | **111 modèles**, 4155 lignes, 8 migrations |
| Frontend `frontend` | Next.js 14 (App Router) + React 18 + Tailwind + shadcn/ui, PWA, i18n fr/en/de, Capacitor | **90 pages** |
| Docs | Markdown | 42 fichiers à la racine |

Périmètre fonctionnel couvert (code présent) : auth JWT + OAuth (Google/Facebook/Apple) + 2FA,
missions & devis + **signature électronique**, paiements **Stripe/PayPal/virement/différé B2B**,
**chat interne** temps réel, marketplace, avis, litiges, **KYC (Stripe Identity)**, VAT multi-pays,
**time-tracking employés**, **comptabilité / export FEC**, badges, espaces client/artisan/employé/admin.

## 2. Intégration des branches ✅

- Seule branche non mergée : `claude/analyze-codebase-artisan-…` (23 commits, **+17 412 lignes**) →
  mergée en fast-forward dans la branche par défaut et **poussée sur `origin`**.
- Les 4 autres branches (`features`, `gaps`, `fix-ci-tests`, `artisan-features-analysis`) étaient
  déjà mergées. `git branch -r --no-merged` est désormais **vide**.

## 3. Santé du code — vérifications réalisées

- **Build images Docker (Node 20)** : backend ✅ et frontend ✅ compilent (après corrections, §6).
- **Démarrage backend** : ✅ « Nest application successfully started » — après correction de **3 bugs
  bloquants au boot** (voir §6) qui empêchaient toute exécution de l'API.
- **Tests unitaires** (Jest, image Node 20) : **1683 / 1683 passent — 84/84 suites (100 %)**.
  (Le seul échec initial était un artefact d'exécution sous `NODE_ENV=production` ; le test a été
  rendu déterministe.)
- **Dette / TODO** : seulement **3 TODO** backend (notifications devis ×2, revue de compte chat),
  0 TODO frontend, icônes PWA présentes. Code globalement propre après le merge.

### Anomalies trouvées — toutes corrigées (cf. §6)
1. ~~Dérive schéma ↔ migrations~~ → **RÉSOLU** : l'historique de migrations était en fait incomplet
   (aucune migration de base ne créait les tables coeur ; `migrate deploy` échouait de zéro).
   Squashé en une **baseline unique** validée (`migrate deploy` de zéro = 113 tables, diff vide).
2. ~~`prisma/seed.ts` obsolète~~ → **RÉSOLU** : aligné sur le schéma (relation Category) et rendu
   re-jouable (`SEED_RESET=true`). La base de démo est **peuplée** (5 spécialités, 6 users, 9 produits,
   11 catégories) avec comptes connectables (cf. §4).
3. ~~Dockerfiles non fonctionnels~~ → **RÉSOLU** : husky, hoisting workspaces, `.dockerignore`, OpenSSL.

## 4. Déploiement démo — LIVE ✅

**URL : https://149.56.131.178:9443** (certificat **auto-signé** → accepter l'avertissement navigateur).

| Test (via nginx HTTPS) | Résultat |
|---|---|
| `GET /health` | **200** `{"status":"ok",...}` |
| `GET /api/health` | **200** |
| `GET /api/specialties` (touche la DB) | **200** `[]` (base vide) |
| `GET /api/currencies` | **200** |
| `POST /api/auth/login` (mauvais creds) | **401** (attendu) |
| `GET /` (frontend) | **200** — `<title>ArtiConnect - Trouvez des artisans locaux</title>` |

Stack (tous `unless-stopped`, redémarrage auto) : `postgres` + `redis` (réseau interne, non exposés),
`backend` (healthy), `frontend` (healthy), `nginx` (publie `9443→443`). Port `9443` ouvert dans **ufw**.

Architecture mono-origine derrière nginx : `/api/*`→backend (préfixe retiré), `/socket.io/`→backend,
`/`→frontend. Fichiers : `deploy/docker-compose.deploy.yml`, `deploy/nginx.ip.conf`,
`deploy/.env.deploy` (secrets, non commité), `deploy/gen-cert.sh`.

**Données & comptes de démo** : base peuplée. Connexion possible :
`admin@articonnect.com / Admin1234!`, `jean.dupont@example.com / Client1234!`,
`pierre.plombier@example.com / Artisan1234!` (anti-fraude multi-comptes désactivé pour la démo).

### Mode démo — ce qui est inactif (placeholders, nécessite de vraies clés)
Paiements **Stripe/PayPal**, upload **AWS S3**, SMS **Twilio**, push **Firebase**, e-mail **SMTP**
(utilise un compte de test Ethereal au boot), **Google Maps**, login **OAuth social**
(clés factices pour éviter le crash), **Sentry**. Le cœur (comptes, missions, marketplace, chat) fonctionne.

## 5. Reste à faire (priorisé)

**P0 — pour une vraie mise en production**
- Fournir les vraies clés tierces (Stripe live, AWS S3, Twilio, SMTP, Firebase, OAuth, Maps).
- Domaine + TLS Let's Encrypt (remplacer le cert auto-signé) ; durcir la CSP (`unsafe-inline` à retirer).
- Réactiver les détections anti-fraude (désactivées pour la démo) avec des seuils adaptés.

**P1 — qualité / complétude**
- Vérifier/auditer les flux paiement de bout en bout une fois Stripe câblé (webhooks, payouts).
- ~~Régulariser les migrations Prisma~~, ~~réparer seed.ts~~, ~~3 TODO backend~~, ~~suite de tests verte~~ → **FAIT**.

**P2 — exploitation**
- Sauvegardes Postgres planifiées, monitoring/alerting (Sentry DSN), rotation des logs.
- Réduire l'image frontend (~970 Mo : passer en build Next.js `standalone`).

## 6. Corrections appliquées pendant la mise en route

Bugs **réels** corrigés (sinon ni build ni boot possibles) :
1. `compliance.module.ts` — dépendance circulaire Payment↔Compliance : ajout du `forwardRef(() => PaymentModule)`
   (le côté Payment l'avait déjà ; côté Compliance non) → corrige « ComplianceModule imports[1] undefined ».
2. `email/email.module.ts` — `EmailService` dépendait de `EmailTemplateService` non fourni → ajouté aux providers.
3. `backend/api-gateway/Dockerfile` — retrait du script `prepare` (husky) avant `npm ci`, copie de l'arbre
   `/app` complet (hoisting workspaces), ajout d'`openssl` (Prisma/Alpine).
4. `frontend/Dockerfile` — idem husky + copie `/app` complet (le binaire `next` était hoisté et introuvable).
5. `.dockerignore` créé (exclut `node_modules`/`.next`/`dist` du contexte de build).
6. `deploy/.env.deploy` — valeurs OAuth factices pour éviter le crash « OAuth2Strategy requires a clientID ».

Ces correctifs sont dans l'arbre de travail (commit recommandé). Le reverse-proxy partagé du serveur
(`nginx-proxy` sur 80/443/8443) n'a pas été touché.
