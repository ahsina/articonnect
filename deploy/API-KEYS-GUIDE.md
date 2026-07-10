# Guide — Obtenir les clés d'API de Krafolt

Ce guide explique **où et comment récupérer chaque clé/identifiant** des intégrations tierces, puis où
la coller et comment vérifier. Il complète `PHASE4-KEYS.md` (qui liste seulement *quelles* variables remplir).

---

## 0. Règles générales (à lire une fois)

- **Toutes les clés vont dans `deploy/.env.deploy`** (une ligne `NOM=valeur`).
- ⚠️ **Ne JAMAIS committer `.env.deploy`** — il est `gitignored`. Il contient des secrets.
- **Après avoir édité `.env.deploy`, redéployer** :
  ```bash
  cd /home/debian/articonnect
  docker compose -f deploy/docker-compose.deploy.yml --env-file deploy/.env.deploy up -d backend frontend
  docker exec nginx-proxy nginx -t && docker exec nginx-proxy nginx -s reload
  ```
- **Variables `NEXT_PUBLIC_*`** : elles sont **compilées dans le frontend au build** → il faut
  **rebuilder le frontend** (`... up -d --build frontend`) pour qu'un changement soit pris en compte.
  Les autres variables (backend) sont lues au démarrage → un simple `up -d backend` suffit.
- **Où trouver le nom exact** : `grep -i <mot> deploy/.env.deploy`.
- Ordre de priorité conseillé : **1) Stripe live → 2) Email pro → 3) Twilio → 4) Maps → 5) OAuth → 6) Sentry**.

---

## 1. 💳 Stripe — paiements réels (priorité #1)

> État actuel : **mode TEST** entièrement fonctionnel (webhook test déjà branché, paiement + escrow +
> payout artisan prouvés). Passer en **LIVE** = encaisser du vrai argent.

### 1a. Récupérer les clés API
1. Créer/ouvrir un compte sur **https://dashboard.stripe.com**.
2. Terminer l'**activation du compte** (infos entreprise, IBAN, pièce d'identité) — obligatoire pour le mode live.
3. En haut à droite, **basculer le toggle « Test mode » sur OFF** (mode Live).
4. Menu **Developers → API keys** :
   - **Publishable key** (`pk_live_...`)
   - **Secret key** (`sk_live_...`) → cliquer « Reveal ».

```
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_xxx   # ← rebuild frontend
```

### 1b. Créer le webhook LIVE
Le secret webhook **test** ne vaut qu'en test → il faut un endpoint live.
- Dashboard (mode Live) → **Developers → Webhooks → Add endpoint** :
  - **Endpoint URL** : `https://krafolt.com/api/payments/webhook`
  - **Events to send** : `charge.succeeded`, `charge.failed`, `payment_intent.succeeded`,
    `payment_intent.payment_failed`, `payment_intent.canceled`, `setup_intent.succeeded`,
    `review.opened`, `review.closed`, `radar.early_fraud_warning.created`.
- Après création, cliquer sur l'endpoint → **Signing secret** (`whsec_...`).

```
STRIPE_WEBHOOK_SECRET=whsec_xxx
```
> (Alternative en ligne de commande, comme fait en test :
> `curl -u sk_live_xxx: https://api.stripe.com/v1/webhook_endpoints -d url=https://krafolt.com/api/payments/webhook -d "enabled_events[]=charge.succeeded" ...` → renvoie le `secret`.)

### 1c. Activer Stripe Connect (versements aux artisans)
- Dashboard → **Connect → Get started** → activer **Express**. Pas de clé séparée : le code utilise
  `accounts.create` avec la clé secrète.
- ⚠️ **Chaque artisan doit terminer SON onboarding** (KYC Stripe) via le bouton `/artisan/stripe` de l'app
  (flux hébergé Stripe). Sans ça, le virement reste « différé » (fonds sécurisés en escrow, versement récupérable).

### 1d. Vérifier
- Un vrai paiement carte de bout en bout : mission → paiement → l'escrow se finance (statut PAID) → validation → virement artisan.
- Nettoyage prod : supprimer le conteneur de forwarding démo `articonnect-stripe-cli` (`docker rm -f articonnect-stripe-cli`).

---

## 2. 📧 Email professionnel (SMTP)

> Aujourd'hui : Gmail perso partagé. Objectif : un expéditeur `@krafolt.com` fiable (sinon les mails
> tombent en spam). Deux options — **SendGrid** (simple) ou **Google Workspace** (boîte pro complète).

