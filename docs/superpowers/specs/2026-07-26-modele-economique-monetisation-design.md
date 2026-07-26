# Krafolt — Modèle économique & monétisation (design validé)

> Statut : **design validé** (go fondateur, 2026-07-26). Prochaine étape : plan d'implémentation (writing-plans).
> Contexte : marketplace artisans **LU / FR / BE**, modèle **offres + escrow** déjà en place (le client publie
> une demande, les artisans font des offres, le client choisit, paiement séquestré libéré à la validation).

## 1. Principe directeur

**« L'artisan ne paie que quand il est réellement payé. »** On inverse le modèle dominant du secteur
(Angi/Thumbtack/HomeAdvisor/StarOfService/Google LSA = **pay-per-lead** : l'artisan paie 15–117 € **par lead**,
souvent **partagé** entre 3-5 pros, et **paie même sans décrocher** → coût par job jusqu'à **~542 €** chez Angi).

Krafolt = **commission au succès** (zéro lead-fee) + **escrow** (paiement garanti à l'artisan) + le **client
choisit** sur la valeur (pas une enchère au lead). L'artisan remplace des milliers €/mois de pub par un %
uniquement sur les jobs gagnés.

## 2. Les 3 robinets de revenus

### Robinet 1 — Commission au succès (cœur, obligatoire)
- Prélevée **uniquement sur une mission réussie et validée** (fonds libérés de l'escrow).
- **Taux de base = 15 %** (tier Free), avec **plancher** et **plafond** (déjà en config : `minCommissionAmount`,
  `maxCommissionAmount`) pour ne pas générer une commission absolue disproportionnée sur un gros chantier.
- **Source de vérité unique** : `net artisan = montant − commission` (corrigé, commit d0758d2 : plus de double
  barème 88 %/13 %).
- Le taux effectif dépend du **tier d'abonnement** de l'artisan (voir Robinet 2).

### Robinet 2 — Packages Pro (abonnement SaaS, revenu récurrent)
L'abonnement **baisse la commission** et débloque visibilité + outils. L'artisan **pilote son coût**.

| Tier | Prix | Commission | Débloque |
|---|---|---|---|
| **Free** | 0 € | **15 %** | Accès marketplace, offres illimitées, devis/facture de base, paiement escrow, avis |
| **Pro** | **39 €/mois** | **10 %** | Commission réduite · **Mise en avant standard** · outils illimités (devis/facture/agenda/sous-traitance/analytics) · **badge « Pro vérifié »** · support prioritaire |
| **Premium** | **99 €/mois** | **8 %** | Commission mini · **Mise en avant renforcée** · **multi-employés** · **Garantie missions** (Phase 3) · export compta |

- Seuil de rentabilité pour l'artisan (indicatif, transparent dans l'UI) : Pro rentable dès ~800 €/mois de CA
  sur la plateforme (5 pts de commission économisés) ; Premium dès ~1400 €/mois.
- **P2B** : les conditions (commission + frais) sont affichées **avant inscription** (CGU pro) et modifiables
  avec préavis.

### Robinet 3 — Boosts ponctuels (remplace Google Ads, éthique) — Phase 2
- **« Mise en avant »** payante : apparaître **en haut de la liste** / slot sponsorisé sur des missions ciblées
  (par catégorie + zone), **labellé « Sponsorisé »**, **sans casser le classement qualité** (le boost pondère,
  ne remplace pas la note/pertinence). Remplaçant honnête de Google Ads (quelques € pour être vu par des clients
  prêts à payer, vs 50 €/lead).
- **« Garantie missions »** (option Premium, **Phase 3**, ville par ville quand la demande est prouvée) :
  *N missions qualifiées/mois ou remboursement pro-rata*. Puissant pour recruter, mais risqué → différé.

### Côté client
- **Gratuit au lancement** (la demande est la ressource rare : plus de clients = plus de valeur artisan).
- **Phase 3** (leviers doux, optionnels) : **frais de service** léger (façon Uber, 3-5 %) et/ou **premium/urgence**
  (intervention prioritaire garantie, assurance étendue, conciergerie). → on gagne des deux côtés sans étouffer la demande.

## 3. Ouverture de la marketplace
- **Clients : ouverts à tous.**
- **Artisans : ouverts MAIS vérifiés** (KYC entreprise + assurance + avis). Le **trust est le produit**, pas un annuaire ouvert.

## 4. Avantages vs concurrents (argumentaire produit)
1. **Zéro pay-per-lead / zéro « payé pour rien »** : on paie sur le job gagné (vs Angi/Thumbtack/LSA).
2. **Escrow** : paiement garanti à l'artisan (fini les impayés) + protection client.
3. **Pas d'enchère au lead** : le client choisit sur la valeur ; l'artisan ne surenchérit pas sur son budget pub.
4. **Remplace la pub** : des milliers €/mois → un % au succès + boosts optionnels bon marché.
5. **Trust** : vérifié, avis, médiation, anti-désintermédiation.
6. **Tout-en-un** : devis/facture/agenda/paiement — plus besoin de 5 outils.

## 5. Modèle de données (ajouts)
- **`SubscriptionPlan`** (config, ou étendre `PlatformConfig.fees`) : `code (FREE|PRO|PREMIUM)`, `monthlyPrice`,
  `commissionRate`, `features[]`.
- **`ArtisanSubscription`** : `artisanProfileId`, `plan`, `status (ACTIVE|PAST_DUE|CANCELLED)`, `currentPeriodEnd`,
  `stripeSubscriptionId?`. (Phase 1 : gérable manuellement/gratuit ; Phase 2 : billing Stripe.)
- **`Boost`** (Phase 2) : `artisanId`, `type (LIST_TOP|MISSION_SPOTLIGHT)`, `category?`, `zone?`, `startsAt`,
  `endsAt`, `amount`, `status`.
- **`ArtisanProfile`** : champ `plan`/lien vers l'abonnement courant (pour résoudre la commission).

## 6. Points d'intégration (code existant)
- **`payment.service.computeCommission`** → prendre le **taux du tier** de l'artisan (résolveur
  `getCommissionRate(artisanId)` = taux plan actif, sinon base 15 %). Aujourd'hui : taux plateforme fixe.
- **`platform-config.service`** → config des tiers (prix, taux, features) ; garder plancher/plafond.
- **`invoice.service`** → **`generateCommissionInvoice(mission)`** (Krafolt → artisan, **TVA sur la commission**),
  émise à la validation, en plus de la facture artisan→client. (**Gap légal #1**, tâche #71.)
- **Discover artisan + comparaison d'offres client** → pondération **boost/tier** dans le classement, avec label
  **« Sponsorisé »** (Phase 2).
- **Frontend** : page **Packages/Tarifs** (comparatif tiers), gestion d'abonnement, achat de boost, **badge tier**,
  affichage **commission dynamique** dans « Gains » et avant acceptation (**Gap légal #2**, tâche #72), écran de
  paiement client avec **TTC + détail TVA + conditions séquestre** (**Gap légal #3**, tâche #73).

## 7. Conformité légale (intégrée)
- **P2B (UE 2019/1150)** : commission/frais transparents **avant inscription** (CGU pro) + préavis de changement +
  système de réclamation. Commission **visible** à l'artisan (avant acceptation + dans Gains).
- **Facture de commission** Krafolt→artisan avec **TVA** (l'artisan assujetti récupère la TVA).
- **Consommateur** : prix **TTC** + détail TVA + rôle d'intermédiaire + identité artisan **avant** paiement.
- Facture artisan→client : émetteur artisan (SIRET/TVA), **sans** commission, **sans** tel/email artisan (déjà fait).

## 8. Phasage
- **Phase 1 (fondation, sans dépendance clés Stripe billing)** : barème commission par tier + résolveur ·
  commission **visible/dynamique** · **facture de commission** artisan · **transparence client TTC/TVA** ·
  tiers gérés manuellement (Free par défaut). → livrable, testable en Stripe test.
- **Phase 2 (nécessite clés)** : **billing Stripe** des abonnements (Subscriptions) + **boosts** payants +
  classement sponsorisé.
- **Phase 3** : **garantie missions** (ville par ville) + **frais/premium côté client**.

## Definition of Done (Phase 1)
La commission dépend du tier de l'artisan (défaut 15 %), `net = montant − commission` partout ; l'artisan voit sa
commission réelle (dynamique) avant d'accepter et dans Gains ; une **facture de commission avec TVA** est générée
à la validation (Krafolt→artisan) ; l'écran de paiement client affiche TTC + TVA + conditions séquestre. Conforme P2B.
