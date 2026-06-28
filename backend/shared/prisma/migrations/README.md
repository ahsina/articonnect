# Database Migrations

Ce dossier contient toutes les migrations Prisma pour la base de données Krafolt.

## Appliquer les Migrations

### En Développement

```bash
# Méthode 1: Avec le script (recommandé)
cd backend/api-gateway
./scripts/migrate.sh dev

# Méthode 2: Directement avec Prisma
cd backend/shared
npx prisma migrate dev
```

### En Production

```bash
# Méthode 1: Avec le script (recommandé)
cd backend/api-gateway
./scripts/migrate.sh deploy

# Méthode 2: Directement avec Prisma
cd backend/shared
npx prisma migrate deploy
```

## Migrations Disponibles

### `20251115000000_add_mission_templates_and_review_responses`

**Date:** 2025-11-15

**Description:**
Ajoute deux nouveaux modèles pour les fonctionnalités avancées:

1. **MissionTemplate** - Templates de missions réutilisables
   - Permet aux utilisateurs de créer des modèles de missions
   - Supporte les templates publics et privés
   - Tracking d'utilisation
   - Budget guidance et checklists

2. **ReviewResponse** - Réponses aux avis
   - Permet aux artisans de répondre aux avis
   - Relation 1-to-1 avec Review
   - Notifications automatiques

**Tables créées:**
- `MissionTemplate` (10 colonnes, 4 indexes)
- `ReviewResponse` (6 colonnes, 2 indexes, 2 foreign keys)

**Impact:**
- ✅ Pas de modification de données existantes
- ✅ Aucune migration de données nécessaire
- ✅ Pas de downtime requis

**Rollback:**
Si besoin de rollback, exécuter:
```sql
DROP TABLE "ReviewResponse";
DROP TABLE "MissionTemplate";
```

## Vérification Post-Migration

Après avoir appliqué les migrations, vérifier:

```bash
# 1. Vérifier le statut
npx prisma migrate status

# 2. Générer le client Prisma
npx prisma generate

# 3. Vérifier les tables
psql $DATABASE_URL -c "\dt"

# 4. Vérifier les indexes
psql $DATABASE_URL -c "\di"
```

## Troubleshooting

### Erreur: "Migration already applied"

```bash
# Résoudre manuellement
npx prisma migrate resolve --applied 20251115000000_add_mission_templates_and_review_responses
```

### Erreur: "Database schema is not in sync"

```bash
# Reset (DEV ONLY - perd toutes les données!)
npx prisma migrate reset

# Ou appliquer les migrations manquantes
npx prisma migrate deploy
```

### Erreur: "P1012 - DATABASE_URL not found"

```bash
# Vérifier que .env est configuré
cat .env | grep DATABASE_URL

# Ou exporter la variable
export DATABASE_URL="postgresql://user:pass@host:5432/db"
```

## Notes Importantes

⚠️ **AVANT de modifier ce dossier:**
1. Créer un backup de la base de données
2. Tester en développement d'abord
3. Ne jamais modifier les migrations existantes
4. Toujours créer une nouvelle migration

✅ **Bonnes pratiques:**
- Utiliser le script `migrate.sh` pour plus de sécurité
- Toujours vérifier le statut avant de déployer
- Garder un historique des migrations
- Documenter les changements complexes