### Option A — SendGrid (recommandé pour du transactionnel)
1. Créer un compte sur **https://sendgrid.com** (offre gratuite ~100 mails/jour).
2. **Settings → Sender Authentication → Authenticate Your Domain** → suivre pour ajouter les
   enregistrements **DNS (CNAME DKIM/SPF)** de `krafolt.com` chez ton registrar (OVH). Attendre la validation.
3. **Settings → API Keys → Create API Key** (Full Access ou « Mail Send ») → copier la clé (`SG.xxxx`).
4. Config SMTP SendGrid :
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false            # STARTTLS sur 587 (true seulement pour le port 465)
SMTP_USER=apikey             # littéralement le mot "apikey"
SMTP_PASS=SG.xxxx            # la clé générée
SMTP_FROM_EMAIL=no-reply@krafolt.com
SMTP_FROM_NAME=Krafolt
# (le code lit SMTP_* ; les variables EMAIL_* sont l'ancien jeu — aligner les deux par sécurité)
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.xxxx
EMAIL_FROM=no-reply@krafolt.com
```

### Option B — Google Workspace
1. Souscrire **Google Workspace** pour `krafolt.com` (**https://workspace.google.com**), vérifier le domaine (DNS).
2. Créer une boîte `no-reply@krafolt.com`, activer la **validation en 2 étapes**, puis générer un
   **mot de passe d'application** (Compte Google → Sécurité → Mots de passe des applications).
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=no-reply@krafolt.com
SMTP_PASS=<mot-de-passe-application-16-caractères>
SMTP_FROM_EMAIL=no-reply@krafolt.com
SMTP_FROM_NAME=Krafolt
```

### Vérifier
- Déclencher un mail (inscription, reset mot de passe) et confirmer la réception (+ pas en spam).

---

## 3. 📱 Twilio — SMS & relais téléphonique masqué

> Le trial actuel (numéro US) ne livre pas au Luxembourg et ne peut pas faire de relais masqué.
> Un compte **payant** débloque : (a) SMS de vérification vers LU/FR/BE, (b) le vrai **relais de numéro
> anonymisé** anti-désintermédiation (façon Uber).

1. Créer un compte sur **https://www.twilio.com** puis **passer en compte payant** (ajouter un moyen de paiement — « Upgrade »).
2. **Acheter un numéro** compatible SMS pour ton marché : Console → **Phone Numbers → Buy a number**
   (choisir un numéro **LU +352** ou **FR +33** avec capacité *SMS*). Pour le relais anonymisé, prévoir
   un **pool de numéros** (fonctionnalité *Twilio Proxy* / *Programmable Voice*, payante).
3. Récupérer les identifiants : Console **dashboard** →
   - **Account SID** (`ACxxxx`)
   - **Auth Token** (masqué, cliquer « show »)
```
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_PHONE_NUMBER=+352xxxxxxxx     # le numéro acheté
TWILIO_ENABLED=true
```
### Vérifier
- Demander un code SMS de vérification de téléphone dans l'app → réception sur un vrai numéro LU/FR.

---

## 4. 🗺️ Google Maps (géocodage / carte)

1. Aller sur **https://console.cloud.google.com** → créer/choisir un **projet**.
2. **APIs & Services → Library** → activer : **Maps JavaScript API**, **Geocoding API**, **Places API** (selon usage).
3. **APIs & Services → Credentials → Create credentials → API key** → copier la clé.
4. **Restreindre la clé** (important) : *Application restrictions* → **HTTP referrers** → ajouter
   `https://krafolt.com/*` ; *API restrictions* → limiter aux APIs activées ci-dessus.
