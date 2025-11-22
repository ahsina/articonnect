-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('EMERGENCY', 'RENOVATION', 'INSTALLATION', 'MAINTENANCE', 'PRODUCT', 'OTHER');

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "standardRate" DECIMAL(5,2) NOT NULL,
    "reducedRate" DECIMAL(5,2) NOT NULL,
    "intermediateRate" DECIMAL(5,2),
    "superReducedRate" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRate" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "description" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VatDeclaration" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "totalSales" DECIMAL(10,2) NOT NULL,
    "totalTax" DECIMAL(10,2) NOT NULL,
    "totalPurchases" DECIMAL(10,2),
    "totalTaxCredit" DECIMAL(10,2),
    "netTaxDue" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "reportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VatDeclaration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE INDEX "Country_code_idx" ON "Country"("code");

-- CreateIndex
CREATE INDEX "TaxRate_countryId_idx" ON "TaxRate"("countryId");

-- CreateIndex
CREATE INDEX "TaxRate_category_idx" ON "TaxRate"("category");

-- CreateIndex
CREATE INDEX "TaxRate_effectiveFrom_idx" ON "TaxRate"("effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "VatDeclaration_artisanId_period_countryCode_key" ON "VatDeclaration"("artisanId", "period", "countryCode");

-- CreateIndex
CREATE INDEX "VatDeclaration_artisanId_idx" ON "VatDeclaration"("artisanId");

-- CreateIndex
CREATE INDEX "VatDeclaration_period_idx" ON "VatDeclaration"("period");

-- CreateIndex
CREATE INDEX "VatDeclaration_status_idx" ON "VatDeclaration"("status");

-- AddForeignKey
ALTER TABLE "TaxRate" ADD CONSTRAINT "TaxRate_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VatDeclaration" ADD CONSTRAINT "VatDeclaration_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Insert default countries and tax rates

-- Luxembourg
INSERT INTO "Country" ("id", "code", "name", "standardRate", "reducedRate", "intermediateRate", "superReducedRate", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'LU', 'Luxembourg', 17.00, 8.00, 14.00, 3.00, NOW(), NOW());

-- France
INSERT INTO "Country" ("id", "code", "name", "standardRate", "reducedRate", "intermediateRate", "superReducedRate", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'FR', 'France', 20.00, 5.50, 10.00, 2.10, NOW(), NOW());

-- Belgium
INSERT INTO "Country" ("id", "code", "name", "standardRate", "reducedRate", "intermediateRate", "superReducedRate", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'BE', 'Belgique', 21.00, 6.00, 12.00, 0.00, NOW(), NOW());

-- Insert tax rates for Luxembourg
INSERT INTO "TaxRate" ("id", "countryId", "category", "rate", "description", "effectiveFrom", "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, 'EMERGENCY', 17.00, 'Taux standard pour dépannages urgents', NOW(), NOW(), NOW()
FROM "Country" WHERE code = 'LU';

INSERT INTO "TaxRate" ("id", "countryId", "category", "rate", "description", "effectiveFrom", "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, 'RENOVATION', 8.00, 'Taux réduit pour rénovations', NOW(), NOW(), NOW()
FROM "Country" WHERE code = 'LU';

INSERT INTO "TaxRate" ("id", "countryId", "category", "rate", "description", "effectiveFrom", "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, 'INSTALLATION', 17.00, 'Taux standard pour installations', NOW(), NOW(), NOW()
FROM "Country" WHERE code = 'LU';

INSERT INTO "TaxRate" ("id", "countryId", "category", "rate", "description", "effectiveFrom", "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, 'MAINTENANCE', 17.00, 'Taux standard pour maintenance', NOW(), NOW(), NOW()
FROM "Country" WHERE code = 'LU';

INSERT INTO "TaxRate" ("id", "countryId", "category", "rate", "description", "effectiveFrom", "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, 'PRODUCT', 17.00, 'Taux standard pour produits', NOW(), NOW(), NOW()
FROM "Country" WHERE code = 'LU';

INSERT INTO "TaxRate" ("id", "countryId", "category", "rate", "description", "effectiveFrom", "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, 'OTHER', 17.00, 'Taux standard pour autres services', NOW(), NOW(), NOW()
FROM "Country" WHERE code = 'LU';

-- Insert tax rates for France
INSERT INTO "TaxRate" ("id", "countryId", "category", "rate", "description", "effectiveFrom", "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, 'EMERGENCY', 20.00, 'Taux standard pour dépannages urgents', NOW(), NOW(), NOW()
FROM "Country" WHERE code = 'FR';

INSERT INTO "TaxRate" ("id", "countryId", "category", "rate", "description", "effectiveFrom", "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, 'RENOVATION', 10.00, 'Taux intermédiaire pour rénovations (>2 ans)', NOW(), NOW(), NOW()
FROM "Country" WHERE code = 'FR';

INSERT INTO "TaxRate" ("id", "countryId", "category", "rate", "description", "effectiveFrom", "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, 'INSTALLATION', 20.00, 'Taux standard pour installations', NOW(), NOW(), NOW()
FROM "Country" WHERE code = 'FR';

INSERT INTO "TaxRate" ("id", "countryId", "category", "rate", "description", "effectiveFrom", "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, 'MAINTENANCE', 20.00, 'Taux standard pour maintenance', NOW(), NOW(), NOW()
FROM "Country" WHERE code = 'FR';

INSERT INTO "TaxRate" ("id", "countryId", "category", "rate", "description", "effectiveFrom", "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, 'PRODUCT', 20.00, 'Taux standard pour produits', NOW(), NOW(), NOW()
FROM "Country" WHERE code = 'FR';

INSERT INTO "TaxRate" ("id", "countryId", "category", "rate", "description", "effectiveFrom", "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, 'OTHER', 20.00, 'Taux standard pour autres services', NOW(), NOW(), NOW()
FROM "Country" WHERE code = 'FR';

-- Insert tax rates for Belgium
INSERT INTO "TaxRate" ("id", "countryId", "category", "rate", "description", "effectiveFrom", "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, 'EMERGENCY', 21.00, 'Taux standard pour dépannages urgents', NOW(), NOW(), NOW()
FROM "Country" WHERE code = 'BE';

INSERT INTO "TaxRate" ("id", "countryId", "category", "rate", "description", "effectiveFrom", "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, 'RENOVATION', 6.00, 'Taux réduit pour rénovations habitations privées', NOW(), NOW(), NOW()
FROM "Country" WHERE code = 'BE';

INSERT INTO "TaxRate" ("id", "countryId", "category", "rate", "description", "effectiveFrom", "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, 'INSTALLATION', 21.00, 'Taux standard pour installations', NOW(), NOW(), NOW()
FROM "Country" WHERE code = 'BE';

INSERT INTO "TaxRate" ("id", "countryId", "category", "rate", "description", "effectiveFrom", "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, 'MAINTENANCE', 21.00, 'Taux standard pour maintenance', NOW(), NOW(), NOW()
FROM "Country" WHERE code = 'BE';

INSERT INTO "TaxRate" ("id", "countryId", "category", "rate", "description", "effectiveFrom", "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, 'PRODUCT', 21.00, 'Taux standard pour produits', NOW(), NOW(), NOW()
FROM "Country" WHERE code = 'BE';

INSERT INTO "TaxRate" ("id", "countryId", "category", "rate", "description", "effectiveFrom", "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, 'OTHER', 21.00, 'Taux standard pour autres services', NOW(), NOW(), NOW()
FROM "Country" WHERE code = 'BE';
