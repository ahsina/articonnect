# Audit d'intégration UI → API — ArtiConnect

> Méthode : trace `bouton → handler → fonction API → endpoint`, puis vérification de l'endpoint
> contre les **690 routes backend réelles**. Chaque item ci-dessous a été **vérifié** (les faux
> positifs des agents d'audit ont été retirés). Le backend répond ; le problème est le câblage UI.

Légende : 🔴 DEAD (bouton sans handler / handler désactivé) · 🟠 BROKEN-API (endpoint 404 / mauvaise
méthode / mauvais chemin) · 🟡 MOCK (données en dur au lieu d'un appel réseau).

---

## 🔴 Boutons morts (cliquables, aucun effet)

| Écran | Action | Fichier:ligne | Correctif |
|---|---|---|---|
| Client · Factures | **« Payer »** (`payNow`) | `app/client/invoices/page.tsx:349` | Ajouter `onClick` → `router.push('/client/payment/'+...)` (la page paiement Stripe existe déjà). |
| Artisan · Entreprise/Rapports | **« Export Report »** | `app/artisan/company/reports/page.tsx:67` | Aucun handler. Câbler sur `GET /api/reports/company/:id/financial-summary` ou `/api/export/accounting`. |
| Artisan · Entreprise/Rapports | **« Apply »** (filtre dates) | `app/artisan/company/reports/page.tsx:90` | Aucun handler → le filtre de dates ne fait rien. |
| Artisan · Entreprise/Affectations | **« Affecter »** mission→employé | `app/artisan/company/assignments/page.tsx:73` | `handleAssign` ne fait qu'un toast (« would need a backend endpoint »). **L'endpoint EXISTE** : `POST /api/missions/assignment/:missionId/assign-to-employee`. |
| Artisan · Planning employé | **« Add Shift »** | `app/artisan/company/employees/[id]/shifts/page.tsx:96` | Appel `employeeApi.createShift()` **commenté**. Endpoint existe : `POST /api/employee-features/shifts?companyId=…`. |

## 🟠 Endpoints cassés (404 / mauvaise méthode / mauvais chemin)

| Écran | Action | Appel actuel (faux) | Endpoint réel (correctif) |
|---|---|---|---|
| Artisan · Mission détail | **« Refuser la mission »** | `POST /missions/:id/decline` *(absent)* | Utiliser `PUT /api/missions/:id/status` avec `{status:'CANCELLED'}` (ou ajouter la route backend). `missions/[id]/page.tsx:182` |
| Artisan · Mission détail | Timeline | `GET /missions/:id/timeline` *(absent)* | Pas de route timeline → la timeline est toujours vide. Utiliser `GET /api/missions/:id/tracking`. `missions/[id]/page.tsx:131` |
| Admin · Utilisateurs | **« Suspendre »** | `POST /admin/users/:id/suspend` | Mauvaise **méthode** : c'est `PUT /api/admin/users/:id/suspend`. `lib/api/admin.ts:1070` |
| Admin · Utilisateurs | **« Réactiver »** | `POST /admin/users/:id/unsuspend` *(absent)* | Endpoint = `PUT /api/admin/users/:id/activate`. `lib/api/admin.ts:1074` |
| Admin · Réputation | Charger réputation user | `GET /reputation/:userId` *(absent)* | Chemin correct = `GET /api/reputation/user/:userId`. |
| Admin · Missions | Stats missions | `GET /admin/missions/stats` *(absent)* | Aucune route. Utiliser `/api/admin/dashboard` / `/api/admin/analytics/metrics`. |
| Artisan · Réglages | **Vérifier le téléphone** | `POST /api/auth/phone/verify` *(absent)* | Endpoint = `POST /api/auth/phone/verify-code`. `settings/page.tsx:114` |

## 🟡 Données en dur (mock au lieu d'API)

| Écran | Détail | Fichier:ligne |
|---|---|---|
| Artisan · Dashboard | Note `rating: 4.8` codée en dur | `app/artisan/dashboard/page.tsx:91` |
| Artisan · Pointage | `getTimeEntries()` **commenté** → données fictives | `app/artisan/time-tracking/page.tsx:71` |
| Artisan · Analytics | Fallback silencieux sur données de démo si l'API échoue | `app/artisan/analytics/page.tsx` |
| Admin · Cron | Boutons « Cleanup » / « Generate Reports » désactivés (Coming Soon) | `app/admin/admin/cron/page.tsx` |

---

## Faux positifs écartés (signalés par l'audit, mais OK en réalité)
- Client · Litiges « Annuler » → `POST /disputes/:id/cancel` **existe**. ✅
- Artisan · Produits → les boutons (ajouter/éditer/activer/supprimer) **ont bien des handlers**. ✅
- Admin · Monitoring → `/admin/monitoring/metrics/overview` **existe**. ✅

## Synthèse
- **~16 actions réellement cassées** confirmées (5 boutons morts, 7 endpoints faux, 4 mocks).
- 3 d'entre elles ont un **endpoint backend déjà disponible** (affectation employé, add shift, decline via status) → simple recâblage.
- Les autres nécessitent soit une correction de chemin/méthode côté `lib/api`, soit l'ajout d'une route backend (decline, admin/missions/stats).
- Priorité utilisateur : **Payer une facture** (client) et **Suspendre/Réactiver un user** (admin) sont les plus visibles.