5. Activer la **facturation** sur le projet (Google Maps l'exige, avec un quota gratuit mensuel).
```
GOOGLE_MAPS_API_KEY=AIzaxxxx
# si le front l'utilise directement, prévoir aussi une variable NEXT_PUBLIC_* dédiée → rebuild frontend
```

---

## 5. 🔐 Connexion sociale (OAuth)

> Callbacks à déclarer chez chaque fournisseur : `https://krafolt.com/api/auth/<provider>/callback`.
> (Les valeurs actuelles sont factices → les boutons mènent à une page d'erreur du fournisseur.)

### 5a. Google
1. **https://console.cloud.google.com** → même projet → **APIs & Services → OAuth consent screen** :
   configurer (External, nom de l'app, domaine `krafolt.com`, email de contact).
2. **Credentials → Create credentials → OAuth client ID** → type **Web application** :
   - **Authorized redirect URIs** : `https://krafolt.com/api/auth/google/callback`
   - **Authorized JavaScript origins** : `https://krafolt.com`
3. Copier **Client ID** et **Client secret**.
```
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxx
GOOGLE_CALLBACK_URL=https://krafolt.com/api/auth/google/callback
```

### 5b. Facebook
1. **https://developers.facebook.com** → **My Apps → Create App** (type « Consumer »).
2. Ajouter le produit **Facebook Login** → Settings :
   - **Valid OAuth Redirect URIs** : `https://krafolt.com/api/auth/facebook/callback`
3. **Settings → Basic** → **App ID** + **App Secret**. Passer l'app en **Live** (toggle en haut).
```
FACEBOOK_APP_ID=xxxx
FACEBOOK_APP_SECRET=xxxx
FACEBOOK_CALLBACK_URL=https://krafolt.com/api/auth/facebook/callback
```

### 5c. Apple (Sign in with Apple)
> Nécessite un **compte Apple Developer payant** (~99 €/an).
1. **https://developer.apple.com/account** → **Certificates, Identifiers & Profiles**.
2. **Identifiers → +** → **App ID** (Bundle ID, ex `com.krafolt.app`), activer la capability **Sign in with Apple**.
3. Créer un **Services ID** (c'est le `client_id` OAuth web) → activer Sign in with Apple → configurer :
   - **Return URLs** : `https://krafolt.com/api/auth/apple/callback`
   - **Domains** : `krafolt.com`
4. **Keys → +** → créer une clé **Sign in with Apple** → télécharger le fichier **`.p8`** (une seule fois !)
   et noter le **Key ID**. Noter aussi le **Team ID** (en haut à droite du compte).
5. Déposer le `.p8` sur le serveur (hors git) et pointer `APPLE_PRIVATE_KEY_LOCATION` dessus.
```
APPLE_CLIENT_ID=com.krafolt.service        # le Services ID
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_KEY_ID=XXXXXXXXXX
APPLE_PRIVATE_KEY_LOCATION=/app/secrets/AuthKey_XXXX.p8
APPLE_CALLBACK_URL=https://krafolt.com/api/auth/apple/callback
```

### Vérifier (les 3)
- Cliquer chaque bouton social sur `/auth/login` → doit rediriger vers le fournisseur puis revenir connecté.
  (Le `redirect_uri` côté frontend est déjà corrigé pour viser `krafolt.com`.)

---

## 6. 👁️ Sentry (suivi d'erreurs)

1. Créer un compte sur **https://sentry.io** → **Create project** :
   - Plateforme **Node.js** (pour le backend) → donne un **DSN** `https://xxxx@oyyyy.ingest.sentry.io/zzzz`.
   - (Optionnel) un 2e projet **Next.js** pour le frontend.
2. Coller le DSN :
```
SENTRY_DSN=https://xxxx@oyyyy.ingest.sentry.io/zzzz
# (frontend, si activé) NEXT_PUBLIC_SENTRY_DSN=...   ← rebuild frontend
```
> ⚠️ Le service Sentry est **codé** côté backend et s'active automatiquement dès qu'un `SENTRY_DSN` est présent,
> MAIS le paquet `@sentry/node` n'est pas encore installé. Une fois que tu as le DSN, dis-moi
> « installe Sentry » et je pousse le SDK (backend) + `@sentry/nextjs` (frontend) + rebuild.

### Vérifier
- Provoquer une erreur test → elle apparaît dans le dashboard Sentry.

---

## Récapitulatif « quelle variable pour quoi »

| Intégration | Variables `.env.deploy` | Rebuild frontend ? |
|---|---|---|
| Stripe live | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` | **oui** (clé publique) |
| Email pro | `SMTP_*` (+ `EMAIL_*`) | non |
| Twilio | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_ENABLED` | non |
| Google Maps | `GOOGLE_MAPS_API_KEY` (+ `NEXT_PUBLIC_*` si front) | oui si front |
| Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | non |
| Facebook OAuth | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_CALLBACK_URL` | non |
| Apple OAuth | `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY_LOCATION`, `APPLE_CALLBACK_URL` | non |
| Sentry | `SENTRY_DSN` (+ `NEXT_PUBLIC_SENTRY_DSN`) | oui si front |

**Comment me passer une clé** : dis simplement « voici la clé Stripe live : sk_live_… » (ou colle le bloc
de variables) et je l'installe dans `.env.deploy`, je redéploie et je teste de bout en bout.
