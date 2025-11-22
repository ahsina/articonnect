-- CreateEnum
CREATE TYPE "ConfigCategory" AS ENUM ('FEES', 'PAYMENT', 'NOTIFICATION', 'FEATURE_TOGGLE', 'LIMIT', 'GENERAL');

-- CreateEnum
CREATE TYPE "ConfigDataType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON');

-- CreateTable
CREATE TABLE "PlatformConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "dataType" "ConfigDataType" NOT NULL DEFAULT 'STRING',
    "category" "ConfigCategory" NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformConfig_key_key" ON "PlatformConfig"("key");

-- CreateIndex
CREATE INDEX "PlatformConfig_category_idx" ON "PlatformConfig"("category");

-- CreateIndex
CREATE INDEX "PlatformConfig_isActive_idx" ON "PlatformConfig"("isActive");

-- Insert default configuration values
INSERT INTO "PlatformConfig" (id, key, value, "dataType", category, description, "isPublic", "isActive", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'platform.fee_percentage', '15', 'NUMBER', 'FEES', 'Platform commission percentage', false, true, NOW(), NOW()),
  (gen_random_uuid(), 'platform.min_mission_amount', '50', 'NUMBER', 'FEES', 'Minimum mission amount in EUR', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'platform.max_mission_amount', '10000', 'NUMBER', 'FEES', 'Maximum mission amount in EUR', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'payment.stripe_enabled', 'true', 'BOOLEAN', 'PAYMENT', 'Enable Stripe payments', false, true, NOW(), NOW()),
  (gen_random_uuid(), 'payment.auto_payout_delay_days', '7', 'NUMBER', 'PAYMENT', 'Days to wait before auto payout to artisan', false, true, NOW(), NOW()),
  (gen_random_uuid(), 'notification.email_enabled', 'true', 'BOOLEAN', 'NOTIFICATION', 'Enable email notifications', false, true, NOW(), NOW()),
  (gen_random_uuid(), 'notification.sms_enabled', 'false', 'BOOLEAN', 'NOTIFICATION', 'Enable SMS notifications', false, true, NOW(), NOW()),
  (gen_random_uuid(), 'feature.marketplace_enabled', 'true', 'BOOLEAN', 'FEATURE_TOGGLE', 'Enable marketplace', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'feature.chat_enabled', 'true', 'BOOLEAN', 'FEATURE_TOGGLE', 'Enable in-app chat', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'limit.max_photos_per_mission', '10', 'NUMBER', 'LIMIT', 'Maximum photos per mission', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'limit.artisan_service_radius_km', '50', 'NUMBER', 'LIMIT', 'Maximum service radius for artisans', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'general.platform_name', 'ArtiConnect', 'STRING', 'GENERAL', 'Platform name', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'general.support_email', 'support@articonnect.lu', 'STRING', 'GENERAL', 'Support email', true, true, NOW(), NOW());
