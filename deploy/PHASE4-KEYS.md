# Phase 4 — Clés/variables à fournir dans `deploy/.env.deploy`

> ⚠️ `deploy/.env.deploy` est gitignored — ne jamais le committer. Après édition :
> `cd /home/debian/articonnect && docker compose -f deploy/docker-compose.deploy.yml --env-file deploy/.env.deploy up -d --build backend frontend`
> (Les `NEXT_PUBLIC_*` sont compilés au build du frontend → rebuild frontend obligatoire après changement.)

## A. 💰 ARGENT RÉEL — payouts (priorité #1)
État actuel : Stripe en **mode TEST**.
1. `STRIPE_SECRET_KEY=sk_live_...`            (actuel : sk_test)
2. `STRIPE_PUBLISHABLE_KEY=pk_live_...`       (actuel : pk_test)
3. `NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_...`(actuel : pk_test — **rebuild front**)
4. `STRIPE_WEBHOOK_SECRET=whsec_...`          → créer un **endpoint webhook LIVE** dans le dashboard Stripe
   pointant sur `https://krafolt.com/api/payments/webhook`, copier son secret.
5. **Activer Stripe Connect (Express)** dans le dashboard Stripe → PAS de clé séparée (le code utilise
   `accounts.create` avec la clé secrète). C'est CE qui débloque les virements artisan/employé.
6. (optionnel) `STRIPE_MERCHANT_ID=merchant....` → Apple Pay uniquement.

⚠️ Même avec les clés live : un virement n'aboutit que si l'artisan a **terminé son onboarding Connect** (KYC
Stripe) via `/artisan/stripe`. Et 2 points de CODE restent à finir de mon côté (indépendants des clés) :
   - durcir `transferToArtisan` (aujourd'hui il avale le cas « pas de compte Connect » → statut PAID sans virement) ;
   - brancher réellement les payouts employés (s'arrêtent à PROCESSING) + génération auto des factures à la complétion.
   → dis-moi « fais la partie code payouts » et je la traite (testable en Stripe **test** avec des comptes Connect test).

## B. 👁️ Observabilité — Sentry
7. `SENTRY_DSN=https://...ingest.sentry.io/...`            (backend — actuel : vide)
8. `NEXT_PUBLIC_SENTRY_DSN=https://...ingest.sentry.io/...`(front — actuel : vide, **rebuild front**)
⚠️ Sentry n'est PAS installé (paquets absents). La clé seule ne suffit pas → je dois installer
`@sentry/node` (back) + `@sentry/nextjs` (front) et l'initialiser. Dis-moi et je le fais.

## C. 🗺️ Géocodage — Google Maps (OPTIONNEL, non bloquant)
9. `GOOGLE_MAPS_API_KEY=AIza...`  (actuel : vide)
L'app géocode déjà via **OpenStreetMap / Nominatim** (gratuit, fonctionnel). Google = meilleure précision, optionnel.

## D. 🔐 OAuth social (OPTIONNEL — le login email marche déjà)
Actuellement des **placeholders** (`demo-...`). Pour activer le login social, remplacer par de vraies apps :
10. `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
11. `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET`
12. `APPLE_CLIENT_ID` / `APPLE_TEAM_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY_LOCATION`
(+ vérifier les `*_CALLBACK_URL` = `https://krafolt.com/api/auth/<provider>/callback`)

## E. 🔔 Push notifications (OPTIONNEL)
13. `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` (actuel : vide)
14. `NEXT_PUBLIC_VAPID_PUBLIC_KEY=...` (web push — actuel : vide, **rebuild front**)

## ✅ Déjà OK — ne rien faire
- **Twilio** : réel (AC53bf…), `TWILIO_ENABLED=true` → SMS OK (limites compte trial).
  [note code : `phone-verification.service` a encore un stub commenté → je peux y injecter `TwilioSmsService` réel.]
- **SMTP** : réel (Gmail), envoi d'emails fonctionnel.
- **STRIPE_WEBHOOK_SECRET** : défini (à remplacer par le secret LIVE quand tu passes en live).

---
### Résumé « strict minimum pour encaisser/verser en vrai »
Points **1, 2, 3, 4** + activer **Connect (5)** dans le dashboard Stripe, puis me demander la **partie code payouts**.
Tout le reste (Sentry, Maps, OAuth, Push) est optionnel / non bloquant pour la mise en service.
