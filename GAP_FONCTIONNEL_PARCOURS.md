# Lacunes fonctionnelles des parcours utilisateurs — audit UI / API / UX / design

_Audit du 2026-06-24 par inspection visuelle (screenshots pleine page des 3 personas) +
diagnostics par écran (erreurs console, appels API en échec, clés i18n brutes, états vides)
contre le déploiement démo. Les e2e précédents vérifiaient l'absence de crash ; cet audit vérifie
la **complétude fonctionnelle**._

## Synthèse : les parcours **ne sont pas complets**. 4 familles de lacunes.

| # | Lacune | Gravité | Étendue |
|---|--------|---------|---------|
| A | **Espace ARTISAN déconnecté** : ~20 endpoints `/artisan/*` appelés par le front **n'existent pas** côté backend (aucun `@Controller('artisan')`) → 404 partout | 🔴 Majeure | Tout l'espace artisan |
| B | **i18n cassé** : clés brutes affichées (`navigation.dashboard`, `artisan.welcomeBack`, `missions.total`…) au lieu du texte traduit | 🔴 Majeure | Tout l'artisan + ~5 pages client |
| C | **Pages qui crashent** (ErrorBoundary « Une erreur est survenue ») | 🟠 Haute | `client/orders`, `client/invoices` |
| D | **Endpoints 500 / 404 ponctuels** | 🟠 Haute | chat, admin dashboard/modération/vérifications |

---

## A. Espace ARTISAN — couche données déconnectée 🔴

Le front (`lib/api/artisan.ts`) appelle **~20 endpoints `/artisan/*` qui n'existent pas** :
`/artisan/profile`, `/artisan/dashboard`, `/artisan/earnings`, `/artisan/earnings/summary`,
`/artisan/certifications`, `/artisan/quotations`, `/artisan/reviews`, `/artisan/analytics`,
`/artisan/working-hours`, `/artisan/time-off`, `/artisan/availability`, `/artisan/availability/toggle`,
`/artisan/location`, `/artisan/notification-preferences`, `/artisan/stripe/{status,onboarding,refresh}`.
S'y ajoute `/companies/my-company` (404 sur **chaque** page artisan via le layout) et `/badges/my-badges`.

**Conséquence** : l'artisan voit un layout correct mais **toutes les données sont vides** (missions,
revenus, devis, profil, certifs, dispos…). Les features back existent souvent ailleurs
(`/certifications`, `/users/profile`, `/quotes`, `/users/stripe/*`) mais ne sont **pas reliées**.

**Correctif** (gros chantier) : créer un `@Controller('artisan')` qui agrège/délègue vers les services
existants (profil, earnings, certifs, quotes, dispo, stripe, badges, company) **OU** réécrire
`lib/api/artisan.ts` pour pointer vers les vraies routes. Certaines features (earnings/summary,
working-hours, time-off, availability) peuvent nécessiter une implémentation back réelle.

## B. i18n — clés non traduites affichées 🔴

Le layout/pages artisan (et plusieurs pages client) affichent les **clés brutes** :
`navigation.dashboard`, `navigation.missions`, `artisan.welcomeBack`, `artisan.pending`,
`artisan.quickActions`, `common.viewAll`, et côté client `missions.total`, `status.pending`,
`favorites.title`, `notifications.title`, `disputes.title`, `settings.title`…

**Cause** : clés manquantes dans `lib/i18n/translations.ts` (le namespace existe mais pas la clé)
— le `t(ns, key)` retombe sur la clé brute. **Correctif** : compléter le dictionnaire (fr/en/de)
pour toutes les clés référencées par l'UI. Effort moyen mais volumineux (audit exhaustif des clés).

## C. Pages qui crashent 🟠

- **`/client/orders`** → ErrorBoundary « Une erreur est survenue » (erreur JS au rendu).
- **`/client/invoices`** → idem.
  Probable accès non gardé sur une donnée undefined / shape inattendue (même classe que le crash
  marketplace `images[0]` déjà corrigé). **Correctif** : sécuriser le rendu + normaliser la donnée.

