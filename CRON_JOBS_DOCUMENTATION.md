# 📅 CRON JOBS - Documentation ArtiConnect

**Date**: 2025-11-08
**Module**: Mission CRON Service
**Status**: ✅ Opérationnel

---

## 📋 RÉSUMÉ

Le système de CRON jobs ArtiConnect automatise les tâches planifiées critiques pour le bon fonctionnement de la plateforme, notamment l'auto-validation des missions bloquées et le nettoyage des données obsolètes.

**Configuration**:
- Framework: `@nestjs/schedule`
- Timezone: `Europe/Paris`
- Logging: NestJS Logger

---

## 🔄 CRON JOBS ACTIFS

### 1. Auto-Validation Missions Bloquées

**Nom**: `auto-validate-stuck-missions`
**Planification**: Toutes les 6 heures (00:00, 06:00, 12:00, 18:00)
**Fichier**: `src/mission/services/mission-cron.service.ts`

#### Description
Valide automatiquement les missions en statut `COMPLETED` depuis plus de 7 jours sans validation client.

#### Critères d'éligibilité
- Statut: `COMPLETED`
- Délai: > 7 jours depuis `completedAt`
- Non validée: `validatedAt` = null
- Non auto-validée: `autoValidated` = false

#### Actions effectuées
1. Recherche des missions éligibles
2. Mise à jour statut → `VALIDATED`
3. Marquage `autoValidated = true`
4. Création `autoValidatedAt`
5. Déclenchement paiement artisan
6. Mise à jour réputation (+10 points client, +15 points artisan)
7. Notification client (validation automatique)
8. Logging détaillé

#### Exemple de logs
```
🔄 Démarrage CRON: Auto-validation missions bloquées
✅ CRON terminé: 3 mission(s) auto-validée(s) en 245ms
  - Mission abc-123: Réparation plomberie (client: user-1, artisan: user-2)
  - Mission def-456: Installation électrique (client: user-3, artisan: user-4)
  - Mission ghi-789: Rénovation salle de bain (client: user-5, artisan: user-6)
  📊 Total paiements déclenchés: 850€
```

#### Endpoint manuel
```bash
POST /admin/cron/trigger/auto-validate
Authorization: Bearer {admin_token}
```

---

### 2. Nettoyage Missions Expirées

**Nom**: `cleanup-expired-missions`
**Planification**: Tous les jours à 02:00
**Fichier**: `src/mission/services/mission-cron.service.ts`

#### Description
Annule automatiquement les missions en statut `PENDING` depuis plus de 30 jours pour éviter l'accumulation de missions obsolètes.

#### Critères d'éligibilité
- Statut: `PENDING`
- Délai: > 30 jours depuis `createdAt`

#### Actions effectuées
1. Recherche des missions expirées
2. Mise à jour statut → `CANCELLED`
3. Création `cancelledAt`
4. Ajout entrée `MissionHistory` (reason: "Mission expirée automatiquement")
5. Logging

#### Exemple de logs
```
🧹 Démarrage CRON: Nettoyage missions expirées
✅ CRON terminé: 5/5 mission(s) expirée(s) annulée(s)
```

---

### 3. Alertes Missions en Attente

**Nom**: `alert-pending-actions`
**Planification**: Tous les jours à 10:00
**Fichier**: `src/mission/services/mission-cron.service.ts`

#### Description
Identifie et compte les missions nécessitant une action (négociation, paiement) pour permettre l'envoi de notifications de rappel.

#### Critères surveillés
1. **Négociations en cours > 48h**
   - Statut: `NEGOTIATING`
   - Délai: > 2 jours depuis `updatedAt`

2. **Missions acceptées non payées > 24h**
   - Statut: `ACCEPTED`
   - `depositRequired = true`
   - `depositPaidAt = null`
   - Délai: > 1 jour depuis `acceptedAt`

#### Actions effectuées
1. Comptage des missions concernées
2. Logging des statistiques
3. **(À implémenter)**: Envoi notifications via NotificationService

#### Exemple de logs
```
🔔 Démarrage CRON: Alertes missions en attente
✅ CRON terminé: 12 mission(s) en négociation > 48h, 8 mission(s) non payées > 24h
```

---

### 4. Statistiques Hebdomadaires

**Nom**: `weekly-statistics`
**Planification**: Tous les lundis à 08:00
**Fichier**: `src/mission/services/mission-cron.service.ts`

#### Description
Génère et log des statistiques hebdomadaires sur l'activité de la plateforme.

#### Métriques calculées
- Missions complétées
- Missions annulées
- Missions en cours
- Auto-validations effectuées
- Groupement par statut

#### Exemple de logs
```
📊 Démarrage CRON: Statistiques hebdomadaires
📈 Statistiques des 7 derniers jours:
  - COMPLETED: 45 missions
  - CANCELLED: 3 missions
  - IN_PROGRESS: 12 missions
  - VALIDATED: 38 missions
  - Auto-validations: 7 missions
✅ CRON terminé: Statistiques générées
```

---

## 🛠️ ADMINISTRATION

### Endpoints Admin

#### 1. Statut CRON Jobs

```http
GET /admin/cron/status
Authorization: Bearer {admin_token}
```

