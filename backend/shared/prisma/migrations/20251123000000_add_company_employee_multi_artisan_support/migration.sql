-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('OWNER', 'MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'CONTRACTOR');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TERMINATED', 'PENDING_INVITATION');

-- CreateEnum
CREATE TYPE "PaymentModel" AS ENUM ('SALARY', 'COMMISSION', 'HYBRID');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "siret" TEXT NOT NULL,
    "vatNumber" TEXT,
    "description" TEXT,
    "website" TEXT,
    "logo" TEXT,
    "ownerId" TEXT NOT NULL,
    "baseAddress" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "serviceRadius" INTEGER NOT NULL DEFAULT 20,
    "businessVerified" BOOLEAN NOT NULL DEFAULT false,
    "businessVerifiedAt" TIMESTAMP(3),
    "businessVerificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "businessRegistrationNumber" TEXT,
    "businessCountry" TEXT,
    "businessVerificationErrors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "businessVerificationWarnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "businessLegalForm" TEXT,
    "businessActivityCode" TEXT,
    "businessVerificationLastCheck" TIMESTAMP(3),
    "stripeAccountId" TEXT,
    "stripeOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "totalMissions" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyEmployee" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "EmployeeRole" NOT NULL DEFAULT 'TECHNICIAN',
    "status" "EmployeeStatus" NOT NULL DEFAULT 'PENDING_INVITATION',
    "invitationToken" TEXT,
    "invitationSentAt" TIMESTAMP(3),
    "invitationAcceptedAt" TIMESTAMP(3),
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "paymentModel" "PaymentModel" NOT NULL DEFAULT 'COMMISSION',
    "baseSalary" DECIMAL(10,2),
    "commissionRate" DECIMAL(5,2),
    "hourlyRate" DECIMAL(10,2),
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "totalMissions" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeEarnings" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "missionRevenue" DECIMAL(10,2) NOT NULL,
    "platformCommission" DECIMAL(10,2) NOT NULL,
    "companyRevenue" DECIMAL(10,2) NOT NULL,
    "employeeCommission" DECIMAL(10,2) NOT NULL,
    "employeeCommissionRate" DECIMAL(5,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payoutDate" TIMESTAMP(3),
    "payoutMethod" TEXT DEFAULT 'STRIPE_TRANSFER',
    "stripeTransferId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeEarnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "defaultCommissionRate" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "ownerCommissionRate" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "autoAssignMissions" BOOLEAN NOT NULL DEFAULT false,
    "requireManagerApproval" BOOLEAN NOT NULL DEFAULT false,
    "allowEmployeeSelfAssignment" BOOLEAN NOT NULL DEFAULT true,
    "payoutFrequency" TEXT NOT NULL DEFAULT 'WEEKLY',
    "minimumPayout" DECIMAL(10,2) NOT NULL DEFAULT 50,
    "notifyOwnerOnNewMission" BOOLEAN NOT NULL DEFAULT true,
    "notifyManagerOnNewMission" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmployeeOnAssignment" BOOLEAN NOT NULL DEFAULT true,
    "defaultWorkingHoursStart" TEXT,
    "defaultWorkingHoursEnd" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_siret_key" ON "Company"("siret");

-- CreateIndex
CREATE UNIQUE INDEX "Company_ownerId_key" ON "Company"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_stripeAccountId_key" ON "Company"("stripeAccountId");

-- CreateIndex
CREATE INDEX "Company_siret_idx" ON "Company"("siret");

-- CreateIndex
CREATE INDEX "Company_ownerId_idx" ON "Company"("ownerId");

-- CreateIndex
CREATE INDEX "Company_latitude_longitude_idx" ON "Company"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Company_averageRating_idx" ON "Company"("averageRating");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyEmployee_invitationToken_key" ON "CompanyEmployee"("invitationToken");

-- CreateIndex
CREATE INDEX "CompanyEmployee_companyId_idx" ON "CompanyEmployee"("companyId");

-- CreateIndex
CREATE INDEX "CompanyEmployee_userId_idx" ON "CompanyEmployee"("userId");

-- CreateIndex
CREATE INDEX "CompanyEmployee_status_idx" ON "CompanyEmployee"("status");

-- CreateIndex
CREATE INDEX "CompanyEmployee_role_idx" ON "CompanyEmployee"("role");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyEmployee_companyId_userId_key" ON "CompanyEmployee"("companyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeEarnings_stripeTransferId_key" ON "EmployeeEarnings"("stripeTransferId");

-- CreateIndex
CREATE INDEX "EmployeeEarnings_employeeId_idx" ON "EmployeeEarnings"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeEarnings_missionId_idx" ON "EmployeeEarnings"("missionId");

-- CreateIndex
CREATE INDEX "EmployeeEarnings_status_idx" ON "EmployeeEarnings"("status");

-- CreateIndex
CREATE INDEX "EmployeeEarnings_payoutDate_idx" ON "EmployeeEarnings"("payoutDate");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySettings_companyId_key" ON "CompanySettings"("companyId");

-- AlterTable: Add company relationships to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ownedCompanyId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "employmentIds" TEXT[];

-- AlterTable: Add company relationship to ArtisanProfile table
ALTER TABLE "ArtisanProfile" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

-- AlterTable: Add company and employee assignment to Mission table
ALTER TABLE "Mission" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "Mission" ADD COLUMN IF NOT EXISTS "assignedToId" TEXT;
ALTER TABLE "Mission" ADD COLUMN IF NOT EXISTS "completedById" TEXT;

-- CreateIndex: Add indexes for new Mission foreign keys
CREATE INDEX IF NOT EXISTS "Mission_companyId_idx" ON "Mission"("companyId");
CREATE INDEX IF NOT EXISTS "Mission_assignedToId_idx" ON "Mission"("assignedToId");
CREATE INDEX IF NOT EXISTS "Mission_completedById_idx" ON "Mission"("completedById");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyEmployee" ADD CONSTRAINT "CompanyEmployee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyEmployee" ADD CONSTRAINT "CompanyEmployee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeEarnings" ADD CONSTRAINT "EmployeeEarnings_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "CompanyEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeEarnings" ADD CONSTRAINT "EmployeeEarnings_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySettings" ADD CONSTRAINT "CompanySettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtisanProfile" ADD CONSTRAINT "ArtisanProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "CompanyEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "CompanyEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