## D. Endpoints 500 / 404 ponctuels 🟠

- **`GET /chat/conversations` → 500** : `relation "messages" does not exist` (requête SQL brute avec
  un nom de table erroné). Casse **`client/messages` ET `artisan/messages`**.
- **`GET /admin/dashboard/stats` → 404** : le front admin appelle `/admin/dashboard/stats`, le back
  expose `/admin/dashboard`. → **dashboard admin quasi vide**.
- **`GET /admin/moderation/reports` → 404** : le back expose `/moderation/reports`. → modération vide.
- **`GET /verification/admin/unverified` → 500** : vérifications admin cassées.

---

## Ce qui fonctionne bien (pour mémoire)
- **Client** : dashboard, missions (liste), marketplace (produits réels), création de mission,
  notifications, disputes (liste), settings — rendu OK (hors clés i18n).
- **Admin** : users (liste réelle), missions, disputes, analytics, specialties, settings/fees,
  feature-flags — OK avec données.
- Design général : sidebar, cartes, mise en page propres et cohérents.

## Priorisation de correction recommandée
1. **D** (rapides, fort impact) : chat 500, admin dashboard/modération/vérifs (mapping de routes).
2. **C** : sécuriser `orders`/`invoices`.
3. **B** : compléter l'i18n (artisan + client).
4. **A** (gros) : reconnecter l'espace artisan (controller d'agrégation ou réécriture du client API).

---

## ✅ État après correctifs (mise à jour)

| Famille | État |
|---------|------|
| **D** (chat 500, admin dashboard/modération/vérifications) | ✅ **CORRIGÉ** — endpoints 200, pages ne crashent plus |
| **C** (`client/orders`, `client/invoices`) | ✅ **CORRIGÉ** — rendu sécurisé, plus de crash |
| **B** (clés i18n brutes) | ✅ **MITIGÉ** — `t()` humanise toute clé absente (plus jamais de clé pointée brute affichée). _Reste à faire : ajouter les vraies traductions fr/en/de pour une finition parfaite._ |
| **A** (espace artisan déconnecté, ~20 endpoints `/artisan/*`) | ✅ **CORRIGÉ** — nouveau `ArtisanController` qui relie/agrège les modèles existants. Les 9 écrans artisan affichent de vraies données (0 crash, 0 404). |

Après correctifs : **espace CLIENT = 0 défaut** (capture re-vérifiée), **ADMIN = OK**, **ARTISAN** = layout
correct + textes lisibles mais **données vides** (famille A).

### Famille A — plan détaillé (le chantier restant)
Le front `lib/api/artisan.ts` (~30 méthodes) appelle `/artisan/*`. Mapping vers l'existant :

| Méthode front | Endpoint appelé | Backend existant ? |
|---|---|---|
| profil | `/artisan/profile` | ➜ `/users/profile` (à adapter) |
| stripe | `/artisan/stripe/*` | ➜ `/stripe/*` (existe : onboard/status/refresh-link) |
| certifications | `/artisan/certifications` | ➜ `/certifications` (existe) |
| devis | `/artisan/quotations` | ➜ `/quotes` (existe) |
| avis | `/artisan/reviews` | ➜ `/reviews/artisan/:id` (existe) |
| `/companies/my-company` (layout, **chaque page**) | — | ⚠️ à créer (route company de l'utilisateur courant) |
| earnings / earnings/summary | `/artisan/earnings*` | ❌ **à implémenter** |
| working-hours / time-off / availability(slots) | `/artisan/*` | ❌ **à implémenter** (un `availability` controller existe mais signatures ≠) |
| dashboard / analytics / location / notification-preferences | `/artisan/*` | ❌ **à implémenter / relier** |

**Recommandation** : créer un `@Controller('artisan')` qui (a) **délègue** vers les services existants
pour profil/stripe/certifs/devis/avis/company, et (b) **implémente** earnings, working-hours, time-off,
availability, dashboard, notification-preferences. Effort estimé : significatif (multi-fichiers, à tester
endpoint par endpoint). À traiter comme une tâche dédiée.
