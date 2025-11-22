-- CreateEnum
CREATE TYPE "BadgeType" AS ENUM ('PERFORMANCE', 'RELIABILITY', 'EXPERIENCE', 'SPECIALTY', 'CUSTOMER_SERVICE', 'MILESTONE');

-- CreateEnum
CREATE TYPE "BadgeTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "type" "BadgeType" NOT NULL,
    "tier" "BadgeTier" NOT NULL,
    "criteria" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggerData" JSONB,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Badge_key_key" ON "Badge"("key");

-- CreateIndex
CREATE INDEX "Badge_type_idx" ON "Badge"("type");

-- CreateIndex
CREATE INDEX "Badge_tier_idx" ON "Badge"("tier");

-- CreateIndex
CREATE INDEX "Badge_isActive_idx" ON "Badge"("isActive");

-- CreateIndex
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");

-- CreateIndex
CREATE INDEX "UserBadge_badgeId_idx" ON "UserBadge"("badgeId");

-- CreateIndex
CREATE INDEX "UserBadge_earnedAt_idx" ON "UserBadge"("earnedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default badges
INSERT INTO "Badge" (id, key, name, description, type, tier, criteria, "isActive", "createdAt", "updatedAt") VALUES
  -- Mission completion badges
  (gen_random_uuid(), 'missions_10', 'Débutant', 'Complété 10 missions', 'MILESTONE', 'BRONZE', '{"missions_completed": 10}', true, NOW(), NOW()),
  (gen_random_uuid(), 'missions_50', 'Professionnel', 'Complété 50 missions', 'MILESTONE', 'SILVER', '{"missions_completed": 50}', true, NOW(), NOW()),
  (gen_random_uuid(), 'missions_100', 'Expert', 'Complété 100 missions', 'MILESTONE', 'GOLD', '{"missions_completed": 100}', true, NOW(), NOW()),
  (gen_random_uuid(), 'missions_500', 'Maître Artisan', 'Complété 500 missions', 'MILESTONE', 'PLATINUM', '{"missions_completed": 500}', true, NOW(), NOW()),

  -- Rating badges
  (gen_random_uuid(), 'rating_45', 'Bien Noté', 'Note moyenne ≥ 4.5/5 avec 20+ avis', 'PERFORMANCE', 'SILVER', '{"avg_rating": 4.5, "min_reviews": 20}', true, NOW(), NOW()),
  (gen_random_uuid(), 'rating_48', 'Excellente Réputation', 'Note moyenne ≥ 4.8/5 avec 50+ avis', 'PERFORMANCE', 'GOLD', '{"avg_rating": 4.8, "min_reviews": 50}', true, NOW(), NOW()),
  (gen_random_uuid(), 'rating_49', 'Légende', 'Note moyenne ≥ 4.9/5 avec 100+ avis', 'PERFORMANCE', 'PLATINUM', '{"avg_rating": 4.9, "min_reviews": 100}', true, NOW(), NOW()),

  -- Reliability badges
  (gen_random_uuid(), 'reliable_90', 'Fiable', 'Taux de complétion ≥ 90%', 'RELIABILITY', 'BRONZE', '{"completion_rate": 90}', true, NOW(), NOW()),
  (gen_random_uuid(), 'reliable_95', 'Très Fiable', 'Taux de complétion ≥ 95%', 'RELIABILITY', 'SILVER', '{"completion_rate": 95}', true, NOW(), NOW()),
  (gen_random_uuid(), 'reliable_98', 'Ultra Fiable', 'Taux de complétion ≥ 98%', 'RELIABILITY', 'GOLD', '{"completion_rate": 98}', true, NOW(), NOW()),

  -- Response time badges
  (gen_random_uuid(), 'fast_responder', 'Réponse Rapide', 'Temps de réponse moyen < 2h', 'CUSTOMER_SERVICE', 'SILVER', '{"avg_response_time_hours": 2}', true, NOW(), NOW()),
  (gen_random_uuid(), 'instant_responder', 'Réponse Instantanée', 'Temps de réponse moyen < 30min', 'CUSTOMER_SERVICE', 'GOLD', '{"avg_response_time_minutes": 30}', true, NOW(), NOW()),

  -- Experience badges
  (gen_random_uuid(), 'veteran_1year', 'Vétéran 1 an', 'Actif depuis 1 an', 'EXPERIENCE', 'BRONZE', '{"years_active": 1}', true, NOW(), NOW()),
  (gen_random_uuid(), 'veteran_3years', 'Vétéran 3 ans', 'Actif depuis 3 ans', 'EXPERIENCE', 'SILVER', '{"years_active": 3}', true, NOW(), NOW()),
  (gen_random_uuid(), 'veteran_5years', 'Vétéran 5 ans', 'Actif depuis 5 ans', 'EXPERIENCE', 'GOLD', '{"years_active": 5}', true, NOW(), NOW()),

  -- No disputes badge
  (gen_random_uuid(), 'no_disputes', 'Sans Litige', 'Aucun litige après 50 missions', 'RELIABILITY', 'GOLD', '{"missions_completed": 50, "max_dispute_count": 0}', true, NOW(), NOW());
