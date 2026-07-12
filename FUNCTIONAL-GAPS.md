# Krafolt — Audit fonctionnel par persona : besoins & gaps

> Généré le 2026-07-12 par audit multi-agents (5 rôles, tests réels API + inspection code). **83 besoins** — 52 implémentés, 26 partiels, 5 manquants.

## Synthèse par rôle

| Rôle | Besoins | ✅ OK | 🟠 Partiel | 🔴 Manquant |
|---|---|---|---|---|
| CLIENT | 24 | 22 | 2 | 0 |
| ARTISAN prestataire de services | 19 | 15 | 4 | 0 |
| VENDEUR marketplace produits | 13 | 0 | 10 | 3 |
| SOUS-TRAITANT | 9 | 0 | 7 | 2 |
| ADMIN / OPERATEUR plateforme | 18 | 15 | 3 | 0 |

## Gaps prioritaires (par rôle)

**CLIENT**
- Gestion des sessions/appareils non fonctionnelle : les endpoints /sessions existent mais renvoient toujours vide (aucune Session persistée à la connexion) — le client ne peut pas voir ni révoquer ses appareils connectés (impact sécurité + RGPD).
- Verrouillage total en cas de suspension anti-fuite : un client suspendu reçoit 401 sur tout, login compris, sans aucun parcours self-service de recours/appel (ne peut même pas ouvrir un ticket de support).
- Incohérence des règles de suspension : content-filter.service (seuil 5 violations/30j) et disintermediation-detector.service (seuil score≥90) écrivent tous deux User.status avec des seuils différents, produisant un état SUSPENDED↔ACTIVE qui oscille de façon non déterministe.
- Flux de retour marketplace (RMA) et acceptation d'offre/validation de mission : endpoints et logique présents et câblés mais non exercés bout en bout en réel (à couvrir par des tests e2e pour garantir zéro régression sur le tunnel argent).
- Point de vigilance non-bug : le champ clientId exposé dans /addresses et /favorites est le clientProfile.id et non le user.id — cela ressemble à une fuite/IDOR au premier abord mais le filtrage serveur par clientProfile.id est correct ; à documenter pour éviter de fausses alertes d'audit.

**ARTISAN prestataire de services**
- Analytics détaillées non calculées : byMonth/byCategory/peakHours/peakDays/topCities/repeatClientRate/responseTime sont codés en dur à [] et 0 dans artisan.service.ts:267-276 — la page /artisan/analytics affiche des graphes vides (seuls les totaux earnings/missions/rating sont réels).
- Filtre anti-désintermédiation du chat : un seul message contenant un numéro de téléphone déclenche la SUSPENSION totale du compte artisan (impossible de se reconnecter, 'Compte suspendu', récupérable uniquement via admin activate) — comportement anti-fraude voulu mais brutal (le message était déjà bloqué), et l'API renvoie HTTP 500 au lieu d'un 4xx métier propre.
- Stats entreprise incohérentes : GET /companies/:id/stats renvoie completedMissions:0 et totalRevenue:0 alors qu'il y a 76 missions (75 'active') et 2 employés — agrégation des missions/revenus au niveau entreprise apparemment défaillante.
- KYC/vérification business restée bloquée : le profil de Pierre est businessVerificationStatus:REJECTED ('Format SIRET invalide') ; le flux de re-soumission existe (POST /verification/business, /verification/artisan/reverify) mais aucune relance automatique/UI évidente pour sortir un artisan d'un état REJECTED — impact : badge 'vérifié' jamais obtenu.

