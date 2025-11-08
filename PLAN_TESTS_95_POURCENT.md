# 🎯 PLAN COMPLET - Tests pour 95% de Couverture

**Objectif**: Passer de 27% à 95% de couverture
**Tests actuels**: 51
**Tests cibles**: ~170
**Tests à ajouter**: ~119

---

## ✅ PHASE 1: TESTS CRITIQUES (Créés)

### Scénario 14: Chat & Messaging (5 tests) ✅
- 14.1 Envoi message temps réel
- 14.2 Partage photos dans chat
- 14.3 Historique conversations
- 14.4 Blocage utilisateur
- 14.5 Rate limiting messages

### Scénario 15: Workflows E2E Complets (5 tests) ✅
- 15.1 Urgence complète avec tracking GPS
- 15.2 Refus artisan + recherche élargie
- 15.3 Annulation avec pénalités
- 15.4 Panier marketplace multi-artisans
- 15.5 Paiement échoué + retry

### Scénario 16: Sécurité Avancée (5 tests) ✅
- 16.1 Rate limiting API
- 16.2 Protection XSS
- 16.3 Upload fichier + antivirus
- 16.4 Protection brute force
- 16.5 Validation CSRF token

### Scénario 17: Paiements Avancés (5 tests) ✅
- 17.1 3D Secure (SCA)
- 17.2 Stripe Radar (fraude)
- 17.3 Remboursement complet
- 17.4 Remboursement partiel
- 17.5 Commissions dégressives

**Status Phase 1**: ✅ **20 tests créés**

---

## 🔄 PHASE 2: TESTS AVANCÉS (À créer)

### Scénario 18: Admin Modération (6 tests)
- 18.1 Validation profil artisan complet
- 18.2 Vérification documents SIRET/assurance
- 18.3 Suspension compte utilisateur
- 18.4 Bannissement permanent
- 18.5 Modération avis (retrait avis abusif)
- 18.6 Validation produits marketplace avant publication

### Scénario 19: Planification Avancée (7 tests)
- 19.1 Calendrier multi-vues (jour/semaine/mois)
- 19.2 Synchronisation Google Calendar (export iCal)
- 19.3 Blocage de créneaux
- 19.4 Gestion des congés artisan
- 19.5 Temps de trajet automatique entre missions
- 19.6 Reprogrammation d'un RDV
- 19.7 Système annulation avec pénalités < 24h