**Réponse:**
```json
{
  "jobs": [
    {
      "name": "auto-validate-stuck-missions",
      "schedule": "Toutes les 6 heures (00:00, 06:00, 12:00, 18:00)",
      "description": "Auto-validation missions bloquées > 7 jours",
      "enabled": true
    },
    {
      "name": "cleanup-expired-missions",
      "schedule": "Tous les jours à 02:00",
      "description": "Nettoyage missions PENDING > 30 jours",
      "enabled": true
    },
    {
      "name": "alert-pending-actions",
      "schedule": "Tous les jours à 10:00",
      "description": "Alertes missions en attente de réponse",
      "enabled": true
    },
    {
      "name": "weekly-statistics",
      "schedule": "Tous les lundis à 08:00",
      "description": "Génération statistiques hebdomadaires",
      "enabled": true
    }
  ],
  "timezone": "Europe/Paris",
  "nextExecutions": {
    "autoValidate": "2025-11-08T18:00:00.000Z",
    "cleanup": "2025-11-09T02:00:00.000Z",
    "alerts": "2025-11-09T10:00:00.000Z",
    "statistics": "2025-11-11T08:00:00.000Z"
  }
}
```

#### 2. Déclencher Auto-Validation Manuellement

```http
POST /admin/cron/trigger/auto-validate
Authorization: Bearer {admin_token}
```

**Réponse:**
```json
{
  "autoValidatedCount": 3,
  "missions": [
    {
      "id": "abc-123",
      "title": "Réparation plomberie",
      "clientId": "user-1",
      "artisanId": "user-2"
    }
  ]
}
```

#### 3. Santé du Système CRON

```http
GET /admin/cron/health
Authorization: Bearer {admin_token}
```

**Réponse:**
```json
{
  "status": "healthy",
  "scheduleModuleEnabled": true,
  "activeJobs": 4,
  "totalJobs": 4,
  "timezone": "Europe/Paris",
  "message": "Tous les CRON jobs sont opérationnels"
}
```

---

## 📊 MONITORING

### Logs à Surveiller

1. **Erreurs CRON**
   ```
   ❌ Erreur CRON auto-validation: {message}
   ```
   → Vérifier la connectivité BDD et l'état des services

2. **Auto-validations massives**
   ```
   ✅ CRON terminé: 50+ mission(s) auto-validée(s)
   ```
   → Possible problème de notifications clients

3. **Missions expirées massives**
   ```
   ✅ CRON terminé: 100+ mission(s) expirée(s) annulée(s)
   ```
   → Possible problème UX ou abandon utilisateurs

### Métriques Recommandées

- **Auto-validations / semaine**: Devrait être < 10% des missions complétées
- **Missions expirées / jour**: Devrait être < 5
- **Temps d'exécution auto-validation**: Devrait être < 1000ms

---

## 🔧 CONFIGURATION

### Variables d'Environnement

Aucune variable spécifique requise. Le système utilise:
- `DATABASE_URL` (via PrismaService)
- Timezone: Hardcodée à `Europe/Paris`

### Désactivation CRON Jobs

Pour désactiver les CRON jobs en développement, commenter dans `AppModule`:

```typescript
// ScheduleModule.forRoot(), // CRON jobs désactivés
```

### Modification des Planifications

Modifier les décorateurs `@Cron()` dans `mission-cron.service.ts`:

```typescript
@Cron(CronExpression.EVERY_12_HOURS) // Au lieu de EVERY_6_HOURS
async autoValidateStuckMissions() {
  // ...
}
```

**Expressions disponibles:**
- `CronExpression.EVERY_HOUR`
- `CronExpression.EVERY_6_HOURS`
- `CronExpression.EVERY_12_HOURS`
- `CronExpression.EVERY_DAY_AT_MIDNIGHT`
- `CronExpression.EVERY_DAY_AT_1AM` ... `AT_11PM`
- `CronExpression.EVERY_WEEK`
- `CronExpression.EVERY_MONTH`
- Custom: `'0 */6 * * *'` (syntaxe cron standard)

---

## 🚨 GESTION DES ERREURS

### Stratégie de Récupération

Les CRON jobs sont conçus pour **ne jamais propager d'erreurs** afin de ne pas bloquer les exécutions suivantes.

```typescript
try {
  // Logique du CRON
} catch (error) {
  this.logger.error(`❌ Erreur CRON: ${error.message}`, error.stack);
  // Pas de throw - on continue
}
```

### Alertes Production

En production, implémenter l'envoi d'alertes via:
- **Sentry** pour les exceptions
- **PagerDuty** pour incidents critiques
- **Slack** pour notifications équipe

---

## 📈 ÉVOLUTIONS FUTURES

### Phase 7: Monitoring & Analytics
- Dashboard admin avec métriques CRON
- Graphiques taux auto-validation
- Alertes intelligentes (seuils)

### Nouveaux CRON Jobs Potentiels
1. **Rappels paiement** (toutes les heures)
2. **Nettoyage photos temporaires** (quotidien)
3. **Archivage missions anciennes** (mensuel)
4. **Rapports financiers** (hebdomadaire)
5. **Synchronisation ratings agrégés** (quotidien)

---

## 🔗 RÉFÉRENCES

- **NestJS Schedule**: https://docs.nestjs.com/techniques/task-scheduling
- **Cron Expressions**: https://crontab.guru/
- **Service**: `src/mission/services/mission-cron.service.ts`
- **Controller**: `src/admin/controllers/cron.controller.ts`
- **Module**: `src/app.module.ts` (ScheduleModule.forRoot())

---

## ✅ CHECKLIST MISE EN PRODUCTION

- [x] @nestjs/schedule installé
- [x] ScheduleModule.forRoot() configuré
- [x] MissionCronService implémenté
- [x] Logging configuré
- [x] Endpoints admin créés
- [x] Documentation complète
- [ ] Tests E2E CRON jobs
- [ ] Alerting production configuré
- [ ] Monitoring dashboards
- [ ] Seuils d'alerte définis

---

**Dernière mise à jour**: 2025-11-08
**Responsable**: Équipe Backend ArtiConnect