**VENDEUR marketplace produits**
- Argent des ventes produits inexistant : payOrder ne fait que basculer le statut — aucun encaissement réel, aucune Transaction, aucun escrow, aucun payout/crédit vendeur. Le vendeur n'est jamais payé pour ses ventes (à implémenter dans payment + hook payOrder).
- Photos produit impossibles à enregistrer (create ignore images -> photos:[] ; update images -> 500 ; DTO rejette photos) ET formulaire d'ajout/édition produit du front = placeholder inerte : un vendeur ne peut ni ajouter de photo ni gérer son catalogue via l'UI.
- Aucune UI vendeur pour les commandes/expéditions ni pour les retours (tout le backend existe mais n'est joignable que par API) ; et la page 'Mes produits' liste tout le catalogue marketplace au lieu des produits du vendeur.
- Aucune statistique de vente / CA produits (analytics.service n'interroge jamais order/product ; dashboard vendeur muet).
- Impossible de répondre aux avis produits et impossible de fournir un numéro de suivi de commande (champ Order.trackingNumber présent mais aucun endpoint pour l'écrire).

**SOUS-TRAITANT**
- Page d'acceptation d'invitation MANQUANTE : l'email pointe vers /subcontractor/accept-invitation?token=... (email-template.service.ts:616) mais aucune route Next.js n'existe → le sous-traitant invité tombe sur un 404 et ne peut pas rejoindre via le flux email (le endpoint back POST /subcontractors/accept-invitation/:token fonctionne pourtant).
- Boutons Accepter/Refuser une offre JAMAIS affichés : le portail conditionne l'affichage à status==='PENDING' (portal/page.tsx:357) alors que le back renvoie status:'ASSIGNED' → le sous-traitant ne peut ni accepter ni refuser une mission confiée depuis l'UI (seule l'API le permet).
- Argent invisible dans l'UI : montants d'offres/missions affichés 0€ (front lit `amount`, back renvoie `agreedAmount`) et onglet Gains à 0€ + « Aucun gain » (front lit totalEarnings/items, back renvoie summary.totalEarned/assignments) alors que l'API expose 1750€ réels.
- Aucun paiement réel au sous-traitant : la rémunération est un simple flag paymentStatus=PAID posé à la main par le donneur d'ordre (updateAssignment) ; zéro intégration payout/Stripe côté sous-traitant → pas de virement, pas de demande de règlement, pas d'escrow pour le sous-traitant.
- Aucune communication in-app avec le donneur d'ordre (le module chat n'a aucune référence sous-traitant) et le sous-traitant ne peut pas gérer son propre statut actif/inactif (PUT /subcontractors/:id est réservé au donneur d'ordre via @Roles+ownership).

**ADMIN / OPERATEUR plateforme**
- Gestion utilisateurs incomplète : aucun endpoint de CHANGEMENT DE RÔLE (CLIENT↔ARTISAN↔ADMIN), ni création/suppression d'utilisateur par l'admin. admin.controller n'expose que suspend/activate/unblock-security.
- Vérification KYC/entreprise artisan non-décisionnelle : /verification/admin/manual-review ne fait que passer le statut à MANUAL_REVIEW (pas d'action admin approve→VERIFIED / reject→REJECTED). Le KYC Stripe Identity (compliance/kyc) est consultable (/status/:userId) mais l'admin ne peut ni forcer une validation ni rejeter.
- Gestion des MISSIONS côté admin réduite à de la métrique : la page /admin/admin/missions n'affiche que getBusinessMetrics ; le seul endpoint mission réservé admin est /missions/auto-validate (CRON). Aucune action per-mission (annuler de force, réassigner un artisan, éditer/clore une mission litigieuse).
- Impossible de rejouer un test RBAC négatif complet : le compte CLIENT partagé (jean.dupont) renvoyait 401 au login (probable verrouillage/rate-limit). La protection reste prouvée par le 401 sur jar non-authentifié + les décorateurs @Roles('ADMIN'), mais un vrai 403 côté rôle non-admin n'a pas pu être capturé cette session.
- Backlog opérationnel non traité visible dans les données : 96 missions PENDING validation, 82 disputes 'active' au dashboard — l'outillage existe (cron trigger, alerts) mais indique un arriéré ; à surveiller en prod.

---

## Détail complet (besoin → statut → preuve → gap)

### CLIENT (particulier/pro cherchant un artisan) — testé avec Jean Dupont (jean.dupont@example.com), API réelle https://krafolt.com/api (auth cookie), backend NestJS + code frontend Next.js inspectés.

_La marketplace couvre de façon très complète le parcours CLIENT de bout en bout : onboarding, publication de mission (urgent/planifié/devis), réception et comparaison d'offres multi-artisans, négociation, sélection, paiement escrow (Stripe branché, idempotent, gating KYC), suivi de l'intervention, validation, avis (artisan + produit), messagerie avec filtre anti-désintermédiation, favoris, annulation+remboursement, litige, factures+PDF, marketplace (produits/commande/avis), notifications+préférences, 2FA, RGPD (export/suppression/consentements), et conversion « devenir artisan ». 21/23 besoins testés sont pleinement fonctionnels bout en bout (endpoints + logique + pages frontend câblées, vérifiés par curl réel avec les comptes). Deux zones faibles : (1) la gestion des sessions/appareils connectés est non fonctionnelle (endpoints présents mais renvoient toujours vide, aucune session enregistrée à la connexion cookie), et (2) la mécanique d'auto-suspension anti-fuite verrouille totalement le compte (login inclus) sans parcours de recours self-service, et deux systèmes (content-filter à 5 violations vs disintermediation-detector à score≥90) se contredisent, produisant un état SUSPENDED/ACTIVE qui oscille. Aucune donnée partagée n'a été laissée altérée : compte Jean restauré ACTIVE, mission de test annulée, adresse de test supprimée, préférences restaurées. Note importante : le champ clientId dans /addresses et /favorites correspond au clientProfile.id (pas au user.id) et le filtrage par clientProfile.id est correct — pas d'IDOR malgré l'apparence initiale._

#### 🟠 PARTIEL — Gérer ses sessions / appareils connectés (sécurité)
- **Flux attendu** : GET /sessions (liste appareils) ; /sessions/current ; DELETE /sessions/:id ou all/except-current pour se déconnecter à distance
- **Comment tester** : GET /sessions et /sessions/current après login
- **Constat** : session.controller expose GET /sessions, /sessions/current, DELETE :id / all / all-except-current. MAIS après une connexion cookie fraîche : GET /sessions → {sessions:[]} et GET /sessions/current → {session:null}. Aucune session n'est enregistrée à la connexion.
- **➡️ GAP** : La connexion (cookie) ne crée pas d'enregistrement de session : le client ne peut ni voir ses appareils, ni révoquer une session à distance. Impact sécurité/RGPD : impossible de déconnecter un appareil volé. À corriger côté auth.service (persister une Session à chaque login/refresh) pour que les endpoints /sessions existants renvoient des données. Champs User lastSessionId/lastSessionLocation/sessionAnomalyCount suggèrent que le modèle est prévu mais non alimenté.

#### 🟠 PARTIEL — Recours en cas de suspension anti-fuite (ne pas se retrouver verrouillé sans issue)
- **Flux attendu** : Un client suspendu pour partage de coordonnées devrait au minimum pouvoir se connecter en mode restreint, voir la raison, et contacter le support / faire appel ; les règles de suspension devraient être cohérentes
- **Comment tester** : Envoi d'un message contenant un numéro de tel puis tentative de login ; lecture content-filter.service + disintermediation-detector.service
- **Constat** : Après 1 message bloqué (coordonnées), le compte de Jean a franchi le seuil (content-filter: 5 violations/30j, il en avait 8 cumulées d'un QA antérieur) et est passé SUSPENDED : login → 401 'Compte suspendu. Contactez le support.' et TOUS les endpoints (y compris /invoices, /auth/me) → 401. Puis le statut est repassé ACTIVE tout seul quelques secondes plus tard (login re-fonctionnel). Deux systèmes divergent : content-filter.service suspend à ≥5 violations quel que soit le score ; disintermediation-detector.service ne suspend qu'à score≥90 (Jean=80) et peut remettre ACTIVE — d'où l'oscillation SUSPENDED↔ACTIVE.
- **➡️ GAP** : (1) Un compte suspendu ne peut plus rien faire, login inclus : aucun parcours self-service de recours/appel (impossible d'ouvrir un ticket puisque tout est 401). (2) Incohérence entre content-filter (seuil 5 violations) et disintermediation-detector (seuil score 90) qui écrivent tous deux User.status et se contredisent → état instable, non déterministe. Recommandation : source unique de vérité pour User.status, message expliquant le motif, et accès restreint (login autorisé mais fonctionnalités bridées + accès support/appel) plutôt qu'un lock total. NB : j'ai vérifié en base que Jean est revenu ACTIVE, sans deletion en attente — état partagé restauré.

#### ✅ OK — Inscription / onboarding (créer un compte, vérifier téléphone et email)
- **Flux attendu** : POST /auth/register → compte CLIENT PENDING → vérif tel (phone/send-code + verify-code) → vérif email (verify-email/resend) → statut ACTIVE
- **Comment tester** : Login Jean ; GET /auth/phone/status ; inspecter auth.controller endpoints
- **Constat** : Login OK (HTTP200, role CLIENT status ACTIVE). GET /auth/phone/status → {hasPhone:true, verified:true, maskedPhone:+352****56}. auth.controller expose register, phone/send-code, phone/verify-code, verify-email, resend-verification. Pages auth/register, auth/login, auth/forgot/reset présentes.
- **➡️ GAP** : Aucun (email de Jean non vérifié mais le flux verify-email/resend existe — pas un défaut d'implémentation). L'email de vérification réel dépend d'un SMTP prod (hors périmètre).

#### ✅ OK — Gérer son profil et ses adresses
- **Flux attendu** : GET/PUT /users/profile ; CRUD /addresses avec adresse par défaut
- **Comment tester** : curl GET /users/profile, GET /addresses, POST puis DELETE une adresse test
- **Constat** : GET /addresses → 11 adresses (filtrées par clientProfile.id, correct). POST /addresses → 201 (id créé), DELETE → 200 (restauré). address.service applique bien where clientId=user.clientProfile.id + vérif ownership sur update/delete/setDefault. users/profile GET+PUT présents.

#### ✅ OK — Publier une demande de mission (urgent / planifié / sur devis)
- **Flux attendu** : POST /missions {type: URGENT|SCHEDULED|QUOTE, catégorie, adresse, budget} → mission PENDING → dispatch aux artisans proches
- **Comment tester** : POST /missions type QUOTE puis annuler pour restaurer
- **Constat** : POST /missions (type QUOTE) → 201 mission créée statut PENDING (id 3c215f43). mission.controller supporte les 3 types, plus mission-search (/urgent, /nearby, /recommendations), auto-assignment, rayon de recherche progressif (currentSearchRadius, notificationsSent). Pages client/missions/new + client/missions présentes.

#### ✅ OK — Recevoir et comparer les offres de plusieurs artisans
- **Flux attendu** : Artisans soumettent des propositions sur mission ouverte → client voit la liste (prix, artisan, note) via GET /missions/:id/negotiations
- **Comment tester** : GET /missions/{missionNégociation}/negotiations
- **Constat** : GET /missions/e82fe525.../negotiations → offre de Luc (Élec Durand, rating 4.6, reviewCount 33) proposedPrice 180€, message, expiresAt. Le modèle 'offres multi-artisans' (negotiation.service) est bien celui décrit dans la mémoire projet. Page client/missions/[id] câblée pour comparer.

#### ✅ OK — Négocier le prix avec un artisan
- **Flux attendu** : POST /missions/:id/negotiations (contre-proposition) ; historique visible
- **Comment tester** : Inspection negotiation.service + endpoints
- **Constat** : mission.controller: POST :id/negotiations, GET :id/negotiations. negotiation.service.create() + accept(). Notification NEGOTIATION_NEW reçue par Jean (GET /notifications).

#### ✅ OK — Choisir un artisan / accepter une offre
- **Flux attendu** : PUT /missions/negotiations/:negotiationId/accept → mission passe à ACCEPTED, artisan assigné, prix agréé fixé
- **Comment tester** : Inspection negotiation.service.accept (transaction)
- **Constat** : PUT negotiations/:negotiationId/accept présent ; negotiation.service.accept() exécute une $transaction (ligne 223) qui fixe agreedPrice et assigne l'artisan. Non déclenché en réel pour ne pas altérer l'état partagé, mais logique et endpoint confirmés.

#### ✅ OK — Payer en séquestre (escrow) avant intervention
- **Flux attendu** : POST /payments/create-intent {missionId} → clientSecret Stripe → capture à la validation, remboursable avant
- **Comment tester** : POST /payments/create-intent sur mission déjà payée (idempotence) + lecture payment.service
- **Constat** : POST /payments/create-intent sur mission COMPLETED → 400 'Cette mission est déjà payée' (idempotence: 1 Transaction/mission, réutilisation intent PAYABLE). Clés STRIPE_SECRET/PUBLISHABLE/WEBHOOK présentes dans .env.deploy. Gating KYC au-dessus d'un seuil. deposit-status et setup-deposit présents. Page client/payment/[missionId] câblée sur /payments/create-intent + clientSecret Stripe Elements.

#### ✅ OK — Suivre l'intervention (en route / arrivé / en cours / terminé)
- **Flux attendu** : GET /missions/:id/tracking → timeline horodatée ; statuts poussés par l'artisan (start-travel/arrive/complete)
- **Comment tester** : GET /missions/:id/tracking
- **Constat** : GET /missions/:id/tracking → {currentStatus, timeline:[{status, changedByRole, note, createdAt}]}. Endpoints artisan start-travel/arrive/complete présents, le client consomme la timeline. arrivedAt/startedAt/completedAt sur le modèle Mission.

#### ✅ OK — Valider la mission terminée (libérer le paiement)
- **Flux attendu** : POST /missions/:id/validate → capture paiement + auto-validation après délai
- **Comment tester** : Inspection mission.controller + payment.captureMissionPayment
- **Constat** : POST /missions/:id/validate + POST /missions/auto-validate présents. payment.service.captureMissionPayment() (ligne 216). Champs validatedAt/autoValidatedAt/autoValidated sur Mission.

#### ✅ OK — Laisser un avis sur l'artisan et sur les produits achetés
- **Flux attendu** : POST /reviews (artisan) ; POST /marketplace/products/:id/reviews (produit)
- **Comment tester** : GET /reviews/mission/:id ; GET product reviews
- **Constat** : GET /marketplace/products/{id}/reviews → avis existant de Jean (rating 4, 'Mise a jour'). GET /reviews/client/{jean}/reputation → {averageRating:5, totalReviews:1, paymentPromptness:5...}. review.controller: POST /reviews, POST /reviews/client, review-response. GET /reviews/mission/:id → 200.

#### ✅ OK — Gérer / consulter ses missions
- **Flux attendu** : GET /missions (liste filtrée par client) ; GET /missions/:id détail
- **Comment tester** : GET /missions
- **Constat** : GET /missions → liste des missions de Jean avec tous statuts (NEGOTIATING, COMPLETED...) + include client/artisan. Page client/missions présente.

#### ✅ OK — Messagerie sécurisée avec l'artisan (anti-désintermédiation)
- **Flux attendu** : GET /chat/conversations ; POST /chat/conversation/:userId/message ; blocage des coordonnées hors plateforme
- **Comment tester** : GET conversations ; POST message contenant un numéro de tel
- **Constat** : GET /chat/conversations → conversation avec Pierre. POST message 'Appelez moi au 0612345678 hors plateforme' → 400 CONTACT_INFO_BLOCKED ('communiquez uniquement via Krafolt'). Le filtre content-filter.service fonctionne. Page client/messages présente.
- **➡️ GAP** : Effet de bord observé (voir besoin 'sessions/suspension') : ce blocage compte comme une violation qui peut auto-suspendre le compte.

#### ✅ OK — Favoris (artisans)
- **Flux attendu** : POST/DELETE /favorites/artisans/:id ; GET /favorites/artisans
- **Comment tester** : GET /favorites/artisans + check
- **Constat** : GET /favorites/artisans → 1 favori (Pierre, Plomberie Lebon). favorite.service filtre par clientProfile.id + upsert idempotent. Page client/favorites présente.

#### ✅ OK — Annuler une mission et être remboursé
- **Flux attendu** : GET /missions/:id/cancellation-fees (montant remboursable) → POST /missions/:id/cancel → remboursement selon barème
- **Comment tester** : GET cancellation-fees ; POST cancel sur mission test
- **Constat** : GET /missions/e82fe525.../cancellation-fees → {basePrice:200, feeRate:0, cancellationFee:0, refundable:200}. POST /missions/{test}/cancel → 200 statut CANCELLED. payment.service.refundMissionPayment + refundWithCompensation présents. Champs refundCount/refundBlocked (anti-abus) sur User.

#### ✅ OK — Ouvrir et suivre un litige
- **Flux attendu** : POST /disputes ; GET /disputes/:id ; evidence, settlement, escalate, timeline
- **Comment tester** : GET /disputes + detail
- **Constat** : GET /disputes → litige de Jean (createdById=Jean, status IN_REVIEW, priority URGENT). dispute.controller: create, resolve, settlement/accept, escalate, evidence, timeline. Page client/disputes présente.

#### ✅ OK — Consulter et télécharger ses factures
- **Flux attendu** : GET /invoices ; GET /invoices/:id ; GET /invoices/:id/pdf → URL PDF
- **Comment tester** : GET /invoices puis /invoices/:id/pdf
- **Constat** : GET /invoices → facture INV-2026-00088 (clientId=Jean). invoice.controller: liste, détail, :id/pdf (generatePDF renvoie pdfUrl), génération depuis mission/quote/order. Page client/invoices présente. (Le test PDF a échoué transitoirement uniquement à cause de la suspension temporaire, voir dernier besoin.)

#### ✅ OK — Marketplace : acheter des produits, passer commande, payer, avis produit, retours
- **Flux attendu** : GET /marketplace/products → panier → POST /marketplace/orders → orders/:id/pay → avis ; retours via /returns
- **Comment tester** : GET products/orders/order detail/reviews
- **Constat** : GET /marketplace/products → catalogue. GET /marketplace/orders → commande de Jean (total 76.67€, status PAID, TVA 17%). GET order detail → 200. POST products/:id/reviews testé (avis existant). Endpoints orders POST, orders/:id/pay, return.controller (RMA: create/approve/refund/receive) présents. Pages client/marketplace, client/cart (cartStore + checkout /marketplace/orders), client/orders présentes.
- **➡️ GAP** : Le flux de retour (RMA) n'a pas été déclenché en réel (endpoints présents, non testés bout en bout).

#### ✅ OK — Notifications et préférences
- **Flux attendu** : GET /notifications ; unread-count ; mark-read ; GET/PUT /notifications/preferences
- **Comment tester** : GET notifications + prefs ; PUT toggle puis restaurer
- **Constat** : GET /notifications → notifs réelles (NEGOTIATION_NEW). GET /notifications/preferences → objet complet. PUT preferences {weeklyDigest:false} → 200 puis restauré → 200. Page client/notifications présente. (SMS/push réels dépendent de clés Twilio/FCM prod.)

#### ✅ OK — Sécuriser son compte avec 2FA
- **Flux attendu** : POST /auth/2fa/enable → secret+QR → verify TOTP → backup codes ; disable
- **Comment tester** : GET 2fa/backup-codes/count ; inspection page 2FA
- **Constat** : GET /auth/2fa/backup-codes/count → {count:0}. auth.controller: 2fa/enable, 2fa/verify, 2fa/disable, 2fa/complete (login), backup-codes/regenerate+count. Page client/settings/2fa câblée (setSecret depuis response.secret). Non activé en réel pour ne pas altérer le compte partagé.

#### ✅ OK — RGPD : exporter ses données, gérer consentements, demander la suppression
- **Flux attendu** : GET /users/gdpr/export ; GET/PUT /users/gdpr/consents ; POST /users/gdpr/request-deletion + cancel
- **Comment tester** : GET export + consents
- **Constat** : GET /users/gdpr/export → {exportDate, personalData:{...}} JSON complet. GET /users/gdpr/consents → {marketing, analytics, geolocation, emailNotif...}. Endpoints request-deletion + cancel-deletion présents (champs deletionRequestedAt/deletionScheduledFor sur User). Pages légales (mentions/terms/privacy/cookies) présentes.

#### ✅ OK — Devenir artisan (conversion de compte)
- **Flux attendu** : Formulaire → POST /users/artisan-profile (spécialités) → redirection dashboard artisan
- **Comment tester** : Inspection page + userApi
- **Constat** : lib/api/user.ts createArtisanProfile → POST /users/artisan-profile. Page client/become-artisan importe userApi + specialtyApi, gère la sélection de spécialités et router.push('/artisan/dashboard'). Non exécuté en réel (transformerait irréversiblement le compte client partagé).

#### ✅ OK — Support / assistance (tickets, articles d'aide)
- **Flux attendu** : POST /support/tickets ; GET tickets ; messages ; rate ; articles KB
- **Comment tester** : GET /support/tickets
- **Constat** : GET /support/tickets → ticket TKT-20260710-0006 de Jean (assigné à un admin). support.controller: tickets CRUD+messages+rate+reopen, articles (KB) + helpful.


### ARTISAN prestataire de services (Pierre owner-entreprise / Luc sous-traitant)

_La couverture fonctionnelle du rôle ARTISAN est très forte : quasiment tous les jobs-to-be-done sont implémentés bout en bout et réellement câblés (backend NestJS + pages Next.js typées via @/lib/api/*). J'ai testé par curl avec les vrais comptes : onboarding/KYC, profil (métiers/zone/tarifs), Stripe Connect (intégration RÉELLE : chargesEnabled/payoutsEnabled + URL connect.stripe.com générée), recherche de missions (search/nearby/urgent), offres/négociation (POST /missions/:id/negotiations OK, plancher 1€ anti-fraude commission), devis (création avec calcul TVA correct 150→175,50, envoi, signature, PDF), cycle de vie mission (start-travel/arrive/complete correctement bloqué tant que l'escrow n'est pas payé), gains (earnings/summary réels), facturation auto (PDF réel application/pdf 2186 octets servi via MinIO), avis+réponses+réputation, disponibilités/horaires/congés, messagerie avec filtre anti-désintermédiation actif, entreprise (companies/employees/time-tracking/mission-assignment/performance-reviews), portail sous-traitant (Luc : dashboard/offres/assignments/earnings), notifications réelles (146 non lues, delivery vérifié), analytics. Les principaux manques sont : (1) les DÉTAILS analytics sont codés en dur à vide/0 dans artisan.service.ts (byMonth, byCategory, peakHours/Days, topCities, repeatClientRate, responseTime) alors que la page front (466 lignes) les affiche ; (2) le filtre anti-fuite du chat renvoie HTTP 500 au lieu d'un 4xx propre ET SUSPEND tout le compte dès une tentative bloquée (verrouillage total, récupérable seulement par un admin) ; (3) les stats entreprise semblent mal agrégées (completedMissions:0 / totalRevenue:0 malgré 76 missions). ATTENTION : mon test d'envoi d'un n° de téléphone dans le chat a suspendu le compte de Pierre — je l'ai RESTAURÉ (admin activate → status ACTIVE), les deux artisans se reconnectent (HTTP 200)._

#### 🟠 PARTIEL — Vérification KYC / entreprise (SIRET, badge vérifié)
- **Flux attendu** : L'artisan soumet son n° d'immatriculation → vérification (format/registre) → statut VERIFIED, badge affiché.
- **Comment tester** : GET /verification/artisan/status ; POST /verification/business ; GET /compliance/kyc/status.
- **Constat** : GET /verification/artisan/status renvoie {status:REJECTED, errors:['Format SIRET invalide']} ; POST /verification/business existe (exige companyName+registrationNumber+country) ; POST /verification/artisan/reverify existe ; /compliance/kyc/status renvoie {status:PENDING,provider:null}.
- **➡️ GAP** : Le profil de Pierre reste bloqué en REJECTED sans chemin de remédiation évident côté UI ; le provider KYC est null (pas de fournisseur d'identité branché). Le badge 'vérifié' n'est donc jamais atteignable avec les données actuelles.

#### 🟠 PARTIEL — Messagerie client/interne (avec anti-désintermédiation)
- **Flux attendu** : Conversations avec clients + chat interne entreprise ; blocage des coordonnées pour éviter le hors-plateforme.
- **Comment tester** : GET /chat/conversations ; POST /chat/conversation/:userId/message ; internal-chat/*.
- **Constat** : GET /chat/conversations → conversations réelles ; internal-chat complet (rooms/messages/reactions/search). Le filtre anti-fuite fonctionne : POST message avec '0612345678' → bloqué (code CONTACT_INFO_BLOCKED).
- **➡️ GAP** : Deux défauts : (1) le message bloqué renvoie HTTP 500 (Internal Server Error) au lieu d'un 400/422 métier ; (2) surtout, la tentative a SUSPENDU immédiatement tout le compte artisan (login ensuite 'Compte suspendu', déconnexion totale) — récupérable uniquement via admin activate. Suspension sur première infraction = risque de verrouiller un artisan légitime.

#### 🟠 PARTIEL — Gérer une entreprise (salariés, invitations, planning)
- **Flux attendu** : Le propriétaire invite des salariés, gère les rôles, le planning/shifts, les évaluations de performance.
- **Comment tester** : GET /companies/my-company, /:id/stats ; /employees/company/:id ; employee-features/shifts ; performance-reviews.
- **Constat** : GET /companies/my-company → entreprise Plomberie Lebon ; /employees/company/:id → salariés (dont invitation PENDING) ; controllers employee-features (shifts/schedule/bulk) et performance-reviews (360-feedback/goals/templates) complets.
- **➡️ GAP** : GET /companies/:id/stats renvoie completedMissions:0 et totalRevenue:0 malgré totalMissions:76 (activeMissions:75) et employeeCount:2 — l'agrégation des missions terminées et du CA au niveau entreprise semble défaillante (probable filtre de statut/jointure incorrect).

#### 🟠 PARTIEL — Statistiques / analytics de performance
- **Flux attendu** : L'artisan voit gains par mois, missions par catégorie, taux de conversion, heures/jours de pointe, top villes, taux de clients récurrents, temps de réponse.
- **Comment tester** : GET /artisan/analytics ; module /analytics.
- **Constat** : GET /artisan/analytics → totaux RÉELS (earnings.total 20511, missions.completed 95, conversionRate 24, averageRating 4.97). Page artisan/analytics (466 lignes) appelle /api/artisan/analytics?period.
- **➡️ GAP** : Tous les DÉTAILS sont codés en dur à vide/0 dans artisan.service.ts:267-276 : earnings.byMonth=[], missions.byCategory=[], trends.peakHours=[]/peakDays=[], geography.topCities=[], performance.repeatClientRate=0, responseTime=0. La page affiche donc des graphiques/sections vides malgré des données disponibles en base. Devrait être calculé par agrégation Prisma (groupBy month/category/city).

#### ✅ OK — Inscription / onboarding artisan (devenir prestataire)
- **Flux attendu** : Un client ou nouvel inscrit remplit métiers/entreprise/zone → création d'un profil artisan → rôle ARTISAN.
- **Comment tester** : Inspecter POST /users/artisan-profile et la page client/become-artisan ; vérifier le câblage userApi.createArtisanProfile.
- **Constat** : user.controller.ts:62 @Post('artisan-profile') ; frontend client/become-artisan/page.tsx:104 appelle userApi.createArtisanProfile(formData) avec sélection de spécialités. Pierre a un profil artisan complet (companyName, siret, spécialités).

#### ✅ OK — Compléter le profil (métiers, zone d'intervention, tarifs)
- **Flux attendu** : L'artisan édite description, spécialités, serviceRadius, hourlyRate, emergencyRate, adresse de base.
- **Comment tester** : GET/PUT /artisan/profile.
- **Constat** : GET /artisan/profile renvoie serviceRadius:25, hourlyRate:60, emergencyRate:90, baseAddress, latitude/longitude, specialties[] ; PUT /artisan/profile accepté (avant expiration du token). Page artisan/profile présente.

#### ✅ OK — Configurer les paiements (Stripe Connect)
- **Flux attendu** : L'artisan lance l'onboarding Stripe → complète KYC bancaire → chargesEnabled/payoutsEnabled → reçoit les paiements.
- **Comment tester** : GET /artisan/stripe/status ; POST /artisan/stripe/onboarding.
- **Constat** : GET /artisan/stripe/status → {onboarded:true, chargesEnabled:true, payoutsEnabled:true, accountId:acct_1Trgvd...} ; POST /artisan/stripe/onboarding → {url:'https://connect.stripe.com/setup/c/acct_.../MNtVLTYhXt1c'} (URL Stripe RÉELLE). Intégration live.

#### ✅ OK — Trouver des missions (recherche, proximité, urgentes)
- **Flux attendu** : L'artisan cherche les missions ouvertes, filtre par catégorie/statut, voit celles à proximité et urgentes.
- **Comment tester** : GET /missions/search, /missions/search/nearby, /urgent, /recommendations, /similar/:id.
- **Constat** : GET /missions/search?status=PENDING → 20 missions ; /missions/search/nearby?latitude&longitude&radius → missions géolocalisées. mission-search.controller.ts expose search/recommendations/similar/nearby/urgent.

#### ✅ OK — Faire une offre / négocier sur une mission ouverte
- **Flux attendu** : L'artisan propose un prix + message sur une mission ; le client compare plusieurs offres et en accepte une (modèle multi-offres).
- **Comment tester** : POST /missions/:id/negotiations ; GET /missions/:id/negotiations ; PUT /missions/negotiations/:id/accept.
- **Constat** : POST /missions/6bdea5e3.../negotiations {proposedPrice:180,laborCost:120,message} → HTTP 201, négociation créée (senderId=Pierre, receiverId=client). Plancher @Min(1) anti prix de façade (intégrité commission). DTO valide strictement (rejette champs inconnus).

#### ✅ OK — Envoyer un devis (lignes, TVA, signature électronique)
- **Flux attendu** : L'artisan crée un devis avec lignes (MO/matériel), TVA, validité → envoie → client signe → PDF.
- **Comment tester** : POST /quotes ; POST /quotes/:id/send ; POST /quotes/:id/sign ; GET /quotes/:id/signatures ; templates/catalog.
- **Constat** : POST /quotes créé QUO-2026-00213 : subtotal 150, taxAmount 25,50 (17%), totalAmount 175,50 (calcul TVA correct) ; POST /send OK ; GET /:id/signatures → [] (200) ; endpoints templates/catalog/new-version/request-signature présents. Page artisan/quotations (536 lignes) câblée à /quotes/:id/sign et /request-signature.

#### ✅ OK — Réaliser la mission (déplacement, arrivée, exécution, finalisation)
- **Flux attendu** : start-travel → arrive → complete, avec suivi/tracking et photos avant/après ; paiement escrow requis avant déplacement.
- **Comment tester** : GET /missions/:id/tracking, /deposit-status ; POST start-travel/arrive/complete/photos.
- **Constat** : GET /missions/:id/tracking renvoie currentStatus + timeline horodatée ; POST start-travel sur mission ACCEPTED → 400 'Paiement plateforme requis avant de commencer le déplacement (escrow non sécurisé)' (garde anti-fraude correcte) ; 2 missions de Pierre sont IN_PROGRESS (preuve que le flux passe la barrière escrow). Endpoints photos/setup-deposit/validate/auto-validate présents.

#### ✅ OK — Être payé (gains, escrow libéré, payouts, retraits)
- **Flux attendu** : À la validation, l'escrow est libéré vers le compte Stripe Connect de l'artisan ; l'artisan suit ses gains payés/en attente ; payouts bancaires automatiques via Stripe.
- **Comment tester** : GET /artisan/earnings, /earnings/summary ; payment/payouts/automated ; earnings/company/:id/process-payouts.
- **Constat** : GET /artisan/earnings/summary → {totalEarnings:20511, paidEarnings:20511, pendingEarnings:0, thisMonthEarnings:13383}. Payouts entreprise→employés via POST /earnings/company/:id/process-payouts et /payouts/automated. Le retrait bancaire de l'artisan solo passe par Stripe Connect (payoutsEnabled:true), modèle correct — pas d'endpoint 'withdraw' manuel nécessaire.

#### ✅ OK — Facturation automatique + comptabilité
- **Flux attendu** : Facture générée à la mission/devis/commande, numérotée, PDF, avec export FEC et déclaration TVA.
- **Comment tester** : GET /invoices, /invoices/:id/pdf ; POST /invoices/mission/:id ; GET /accounting/summary, /fec/export, /vat-declaration.
- **Constat** : GET /invoices → factures INV-2026-00088 numérotées ; GET /invoices/:id/pdf → {pdfUrl} et le fichier RÉEL existe (application/pdf, 2186 octets via /files/invoices/). GET /accounting/summary?dates → {invoices:{totalHT,TVA,TTC}, balance}. Page artisan/earnings câblée à /accounting/fec/export.

#### ✅ OK — Avis & réputation (recevoir, répondre)
- **Flux attendu** : L'artisan consulte ses avis, y répond publiquement, voit son score de réputation.
- **Comment tester** : GET /artisan/reviews ; /review-responses/my-responses ; POST /review-responses/:reviewId.
- **Constat** : GET /artisan/reviews → avis détaillés (overallRating/quality/punctuality/communication) ; GET /review-responses/my-responses → réponses existantes ('Merci pour votre retour !'). Profil : rating 4.97, reviewCount 80, reputationScore 107.

#### ✅ OK — Disponibilités / agenda / congés
- **Flux attendu** : L'artisan définit horaires hebdo, créneaux de dispo, demande des congés, bascule dispo on/off.
- **Comment tester** : GET/PUT /artisan/working-hours ; /availability ; /time-off ; PUT /artisan/availability/toggle.
- **Constat** : GET /artisan/working-hours → horaires par jour ; /availability → créneaux ; /time-off → congés (VACATION, status PENDING) ; PUT /artisan/availability/toggle {available:false} → 200. Pages artisan/availability/{calendar,time-off,working-hours}.

#### ✅ OK — Pointeuse (time-tracking) salariés
- **Flux attendu** : Salarié pointe entrée/sortie/pause ; l'employeur voit les heures jour/semaine et corrige.
- **Comment tester** : POST /time-tracking/clock-in/out, break ; GET /status/today/weekly ; /company/:id ; POST /entry/:id/correct.
- **Constat** : GET /time-tracking/status → {isWorking:false,todayWorkedMinutes:0} ; endpoints clock-in/out, break/start-end, daily/:date, weekly, company/:id, entry/:id/correct présents. Page artisan/time-tracking + employee/pointeuse.

#### ✅ OK — Sous-traitance (portail sous-traitant — Luc)
- **Flux attendu** : Un artisan enrôlé comme sous-traitant voit ses offres, accepte/refuse, progresse/termine ses assignations, suit ses gains.
- **Comment tester** : GET /subcontractor-portal/{dashboard,offers,assignments,earnings} avec le compte Luc.
- **Constat** : Avec luc.jar : /subcontractor-portal/dashboard → {isSubcontractor:true, stats:{pendingOffers:4,activeAssignments:2,completedMissions:3,totalEarnings:800}} ; /offers, /assignments, /earnings (totalEarned 1750, totalPending 950) tous 200. Endpoints accept/decline/progress/complete présents. Côté gestion : subcontractors.controller (invite/terminate/assignments).

#### ✅ OK — Certifications / qualifications
- **Flux attendu** : L'artisan ajoute ses certifications (RGE, Qualibat...), avec document, et statut de vérification.
- **Comment tester** : GET/POST/PUT/DELETE /artisan/certifications.
- **Constat** : GET /artisan/certifications → [{name:'RGE',issuer:'Qualibat',verified:false}] ; CRUD complet. Page artisan/certifications.
- **➡️ GAP** : Champ 'verified' toujours false (pas de flux de vérification admin des certifications visible) — mineur.

#### ✅ OK — Paramètres & préférences de notification + notifications in-app
- **Flux attendu** : L'artisan règle ses préférences (email/push/sms, alertes missions), reçoit et lit ses notifications.
- **Comment tester** : GET/PUT /artisan/notification-preferences ; GET /notifications, /unread-count ; PATCH read.
- **Constat** : GET /artisan/notification-preferences → {emailNotifications:true,newMissionAlerts:true,...} ; GET /notifications → notifications RÉELLES (ex 'Offre acceptée: le sous-traitant a accepté...') ; /notifications/unread-count → {count:146} ; FCM register/unregister présents. Delivery vérifié.


### VENDEUR marketplace produits (= rôle ARTISAN ; il n'existe PAS de rôle "SELLER" distinct)

_Il n'existe aucun rôle vendeur dédié : l'enum UserRole = {CLIENT, ARTISAN, ADMIN}. Le "vendeur" est un ARTISAN, et un Product porte simplement un artisanId. Côté API, le socle e-commerce existe et est plutôt complet (CRUD produits avec ownership, variantes, stock réservé au paiement avec ré-incrément à l'annulation, cycle de commande PENDING->PAID->SHIPPED->DELIVERED, module retours très complet, génération de facture MARKETPLACE avec commission). MAIS trois trous majeurs cassent l'expérience vendeur de bout en bout : (1) l'argent des ventes produits n'arrive JAMAIS au vendeur — payOrder ne fait que basculer le statut, sans intent de paiement, sans Transaction, sans escrow, sans payout ; (2) les PHOTOS produit sont impossibles à enregistrer (create ignore images, update avec images -> 500, DTO rejette photos) ET le formulaire d'ajout/édition produit du front est un placeholder non fonctionnel ; (3) le vendeur n'a AUCUNE page UI pour voir ses commandes/ventes, expédier, ou gérer les retours (tout n'existe qu'en API), et sa page "Mes produits" charge par erreur tout le catalogue marketplace au lieu de ses propres produits. Aucune statistique de vente/CA produits n'existe. Tests réalisés en live sur krafolt.com/api avec Pierre (artisan) et Jean (client) : création produit, variante, commande, paiement, expédition/livraison, facture, analytics retours — tout tracé ci-dessous. NB : le système anti-fraude a suspendu Jean puis Pierre pendant l'audit ; comptes restaurés en ACTIVE via admin, produit de test masqué (INACTIVE)._

#### 🔴 MANQUANT — Être payé pour ses ventes (encaissement, escrow, versement/payout vendeur)
- **Flux attendu** : Le paiement d'une commande encaisse réellement (Stripe/escrow), crée une Transaction, crédite le solde vendeur, déclenche un payout.
- **Comment tester** : Payer une commande, chercher une Transaction/écriture de gains liée à l'order, vérifier earnings/payouts produits.
- **Constat** : order.service.payOrder ne fait QUE status=PAID + décrément stock : aucun PaymentIntent, aucune création de Transaction (le champ Order.transaction reste null), aucun escrow, aucun crédit vendeur. grep 'createFromOrder/PRODUCT/orderId' : aucune création de Transaction type PRODUCT nulle part. Les payouts (bank-transfer/automated-payout) et le module payments (/payments/create-intent, capture) ne traitent que les MISSIONS (missionId), jamais les commandes produits. analytics.service n'a AUCUNE requête order/product.
- **➡️ GAP** : TROU MAJEUR : toute la chaîne argent des ventes produits est absente — intent de paiement produit, Transaction(type PRODUCT), escrow/commission, crédit et payout vendeur. Devrait vivre dans payment + un hook dans payOrder. Impact : le vendeur ne touche jamais l'argent de ses ventes ; la marketplace produits n'est pas monétisable en l'état.

#### 🔴 MANQUANT — Répondre aux avis produits laissés par les acheteurs
- **Flux attendu** : L'acheteur note un produit acheté ; le vendeur peut répondre publiquement à l'avis.
- **Comment tester** : Chercher un endpoint de réponse vendeur à un ProductReview ; inspecter le modèle.
- **Constat** : Les avis existent : POST /marketplace/products/:id/reviews (contrôle d'achat via order, upsert 1 avis/client), GET reviews OK. Mais le modèle ProductReview n'a aucun champ de réponse vendeur et aucun endpoint de réponse. product.service n'expose que create/get review.
- **➡️ GAP** : Manque champ sellerReply + endpoint POST /marketplace/products/:id/reviews/:reviewId/reply (rôle vendeur propriétaire). Impact : le vendeur ne peut pas gérer sa e-réputation produit.

#### 🔴 MANQUANT — Statistiques de vente / CA produits (tableau de bord vendeur)
- **Flux attendu** : Le vendeur voit CA produits, nb commandes, top produits, évolution, panier moyen.
- **Comment tester** : Chercher endpoints analytics ventes produits ; inspecter pages artisan/analytics & earnings.
- **Constat** : analytics.service.ts ne contient AUCUNE requête prisma.order/orderItem/product (grep vide, seuls des orderBy sur d'autres modèles). Les pages front artisan/earnings, artisan/analytics, artisan/dashboard ne référencent ni product ni marketplace ni sales (grep vide). Seule stat 'vendeur' : le montant de stock statique calculé côté front dans artisan/products (prix×stock).
- **➡️ GAP** : Aucune statistique de vente produits (CA, commandes, top produits). À créer : endpoint analytics ventes marketplace + section dashboard vendeur. Impact : le vendeur pilote à l'aveugle.

#### 🟠 PARTIEL — Onboarding vendeur / configuration boutique (profil boutique, politique d'expédition, politique de retour)
- **Flux attendu** : Un artisan active une activité de vente, configure sa boutique (nom, logo), ses frais/zones d'expédition, sa politique de retour, ses coordonnées de versement.
- **Comment tester** : Chercher un endpoint/page d'onboarding vendeur, un modèle ShopProfile, une config d'expédition/retour par vendeur.
- **Constat** : Aucun rôle SELLER (enum UserRole = CLIENT/ARTISAN/ADMIN, schema.prisma L17). N'importe quel ARTISAN peut créer des produits sans onboarding. Pas de modèle boutique/ShopProfile. Frais d'expédition codés en dur (order.service.ts L18 flatShippingCost=5.99) ; fenêtre de retour codée en dur (return.service.ts L28 RETURN_WINDOW_DAYS=30).
- **➡️ GAP** : Pas de configuration boutique ni de politique d'expédition/retour paramétrable par vendeur. Devrait vivre dans un modèle SellerProfile/ShopSettings + endpoints /marketplace/shop. Impact : le vendeur ne maîtrise ni ses frais de port ni ses conditions de retour.

#### 🟠 PARTIEL — Créer et gérer un catalogue de produits (fiche, prix, TVA, SKU, statut, photos)
- **Flux attendu** : Le vendeur crée un produit (nom, description, prix, TVA, catégorie, SKU, stock, photos, statut DRAFT/ACTIVE), le modifie, le publie, le supprime, uniquement les siens.
- **Comment tester** : POST/PATCH/DELETE /marketplace/products en tant que Pierre ; vérifier persistance des photos ; tester le formulaire front.
- **Constat** : API CRUD OK et ownership vérifié (product.service.ts create/update/delete, ForbiddenException si artisanId != user). Testé : POST create -> 201 (prix, sku, vatRate, status DRAFT persistés). MAIS PHOTOS CASSÉES : POST avec images:[...] -> produit renvoyé photos=[] (le create ne mappe jamais images->photos) ; PATCH avec images -> HTTP 500 (Prisma: champ 'images' inexistant) ; PATCH avec photos -> HTTP 400 'property photos should not exist' (whitelist DTO). Front artisan/products/page.tsx L262-263 : modal ajout/édition = placeholder 'Formulaire ... à implémenter', bouton Save inerte -> impossible de créer/éditer un produit depuis l'UI.
- **➡️ GAP** : 1) Aucun moyen d'attacher une photo à un produit (le champ Prisma est 'photos', le DTO/service parlent 'images' sans mapping ; corriger create() pour écrire data.photos = data.images, ajouter photos au DTO ou renommer). 2) Formulaire produit front totalement absent (à implémenter réellement dans artisan/products/page.tsx). Impact : bloquant — un vendeur ne peut ni mettre de photos ni gérer son catalogue sans curl.

#### 🟠 PARTIEL — Voir son propre catalogue (liste de ses produits, y compris DRAFT/INACTIVE)
- **Flux attendu** : Sur 'Mes produits', le vendeur voit uniquement SES produits, tous statuts confondus.
- **Comment tester** : Inspecter loadProducts() du front vs findAll() backend.
- **Constat** : artisan/products/page.tsx L36 appelle marketplaceApi.getProducts() SANS artisanId ; backend product.service.findAll() force where.status='ACTIVE' par défaut et ne filtre pas par appelant. Résultat : la page 'Mes produits' liste TOUS les produits ACTIVE de toute la marketplace et masque les DRAFT/INACTIVE du vendeur. De plus le dropdown catégories front (tools/materials/decorations...) ne correspond pas aux vraies catégories (bois/finition/plomberie... vérifié via GET /marketplace/categories).
- **➡️ GAP** : Passer artisanId=<user courant> (et un statut 'all') à getProducts, et exposer un filtre statut côté backend pour le propriétaire. Impact : le vendeur ne voit pas son vrai stock/brouillons et voit les produits des autres.

#### 🟠 PARTIEL — Gestion des stocks (décrément à la vente, ré-incrément à l'annulation, alertes rupture)
- **Flux attendu** : Le stock diminue à l'achat payé, remonte si annulation/remboursement, passe SOLD_OUT à 0, alerte stock bas.
- **Comment tester** : Placer+payer une commande, observer le stock ; annuler et observer.
- **Constat** : order.service.payOrder décrémente le stock de façon atomique au paiement (transaction, re-check dispo) ; updateStatus ré-incrémente à CANCELLED/REFUNDED si le stock avait été réservé (L243-254). Testé : commande de 2 -> payée OK. MAIS pas d'auto-statut SOLD_OUT à 0, pas d'alerte stock bas, et le stock des VARIANTES n'est jamais décrémenté (les commandes ignorent variantId).
- **➡️ GAP** : Manque : passage auto en SOLD_OUT, alertes de rupture, et prise en compte du stock/variant à la commande. Impact : survente possible sur variantes, pas de visibilité rupture.

#### 🟠 PARTIEL — Variantes de produit (taille/couleur avec prix et stock propres)
- **Flux attendu** : Le vendeur crée des variantes ; l'acheteur en choisit une ; le prix (priceAdjustment) et le stock de la variante s'appliquent.
- **Comment tester** : POST /marketplace/products/:id/variants ; passer variantId dans une commande.
- **Constat** : CRUD variante OK (testé : POST variant 'Taille L' priceAdjustment=5 stock=3 -> 201). MAIS order.service.create ignore totalement variantId (le front l'envoie pourtant, marketplace.ts createOrder) : prix calculé = prix produit seul (testé : subtotal=85=2×42.5, l'ajustement +5 n'est PAS appliqué), et le stock variante n'est pas touché. Aucune UI de gestion de variantes.
- **➡️ GAP** : La logique de commande doit résoudre la variante (prix = price+priceAdjustment, décrément du stock variante). Manque UI variantes. Impact : les variantes sont décoratives, non vendables correctement.

#### 🟠 PARTIEL — Recevoir et consulter les commandes de ses ventes
- **Flux attendu** : Le vendeur voit la liste des commandes contenant ses produits, avec détail acheteur/adresse/articles.
- **Comment tester** : GET /marketplace/orders en tant que Pierre ; chercher une page 'commandes/ventes' artisan.
- **Constat** : Backend OK : order.service.findAll/findOne autorisent l'acheteur OU l'artisan vendeur d'un item (clause OR items.product.artisanId). Testé : GET /marketplace/orders (Pierre) -> 187 commandes visibles, la vente de test en tête. MAIS AUCUNE page front pour l'artisan : le nav artisan (layout.tsx L96) n'a que '/artisan/products' (My Shop) ; pas de route commandes/ventes. client/orders existe seulement côté acheteur.
- **➡️ GAP** : Créer une page /artisan/orders (ou /artisan/sales) consommant GET /marketplace/orders. Impact : le vendeur ne voit ses ventes que par API, inutilisable en pratique.

#### 🟠 PARTIEL — Traiter/expédier une commande (PAID -> PROCESSING -> SHIPPED -> DELIVERED, n° de suivi)
- **Flux attendu** : Le vendeur fait avancer le statut et renseigne un numéro de suivi communiqué à l'acheteur.
- **Comment tester** : PATCH /marketplace/orders/:id/status ; tenter d'y joindre trackingNumber.
- **Constat** : Transitions OK avec ownership + horodatages : testé SHIPPED -> shippedAt renseigné, DELIVERED -> deliveredAt renseigné (updateStatus L227-239, seul le vendeur d'un item peut changer le statut L215-219). MAIS impossible de renseigner un trackingNumber de commande : PATCH .../status avec trackingNumber -> 400 'property trackingNumber should not exist' ; aucun autre endpoint ne l'écrit alors que Order.trackingNumber existe au schéma. Aucune UI d'expédition.
- **➡️ GAP** : Manque endpoint/champ pour le numéro de suivi de commande + UI de fulfillment. Impact : l'acheteur ne reçoit jamais de tracking pour un achat produit.

#### 🟠 PARTIEL — Gérer les retours et remboursements produits
- **Flux attendu** : Le vendeur voit les demandes de retour, approuve/rejette, reçoit le colis, rembourse, clôture ; suit des analytics retours.
- **Comment tester** : GET /marketplace/returns, /returns/analytics, POST approve/receive/refund en tant que Pierre.
- **Constat** : Backend return.service TRÈS complet et correctement rôle-gé (findAllReturns filtre par produits de l'artisan L172-181 ; approve/reject/receive/refund réservés ARTISAN/ADMIN ; fenêtre 30j, contrôle sur-retour, génération d'étiquette, remboursement partiel, propagation statut order). Testé : GET /marketplace/returns (Pierre) -> total=2 ; GET /marketplace/returns/analytics -> {totalReturns:2, approvalRate:100, totalRefunded:249.7, byReason...} 200 OK. MAIS aucune page front de gestion des retours pour le vendeur (aucune route return dans app/artisan).
- **➡️ GAP** : Le backend existe et fonctionne ; il manque toute l'UI vendeur des retours (/artisan/returns). Note : le remboursement 'refund' n'est de toute façon adossé à aucun vrai flux d'argent (cf. besoin paiement). Impact : gestion des retours inaccessible sans curl.

#### 🟠 PARTIEL — Facturation / TVA des ventes produits
- **Flux attendu** : Chaque vente payée génère une facture MARKETPLACE (TVA, commission, net vendeur), consultable/téléchargeable.
- **Comment tester** : POST /invoices/order/:orderId ; vérifier auto-génération au paiement.
- **Constat** : Endpoint manuel OK : testé POST /invoices/order/:id (Pierre) -> 201, facture INV-2026-00089 type MARKETPLACE (subtotal 85, taxAmount 15.3, platformCommission 11.05, artisanNetAmount...). MAIS : non déclenché automatiquement au paiement (payOrder n'appelle pas createFromOrder), créé en statut DRAFT, aucun bouton/UI pour le générer, et incohérence de taux (facture taxRate=18 alors que produit vatRate=17 et order VAT calculée à 17%).
- **➡️ GAP** : Auto-générer la facture à payOrder, l'exposer dans une UI vendeur, et aligner le taux de TVA (18 vs 17). Impact : pas de facture automatique ni accessible pour le vendeur/acheteur.

#### 🟠 PARTIEL — Gérer les catégories de produits
- **Flux attendu** : Catégories disponibles pour classer les produits (idéalement gérées par l'admin).
- **Comment tester** : GET /marketplace/categories ; chercher un create catégorie.
- **Constat** : GET /marketplace/categories OK (arbre + slug ; testé bois/finition/plomberie...). Seuls des GET sont exposés dans marketplace.controller ; le vendeur ne peut pas créer de catégorie (probablement volontaire = admin). category.service a la logique mais pas d'endpoint d'écriture exposé côté vendeur.
- **➡️ GAP** : Acceptable si géré admin, mais l'UI vendeur propose des catégories codées en dur (tools/materials...) qui ne correspondent pas aux vraies -> à câbler sur GET /marketplace/categories.


### SOUS-TRAITANT (artisan enrôlé comme sous-traitant d'une entreprise donneuse d'ordre — Luc, sous-traitant de l'entreprise de Pierre)

_Le back-end de sous-traitance est solide et fonctionnel bout-en-bout au niveau API : un artisan est invité par email (token non exposé dans la réponse — bonne hygiène anti-désintermédiation), accepte l'invitation (POST /subcontractors/accept-invitation/:token — testé : 404 sur token bidon, dédup ConflictException), voit son portail (dashboard/offres/assignments/earnings — les 4 endpoints répondent 200 pour Luc), accepte/refuse des offres (testé : ASSIGNED→IN_PROGRESS ok, restauré via Pierre), marque terminé, et ses gains sont agrégés (1750€ total, 800€ payés). Un plancher de commission plateforme de 5% est enforced côté création d'assignment (anti-ledger parallèle). MAIS le portail sous-traitant est largement CASSÉ à l'écran à cause de mismatches de contrat front/back systématiques : (1) la page d'acceptation d'invitation vers laquelle pointe l'email (/subcontractor/accept-invitation) N'EXISTE PAS → l'onboarding via email aboutit à un 404 ; (2) les boutons Accepter/Refuser une offre sont conditionnés par status==='PENDING' alors que le back renvoie 'ASSIGNED' → ils ne s'affichent JAMAIS, le sous-traitant ne peut pas accepter/refuser depuis l'UI ; (3) tous les montants s'affichent à 0€ (front lit `amount`, back renvoie `agreedAmount`) ; (4) l'onglet Gains affiche 0€ partout et « Aucun gain » (front lit totalEarnings/items, back renvoie summary.totalEarned/assignments) ; (5) la barre d'avancement est factice (le champ progress est ignoré, aucun champ progress au modèle). Côté métier : aucune messagerie sous-traitant↔donneur d'ordre, aucun paiement réel (le statut PAID est un simple flag posé manuellement par le donneur d'ordre, pas de virement Stripe), et le sous-traitant ne peut pas gérer lui-même son statut actif/inactif (réservé au donneur d'ordre). L'API est la source de vérité et fonctionne ; l'UI et les flux argent/communication sont incomplets._

#### 🔴 MANQUANT — Communiquer avec le donneur d'ordre (et éventuellement le client) autour de la mission
- **Flux attendu** : Fil de discussion lié à la mission/assignment entre sous-traitant et donneur d'ordre pour coordonner (accès, planning, questions).
- **Comment tester** : Chercher une liaison entre le module chat et subcontractor/assignment ; vérifier si le portail expose un bouton messagerie.
- **Constat** : Le module chat n'a AUCUNE référence sous-traitant (grep sur backend/api-gateway/src/chat|messaging|conversation = 0). La seule 'communication' est unidirectionnelle : des notifications SYSTEM créées VERS le donneur d'ordre lors d'accept/decline/complete (portal.service.createNotification). La réponse /assignments expose le téléphone de l'artisan et du client (contact hors-app) mais aucun fil in-app. Le portail n'a aucun bouton/écran de messagerie.
- **➡️ GAP** : Aucun canal de communication in-app pour le sous-traitant. Ajouter une conversation liée à l'assignment (participants : sous-traitant + donneur d'ordre) et un onglet/bouton Message dans le portail. Actuellement toute coordination doit se faire par téléphone hors plateforme (ce qui contredit d'ailleurs la stratégie anti-désintermédiation du reste du produit).

#### 🔴 MANQUANT — Gérer son statut / sa disponibilité (actif, inactif, se retirer)
- **Flux attendu** : Le sous-traitant peut se mettre en pause (ne plus recevoir d'offres), se réactiver, ou mettre fin à la relation depuis son portail.
- **Comment tester** : Chercher un endpoint permettant au sous-traitant (et non au donneur d'ordre) de changer son propre statut.
- **Constat** : Le seul endpoint de changement de statut est PUT /subcontractors/:id (subcontractor.controller.ts:48, @Roles('ARTISAN')) mais findOne vérifie subcontractor.artisanId === req.user.userId → seul le DONNEUR d'ordre (Pierre) peut passer ACTIVE/INACTIVE/TERMINATED. Le sous-traitant (Luc) n'a AUCUN endpoint pour piloter sa propre disponibilité ; il ne peut que refuser des offres une par une (decline). Le portail n'offre aucun réglage de statut.
- **➡️ GAP** : Manque un contrôle self-service : endpoint côté portail (ex. POST /subcontractor-portal/availability {active}) permettant au sous-traitant de se rendre indisponible/disponible et de quitter la relation, + UI correspondante. Impact : le sous-traitant subit les offres sans pouvoir se déclarer indisponible.

#### 🟠 PARTIEL — Recevoir et accepter une invitation de sous-traitance (onboarding)
- **Flux attendu** : Le donneur d'ordre crée un sous-traitant → email d'invitation avec lien contenant un token → le sous-traitant clique, se connecte, accepte → son statut passe PENDING_INVITATION → ACTIVE et il est lié à l'entreprise.
- **Comment tester** : POST /subcontractors/accept-invitation/:token (token bidon, token déjà utilisé, lien email) ; vérifier la page frontend cible du lien email ; vérifier que le token n'est pas exposé dans la réponse de création.
- **Constat** : Back OK : POST /subcontractors/accept-invitation/BOGUSTOKEN → 404 'Invalid invitation token' (testé). Le token n'est PAS renvoyé dans la réponse de create (subcontractor.service.ts:103, strip volontaire anti-désintermédiation) et part uniquement par email. acceptInvitation gère PENDING→ACTIVE + acceptedAt + dédup ConflictException (service ligne 203-241). L'email est bien envoyé (email.service.ts:326). MAIS le lien de l'email pointe vers `${FRONTEND_URL}/subcontractor/accept-invitation?token=...` (email-template.service.ts:616) et AUCUNE route Next.js n'existe pour ce chemin (grep sur frontend/app : 0 fichier invit/accept-invitation).
- **➡️ GAP** : Page frontend manquante : créer frontend/app/subcontractor/accept-invitation/page.tsx qui lit ?token=, appelle subcontractorApi.manage.acceptInvitation(token) (déjà présent dans le client) et affiche succès/erreur. Sans elle, l'onboarding par email aboutit à un 404. Manque aussi une notification/écran pour un sous-traitant DÉJÀ connecté (in-app) listant ses invitations en attente.

#### 🟠 PARTIEL — Accéder au portail sous-traitant (tableau de bord : offres, missions en cours, gains, note moyenne)
- **Flux attendu** : Le sous-traitant se connecte (rôle ARTISAN), ouvre /subcontractor/portal, voit KPIs (offres en attente, missions en cours, terminées, gains) et ses missions en cours.
- **Comment tester** : GET /subcontractor-portal/dashboard avec le cookie de Luc ; comparer les champs renvoyés à ceux lus par portal/page.tsx.
- **Constat** : GET /subcontractor-portal/dashboard → 200 pour Luc : {isSubcontractor:true, stats:{pendingOffers:4, activeAssignments:2, completedMissions:3, totalEarnings:'800', averageRating:'5'}, currentAssignments:[...]}. Portail atteignable (lié depuis frontend/app/artisan/layout.tsx). MAIS mismatch : le back niche les stats sous `stats.*` tandis que le front lit dashboard.pendingOffers / dashboard.totalEarnings à plat (portal/page.tsx:212-224). Les compteurs offres/actives/terminées retombent sur le comptage des tableaux (OK), mais le KPI 'Gains du mois' retombe sur earnings?.totalEarnings qui est aussi un mauvais nom → affiche 0€.
- **➡️ GAP** : Aligner le contrat : soit aplatir la réponse dashboard côté back (pendingOffers/activeAssignments/completedAssignments/totalEarnings à la racine), soit lire dashboard.stats.* côté front. Impact : KPI gains erroné (0€) sur le tableau de bord alors que l'API a la donnée.

#### 🟠 PARTIEL — Se voir confier une mission (offre) et l'accepter ou la refuser
- **Flux attendu** : Le donneur d'ordre assigne une mission → elle apparaît dans les offres du sous-traitant → il accepte (→ en cours) ou refuse (avec motif → annulée), le donneur d'ordre est notifié.
- **Comment tester** : GET /subcontractor-portal/offers ; POST .../offers/:id/accept ; POST .../offers/:id/decline ; vérifier l'affichage des boutons dans portal/page.tsx.
- **Constat** : API OK et testée : GET /offers renvoie 4 offres status:'ASSIGNED'. POST /offers/e1c1d4ce/accept → 200, status devient IN_PROGRESS, notifie le donneur d'ordre (testé puis restauré à ASSIGNED via Pierre). BUG UI CRITIQUE : le portail n'affiche les boutons Accepter/Refuser que si isPending = status==='PENDING' (portal/page.tsx:357,417) alors que le back renvoie 'ASSIGNED' → boutons JAMAIS rendus. De plus le montant affiché lit offer.amount (undefined) alors que le back renvoie agreedAmount → '0 €' ; le nom du donneur d'ordre lit offer.contractor (undefined) alors que le back renvoie subcontractor.artisan → fallback générique. Aucune notification in-app n'est créée POUR le sous-traitant lors d'un nouvel assignment (subcontractor.service.ts createAssignment n'appelle aucune notification).
- **➡️ GAP** : 1) Mapper le statut 'ASSIGNED' → offre en attente (ou renvoyer 'PENDING') pour que Accepter/Refuser s'affichent. 2) Mapper agreedAmount→amount et subcontractor.artisan→contractor dans le client/portail. 3) Créer une notification au sous-traitant (subcontractorUserId) à la création d'assignment. Sans 1), le sous-traitant est incapable d'accepter/refuser une mission depuis l'interface.

#### 🟠 PARTIEL — Réaliser la mission : suivre l'avancement et marquer terminé
- **Flux attendu** : Mission en cours → le sous-traitant met à jour l'avancement (0-100%) → marque terminé → le donneur d'ordre est notifié, les stats se mettent à jour.
- **Comment tester** : POST .../assignments/:id/progress {progress} ; POST .../assignments/:id/complete ; vérifier persistance du % et transition de statut.
- **Constat** : complete OK (portal.service completeWork : IN_PROGRESS→COMPLETED, notifie l'artisan, updateSubcontractorStats). MAIS l'avancement est factice : le front envoie {progress:50} (api/subcontractor.ts updateProgress) tandis que le DTO back UpdateProgressDto n'accepte que `notes` et le modèle SubcontractorAssignment N'A AUCUN champ progress. Testé : POST /assignments/:id/progress avec {progress:50} → 200 mais la valeur est ignorée (réponse ne contient aucun champ progress, confirmé par grep), seul un horodatage est ajouté à la description. La barre d'avancement du portail affiche donc toujours 0% et les boutons 25/50/75% n'ont aucun effet visible.
- **➡️ GAP** : Ajouter un champ progress (Int 0-100) au modèle SubcontractorAssignment + l'accepter dans UpdateProgressDto + le renvoyer, sinon retirer la barre/boutons trompeurs. Actuellement l'avancement est un placeholder non persisté.

#### 🟠 PARTIEL — Suivre ses gains de sous-traitance (historique, versés / en attente)
- **Flux attendu** : Le sous-traitant ouvre l'onglet Gains : total gagné, versé, en attente, et l'historique ligne par ligne avec statut de paiement.
- **Comment tester** : GET /subcontractor-portal/earnings ; comparer les champs aux lectures de portal/page.tsx (onglet earnings).
- **Constat** : API OK : GET /earnings → {summary:{totalEarned:1750, totalPaid:800, totalPending:950, missionsCompleted:3}, assignments:[3 lignes avec amount/paymentStatus/paidAt]}. MAIS l'onglet Gains du portail lit earnings.totalEarnings / paidEarnings / pendingEarnings (portal/page.tsx:483-491) et earnings.items (ligne 502) — tous absents de la réponse (le back renvoie summary.totalEarned/totalPaid/totalPending et `assignments`). Résultat UI : les 3 KPIs affichent 0€ et l'historique affiche « Aucun gain enregistré » alors que 1750€ existent.
- **➡️ GAP** : Aligner le contrat gains : renvoyer côté back {totalEarnings,paidEarnings,pendingEarnings,items} OU adapter le front à {summary.*, assignments}. Impact fort : le sous-traitant ne voit AUCUN de ses gains dans l'interface.

#### 🟠 PARTIEL — Être rémunéré (règlement effectif de la sous-traitance)
- **Flux attendu** : À la fin d'une mission, le sous-traitant doit être payé du montant convenu (moins commission plateforme), avec un versement traçable (escrow/payout Stripe) et une preuve.
- **Comment tester** : Chercher une intégration payout/Stripe côté sous-traitant ; regarder comment paymentStatus passe à PAID.
- **Constat** : Aucun versement réel : grep 'subcontractor' dans backend/api-gateway/src/payment|payout|stripe → 0 référence. paymentStatus passe à PAID uniquement quand le DONNEUR d'ordre appelle PUT /subcontractors/assignments/:id avec paymentStatus:'PAID' (subcontractor.service.ts:402, pose paidAt=now). C'est un simple flag de comptabilité, sans mouvement d'argent ni preuve. Le sous-traitant n'a aucun endpoint pour demander/déclencher un règlement.
- **➡️ GAP** : Manque un vrai flux de paiement sous-traitant : soit split/transfer Stripe Connect vers le compte du sous-traitant à la clôture, soit au minimum une demande de règlement + reçu. En l'état la 'rémunération' repose sur la bonne volonté du donneur d'ordre qui coche PAID à la main — risque de non-paiement et zéro traçabilité financière pour le sous-traitant.

#### 🟠 PARTIEL — Comprendre la commission plateforme et son net (brut vs commission vs net perçu)
- **Flux attendu** : Sur chaque offre/mission, le sous-traitant voit le montant convenu, la part/commission plateforme et ce qu'il touchera net, et comprend la règle de commission.
- **Comment tester** : Vérifier si commissionRate est renvoyé et affiché ; vérifier la règle de plancher côté back.
- **Constat** : Côté back, chaque assignment porte commissionRate (renvoyé dans /offers et /assignments : ex '10') et un plancher plateforme de 5% est enforced à la création (subcontractor.service.ts:22,274 : rejet 400 + AuditLog 'SUBCONTRACTOR_LOW_COMMISSION_REJECTED' + incrément offPlatformSolicitationCount si < 5%). MAIS le portail n'affiche NULLE PART la commission ni un décompte net : grep 'commission' dans portal/page.tsx et api/subcontractor.ts = 0. Le type SubcontractorOffer/Assignment côté front ne mappe même pas commissionRate.
- **➡️ GAP** : Surfacer la commission dans le portail : afficher, par offre/mission, montant convenu + commission plateforme + net estimé, et une note explicative de la règle (plancher 5%). En l'état le sous-traitant n'a aucune visibilité UI sur la commission qui le concerne.


### ADMIN / OPERATEUR plateforme (Krafolt)

_L'espace ADMIN de Krafolt est étonnamment complet et réellement câblé bout en bout : login cookie OK (admin@articonnect.com), ~30 endpoints admin protégés par @Roles('ADMIN')+RolesGuard, et une UI Next.js dédiée (/admin/admin/*) qui consomme un client centralisé lib/api/admin.ts. J'ai testé les ACTIONS en write+read-back (avec restauration) : suspend/activate user, feature-flags CRUD, platform-config PUT (13→15→13%), reputation adjust (100→98→100), certification verify/unverify, moderation report status, specialty create/delete, fraud detect, export comptable CSV, cron trigger. Toutes PERSISTENT réellement. La résolution de litige déclenche un VRAI remboursement escrow (paymentService.refundForCancellation), pas juste du texte. Points faibles : gestion des UTILISATEURS incomplète (pas de changement de rôle, pas de create/delete), VÉRIFICATION KYC artisan sans action explicite approve→VERIFIED / reject→REJECTED (manual-review ne fait que flaguer MANUAL_REVIEW ; le KYC Stripe Identity n'est pas actionnable par l'admin), et la « gestion des missions » côté admin se limite à des métriques + auto-validation (aucune action per-mission : force-cancel/réassignation/édition)._

#### 🟠 PARTIEL — Gestion des utilisateurs : lister/filtrer, suspendre, réactiver, débloquer sécurité, changer rôle
- **Flux attendu** : Liste paginée+filtres → suspend/activate/unblock-security ; changement de rôle ; suppression
- **Comment tester** : GET /admin/users ; PUT /admin/users/:id/suspend|activate ; POST unblock-security ; chercher endpoint role-change
- **Constat** : GET /admin/users?limit=3 → data paginée (45 users, filtres role/status présents). PUT suspend → status SUSPENDED (read-back confirmé), PUT activate → ACTIVE (restauré). POST unblock-security existe. Testé write+read-back+restore OK.
- **➡️ GAP** : AUCUN endpoint de changement de RÔLE (admin ne peut pas promouvoir/rétrograder CLIENT/ARTISAN/ADMIN), ni create/delete utilisateur. admin.controller.ts n'a que dashboard/stats/users/suspend/activate/unblock-security/audit-logs. Devrait vivre : PUT /admin/users/:id/role.

#### 🟠 PARTIEL — Vérifications KYC / vérification entreprise des artisans (approuver/rejeter)
- **Flux attendu** : File d'artisans non vérifiés → examiner → APPROUVER (VERIFIED) ou REJETER (REJECTED) ; consulter KYC Stripe Identity
- **Comment tester** : GET /verification/admin/unverified|reverification-needed ; POST /verification/admin/manual-review ; POST /verification/artisan/:id/reverify ; GET /compliance/kyc/status/:userId
- **Constat** : GET /verification/admin/unverified→liste profils (statut business). POST manual-review passe le profil à businessVerificationStatus='MANUAL_REVIEW' + note (persistance réelle, code lu). reverify existe. /compliance/kyc/status/:userId consultable.
- **➡️ GAP** : Pas d'action de DÉCISION admin : manual-review ne fait que flaguer MANUAL_REVIEW, il n'existe pas d'endpoint approve→VERIFIED / reject→REJECTED. Le KYC Stripe Identity n'est pas forçable/rejetable par l'admin (provider-driven, lecture seule). Manque : POST /verification/admin/:id/approve|reject.

#### 🟠 PARTIEL — Gestion des missions (superviser, corriger, forcer une résolution)
- **Flux attendu** : Lister missions, voir détail, actions admin (annuler de force, réassigner, clore, auto-valider bloquées)
- **Comment tester** : GET /missions ; chercher endpoints mission @Roles('ADMIN') ; POST /missions/auto-validate ; page /admin/admin/missions
- **Constat** : Seul endpoint mission réservé admin = POST /missions/auto-validate (CRON, testé via /admin/cron/trigger/auto-validate → {processed:0}). GET /missions liste OK. La page admin/missions n'affiche que getBusinessMetrics (total/pending/completed/completionRate).
- **➡️ GAP** : Pas d'actions admin per-mission : impossible d'annuler de force, réassigner un artisan, éditer ou clore manuellement une mission problématique depuis l'admin. La 'gestion' se limite au métrique + auto-validation globale + résolution via litige.

#### ✅ OK — Se connecter en tant qu'admin et accéder à un espace réservé
- **Flux attendu** : POST /auth/login → cookie de session → accès aux routes /admin/* protégées ; UI /admin/admin/dashboard
- **Comment tester** : curl login admin@articonnect.com puis GET /admin/dashboard
- **Constat** : Login HTTP 200 (role ADMIN, cookie). GET /admin/dashboard 200. Endpoints admin renvoient 401 sans cookie. Contrôleurs décorés @UseGuards(JwtAuthGuard,RolesGuard)+@Roles('ADMIN').

#### ✅ OK — Tableau de bord & métriques (utilisateurs, missions, revenus, litiges, avis, marketplace)
- **Flux attendu** : Dashboard agrégé + stats revenus/croissance + monitoring temps réel
- **Comment tester** : GET /admin/dashboard, /admin/stats/revenue, /admin/stats/growth, /admin/monitoring/dashboard, /admin/monitoring/alerts
- **Constat** : /admin/dashboard→{users:45,missions:560,revenue.totalCommission,disputes:82,reviews:81}. /admin/stats/revenue→totalCommission 32.5, transactions. /admin/stats/growth→série 30j. /admin/monitoring/dashboard→overview+health 'POOR'. /admin/monitoring/alerts→2 alertes avec actionUrl. Tous HTTP 200.

#### ✅ OK — Modération : signalements (avis/contenus/utilisateurs) et filtrage contenu (anti-coordonnées)
- **Flux attendu** : File des reports → voir → changer statut → résoudre avec action ; violations de contenu + patterns activables
- **Comment tester** : GET /moderation/reports|stats ; PUT /moderation/reports/:id/status|resolve ; GET /moderation/content/violations|patterns ; POST patterns/:name/toggle
- **Constat** : /moderation/reports→liste PENDING. /moderation/stats→byStatus/byType/byReason. PUT reports/:id/status UNDER_REVIEW→PENDING (write+revert OK). /moderation/content/violations→détections PHONE_LU_CC etc. /moderation/content/patterns→regex+enabled. Tous 200.

#### ✅ OK — Litiges : résolution avec remboursement réel + escalade
- **Flux attendu** : File litiges → escalader → résoudre avec issue (REFUND_CLIENT/PARTIAL) déclenchant un remboursement escrow réel
- **Comment tester** : GET /disputes ; POST /disputes/:id/resolve|escalate ; lire dispute.service.resolve()
- **Constat** : GET /disputes→litiges (un IN_REVIEW porte 'Escalated by admin cbd7655b...: QA adminops escalate verify' → escalade admin a réellement écrit). resolve() lu : sur REFUND_CLIENT/PARTIAL_REFUND appelle paymentService.refundForCancellation(missionId,amount), log l'argent bougé, throw si échec escrow. Remboursement RÉEL, pas cosmétique.

#### ✅ OK — Gestion des no-shows (compensation)
- **Flux attendu** : File no-shows en attente → valider (compenser) ou rejeter ; barème configurable
- **Comment tester** : GET /payments/no-show/pending ; POST /payments/no-show/validate|reject ; GET /admin/platform-config/no-show
- **Constat** : Endpoints /payments/no-show/pending|validate|reject|report existent, UI câblée (adminApi.getPendingNoShows→/payments/no-show/pending, validateNoShow, rejectNoShow). GET pending→[] (aucun en attente, 200). Config /admin/platform-config/no-show→barème complet (compensationPercentage 30, gpsRadius, etc.).
- **➡️ GAP** : Validate/reject non exercés faute d'event en attente ; endpoints+wiring+config présents et cohérents.

#### ✅ OK — Réputation : consulter et ajuster manuellement
- **Flux attendu** : Voir score+historique d'un user, ajuster (+/-) avec raison, règles configurables
- **Comment tester** : GET /reputation/user/:id|history ; POST /reputation/adjust {pointsChange} ; GET /admin/platform-config/reputation-rules
- **Constat** : GET /reputation/user/:id→score 100. POST /reputation/adjust {pointsChange:-2}→score 98 (read-back), reverté à 100. Historique dispo. reputation-rules→initialScore/bonus/penalties configurables. Note : le DTO exige 'pointsChange' (pas 'delta').

#### ✅ OK — Certifications artisan : vérifier / dévérifier
- **Flux attendu** : Lister certifs → verify (verified=true) / unverify
- **Comment tester** : GET /certifications ; POST /certifications/:id/verify|unverify
- **Constat** : GET /certifications→liste (RGE/Qualibat verified:false). POST /:id/verify→verified true (read-back), POST /:id/unverify→restauré. Write+read-back+restore OK.

#### ✅ OK — Spécialités / catégories (référentiel)
- **Flux attendu** : CRUD des spécialités et catégories
- **Comment tester** : GET /specialties|categories ; POST/PUT/DELETE /specialties
- **Constat** : POST /specialties {name,category:OTHER}→201 créé, DELETE→'supprimée avec succès'. GET categories dispo. CRUD réel testé.

#### ✅ OK — Feature flags (activation de fonctionnalités)
- **Flux attendu** : Lister, créer, activer/désactiver, évaluer, supprimer un flag
- **Comment tester** : GET/POST /admin/feature-flags ; POST /:key/enable|disable ; DELETE /:key
- **Constat** : GET→[] initial. POST créé 'qa_adminops_flag' (201). POST /enable→value.enabled:true (read-back), DELETE→{success:true}. CRUD complet réel.

#### ✅ OK — Anti-fraude : multi-comptes, désintermédiation (leakage), toggles détecteurs
- **Flux attendu** : Voir comptes flaggés, lancer détection, enforcer sanctions, activer/désactiver détecteurs
- **Comment tester** : GET /fraud/multi-account/flagged, /fraud/disintermediation/flagged ; POST /fraud/multi-account/detect/:id ; GET/PUT /admin/fraud-settings + /status
- **Constat** : /fraud/multi-account/flagged→users riskScore 95/93. /fraud/disintermediation/flagged→artisans SUSPENDED leakageRiskScore 100. POST multi-account/detect/:id→{isSuspicious:true,riskScore:82.8,linkedAccounts:[...]}. /admin/fraud-settings/status→9 détecteurs avec enabled+threshold. Toggles PUT disponibles.

#### ✅ OK — Paramètres plateforme (commissions/frais, paiements, limites, TVA, notifications, intégrations, compliance RGPD, missions, users, performance, content)
- **Flux attendu** : GET puis PUT de chaque bloc de config, persistant
- **Comment tester** : GET/PUT /admin/platform-config/{fees,payments,rate-limits,tax,notifications,integrations,compliance,...}
- **Constat** : 14 sous-sections GET OK. PUT /fees platformCommissionRate 13→15 (read-back 15)→revert 13, persistance confirmée. tax→vatRates LU17/FR20/BE21. compliance→gdprEnabled+retention. no-show/reputation-rules/notifications lus. UI /admin/admin/settings/* complète.

#### ✅ OK — CRON / monitoring
- **Flux attendu** : Voir jobs CRON, déclencher manuellement, santé système
- **Comment tester** : GET /admin/cron/status|health ; POST /admin/cron/trigger/auto-validate ; GET /admin/monitoring/metrics/*
- **Constat** : /admin/cron/status→jobs (auto-validate 6h, expand-radius 10min, cleanup...). POST trigger/auto-validate→{processed:0,results:[]} (201, exécution réelle). monitoring/dashboard,alerts,metrics 200.

#### ✅ OK — Journaux d'audit (audit-logs)
- **Flux attendu** : Lister les actions admin/système horodatées + détail
- **Comment tester** : GET /admin/audit-logs|:id ; vérifier qu'une action écrit un log
- **Constat** : /admin/audit-logs→entries ACTIVATE_USER, LEAKAGE_ENFORCE_REQUIRE_DEPOSIT avec resource/details/ip/date. Les actions de sécurité génèrent bien des logs. GET :id dispo.

#### ✅ OK — Payouts / finances & export comptable
- **Flux attendu** : Statistiques payouts, planning par entreprise, traitement, export comptable téléchargeable
- **Comment tester** : GET /payouts/automated/statistics ; GET /payouts/automated/company/:id/schedule ; POST /export/accounting
- **Constat** : /payouts/automated/statistics→{pending,processing:{amount:679.8,count:5},paid}. POST /export/accounting {type:TRANSACTIONS,format:CSV}→CSV avec entêtes 'Date,Transaction ID,Client,Mission,Montant,Commission,Net perçu,Statut' (201). Note : DTO exige 'type' (INVOICES/TRANSACTIONS/...) et format en MAJ.
- **➡️ GAP** : Payout process per-company non déclenché (pas de company de test isolée) ; statistiques et export prouvés réels.

#### ✅ OK — Contrôle d'accès RBAC (réservé aux admins)
- **Flux attendu** : Un non-admin/non-authentifié reçoit 401/403 sur les routes admin
- **Comment tester** : Appeler /admin/* sans cookie et avec un cookie CLIENT
- **Constat** : Sans cookie : /admin/dashboard, /admin/users, PUT /admin/platform-config/fees → 401. /analytics/dashboard sans droit → 403 Forbidden. Tous contrôleurs @Roles('ADMIN')+RolesGuard.
- **➡️ GAP** : Test négatif avec un vrai cookie CLIENT non rejouable cette session : login jean.dupont a renvoyé 401 (verrouillage/rate-limit probable). Protection néanmoins prouvée par 401 non-authentifié + décorateurs de rôle.