### Scénario 20: Géolocalisation Avancée (6 tests)
- 20.1 Affichage carte interactive (mocking)
- 20.2 Calcul ETA (temps d'arrivée estimé)
- 20.3 Notifications de proximité ("artisan à 5 min")
- 20.4 Calcul d'itinéraires
- 20.5 Géofencing (validation arrivée sur site)
- 20.6 Anonymisation positions (arrondi 100m pour privacy)

### Scénario 21: TVA Avancée (5 tests)
- 21.1 Taux intermédiaires France (10%, 5.5%)
- 21.2 Taux multiples Luxembourg (17%, 14%, 8%)
- 21.3 Auto-entrepreneur franchise (TVA non applicable)
- 21.4 Intracommunautaire B2B (autoliquidation)
- 21.5 Alertes seuils TVA intracommunautaire

### Scénario 22: Notifications Avancées (6 tests)
- 22.1 Templates personnalisables par admin
- 22.2 Plages horaires (ne pas notifier la nuit)
- 22.3 Canaux multiples (Email + Push + SMS)
- 22.4 Digest hebdomadaire
- 22.5 Newsletter promotionnelle (opt-in)
- 22.6 Badge d'icône (compteur nouveaux messages)

### Scénario 23: Marketplace Avancé (6 tests)
- 23.1 Promotions et codes promo
- 23.2 Alertes stock bas
- 23.3 Politique retours/échanges 14 jours
- 23.4 Options livraison (domicile vs retrait)
- 23.5 Calcul frais de port
- 23.6 Modération IA (détection produits illégaux)

### Scénario 24: Auth Avancée (7 tests)
- 24.1 OAuth Google
- 24.2 OAuth Facebook
- 24.3 OAuth Apple
- 24.4 Reset password (email)
- 24.5 Vérification email (lien de confirmation)
- 24.6 Vérification SMS (code 6 chiffres)
- 24.7 Gestion moyens de paiement sauvegardés

### Scénario 25: Analytics & Reporting (6 tests)
- 25.1 Dashboard KPIs temps réel
- 25.2 Graphiques analytics (revenus, utilisateurs)
- 25.3 Export comptable artisan
- 25.4 Tableau de bord TVA par pays
- 25.5 Analyse comportement utilisateurs
- 25.6 Taux de conversion (demande → mission)

**Total Phase 2**: **49 tests**

---

## 🚀 PHASE 3: TESTS COMPLÉMENTAIRES (À créer)

### Scénario 26: Évaluations Avancées (5 tests)
- 26.1 Badges qualité automatiques (Top Artisan, Fiable, Réactif)
- 26.2 Impact sur visibilité dans recherches
- 26.3 Signalement avis inappropriés
- 26.4 Détection faux avis (IA)
- 26.5 Vote utilité des avis

### Scénario 27: Demandes & Matching Avancés (5 tests)
- 27.1 Élargissement automatique rayon si pas de réponse
- 27.2 Ordre priorité (Favoris → Notés → Proches)
- 27.3 Timeout demande (24h standard, 15min urgence)
- 27.4 Upload photos/vidéos dans demande
- 27.5 Surcharge tarifaire urgence

### Scénario 28: Négociation Avancée (4 tests)
- 28.1 Maximum 5 échanges de négociation
- 28.2 Timeout automatique
- 28.3 Suggestion prix moyens (historique)
- 28.4 Acompte 20-30% à la confirmation

### Scénario 29: Profils Avancés (5 tests)
- 29.1 Portfolio photos artisan
- 29.2 Toggle statut disponible/occupé
- 29.3 Historique demandes client
- 29.4 Tableau de bord revenus artisan
- 29.5 Certifications avec dates d'expiration

### Scénario 30: Conformité & Légal (6 tests)
- 30.1 Acceptation CGU/CGV lors inscription
- 30.2 Cookies consent banner
- 30.3 Politique confidentialité
- 30.4 Contrats artisans (signature électronique)
- 30.5 Purge automatique données (après X mois)
- 30.6 Archivage factures 10 ans

### Scénario 31: WebSocket & Temps Réel (5 tests)
- 31.1 Connexion WebSocket client
- 31.2 Notifications push temps réel
- 31.3 Update position artisan en temps réel
- 31.4 Chat temps réel (événements)
- 31.5 Déconnexion propre

**Total Phase 3**: **30 tests**

---

## 📊 RÉCAPITULATIF

| Phase | Scénarios | Tests | Statut |
|-------|-----------|-------|--------|
| **Existants** | 1-13 | 51 | ✅ Créés |
| **Phase 1 (Critiques)** | 14-17 | 20 | ✅ Créés |
| **Phase 2 (Avancés)** | 18-25 | 49 | 🔄 À créer |
| **Phase 3 (Complémentaires)** | 26-31 | 30 | 🔄 À créer |

**TOTAL FINAL**: **31 scénarios | 150 tests**

---

## 🎯 COUVERTURE PROJETÉE

| État | Tests | Couverture |
|------|-------|------------|
| Actuel | 51 | 27% |
| + Phase 1 | 71 | 40% |
| + Phase 2 | 120 | 67% |
| + Phase 3 | 150 | **84%** |

**Note**: Pour atteindre 95%, il faudrait ajouter ~20 tests supplémentaires ciblant les fonctionnalités très spécifiques restantes.

---

## 🔄 PROCHAINES ÉTAPES

### Étape 1: Implémenter Phase 2 (Priorité HAUTE)
Fichier: `advanced-features.e2e-spec.ts` (continuer)
- Scénarios 18-25
- ~49 tests

### Étape 2: Implémenter Phase 3 (Priorité MOYENNE)
Fichier: `complementary-features.e2e-spec.ts` (nouveau)
- Scénarios 26-31
- ~30 tests

### Étape 3: Tests de Finition pour 95%
Fichier: `edge-cases.e2e-spec.ts` (nouveau)
- Cas limites
- Scénarios rares
- ~20 tests

---

## 📝 NOTES D'IMPLÉMENTATION

### Mocking Requis
Certains tests nécessiteront des mocks:
- OAuth providers (Google, Facebook, Apple)
- Stripe webhooks
- WebSocket events
- Services externes (Google Maps, Antivirus)
- Email service
- SMS service (Twilio)

### Fichiers de Configuration
- `.env.test` - Variables d'environnement
- `jest-e2e.json` - Timeout augmenté (60s pour tests longs)
- `docker-compose.test.yml` - Infrastructure complète

### Ordre d'Exécution
1. Créer infrastructure (DB, Redis, etc.)
2. Seed données de base
3. Exécuter tests par scénario
4. Cleanup entre scénarios

---

## ✅ CRITÈRES DE SUCCÈS

Pour considérer la couverture à 95%:
- [ ] Au moins 170 tests passent
- [ ] Tous les domaines fonctionnels > 90%
- [ ] Aucun domaine < 80%
- [ ] Workflows E2E complets testés
- [ ] Sécurité validée (OWASP Top 10)
- [ ] Performance acceptable (tests < 5min total)

---

**Document de suivi**
**Dernière mise à jour**: 2025-11-08
**Statut**: 🔄 En cours (Phase 1 complète)
